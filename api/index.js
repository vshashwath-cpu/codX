import { createApp } from '../server/src/app.js';
import { initializeStorage } from '../server/src/storage/storage-init.js';

let appInstance = null;

async function getApp() {
  if (!appInstance) {
    await initializeStorage();
    appInstance = createApp();
  }
  return appInstance;
}

export default async function handler(req, res) {
  const app = await getApp();
  return app(req, res);
}
