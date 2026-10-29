import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { findById, findRecords } from '../storage/json-store.js';
import {
  applyForDrive,
  getApplicationsByStudent,
  getApplicationsByDrive,
  getApplicationById,
  updateApplicationStatus,
} from '../services/application.service.js';

const router = Router();

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const driveParamsSchema = z.object({
  driveId: z.string().min(1, 'Drive ID is required'),
});

const applicationParamsSchema = z.object({
  applicationId: z.string().min(1, 'Application ID is required'),
});

const applySchema = z.object({
  idempotencyKey: z.string().optional(),
});

const statusUpdateSchema = z.object({
  status: z.enum(
    ['pending', 'reviewed', 'shortlisted', 'selected', 'rejected', 'withdrawn'],
    { errorMap: () => ({ message: 'Invalid application status' }) }
  ),
  remarks: z.string().max(1000).trim().optional().default(''),
});

// All application routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// POST /api/drives/:driveId/apply — student applies to a drive
// ---------------------------------------------------------------------------
router.post(
  '/drives/:driveId/apply',
  authorize('student'),
  validate({ params: driveParamsSchema, body: applySchema }),
  async (req, res) => {
    try {
      const application = await applyForDrive(
        req.session.userId,
        req.params.driveId,
        req.body.idempotencyKey
      );

      return res.status(201).json({
        success: true,
        data: application,
      });
    } catch (err) {
      // Service-level errors carry descriptive messages
      if (
        err.message.includes('not eligible') ||
        err.message.includes('already applied') ||
        err.message.includes('not found') ||
        err.message.includes('not published') ||
        err.message.includes('deadline')
      ) {
        return res.status(400).json({
          success: false,
          error: err.message,
        });
      }
      console.error('[Applications] Apply error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to submit application.',
      });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/applications — list applications based on role
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    let applications;
    const role = req.session.role;
    const userId = req.session.userId;

    if (role === 'student') {
      // Student sees their own applications
      applications = await getApplicationsByStudent(userId);
    } else if (role === 'admin') {
      // Admin sees all applications
      applications = await findRecords('applications', () => true);
    } else if (role === 'faculty') {
      // Faculty sees applications for drives they created
      const drives = await findRecords(
        'placement-drives',
        (d) => d.creatorId === userId
      );
      const driveIds = new Set(drives.map((d) => d.id));
      applications = await findRecords('applications', (a) =>
        driveIds.has(a.driveId)
      );
    } else {
      applications = [];
    }

    return res.status(200).json({
      success: true,
      applications,
      data: applications,
    });
  } catch (err) {
    console.error('[Applications] List error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve applications.',
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/applications/:applicationId — get application details
// ---------------------------------------------------------------------------
router.get(
  '/:applicationId',
  validate({ params: applicationParamsSchema }),
  async (req, res) => {
    try {
      const application = await getApplicationById(req.params.applicationId);

      if (!application) {
        return res.status(404).json({
          success: false,
          error: 'Application not found.',
        });
      }

      const role = req.session.role;
      const userId = req.session.userId;

      // Authorization: student can see own, faculty can see drives they created, admin sees all
      if (role === 'student' && application.studentId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied.',
        });
      }

      if (role === 'faculty') {
        const drive = await findById('placement-drives', application.driveId);
        if (!drive || drive.creatorId !== userId) {
          return res.status(403).json({
            success: false,
            error: 'Access denied.',
          });
        }
      }

      return res.status(200).json({
        success: true,
        data: application,
      });
    } catch (err) {
      console.error('[Applications] Get error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve application.',
      });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/applications/:applicationId/status — update status
// ---------------------------------------------------------------------------
router.patch(
  '/:applicationId/status',
  authorize('faculty', 'admin'),
  validate({ params: applicationParamsSchema, body: statusUpdateSchema }),
  async (req, res) => {
    try {
      const application = await getApplicationById(req.params.applicationId);

      if (!application) {
        return res.status(404).json({
          success: false,
          error: 'Application not found.',
        });
      }

      // Faculty can only update applications for drives they created
      if (req.session.role === 'faculty') {
        const drive = await findById('placement-drives', application.driveId);
        if (!drive || drive.creatorId !== req.session.userId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to update this application.',
          });
        }
      }

      const updated = await updateApplicationStatus(
        req.params.applicationId,
        req.body.status,
        req.body.remarks
      );

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      console.error('[Applications] Status update error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to update application status.',
      });
    }
  }
);

export default router;
