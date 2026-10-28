import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import env from '../config/env.js';

/**
 * Allowed collection names — protects against path traversal attacks.
 */
const ALLOWED_COLLECTIONS = new Set([
  'users',
  'student-profiles',
  'placement-drives',
  'applications',
  'application-history',
  'resumes',
  'resume-analyses',
  'notifications',
  'faculty-requests',
  'audit-logs',
  'metadata',
]);

/**
 * Per-collection write locks to serialize concurrent writes.
 * Each collection gets its own lock so writes to different collections can proceed in parallel.
 */
const writeLocks = new Map();

/**
 * In-memory cache for read performance. 
 * Cache is invalidated on every write to ensure consistency.
 */
const cache = new Map();

/**
 * Safe write with retry and Windows fallback.
 */
async function safeAtomicWrite(tempPath, filePath, data) {
  await fs.writeFile(tempPath, data, 'utf-8');
  
  // Try atomic rename with short retries for Windows file locking
  for (let i = 0; i < 5; i++) {
    try {
      await fs.rename(tempPath, filePath);
      return;
    } catch (err) {
      if ((err.code === 'EPERM' || err.code === 'EBUSY') && i < 4) {
        await new Promise((r) => setTimeout(r, 20 * (i + 1)));
        continue;
      }
      // If rename fails repeatedly on Windows, fallback to copy + delete
      try {
        await fs.copyFile(tempPath, filePath);
        await fs.unlink(tempPath);
        return;
      } catch {
        throw err;
      }
    }
  }
}
function getFilePath(collection) {
  if (!ALLOWED_COLLECTIONS.has(collection)) {
    throw new Error(`Invalid collection name: "${collection}"`);
  }
  return path.join(env.DATA_DIR, `${collection}.json`);
}

/**
 * Acquire a write lock for a collection.
 * Returns a release function.
 */
function acquireLock(collection) {
  if (!writeLocks.has(collection)) {
    writeLocks.set(collection, Promise.resolve());
  }

  let release;
  const newLock = new Promise((resolve) => {
    release = resolve;
  });

  const previousLock = writeLocks.get(collection);
  writeLocks.set(collection, newLock);

  return previousLock.then(() => release);
}

/**
 * Read a collection from disk (or cache).
 */
export async function readCollection(collection) {
  if (!ALLOWED_COLLECTIONS.has(collection)) {
    throw new Error(`Invalid collection name: "${collection}"`);
  }

  // Check cache first
  if (cache.has(collection)) {
    return structuredClone(cache.get(collection));
  }

  const filePath = getFilePath(collection);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    const records = Array.isArray(parsed) ? parsed : (collection === 'metadata' ? parsed : []);
    cache.set(collection, records);
    return structuredClone(records);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File doesn't exist — return empty collection
      const empty = collection === 'metadata' ? {} : [];
      cache.set(collection, empty);
      return structuredClone(empty);
    }
    if (err instanceof SyntaxError) {
      console.error(`[Storage] Corrupted JSON in ${collection}.json — attempting recovery`);
      // Try to recover from backup
      const backupPath = filePath + '.backup';
      try {
        const backupData = await fs.readFile(backupPath, 'utf-8');
        const parsed = JSON.parse(backupData);
        const records = Array.isArray(parsed) ? parsed : (collection === 'metadata' ? parsed : []);
        // Restore from backup
        await fs.writeFile(filePath, JSON.stringify(records, null, 2), 'utf-8');
        console.log(`[Storage] Recovered ${collection}.json from backup`);
        cache.set(collection, records);
        return structuredClone(records);
      } catch {
        // Preserve corrupted file for inspection
        const corruptedPath = filePath + '.corrupted.' + Date.now();
        try {
          await fs.rename(filePath, corruptedPath);
          console.error(`[Storage] Preserved corrupted file as ${path.basename(corruptedPath)}`);
        } catch { /* ignore */ }
        throw new Error(`Collection "${collection}" is corrupted and no valid backup found. Corrupted file preserved for inspection.`);
      }
    }
    throw err;
  }
}

/**
 * Write an entire collection to disk atomically.
 * Uses temp file + rename for crash safety.
 */
