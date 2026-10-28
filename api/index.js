import { createApp } from '../server/src/app.js';
import { initializeStorage } from '../server/src/storage/storage-init.js';

await initializeStorage();
const app = createApp();

export default app;
