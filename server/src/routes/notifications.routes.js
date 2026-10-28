import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  getNotificationsByUser,
  markAsRead,
  getUnreadCount,
} from '../services/notification.service.js';

const router = Router();

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const notificationParamsSchema = z.object({
  notificationId: z.string().uuid('Invalid notification ID'),
});

const listQuerySchema = z.object({
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .default('false'),
});

// All notification routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// GET /api/notifications — get user's notifications
// ---------------------------------------------------------------------------
router.get('/', validate({ query: listQuerySchema }), async (req, res) => {
  try {
    const notifications = await getNotificationsByUser(req.session.userId);

    let result = notifications;
    if (req.query.unreadOnly === 'true') {
      result = notifications.filter((n) => !n.read);
    }

    // Sort by most recent first
    result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('[Notifications] List error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve notifications.',
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/notifications/unread-count — get unread count
// ---------------------------------------------------------------------------
router.get('/unread-count', async (req, res) => {
  try {
    const count = await getUnreadCount(req.session.userId);

    return res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (err) {
    console.error('[Notifications] Unread count error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve unread count.',
    });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/notifications/:notificationId/read — mark as read
// ---------------------------------------------------------------------------
router.patch(
  '/:notificationId/read',
  validate({ params: notificationParamsSchema }),
  async (req, res) => {
    try {
      const notification = await markAsRead(
        req.params.notificationId,
        req.session.userId
      );

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found.',
        });
      }

      return res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (err) {
      console.error('[Notifications] Mark read error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to mark notification as read.',
      });
    }
  }
);

export default router;
