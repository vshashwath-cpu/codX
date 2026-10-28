import { findRecords, insertRecord, updateRecord, countRecords } from '../storage/json-store.js';

export async function createNotification({ recipientId, title, message, type = 'info' }) {
  return await insertRecord('notifications', {
    recipientId,
    title,
    message,
    type,
    read: false,
  });
}

export async function getNotificationsByUser(userId, { unreadOnly = false } = {}) {
  const records = await findRecords('notifications', (n) => {
    if (n.recipientId !== userId) return false;
    if (unreadOnly && n.read) return false;
    return true;
  });

  return records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function markAsRead(notificationId, userId) {
  const notif = await findRecords('notifications', (n) => n.id === notificationId && n.recipientId === userId);
  if (!notif.length) {
    throw Object.assign(new Error('Notification not found'), { status: 404 });
  }

  return await updateRecord('notifications', notificationId, { read: true });
}

export async function getUnreadCount(userId) {
  return await countRecords('notifications', (n) => n.recipientId === userId && !n.read);
}

export default { createNotification, getNotificationsByUser, markAsRead, getUnreadCount };
