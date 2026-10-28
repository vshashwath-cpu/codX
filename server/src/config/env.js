import { config } from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..', '..');

// Load .env from project root
const envPath = path.join(rootDir, '.env');
if (existsSync(envPath)) {
  config({ path: envPath });
}

const isVercel = Boolean(process.env.VERCEL);
const storageBase = isVercel ? path.join('/tmp', 'storage') : path.join(rootDir, 'storage');

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,
  SESSION_SECRET: process.env.SESSION_SECRET || '',
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001',
  BACKUP_ON_START: process.env.BACKUP_ON_START === 'true',
  MAX_BACKUPS: parseInt(process.env.MAX_BACKUPS, 10) || 10,
  IS_VERCEL: isVercel,

  // Derived paths
  ROOT_DIR: rootDir,
  STORAGE_DIR: storageBase,
  DATA_DIR: path.join(storageBase, 'data'),
  UPLOADS_DIR: path.join(storageBase, 'uploads'),
  BACKUPS_DIR: path.join(storageBase, 'backups'),
  SESSIONS_DIR: path.join(storageBase, 'sessions'),
  SEED_DATA_DIR: path.join(rootDir, 'storage', 'data'),
  CLIENT_DIR: path.join(rootDir, 'client'),
};

/**
 * Validate required environment variables at startup.
 * Prints warnings for missing optional vars but throws for critical ones.
 */
export function validateEnv() {
  const errors = [];

  if (!env.SESSION_SECRET || env.SESSION_SECRET === 'replace_with_a_secure_random_secret') {
    errors.push('SESSION_SECRET must be set to a secure random string in .env');
  }

  if (!env.OPENROUTER_API_KEY) {
    console.warn('[Config] OPENROUTER_API_KEY not set — AI resume analysis will be unavailable.');
  }

  if (errors.length > 0) {
    // In development, warn but don't crash if session secret is the placeholder
    if (env.NODE_ENV === 'development' && errors.length === 1 && errors[0].includes('SESSION_SECRET')) {
      console.warn(`[Config] WARNING: ${errors[0]}`);
      // Use a dev-only fallback
      env.SESSION_SECRET = 'dev-only-insecure-secret-change-in-production';
    } else {
      throw new Error(`Environment configuration errors:\n${errors.join('\n')}`);
    }
  }

  console.log(`[Config] Environment: ${env.NODE_ENV}`);
  console.log(`[Config] Port: ${env.PORT}`);
  console.log(`[Config] AI Analysis: ${env.OPENROUTER_API_KEY ? 'Configured' : 'Not configured'}`);
}

export default env;
