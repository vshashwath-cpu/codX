import { Router } from 'express';
import { z } from 'zod';
import fs from 'fs/promises';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { uploadResume } from '../middleware/upload.js';
import { findById } from '../storage/json-store.js';
import {
  createResume,
  getResumesByUser,
  getResumeById,
  updateResume,
  deleteResume,
} from '../services/resume.service.js';
import { generateResumePDF } from '../services/pdf.service.js';
import { analyzeResume } from '../services/ai-analysis.service.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const router = Router();

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const resumeParamsSchema = z.object({
  resumeId: z.string().uuid('Invalid resume ID'),
});

const createResumeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim(),
  template: z.string().max(50).trim().optional().default('default'),
  personalInfo: z
    .object({
      name: z.string().trim().optional().default(''),
      email: z.string().trim().optional().default(''),
      phone: z.string().trim().optional().default(''),
      address: z.string().trim().optional().default(''),
      linkedinUrl: z.string().trim().optional().default(''),
      githubUrl: z.string().trim().optional().default(''),
      portfolioUrl: z.string().trim().optional().default(''),
    })
    .optional()
    .default({}),
  objective: z.string().trim().optional().default(''),
  education: z
    .array(
      z.object({
        institution: z.string().trim().optional().default(''),
        degree: z.string().trim().optional().default(''),
        fieldOfStudy: z.string().trim().optional().default(''),
        startDate: z.string().optional().default(''),
        endDate: z.string().optional().default(''),
        cgpa: z.string().trim().optional().default(''),
      })
    )
    .optional()
    .default([]),
  experience: z
    .array(
      z.object({
        company: z.string().trim().optional().default(''),
        position: z.string().trim().optional().default(''),
        startDate: z.string().optional().default(''),
        endDate: z.string().optional().default(''),
        description: z.string().trim().optional().default(''),
      })
    )
    .optional()
    .default([]),
  skills: z.array(z.string().trim()).optional().default([]),
  projects: z
    .array(
      z.object({
        title: z.string().trim().optional().default(''),
        description: z.string().trim().optional().default(''),
        technologies: z.array(z.string().trim()).optional().default([]),
        url: z.string().trim().optional().default(''),
      })
    )
    .optional()
    .default([]),
  certifications: z.array(z.string().trim()).optional().default([]),
  achievements: z.array(z.string().trim()).optional().default([]),
  customSections: z
    .array(
      z.object({
        title: z.string().trim(),
        content: z.string().trim(),
      })
    )
    .optional()
    .default([]),
});

const updateResumeSchema = createResumeSchema.partial();

const analyzeSchema = z.object({
  resumeId: z.string().uuid().optional(),
  uploadedText: z.string().max(50000).optional(),
  jobDescription: z.string().max(10000).optional(),
});

