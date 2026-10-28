import fs from 'fs/promises';
import path from 'path';
import env from '../config/env.js';
import { getAllowedCollections } from './json-store.js';

/**
 * Initialize storage directories and JSON data files.
 * Creates missing directories and initializes empty JSON files.
 * Does NOT overwrite existing data.
 */
export async function initializeStorage() {
  console.log('[Storage] Initializing storage...');

  // Create directories
  const dirs = [env.DATA_DIR, env.UPLOADS_DIR, env.BACKUPS_DIR, env.SESSIONS_DIR];
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }

  // Initialize collection files
  const collections = getAllowedCollections();
  for (const collection of collections) {
    const filePath = path.join(env.DATA_DIR, `${collection}.json`);
    try {
      await fs.access(filePath);
      // File exists — validate it
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        JSON.parse(content);
      } catch (parseErr) {
        if (parseErr instanceof SyntaxError) {
          console.warn(`[Storage] Warning: ${collection}.json contains invalid JSON — will attempt recovery on first access`);
        }
      }
    } catch {
      // File doesn't exist — create it
      const initialContent = collection === 'metadata'
        ? JSON.stringify({
            version: '1.0.0',
            createdAt: new Date().toISOString(),
            lastStartup: new Date().toISOString(),
          }, null, 2)
        : JSON.stringify([], null, 2);

      await fs.writeFile(filePath, initialContent, 'utf-8');
      console.log(`[Storage] Created ${collection}.json`);
    }
  }

  // Update metadata
  const metadataPath = path.join(env.DATA_DIR, 'metadata.json');
  try {
    const content = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(content);
    metadata.lastStartup = new Date().toISOString();
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
  } catch { /* ignore */ }

  console.log('[Storage] Storage initialization complete.');
}

export default { initializeStorage };