export async function writeCollection(collection, records) {
  if (!ALLOWED_COLLECTIONS.has(collection)) {
    throw new Error(`Invalid collection name: "${collection}"`);
  }

  const filePath = getFilePath(collection);
  const tempPath = filePath + '.tmp.' + crypto.randomUUID();
  const backupPath = filePath + '.backup';

  const release = await acquireLock(collection);
  try {
    const data = JSON.stringify(records, null, 2);

    // Create backup of existing file
    try {
      await fs.copyFile(filePath, backupPath);
    } catch { /* file may not exist yet */ }

    // Safe atomic write
    await safeAtomicWrite(tempPath, filePath, data);

    // Update cache
    cache.set(collection, structuredClone(records));
  } catch (err) {
    // Clean up temp file on failure
    try { await fs.unlink(tempPath); } catch { /* ignore */ }
    throw err;
  } finally {
    release();
  }
}

/**
 * Find a record by ID.
 */
export async function findById(collection, id) {
  const records = await readCollection(collection);
  return records.find((r) => r.id === id) || null;
}

/**
 * Find records matching a predicate function.
 */
export async function findRecords(collection, predicate) {
  const records = await readCollection(collection);
  return records.filter(predicate);
}

/**
 * Find a single record matching a predicate.
 */
export async function findOne(collection, predicate) {
  const records = await readCollection(collection);
  return records.find(predicate) || null;
}

/**
 * Insert a new record. Automatically adds id and timestamps.
 */
export async function insertRecord(collection, record) {
  const release = await acquireLock(collection);
  try {
    // Re-read from disk inside the lock to avoid stale data
    cache.delete(collection);
    const records = await readCollection(collection);

    const newRecord = {
      id: crypto.randomUUID(),
      ...record,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    records.push(newRecord);

    // Write directly (we already hold the lock, bypass acquireLock in writeCollection)
    const filePath = getFilePath(collection);
    const tempPath = filePath + '.tmp.' + crypto.randomUUID();
    const backupPath = filePath + '.backup';
    const data = JSON.stringify(records, null, 2);

    try { await fs.copyFile(filePath, backupPath); } catch { /* may not exist */ }
    await safeAtomicWrite(tempPath, filePath, data);
    cache.set(collection, structuredClone(records));

    return structuredClone(newRecord);
  } finally {
    release();
  }
}

/**
 * Update a record by ID with partial updates.
 * Returns the updated record or null if not found.
 */
export async function updateRecord(collection, id, updates) {
  const release = await acquireLock(collection);
  try {
    cache.delete(collection);
    const records = await readCollection(collection);
    const index = records.findIndex((r) => r.id === id);

    if (index === -1) return null;

    // Don't allow overwriting id or createdAt
    const { id: _id, createdAt: _ca, ...safeUpdates } = updates;

    records[index] = {
      ...records[index],
      ...safeUpdates,
      updatedAt: new Date().toISOString(),
    };

    const filePath = getFilePath(collection);
    const tempPath = filePath + '.tmp.' + crypto.randomUUID();
    const backupPath = filePath + '.backup';
    const data = JSON.stringify(records, null, 2);

    try { await fs.copyFile(filePath, backupPath); } catch { /* may not exist */ }
    await safeAtomicWrite(tempPath, filePath, data);
    cache.set(collection, structuredClone(records));

    return structuredClone(records[index]);
  } finally {
    release();
  }
}

/**
 * Delete a record by ID.
 * Returns true if deleted, false if not found.
 */
export async function deleteRecord(collection, id) {
  const release = await acquireLock(collection);
  try {
    cache.delete(collection);
    const records = await readCollection(collection);
    const index = records.findIndex((r) => r.id === id);

    if (index === -1) return false;

    records.splice(index, 1);

    const filePath = getFilePath(collection);
    const tempPath = filePath + '.tmp.' + crypto.randomUUID();
    const backupPath = filePath + '.backup';
    const data = JSON.stringify(records, null, 2);

    try { await fs.copyFile(filePath, backupPath); } catch { /* may not exist */ }
    await safeAtomicWrite(tempPath, filePath, data);
    cache.set(collection, structuredClone(records));

    return true;
  } finally {
    release();
  }
}

/**
 * Count records matching an optional predicate.
 */
export async function countRecords(collection, predicate) {
  const records = await readCollection(collection);
  if (!predicate) return records.length;
  return records.filter(predicate).length;
}

/**
 * Clear the in-memory cache for a collection or all collections.
 */
export function clearCache(collection) {
  if (collection) {
    cache.delete(collection);
  } else {
    cache.clear();
  }
}

/**
 * Get all allowed collection names.
 */
export function getAllowedCollections() {
  return [...ALLOWED_COLLECTIONS];
}

export default {
  readCollection,
  writeCollection,
  findById,
  findRecords,
  findOne,
  insertRecord,
  updateRecord,
  deleteRecord,
  countRecords,
  clearCache,
  getAllowedCollections,
};
