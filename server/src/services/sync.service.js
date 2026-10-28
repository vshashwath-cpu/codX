import { findOne, insertRecord, updateRecord } from '../storage/json-store.js';
import { applyForDrive } from './application.service.js';
import { createResume, updateResume } from './resume.service.js';

/**
 * Process a batch of pending offline operations from the client.
 * @param {string} userId - Authenticated user ID
 * @param {Array<Object>} operations - Array of pending ops
 * @returns {Promise<Array<Object>>} Array of results per operation
 */
export async function processSyncBatch(userId, operations) {
  if (!Array.isArray(operations)) {
    throw Object.assign(new Error('Operations must be an array'), { status: 400 });
  }

  const results = [];

  for (const op of operations) {
    const { operationId, idempotencyKey, type, payload } = op;

    try {
      let result;

      switch (type) {
        case 'profile-update': {
          // Upsert profile
          const existing = await findOne('student-profiles', (p) => p.userId === userId);
          if (existing) {
            result = await updateRecord('student-profiles', existing.id, payload);
          } else {
            result = await insertRecord('student-profiles', { ...payload, userId });
          }
          results.push({ operationId, status: 'success', result });
          break;
        }

        case 'resume-save': {
          if (payload.id) {
            result = await updateResume(payload.id, userId, payload);
          } else {
            result = await createResume(userId, payload);
          }
          results.push({ operationId, status: 'success', result });
          break;
        }

        case 'application-submit': {
          const appResult = await applyForDrive(userId, payload.driveId, idempotencyKey);
          results.push({
            operationId,
            status: appResult.duplicate ? 'duplicate' : 'success',
            result: appResult.application,
          });
          break;
        }

        default:
          results.push({
            operationId,
            status: 'failed',
            error: `Unknown operation type: "${type}"`,
          });
      }
    } catch (err) {
      results.push({
        operationId,
        status: 'failed',
        error: err.message,
      });
    }
  }

  return results;
}

export default { processSyncBatch };
