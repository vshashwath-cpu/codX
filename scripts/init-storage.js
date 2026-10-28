/**
 * Initialize storage directories and JSON data files.
 * Safe to run multiple times — will not overwrite existing data.
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const STORAGE_DIR = path.join(rootDir, 'storage');
const DATA_DIR = path.join(STORAGE_DIR, 'data');
const UPLOADS_DIR = path.join(STORAGE_DIR, 'uploads');
const BACKUPS_DIR = path.join(STORAGE_DIR, 'backups');
const SESSIONS_DIR = path.join(STORAGE_DIR, 'sessions');

const COLLECTIONS = [
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
];

async function initStorage() {
  console.log('Initializing storage...\n');

  // Create directories
  for (const dir of [DATA_DIR, UPLOADS_DIR, BACKUPS_DIR, SESSIONS_DIR]) {
    await fs.mkdir(dir, { recursive: true });
    console.log(`  ✓ Directory: ${path.relative(rootDir, dir)}`);
  }

  console.log('');

  // Create collection files
  for (const collection of COLLECTIONS) {
    const filePath = path.join(DATA_DIR, `${collection}.json`);
    try {
      await fs.access(filePath);
      console.log(`  ○ ${collection}.json already exists (skipped)`);
    } catch {
      await fs.writeFile(filePath, JSON.stringify([], null, 2), 'utf-8');
      console.log(`  ✓ Created ${collection}.json`);
    }
  }

  // Create metadata file
  const metadataPath = path.join(DATA_DIR, 'metadata.json');
  try {
    await fs.access(metadataPath);
    console.log('  ○ metadata.json already exists (skipped)');
  } catch {
    const metadata = {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      lastStartup: new Date().toISOString(),
      description: 'College Placement Guide data storage',
    };
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    console.log('  ✓ Created metadata.json');
  }

  console.log('\nStorage initialization complete!');
  console.log(`\nData directory: ${DATA_DIR}`);
}

initStorage().catch((err) => {
  console.error('Storage initialization failed:', err.message);
  process.exit(1);
});
