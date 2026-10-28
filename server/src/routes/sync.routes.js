import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { processSyncBatch } from '../services/sync.service.js';
import { findOne, insertRecord, updateRecord } from '../storage/json-store.js';

const router = Router();

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const syncOperationSchema = z.object({
  type: z.enum(['create', 'update', 'delete'], {
    errorMap: () => ({ message: 'Type must be create, update, or delete' }),
  }),
  collection: z.string().min(1, 'Collection is required'),
  recordId: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  timestamp: z.string().optional(),
});

const syncBatchSchema = z.object({
  operations: z
    .array(syncOperationSchema)
    .min(1, 'At least one operation is required')
    .max(100, 'Maximum 100 operations per batch'),
  clientTimestamp: z.string().optional(),
});

// All sync routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// POST /api/sync — process batch of offline operations
// ---------------------------------------------------------------------------
router.post('/', validate({ body: syncBatchSchema }), async (req, res) => {
  try {
    const { operations, clientTimestamp } = req.body;
    const userId = req.session.userId;

    const results = await processSyncBatch(userId, operations);

    // Update last sync time for user
    const syncStatus = await findOne(
      'metadata',
      (m) => m.type === 'sync-status' && m.userId === userId
    );

    const now = new Date().toISOString();

    if (syncStatus) {
      await updateRecord('metadata', syncStatus.id, {
        lastSyncTime: now,
        clientTimestamp: clientTimestamp || null,
        operationsProcessed: operations.length,
      });
    } else {
      await insertRecord('metadata', {
        type: 'sync-status',
        userId,
        lastSyncTime: now,
        clientTimestamp: clientTimestamp || null,
        operationsProcessed: operations.length,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        processed: results.length,
        results,
        serverTimestamp: now,
      },
    });
  } catch (err) {
    console.error('[Sync] Batch error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to process sync batch.',
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/sync/status — get sync status (last sync time per user)
// ---------------------------------------------------------------------------
router.get('/status', async (req, res) => {
  try {
    const userId = req.session.userId;

    const syncStatus = await findOne(
      'metadata',
      (m) => m.type === 'sync-status' && m.userId === userId
    );

    if (!syncStatus) {
      return res.status(200).json({
        success: true,
        data: {
          lastSyncTime: null,
          message: 'No sync history found.',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        lastSyncTime: syncStatus.lastSyncTime,
        clientTimestamp: syncStatus.clientTimestamp,
        operationsProcessed: syncStatus.operationsProcessed,
      },
    });
  } catch (err) {
    console.error('[Sync] Status error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve sync status.',
    });
  }
});

export default router;
