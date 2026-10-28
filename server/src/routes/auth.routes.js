import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  findOne,
  insertRecord,
  findRecords,
  findById,
} from '../storage/json-store.js';
import { createNotification } from '../services/notification.service.js';

const router = Router();

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const registerSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters'),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim(),
  role: z.enum(['student', 'faculty'], {
    errorMap: () => ({ message: 'Role must be student or faculty' }),
  }),
});

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
router.post(
  '/register',
  validate({ body: registerSchema }),
  async (req, res) => {
    try {
      const { email, password, name, role } = req.body;

      // Check duplicate email (case-insensitive)
      const existing = await findOne(
        'users',
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'An account with this email already exists.',
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Faculty must be approved; students are active immediately
      const status = role === 'faculty' ? 'pending' : 'active';

      const user = await insertRecord('users', {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name: name.trim(),
        role,
        status,
      });

      // If faculty registration, notify all admins
      if (role === 'faculty') {
        const admins = await findRecords('users', (u) => u.role === 'admin');
        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            type: 'faculty-request',
            title: 'New Faculty Registration Request',
            message: `${name} (${email}) has requested faculty access and is awaiting approval.`,
            relatedId: user.id,
          });
        }
      }

      // Strip password from response
      const { password: _pw, ...safeUser } = user;

      return res.status(201).json({
        success: true,
        user: safeUser,
        data: safeUser,
      });
    } catch (err) {
      console.error('[Auth] Register error:', err);
      return res.status(500).json({
        success: false,
        error: 'Registration failed. Please try again.',
      });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
router.post('/login', validate({ body: loginSchema }), async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await findOne(
      'users',
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    // Check account status
    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        error:
          'Your faculty account is pending approval. Please contact an administrator.',
      });
    }

    if (user.status === 'suspended' || user.status === 'deactivated') {
      return res.status(403).json({
        success: false,
        error:
          'Your account has been suspended or deactivated. Please contact an administrator.',
      });
    }

    // Set session
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.email = user.email;

    const { password: _pw, ...safeUser } = user;

    return res.status(200).json({
      success: true,
      user: safeUser,
      data: safeUser,
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.',
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('[Auth] Logout error:', err);
      return res.status(500).json({
        success: false,
        error: 'Logout failed.',
      });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully.' },
    });
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await findById('users', req.session.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.',
      });
    }

    const { password: _pw, ...safeUser } = user;

    return res.status(200).json({
      success: true,
      user: safeUser,
      data: safeUser,
    });
  } catch (err) {
    console.error('[Auth] Me error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve user information.',
    });
  }
});

export default router;
