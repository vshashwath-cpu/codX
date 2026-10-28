/**
 * Notifications module — fetch, display, and mark read.
 */

import api from './api.js';
import { escapeHtml, formatRelativeTime, loadingSpinner, emptyState, showToast } from './ui.js';

export const notifications = {
  async init() {
    this.updateBadge();
    // Poll every 45s
    setInterval(() => this.updateBadge(), 45000);
  },

  async updateBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;

    try {
      const res = await api.getUnreadCount();
      if (res.success && res.unreadCount > 0) {
        badge.textContent = res.unreadCount > 99 ? '99+' : res.unreadCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    } catch { /* ignore offline */ }
  },

  async renderPage(container) {
    container.innerHTML = loadingSpinner('Loading notifications...');

    try {
      const res = await api.getNotifications();
      if (!res.success) {
        container.innerHTML = `<div class="error-banner">${escapeHtml(res.error)}</div>`;
        return;
      }

      const notifs = res.notifications || [];

      if (notifs.length === 0) {
        container.innerHTML = `
          <div class="page-header">
            <h1 class="page-title">Notifications</h1>
          </div>
          ${emptyState('No notifications yet', 'When you apply for drives or status changes occur, you will see notifications here.')}
        `;
        return;
      }

      const listHtml = notifs.map((n) => {
        const typeIcons = {
          drive: '📢',
          application: '📝',
          'status-change': '🔄',
          shortlist: '⭐',
          selection: '🎉',
          announcement: '📣',
          account: '👤',
        };

        return `
          <div class="notification-item ${n.read ? 'read' : 'unread'}" data-id="${n.id}">
            <div class="notif-icon">${typeIcons[n.type] || 'ℹ'}</div>
            <div class="notif-content">
              <div class="notif-title">${escapeHtml(n.title)}</div>
              <div class="notif-message">${escapeHtml(n.message)}</div>
              <div class="notif-time">${formatRelativeTime(n.createdAt)}</div>
            </div>
            ${!n.read ? `
              <button class="btn btn-sm btn-ghost mark-read-btn" data-id="${n.id}">
                Mark read
              </button>
            ` : ''}
          </div>
        `;
      }).join('');

      container.innerHTML = `
        <div class="page-header">
          <h1 class="page-title">Notifications</h1>
          <button class="btn btn-secondary btn-sm" id="mark-all-read-btn">Mark all as read</button>
        </div>
        <div class="notifications-list card">
          ${listHtml}
        </div>
      `;

      // Event listeners for marking read
      container.querySelectorAll('.mark-read-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          await api.markNotificationRead(id);
          const item = container.querySelector(`.notification-item[data-id="${id}"]`);
          if (item) {
            item.classList.remove('unread');
            item.classList.add('read');
            e.target.remove();
          }
          this.updateBadge();
        });
      });

      const markAllBtn = container.querySelector('#mark-all-read-btn');
      if (markAllBtn) {
        markAllBtn.addEventListener('click', async () => {
          for (const n of notifs.filter((x) => !x.read)) {
            await api.markNotificationRead(n.id);
          }
          showToast('All notifications marked as read', 'success');
          this.renderPage(container);
          this.updateBadge();
        });
      }
    } catch (err) {
      container.innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
    }
  },
};

export default notifications;
