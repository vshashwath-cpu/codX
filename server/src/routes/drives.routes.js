import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  findById,
  findRecords,
  insertRecord,
  updateRecord,
  readCollection,
} from '../storage/json-store.js';
import { checkEligibility } from '../services/eligibility.service.js';

const router = Router();

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const createDriveSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200).trim(),
  jobTitle: z.string().min(1, 'Job title is required').max(200).trim(),
  jobDescription: z.string().min(1, 'Job description is required').trim(),
  requiredSkills: z.array(z.string().trim()).optional().default([]),
  minCGPA: z
    .union([z.number().min(0).max(10), z.string().transform(Number)])
    .optional()
    .default(0),
  eligibleDepartments: z.array(z.string().trim()).optional().default([]),
  eligibleGraduationYears: z
    .array(z.union([z.number().int(), z.string().transform(Number)]))
    .optional()
    .default([]),
  eligibleDegrees: z.array(z.string().trim()).optional().default([]),
  location: z.string().max(200).trim().optional().default(''),
  salary: z.string().max(100).trim().optional().default(''),
  applicationDeadline: z.string().optional().default(''),
  selectionProcess: z.string().trim().optional().default(''),
  openings: z
    .union([z.number().int().min(0), z.string().transform(Number)])
    .optional()
    .default(0),
  status: z
    .enum(['draft', 'published', 'closed', 'archived'])
    .optional()
    .default('draft'),
});

const updateDriveSchema = createDriveSchema.partial();

const statusSchema = z.object({
  status: z.enum(['draft', 'published', 'closed', 'archived'], {
    errorMap: () => ({
      message: 'Status must be draft, published, closed, or archived',
    }),
  }),
});

const driveParamsSchema = z.object({
  driveId: z.string().uuid('Invalid drive ID'),
});

const listQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  department: z.string().optional(),
  minCGPA: z.string().optional(),
  sortBy: z
    .enum([
      'companyName',
      'jobTitle',
      'applicationDeadline',
      'createdAt',
      'salary',
    ])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
});

// All drive routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// GET /api/drives — list drives
// ---------------------------------------------------------------------------
router.get('/', validate({ query: listQuerySchema }), async (req, res) => {
  try {
    const {
      search,
      status,
      department,
      minCGPA,
      sortBy,
      sortOrder,
      page,
      limit,
    } = req.query;

    let drives = await readCollection('placement-drives');

    // Students can only see published drives
    if (req.session.role === 'student') {
      drives = drives.filter((d) => d.status === 'published');
    } else if (status) {
      // Faculty/admin can filter by status
      drives = drives.filter((d) => d.status === status);
    }

    // Search across company name, job title, description
    if (search) {
      const term = search.toLowerCase();
      drives = drives.filter(
        (d) =>
          d.companyName?.toLowerCase().includes(term) ||
          d.jobTitle?.toLowerCase().includes(term) ||
          d.jobDescription?.toLowerCase().includes(term)
      );
    }

    // Filter by department
    if (department) {
      const dept = department.toLowerCase();
      drives = drives.filter(
        (d) =>
          !d.eligibleDepartments ||
          d.eligibleDepartments.length === 0 ||
          d.eligibleDepartments.some(
            (ed) => ed.toLowerCase() === dept
          )
      );
    }

    // Filter by minimum CGPA
    if (minCGPA) {
      const cgpa = parseFloat(minCGPA);
      if (!isNaN(cgpa)) {
        drives = drives.filter(
          (d) => !d.minCGPA || d.minCGPA <= cgpa
        );
      }
    }

    // Sort
    drives.sort((a, b) => {
      const valA = a[sortBy] ?? '';
      const valB = b[sortBy] ?? '';
      const cmp = String(valA).localeCompare(String(valB), undefined, {
        numeric: true,
      });
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const total = drives.length;
    const totalPages = Math.ceil(total / limitNum);
    const offset = (pageNum - 1) * limitNum;
    const paginatedDrives = drives.slice(offset, offset + limitNum);

    return res.status(200).json({
      success: true,
      data: paginatedDrives,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error('[Drives] List error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve drives.',
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/drives/:driveId — get single drive
// ---------------------------------------------------------------------------
router.get(
  '/:driveId',
  validate({ params: driveParamsSchema }),
  async (req, res) => {
    try {
      const drive = await findById('placement-drives', req.params.driveId);

      if (!drive) {
        return res.status(404).json({
          success: false,
          error: 'Drive not found.',
        });
      }

      // Students can only see published drives
      if (req.session.role === 'student' && drive.status !== 'published') {
        return res.status(404).json({
          success: false,
          error: 'Drive not found.',
        });
      }

      return res.status(200).json({
        success: true,
        data: drive,
      });
    } catch (err) {
      console.error('[Drives] Get error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve drive.',
      });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/drives — create drive (faculty/admin only)
// ---------------------------------------------------------------------------
router.post(
  '/',
  authorize('faculty', 'admin'),
  validate({ body: createDriveSchema }),
  async (req, res) => {
    try {
      const drive = await insertRecord('placement-drives', {
        ...req.body,
        creatorId: req.session.userId,
      });

      return res.status(201).json({
        success: true,
        data: drive,
      });
    } catch (err) {
      console.error('[Drives] Create error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to create drive.',
      });
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/drives/:driveId — update drive (creator or admin only)
// ---------------------------------------------------------------------------
router.put(
  '/:driveId',
  authorize('faculty', 'admin'),
  validate({ params: driveParamsSchema, body: updateDriveSchema }),
  async (req, res) => {
    try {
      const drive = await findById('placement-drives', req.params.driveId);

      if (!drive) {
        return res.status(404).json({
          success: false,
          error: 'Drive not found.',
        });
      }

      // Only creator or admin can update
      if (
        drive.creatorId !== req.session.userId &&
        req.session.role !== 'admin'
      ) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to update this drive.',
        });
      }

      const updated = await updateRecord(
        'placement-drives',
        req.params.driveId,
        req.body
      );

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      console.error('[Drives] Update error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to update drive.',
      });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/drives/:driveId/status — change drive status (faculty/admin)
// ---------------------------------------------------------------------------
router.patch(
  '/:driveId/status',
  authorize('faculty', 'admin'),
  validate({ params: driveParamsSchema, body: statusSchema }),
  async (req, res) => {
    try {
      const drive = await findById('placement-drives', req.params.driveId);

      if (!drive) {
        return res.status(404).json({
          success: false,
          error: 'Drive not found.',
        });
      }

      // Only creator or admin can change status
      if (
        drive.creatorId !== req.session.userId &&
        req.session.role !== 'admin'
      ) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to change this drive status.',
        });
      }

      const updated = await updateRecord(
        'placement-drives',
        req.params.driveId,
        { status: req.body.status }
      );

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      console.error('[Drives] Status update error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to update drive status.',
      });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/drives/:driveId/eligibility — check eligibility (student)
// ---------------------------------------------------------------------------
router.get(
  '/:driveId/eligibility',
  authorize('student'),
  validate({ params: driveParamsSchema }),
  async (req, res) => {
    try {
      const result = await checkEligibility(
        req.session.userId,
        req.params.driveId
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error('[Drives] Eligibility check error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to check eligibility.',
      });
    }
  }
);

export default router;
