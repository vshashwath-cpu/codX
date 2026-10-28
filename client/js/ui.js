/**
 * UI utility functions: routing, modals, toasts, formatting, helpers.
 */

// Escape HTML to prevent XSS
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// Format date to human readable
export function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

// Format relative time (e.g., "2 hours ago")
export function formatRelativeTime(isoString) {
  if (!isoString) return '';
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(isoString);
  } catch {
    return '';
  }
}

// Format currency
export function formatCurrency(amount) {
  if (!amount) return '—';
  if (typeof amount === 'string') return amount;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

// Render status badge HTML
export function statusBadge(status) {
  const map = {
    'applied': { label: 'Applied', class: 'badge-applied' },
    'under-review': { label: 'Under Review', class: 'badge-under-review' },
    'shortlisted': { label: 'Shortlisted', class: 'badge-shortlisted' },
    'selected': { label: 'Selected', class: 'badge-selected' },
    'rejected': { label: 'Rejected', class: 'badge-rejected' },
    'offered': { label: 'Offered', class: 'badge-offered' },
    'draft': { label: 'Draft', class: 'badge-gray' },
    'published': { label: 'Published', class: 'badge-active' },
    'closed': { label: 'Closed', class: 'badge-danger' },
    'archived': { label: 'Archived', class: 'badge-gray' },
    'pending': { label: 'Pending Approval', class: 'badge-warning' },
    'active': { label: 'Active', class: 'badge-active' },
    'suspended': { label: 'Suspended', class: 'badge-danger' },
  };

  const info = map[status] || { label: status, class: 'badge-gray' };
  return `<span class="badge ${info.class}">${escapeHtml(info.label)}</span>`;
}

// Toast notification
export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ'}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

  container.appendChild(toast);

  // Auto remove after 4.5s
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// Generic Modal Dialog
export function showModal({ title, content, actions = [] }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';

  const actionButtons = actions.map((act) => {
    return `<button class="btn btn-${act.variant || 'primary'}" id="modal-btn-${act.id}">${escapeHtml(act.label)}</button>`;
  }).join(' ');

  overlay.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h3 class="modal-title">${escapeHtml(title)}</h3>
        <button class="modal-close" id="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body">${content}</div>
      ${actions.length > 0 ? `<div class="modal-footer">${actionButtons}</div>` : ''}
    </div>
  `;

  document.body.appendChild(overlay);

  // Close handler
  const closeModal = () => overlay.remove();
  overlay.querySelector('#modal-close-btn').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Action handlers
  actions.forEach((act) => {
    const btn = overlay.querySelector(`#modal-btn-${act.id}`);
    if (btn) {
      btn.addEventListener('click', () => {
        if (act.onClick) act.onClick(closeModal);
        else closeModal();
      });
    }
  });

  return closeModal;
}

// Confirmation Dialog
export function confirmDialog(message, title = 'Confirm Action') {
  return new Promise((resolve) => {
    showModal({
      title,
      content: `<p class="confirm-message">${escapeHtml(message)}</p>`,
      actions: [
        { id: 'cancel', label: 'Cancel', variant: 'secondary', onClick: (close) => { close(); resolve(false); } },
        { id: 'confirm', label: 'Confirm', variant: 'danger', onClick: (close) => { close(); resolve(true); } },
      ],
    });
  });
}

// Loading Spinner HTML
export function loadingSpinner(message = 'Loading...') {
  return `
    <div class="loading-state">
      <div class="spinner"></div>
      <p class="loading-text">${escapeHtml(message)}</p>
    </div>
  `;
}

// Empty State HTML
export function emptyState(title, description = '', actionButton = '') {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">📋</div>
      <h3 class="empty-state-title">${escapeHtml(title)}</h3>
      ${description ? `<p class="empty-state-desc">${escapeHtml(description)}</p>` : ''}
      ${actionButton ? `<div class="empty-state-action">${actionButton}</div>` : ''}
    </div>
  `;
}

// Debounce helper
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export default {
  escapeHtml,
  formatDate,
  formatRelativeTime,
  formatCurrency,
  statusBadge,
  showToast,
  showModal,
  confirmDialog,
  loadingSpinner,
  emptyState,
  debounce,
};
