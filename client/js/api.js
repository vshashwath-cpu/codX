/**
 * API client module for backend communication.
 * All requests include session credentials and standard headers.
 */

const BASE_URL = '';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const token = localStorage.getItem('cpg_token');
  const authHeaders = token
    ? { 'Authorization': `Bearer ${token}`, 'X-Session-Token': token }
    : {};

  const config = {
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
    ...options,
  };

  // If body is an object and not FormData, stringify it
  if (config.body && !(config.body instanceof FormData) && typeof config.body === 'object') {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);

    // Handle PDF/blob download
    if (response.headers.get('content-type')?.includes('application/pdf')) {
      const blob = await response.blob();
      return { success: true, data: blob };
    }

    // Handle CSV download
    if (response.headers.get('content-type')?.includes('text/csv')) {
      const text = await response.text();
      return { success: true, data: text };
    }

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/api/auth/login') && !endpoint.includes('/api/auth/register')) {
        localStorage.removeItem('cpg_token');
        localStorage.removeItem('cpg_user');
        if (typeof window !== 'undefined' && typeof window.__cpg_onAuthExpired === 'function') {
          window.__cpg_onAuthExpired();
        }
      }
      return {
        success: false,
        error: data.error || `Request failed (${response.status})`,
        status: response.status,
      };
    }

    return data;
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Network error. Please check your connection.',
      networkError: true,
    };
  }
}

export const api = {
  // Auth
  register: (userData) => request('/api/auth/register', { method: 'POST', body: userData }),
  login: (credentials) => request('/api/auth/login', { method: 'POST', body: credentials }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  getMe: () => request('/api/auth/me'),

  // Profile
  getProfile: () => request('/api/profile'),
  updateProfile: (profileData) => request('/api/profile', { method: 'PUT', body: profileData }),

  // Drives
  getDrives: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.department) query.set('department', params.department);
    if (params.status) query.set('status', params.status);
    if (params.minCGPA) query.set('minCGPA', params.minCGPA);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);
    const qs = query.toString();
    return request(`/api/drives${qs ? `?${qs}` : ''}`);
  },
  getDrive: (id) => request(`/api/drives/${id}`),
  createDrive: (driveData) => request('/api/drives', { method: 'POST', body: driveData }),
  updateDrive: (id, driveData) => request(`/api/drives/${id}`, { method: 'PUT', body: driveData }),
  updateDriveStatus: (id, status) => request(`/api/drives/${id}/status`, { method: 'PATCH', body: { status } }),
  checkEligibility: (id) => request(`/api/drives/${id}/eligibility`),

  // Applications
  applyForDrive: (driveId, idempotencyKey) => request(`/api/drives/${driveId}/apply`, {
    method: 'POST',
    body: { idempotencyKey },
  }),
  getApplications: () => request('/api/applications'),
  getApplication: (id) => request(`/api/applications/${id}`),
  updateApplicationStatus: (id, status, remarks) => request(`/api/applications/${id}/status`, {
    method: 'PATCH',
    body: { status, remarks },
  }),

  // Resumes
  getResumes: () => request('/api/resumes'),
  getResume: (id) => request(`/api/resumes/${id}`),
  createResume: (data) => request('/api/resumes', { method: 'POST', body: data }),
  updateResume: (id, data) => request(`/api/resumes/${id}`, { method: 'PUT', body: data }),
  deleteResume: (id) => request(`/api/resumes/${id}`, { method: 'DELETE' }),
  downloadResumePDF: (id) => request(`/api/resumes/${id}/download`, { method: 'POST' }),
  uploadResumePDF: (formData) => request('/api/resumes/upload', { method: 'POST', body: formData }),
  analyzeResume: (data) => request('/api/resumes/analyze', { method: 'POST', body: data }),

  // Notifications
  getNotifications: (unreadOnly = false) => request(`/api/notifications${unreadOnly ? '?unreadOnly=true' : ''}`),
  markNotificationRead: (id) => request(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  getUnreadCount: () => request('/api/notifications/unread-count'),

  // Dashboards & Reports
  getStudentDashboard: () => request('/api/dashboard/student'),
  getFacultyDashboard: () => request('/api/dashboard/faculty'),
  getAdminDashboard: () => request('/api/dashboard/admin'),
  getPlacementReport: () => request('/api/reports/placements'),
  exportPlacementCSV: () => request('/api/reports/placements/export'),

  // Admin
  getUsers: () => request('/api/admin/users'),
  updateUserRole: (userId, role) => request(`/api/admin/users/${userId}/role`, { method: 'PATCH', body: { role } }),
  updateUserStatus: (userId, status) => request(`/api/admin/users/${userId}/status`, { method: 'PATCH', body: { status } }),
  getFacultyRequests: () => request('/api/admin/faculty-requests'),
  handleFacultyRequest: (userId, action) => request(`/api/admin/faculty-requests/${userId}`, { method: 'PATCH', body: { action } }),
  getAuditLogs: () => request('/api/admin/audit-logs'),

  // Sync
  syncOperations: (operations) => request('/api/sync', { method: 'POST', body: { operations } }),
  getSyncStatus: () => request('/api/sync/status'),
};

export default api;
