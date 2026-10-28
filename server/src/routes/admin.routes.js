import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  readCollection,
  findById,
  updateRecord,
  findRecords,
  insertRecord,
} from '../storage/json-store.js';
import { createNotification } from '../services/notification.service.js';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'));

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const userParamsSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

const roleUpdateSchema = z.object({
  role: z.enum(['student', 'faculty', 'admin'], {
    errorMap: () => ({ message: 'Role must be student, faculty, or admin' }),
  }),
});

const statusUpdateSchema = z.object({
  status: z.enum(['active', 'deactivated', 'suspended'], {
    errorMap: () => ({
      message: 'Status must be active, deactivated, or suspended',
    }),
  }),
});

const facultyRequestActionSchema = z.object({
  action: z.enum(['approve', 'reject'], {
    errorMap: () => ({ message: 'Action must be approve or reject' }),
  }),
  reason: z.string().max(500).trim().optional().default(''),
});

// ---------------------------------------------------------------------------
// GET /api/admin/users — list all users
// ---------------------------------------------------------------------------
router.get('/users', async (req, res) => {
  try {
    const users = await readCollection('users');

    // Strip password hashes
    const safeUsers = users.map(({ password, ...user }) => user);

    return res.status(200).json({
      success: true,
      data: safeUsers,
    });
  } catch (err) {
    console.error('[Admin] List users error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve users.',
    });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:userId/role — change user role
// ---------------------------------------------------------------------------
router.patch(
  '/users/:userId/role',
  validate({ params: userParamsSchema, body: roleUpdateSchema }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      // Cannot self-demote
      if (userId === req.session.userId) {
        return res.status(400).json({
          success: false,
          error: 'You cannot change your own role.',
        });
      }

      const user = await findById('users', userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found.',
        });
      }

      const updated = await updateRecord('users', userId, { role });

      // Log audit action
      await insertRecord('audit-logs', {
        action: 'role-change',
        performedBy: req.session.userId,
        targetUserId: userId,
        previousValue: user.role,
        newValue: role,
        details: `Role changed from ${user.role} to ${role}`,
      });

      const { password: _pw, ...safeUser } = updated;

      return res.status(200).json({
        success: true,
        data: safeUser,
      });
    } catch (err) {
      console.error('[Admin] Role update error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to update user role.',
      });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:userId/status — activate/deactivate/suspend
// ---------------------------------------------------------------------------
router.patch(
  '/users/:userId/status',
  validate({ params: userParamsSchema, body: statusUpdateSchema }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { status } = req.body;

      // Cannot change own status
      if (userId === req.session.userId) {
        return res.status(400).json({
          success: false,
          error: 'You cannot change your own account status.',
        });
      }

      const user = await findById('users', userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found.',
        });
      }

      const updated = await updateRecord('users', userId, { status });

      // Log audit action
      await insertRecord('audit-logs', {
        action: 'status-change',
        performedBy: req.session.userId,
        targetUserId: userId,
        previousValue: user.status,
        newValue: status,
        details: `Account status changed from ${user.status} to ${status}`,
      });

      // Notify the affected user
      await createNotification({
        userId,
        type: 'account-status',
        title: 'Account Status Updated',
        message: `Your account has been ${status}.`,
      });

      const { password: _pw, ...safeUser } = updated;

      return res.status(200).json({
        success: true,
        data: safeUser,
      });
    } catch (err) {
      console.error('[Admin] Status update error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to update user status.',
      });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/admin/faculty-requests — list pending faculty requests
// ---------------------------------------------------------------------------
router.get('/faculty-requests', async (req, res) => {
  try {
    const pendingFaculty = await findRecords(
      'users',
      (u) => u.role === 'faculty' && u.status === 'pending'
    );

    // Strip password hashes
    const safeUsers = pendingFaculty.map(({ password, ...user }) => user);

    return res.status(200).json({
      success: true,
      data: safeUsers,
    });
  } catch (err) {
    console.error('[Admin] Faculty requests error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve faculty requests.',
    });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/faculty-requests/:userId — approve/reject faculty
// ---------------------------------------------------------------------------
router.patch(
  '/faculty-requests/:userId',
  validate({ params: userParamsSchema, body: facultyRequestActionSchema }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { action, reason } = req.body;

      const user = await findById('users', userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found.',
        });
      }

      if (user.role !== 'faculty' || user.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'This user does not have a pending faculty request.',
        });
      }

      const newStatus = action === 'approve' ? 'active' : 'rejected';
      const updated = await updateRecord('users', userId, {
        status: newStatus,
      });

      // Log audit action
      await insertRecord('audit-logs', {
        action: `faculty-${action}`,
        performedBy: req.session.userId,
        targetUserId: userId,
        details: `Faculty request ${action}ed${reason ? `: ${reason}` : ''}`,
      });

      // Notify the faculty member
      const notificationTitle =
        action === 'approve'
          ? 'Faculty Account Approved'
          : 'Faculty Account Rejected';
      const notificationMessage =
        action === 'approve'
          ? 'Your faculty account has been approved. You can now log in and manage placement drives.'
          : `Your faculty account request has been rejected.${reason ? ` Reason: ${reason}` : ''}`;

      await createNotification({
        userId,
        type: 'faculty-request-response',
        title: notificationTitle,
        message: notificationMessage,
      });

      const { password: _pw, ...safeUser } = updated;

      return res.status(200).json({
        success: true,
        data: safeUser,
      });
    } catch (err) {
      console.error('[Admin] Faculty request action error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to process faculty request.',
      });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/admin/audit-logs — view audit logs
// ---------------------------------------------------------------------------
router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await readCollection('audit-logs');

    // Sort by most recent first
    logs.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (err) {
    console.error('[Admin] Audit logs error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit logs.',
    });
  }
});

export default router;
