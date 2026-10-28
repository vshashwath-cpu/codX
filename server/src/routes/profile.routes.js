import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  findOne,
  insertRecord,
  updateRecord,
} from '../storage/json-store.js';

const router = Router();

// All profile routes require authentication + student role
router.use(authenticate, authorize('student'));

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).trim().optional().default(''),
  rollNumber: z.string().max(30).trim().optional().default(''),
  degree: z.string().max(50).trim().optional().default(''),
  specialization: z.string().max(100).trim().optional().default(''),
  department: z.string().max(100).trim().optional().default(''),
  institution: z.string().max(200).trim().optional().default(''),
  graduationYear: z
    .union([z.number().int().min(2000).max(2100), z.string().transform(Number)])
    .optional(),
  cgpa: z
    .union([z.number().min(0).max(10), z.string().transform(Number)])
    .optional(),
  skills: z.array(z.string().trim()).optional().default([]),
  projects: z
    .array(
      z.object({
        title: z.string().trim(),
        description: z.string().trim().optional().default(''),
        technologies: z.array(z.string().trim()).optional().default([]),
        url: z.string().url().optional().or(z.literal('')).default(''),
      })
    )
    .optional()
    .default([]),
  internships: z
    .array(
      z.object({
        company: z.string().trim(),
        role: z.string().trim(),
        duration: z.string().trim().optional().default(''),
        description: z.string().trim().optional().default(''),
      })
    )
    .optional()
    .default([]),
  certifications: z.array(z.string().trim()).optional().default([]),
  achievements: z.array(z.string().trim()).optional().default([]),
  githubUrl: z.string().url().optional().or(z.literal('')).default(''),
  linkedinUrl: z.string().url().optional().or(z.literal('')).default(''),
  portfolioUrl: z.string().url().optional().or(z.literal('')).default(''),
});

// ---------------------------------------------------------------------------
// GET /api/profile — get current student's profile
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const profile = await findOne(
      'student-profiles',
      (p) => p.userId === req.session.userId
    );

    if (!profile) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (err) {
    console.error('[Profile] Get error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve profile.',
    });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/profile — create or update profile (upsert by userId)
// ---------------------------------------------------------------------------
router.put('/', validate({ body: profileSchema }), async (req, res) => {
  try {
    const userId = req.session.userId;
    const existing = await findOne(
      'student-profiles',
      (p) => p.userId === userId
    );

    if (existing) {
      // Update
      const updated = await updateRecord('student-profiles', existing.id, {
        ...req.body,
        userId,
      });

      return res.status(200).json({
        success: true,
        data: updated,
      });
    }

    // Create
    const profile = await insertRecord('student-profiles', {
      ...req.body,
      userId,
    });

    return res.status(201).json({
      success: true,
      data: profile,
    });
  } catch (err) {
    console.error('[Profile] Upsert error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to save profile.',
    });
  }
});

export default router;
