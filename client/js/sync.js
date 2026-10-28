/**
 * Offline synchronization manager.
 * Listens for network changes and processes pending operations.
 */

import api from './api.js';
import storage from './storage.js';
import { showToast } from './ui.js';

let isOnline = navigator.onLine;
let isSyncing = false;

export const sync = {
  isOnline() {
    return isOnline;
  },

  init() {
    // Listen for browser connectivity
    window.addEventListener('online', () => {
      isOnline = true;
      this.updateIndicator();
      showToast('Connection restored. Syncing offline changes...', 'info');
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      isOnline = false;
      this.updateIndicator();
      showToast('You are currently offline. Changes will be saved locally.', 'warning');
    });

    // Check API reachability periodically
    setInterval(() => this.checkReachability(), 30000);

    // Initial check
    this.updateIndicator();
    if (isOnline) {
      this.processQueue();
    }
  },

  async checkReachability() {
    try {
      const res = await fetch('/api/auth/me', { method: 'HEAD', cache: 'no-store' });
      const reachable = res.status !== 0;
      if (reachable !== isOnline) {
        isOnline = reachable;
        this.updateIndicator();
      }
    } catch {
      if (isOnline) {
        isOnline = false;
        this.updateIndicator();
      }
    }
  },

  updateIndicator() {
    const bar = document.getElementById('offline-bar');
    if (!bar) return;

    if (!isOnline) {
      bar.classList.remove('hidden');
      bar.innerHTML = '<span>⚠ Working Offline — Changes are saved locally and will sync when reconnected</span>';
    } else {
      const queue = storage.getPendingQueue();
      if (queue.length > 0) {
        bar.classList.remove('hidden');
        bar.className = 'status-bar status-bar-warning';
        bar.innerHTML = `<span>🔄 ${queue.length} pending operation(s) waiting to sync...</span>`;
      } else {
        bar.classList.add('hidden');
      }
    }
  },

  async processQueue() {
    if (!isOnline || isSyncing) return;

    const queue = storage.getPendingQueue();
    if (queue.length === 0) return;

    isSyncing = true;
    console.log(`[Sync] Processing ${queue.length} pending operations...`);

    try {
      const res = await api.syncOperations(queue);
      if (res.success && Array.isArray(res.results)) {
        let syncedCount = 0;
        let failCount = 0;

        for (const item of res.results) {
          if (item.status === 'success' || item.status === 'duplicate') {
            storage.removeOperation(item.operationId);
            syncedCount++;
          } else {
            console.error(`[Sync] Operation ${item.operationId} failed:`, item.error);
            failCount++;
          }
        }

        if (syncedCount > 0) {
          showToast(`Successfully synced ${syncedCount} offline change(s).`, 'success');
        }
        if (failCount > 0) {
          showToast(`${failCount} operation(s) could not be synced. Check requirements.`, 'error');
        }
      }
    } catch (err) {
      console.error('[Sync] Batch sync error:', err.message);
    } finally {
      isSyncing = false;
      this.updateIndicator();
    }
  },
};

export default sync;