// All resume routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// GET /api/resumes — list user's resumes
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const resumes = await getResumesByUser(req.session.userId);

    return res.status(200).json({
      success: true,
      data: resumes,
    });
  } catch (err) {
    console.error('[Resumes] List error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve resumes.',
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/resumes — create new resume
// ---------------------------------------------------------------------------
router.post(
  '/',
  validate({ body: createResumeSchema }),
  async (req, res) => {
    try {
      const resume = await createResume({
        ...req.body,
        userId: req.session.userId,
      });

      return res.status(201).json({
        success: true,
        data: resume,
      });
    } catch (err) {
      console.error('[Resumes] Create error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to create resume.',
      });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/resumes/:resumeId — get resume (owner or faculty/admin reviewing)
// ---------------------------------------------------------------------------
router.get(
  '/:resumeId',
  validate({ params: resumeParamsSchema }),
  async (req, res) => {
    try {
      const resume = await getResumeById(req.params.resumeId);

      if (!resume) {
        return res.status(404).json({
          success: false,
          error: 'Resume not found.',
        });
      }

      // Owner can always see; faculty/admin can view for review purposes
      if (
        resume.userId !== req.session.userId &&
        req.session.role === 'student'
      ) {
        return res.status(403).json({
          success: false,
          error: 'Access denied.',
        });
      }

      return res.status(200).json({
        success: true,
        data: resume,
      });
    } catch (err) {
      console.error('[Resumes] Get error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve resume.',
      });
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/resumes/:resumeId — update resume (owner only)
// ---------------------------------------------------------------------------
router.put(
  '/:resumeId',
  validate({ params: resumeParamsSchema, body: updateResumeSchema }),
  async (req, res) => {
    try {
      const resume = await getResumeById(req.params.resumeId);

      if (!resume) {
        return res.status(404).json({
          success: false,
          error: 'Resume not found.',
        });
      }

      if (resume.userId !== req.session.userId) {
        return res.status(403).json({
          success: false,
          error: 'You can only update your own resumes.',
        });
      }

      const updated = await updateResume(req.params.resumeId, req.body);

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      console.error('[Resumes] Update error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to update resume.',
      });
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/resumes/:resumeId — delete resume (owner only)
// ---------------------------------------------------------------------------
router.delete(
  '/:resumeId',
  validate({ params: resumeParamsSchema }),
  async (req, res) => {
    try {
      const resume = await getResumeById(req.params.resumeId);

      if (!resume) {
        return res.status(404).json({
          success: false,
          error: 'Resume not found.',
        });
      }

      if (resume.userId !== req.session.userId) {
        return res.status(403).json({
          success: false,
          error: 'You can only delete your own resumes.',
        });
      }

      await deleteResume(req.params.resumeId);

      return res.status(200).json({
        success: true,
        data: { message: 'Resume deleted successfully.' },
      });
    } catch (err) {
      console.error('[Resumes] Delete error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete resume.',
      });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/resumes/:resumeId/download — generate and download PDF
// ---------------------------------------------------------------------------
router.post(
  '/:resumeId/download',
  validate({ params: resumeParamsSchema }),
  async (req, res) => {
    try {
      const resume = await getResumeById(req.params.resumeId);

      if (!resume) {
        return res.status(404).json({
          success: false,
          error: 'Resume not found.',
        });
      }

      // Owner or faculty/admin can download
      if (
        resume.userId !== req.session.userId &&
        req.session.role === 'student'
      ) {
        return res.status(403).json({
          success: false,
          error: 'Access denied.',
        });
      }

      const pdfBuffer = await generateResumePDF(
        resume,
        resume.template || 'default'
      );

      const filename = `resume-${resume.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );
      res.setHeader('Content-Length', pdfBuffer.length);

      return res.send(pdfBuffer);
    } catch (err) {
      console.error('[Resumes] Download error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate PDF.',
      });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/resumes/upload — upload PDF resume
// ---------------------------------------------------------------------------
router.post(
  '/upload',
  uploadResume.single('resume'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No PDF file uploaded.',
        });
      }

      // Extract text from PDF
      const fileBuffer = await fs.readFile(req.file.path);
      let extractedText = '';
      try {
        const pdfData = await pdfParse(fileBuffer);
        extractedText = pdfData.text || '';
      } catch {
        // PDF parsing may fail for scanned/image PDFs
        extractedText = '';
      }

      // Save resume record
      const resume = await createResume({
        userId: req.session.userId,
        title: req.file.originalname.replace(/\.pdf$/i, ''),
        template: 'uploaded',
        uploadedFilePath: req.file.path,
        uploadedFileName: req.file.originalname,
        extractedText,
      });

      return res.status(201).json({
        success: true,
        data: resume,
      });
    } catch (err) {
      console.error('[Resumes] Upload error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload resume.',
      });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/resumes/analyze — AI resume analysis
// ---------------------------------------------------------------------------
router.post(
  '/analyze',
  validate({ body: analyzeSchema }),
  async (req, res) => {
    try {
      const { resumeId, uploadedText, jobDescription } = req.body;

      let resumeText = uploadedText || '';

      // If resumeId provided, extract text from the saved resume
      if (resumeId && !resumeText) {
        const resume = await getResumeById(resumeId);
        if (!resume) {
          return res.status(404).json({
            success: false,
            error: 'Resume not found.',
          });
        }

        // Only owner can analyze their own resume
        if (resume.userId !== req.session.userId) {
          return res.status(403).json({
            success: false,
            error: 'Access denied.',
          });
        }

        // Try extracted text first, then uploaded file
        if (resume.extractedText) {
          resumeText = resume.extractedText;
        } else if (resume.uploadedFilePath) {
          try {
            const fileBuffer = await fs.readFile(resume.uploadedFilePath);
            const pdfData = await pdfParse(fileBuffer);
            resumeText = pdfData.text || '';
          } catch {
            // Fallback: build text from structured resume data
            resumeText = buildResumeText(resume);
          }
        } else {
          // Build text from structured resume data
          resumeText = buildResumeText(resume);
        }
      }

      if (!resumeText.trim()) {
        return res.status(400).json({
          success: false,
          error: 'No resume text available for analysis. Provide resumeId or uploadedText.',
        });
      }

      const analysis = await analyzeResume(resumeText, jobDescription || '');

      return res.status(200).json({
        success: true,
        data: analysis,
      });
    } catch (err) {
      console.error('[Resumes] Analyze error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to analyze resume.',
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Helper: build plain text from structured resume data
// ---------------------------------------------------------------------------
function buildResumeText(resume) {
  const parts = [];

  if (resume.personalInfo?.name) parts.push(`Name: ${resume.personalInfo.name}`);
  if (resume.personalInfo?.email) parts.push(`Email: ${resume.personalInfo.email}`);
  if (resume.objective) parts.push(`Objective: ${resume.objective}`);

  if (resume.education?.length) {
    parts.push('Education:');
    for (const edu of resume.education) {
      parts.push(
        `  - ${edu.degree} in ${edu.fieldOfStudy} from ${edu.institution} (${edu.startDate} - ${edu.endDate}) CGPA: ${edu.cgpa}`
      );
    }
  }

  if (resume.experience?.length) {
    parts.push('Experience:');
    for (const exp of resume.experience) {
      parts.push(
        `  - ${exp.position} at ${exp.company} (${exp.startDate} - ${exp.endDate}): ${exp.description}`
      );
    }
  }

  if (resume.skills?.length) {
    parts.push(`Skills: ${resume.skills.join(', ')}`);
  }

  if (resume.projects?.length) {
    parts.push('Projects:');
    for (const proj of resume.projects) {
      parts.push(
        `  - ${proj.title}: ${proj.description} [${proj.technologies?.join(', ')}]`
      );
    }
  }

  if (resume.certifications?.length) {
    parts.push(`Certifications: ${resume.certifications.join(', ')}`);
  }

  if (resume.achievements?.length) {
    parts.push(`Achievements: ${resume.achievements.join(', ')}`);
  }

  return parts.join('\n');
}

export default router;
