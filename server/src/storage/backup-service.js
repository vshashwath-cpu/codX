import fs from 'fs/promises';
import path from 'path';
import env from '../config/env.js';

/**
 * Create a timestamped backup of all data files.
 */
export async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(env.BACKUPS_DIR, `backup-${timestamp}`);

  await fs.mkdir(backupDir, { recursive: true });

  const files = await fs.readdir(env.DATA_DIR);
  let count = 0;

  for (const file of files) {
    if (file.endsWith('.json') && !file.includes('.tmp.') && !file.includes('.backup') && !file.includes('.corrupted.')) {
      const src = path.join(env.DATA_DIR, file);
      const dest = path.join(backupDir, file);
      await fs.copyFile(src, dest);
      count++;
    }
  }

  console.log(`[Backup] Created backup with ${count} files at ${backupDir}`);

  // Clean old backups
  await cleanOldBackups();

  return backupDir;
}

/**
 * Remove oldest backups if MAX_BACKUPS is exceeded.
 */
async function cleanOldBackups() {
  try {
    const entries = await fs.readdir(env.BACKUPS_DIR, { withFileTypes: true });
    const backupDirs = entries
      .filter((e) => e.isDirectory() && e.name.startsWith('backup-'))
      .map((e) => e.name)
      .sort();

    while (backupDirs.length > env.MAX_BACKUPS) {
      const oldest = backupDirs.shift();
      const oldPath = path.join(env.BACKUPS_DIR, oldest);
      await fs.rm(oldPath, { recursive: true, force: true });
      console.log(`[Backup] Removed old backup: ${oldest}`);
    }
  } catch { /* ignore */ }
}

/**
 * List available backups.
 */
export async function listBackups() {
  try {
    const entries = await fs.readdir(env.BACKUPS_DIR, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && e.name.startsWith('backup-'))
      .map((e) => e.name)
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

/**
 * Restore from a specific backup.
 */
export async function restoreBackup(backupName) {
  const backupDir = path.join(env.BACKUPS_DIR, backupName);

  try {
    await fs.access(backupDir);
  } catch {
    throw new Error(`Backup "${backupName}" not found`);
  }

  // Create a safety backup of current data before restoring
  await createBackup();

  const files = await fs.readdir(backupDir);
  let count = 0;

  for (const file of files) {
    if (file.endsWith('.json')) {
      const src = path.join(backupDir, file);
      const dest = path.join(env.DATA_DIR, file);
      await fs.copyFile(src, dest);
      count++;
    }
  }

  console.log(`[Backup] Restored ${count} files from ${backupName}`);
  return count;
}

export default { createBackup, listBackups, restoreBackup };
