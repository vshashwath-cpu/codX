import env, { validateEnv } from './config/env.js';
import { initializeStorage } from './storage/storage-init.js';
import { createBackup } from './storage/backup-service.js';
import { createApp } from './app.js';

async function start() {
  try {
    // Validate environment
    validateEnv();

    // Initialize storage
    await initializeStorage();

    // Optional startup backup
    if (env.BACKUP_ON_START) {
      await createBackup();
    }

    // Create and start Express app
    const app = createApp();

    const server = app.listen(env.PORT, () => {
      console.log(`\n${'='.repeat(50)}`);
      console.log('  College Placement Guide');
      console.log(`${'='.repeat(50)}`);
      console.log(`  Server:      http://localhost:${env.PORT}`);
      console.log(`  Environment: ${env.NODE_ENV}`);
      console.log(`  AI Analysis: ${env.OPENROUTER_API_KEY ? 'Available' : 'Not configured'}`);
      console.log(`${'='.repeat(50)}\n`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);
      server.close(() => {
        console.log('[Server] Server closed.');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('[Server] Forced shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    console.error('[Server] Failed to start:', err.message);
    process.exit(1);
  }
}

start();
