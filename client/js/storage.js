/**
 * LocalStorage manager for offline drafts, preferences, and pending operations.
 */

const STORAGE_PREFIX = 'cpg_';

export const storage = {
  // Generic get/set with JSON handling
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn('[Storage] Failed to save to LocalStorage:', err.message);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } catch { /* ignore */ }
  },

  // Profile Drafts
  saveProfileDraft(draft) {
    return this.set('profile_draft', {
      ...draft,
      savedAt: new Date().toISOString(),
      _version: 1,
    });
  },

  getProfileDraft() {
    return this.get('profile_draft');
  },

  clearProfileDraft() {
    this.remove('profile_draft');
  },

  // Resume Drafts
  saveResumeDraft(resumeId, draft) {
    const key = resumeId ? `resume_draft_${resumeId}` : 'resume_draft_new';
    return this.set(key, {
      ...draft,
      savedAt: new Date().toISOString(),
      _version: 1,
    });
  },

  getResumeDraft(resumeId) {
    const key = resumeId ? `resume_draft_${resumeId}` : 'resume_draft_new';
    return this.get(key);
  },

  clearResumeDraft(resumeId) {
    const key = resumeId ? `resume_draft_${resumeId}` : 'resume_draft_new';
    this.remove(key);
  },

  // Placement Drives Cache (for offline viewing)
  cachePlacementDrives(drives) {
    return this.set('cached_drives', {
      drives,
      cachedAt: new Date().toISOString(),
    });
  },

  getCachedDrives() {
    const cached = this.get('cached_drives');
    return cached ? cached.drives : [];
  },

  // Pending Operations Queue (for offline sync)
  getPendingQueue() {
    return this.get('pending_sync_queue', []);
  },

  enqueueOperation(operation) {
    const queue = this.getPendingQueue();
    const op = {
      operationId: crypto.randomUUID ? crypto.randomUUID() : `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      idempotencyKey: crypto.randomUUID ? crypto.randomUUID() : `idem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString(),
      ...operation,
    };
    queue.push(op);
    this.set('pending_sync_queue', queue);
    return op;
  },

  removeOperation(operationId) {
    const queue = this.getPendingQueue();
    const filtered = queue.filter((op) => op.operationId !== operationId);
    this.set('pending_sync_queue', filtered);
  },

  clearPendingQueue() {
    this.set('pending_sync_queue', []);
  },

  // User Preferences
  getPreference(key, defaultValue = null) {
    return this.get(`pref_${key}`, defaultValue);
  },

  setPreference(key, value) {
    return this.set(`pref_${key}`, value);
  },
};

export default storage;
