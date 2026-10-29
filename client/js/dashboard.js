/**
 * Dashboard views for Student, Faculty, and Admin roles.
 */

import api from './api.js';
import auth from './auth.js';
import { escapeHtml, loadingSpinner, statusBadge, formatDate } from './ui.js';

export const dashboard = {
  async render(container) {
    const user = auth.getUser();
    if (!user) {
      window.location.hash = '#login';
      return;
    }

    container.innerHTML = loadingSpinner('Loading dashboard...');

    switch (user.role) {
      case 'student':
        await this.renderStudent(container);
        break;
      case 'faculty':
        await this.renderFaculty(container);
        break;
      case 'admin':
        await this.renderAdmin(container);
        break;
      default:
        container.innerHTML = `<div class="error-banner">Unknown user role</div>`;
    }
  },

  async renderStudent(container) {
    try {
      const res = await api.getStudentDashboard();
      if (!res.success) {
        if (res.status === 401) {
          auth.logout();
          return;
        }
        container.innerHTML = `<div class="error-banner">${escapeHtml(res.error)}</div>`;
        return;
      }

      const d = res.data;
      const completionPercent = d.profileCompletion || 0;

      container.innerHTML = `
        <div class="page-header">
          <div>
            <h1 class="page-title">Welcome back, ${escapeHtml(auth.getUser().name)}</h1>
            <p class="page-subtitle">Track your placement journey, eligible opportunities, and application statuses.</p>
          </div>
        </div>

        <!-- Profile Completion Card -->
        <div class="card mb-6">
          <div class="profile-completion-header">
            <div>
              <h3 class="card-title">Profile Completion: ${completionPercent}%</h3>
              <p class="text-muted text-sm">${completionPercent < 80 ? 'Complete your profile to unlock all placement opportunities.' : 'Great job! Your profile is well completed.'}</p>
            </div>
            <a href="#profile" class="btn btn-sm btn-primary">Edit Profile</a>
          </div>
          <div class="progress-bar-bg mt-3">
            <div class="progress-bar-fill" style="width: ${completionPercent}%"></div>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="stats-grid mb-6">
          <div class="stat-card">
            <div class="stat-icon bg-blue-100 text-blue-600">🏢</div>
            <div class="stat-content">
              <div class="stat-value">${d.availableDrives || 0}</div>
              <div class="stat-label">Active Drives</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon bg-green-100 text-green-600">🎯</div>
            <div class="stat-content">
              <div class="stat-value">${d.eligibleDrives || 0}</div>
              <div class="stat-label">Eligible Opportunities</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon bg-indigo-100 text-indigo-600">📝</div>
            <div class="stat-content">
              <div class="stat-value">${d.applicationsSummary?.total || 0}</div>
              <div class="stat-label">Applications Submitted</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon bg-purple-100 text-purple-600">⭐</div>
            <div class="stat-content">
              <div class="stat-value">${d.applicationsSummary?.shortlisted || 0}</div>
              <div class="stat-label">Shortlisted</div>
            </div>
          </div>
        </div>

        <div class="grid-2-col gap-6">
          <!-- Recent Applications -->
          <div class="card">
            <div class="card-header flex justify-between items-center">
              <h3 class="card-title">My Recent Applications</h3>
              <a href="#applications" class="btn btn-sm btn-ghost">View All</a>
            </div>
            ${(d.recentApplications && d.recentApplications.length > 0) ? `
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Role</th>
                      <th>Applied</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${d.recentApplications.map((app) => `
                      <tr>
                        <td><strong>${escapeHtml(app.companyName)}</strong></td>
                        <td>${escapeHtml(app.jobTitle)}</td>
                        <td>${formatDate(app.appliedAt)}</td>
                        <td>${statusBadge(app.status)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : `
              <div class="p-6 text-center text-muted">
                <p>No applications yet.</p>
                <a href="#drives" class="btn btn-sm btn-primary mt-3">Browse Drives</a>
              </div>
            `}
          </div>

          <!-- Quick Actions / Next Steps -->
          <div class="card">
            <h3 class="card-title mb-4">Quick Actions</h3>
            <div class="quick-actions-list">
              <a href="#drives" class="action-card">
                <span class="action-icon">🔍</span>
                <div>
                  <div class="action-title">Browse Placement Drives</div>
                  <div class="action-desc">Explore open jobs and check your eligibility</div>
                </div>
              </a>
              <a href="#resume-builder" class="action-card">
                <span class="action-icon">📄</span>
                <div>
                  <div class="action-title">Build & Polish Resume</div>
                  <div class="action-desc">Create professional PDF resumes with templates</div>
                </div>
              </a>
              <a href="#profile" class="action-card">
                <span class="action-icon">👤</span>
                <div>
                  <div class="action-title">Update Profile & Skills</div>
                  <div class="action-desc">Keep your academic and project details up to date</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
    }
  },

  async renderFaculty(container) {
    try {
      const res = await api.getFacultyDashboard();
      if (!res.success) {
        if (res.status === 401) {
          auth.logout();
          return;
        }
        container.innerHTML = `<div class="error-banner">${escapeHtml(res.error)}</div>`;
        return;
      }

      const d = res.data;

      container.innerHTML = `
        <div class="page-header flex justify-between items-center">
          <div>
            <h1 class="page-title">Faculty / TPO Dashboard</h1>
            <p class="page-subtitle">Manage campus placement drives, review applications, and track student outcomes.</p>
          </div>
          <a href="#faculty/drives/new" class="btn btn-primary">+ Create New Drive</a>
        </div>

        <!-- Stats Grid -->
        <div class="stats-grid mb-6">
          <div class="stat-card">
            <div class="stat-icon bg-blue-100 text-blue-600">🏢</div>
            <div class="stat-content">
              <div class="stat-value">${d.activeDrives || 0}</div>
              <div class="stat-label">Active Drives</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon bg-yellow-100 text-yellow-600">📋</div>
            <div class="stat-content">
              <div class="stat-value">${d.totalApplications || 0}</div>
              <div class="stat-label">Total Applications</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon bg-indigo-100 text-indigo-600">⭐</div>
            <div class="stat-content">
              <div class="stat-value">${d.shortlistedCount || 0}</div>
              <div class="stat-label">Shortlisted</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon bg-green-100 text-green-600">🎉</div>
            <div class="stat-content">
              <div class="stat-value">${d.placedCount || 0}</div>
              <div class="stat-label">Placed / Offered</div>
            </div>
          </div>
        </div>

        <div class="card mb-6">
          <div class="card-header flex justify-between items-center">
            <h3 class="card-title">Placement Drives Overview</h3>
            <a href="#faculty/drives" class="btn btn-sm btn-ghost">Manage All</a>
          </div>
          ${(d.drivesSummary && d.drivesSummary.length > 0) ? `
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Role</th>
                    <th>Package</th>
                    <th>Deadline</th>
                    <th>Applications</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${d.drivesSummary.map((drive) => `
                    <tr>
                      <td><strong>${escapeHtml(drive.companyName)}</strong></td>
                      <td>${escapeHtml(drive.jobTitle)}</td>
                      <td>${escapeHtml(drive.salary || '—')}</td>
                      <td>${formatDate(drive.applicationDeadline)}</td>
                      <td><strong>${drive.applicantCount || 0}</strong></td>
                      <td>${statusBadge(drive.status)}</td>
                      <td>
                        <a href="#faculty/applications?driveId=${drive.id}" class="btn btn-xs btn-secondary">Review</a>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="p-6 text-center text-muted">
              <p>No placement drives created yet.</p>
              <a href="#faculty/drives/new" class="btn btn-sm btn-primary mt-3">Create First Drive</a>
            </div>
          `}
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
    }
  },

  async renderAdmin(container) {
    try {
      const res = await api.getAdminDashboard();
      if (!res.success) {
        if (res.status === 401) {
          auth.logout();
          return;
        }
        container.innerHTML = `<div class="error-banner">${escapeHtml(res.error)}</div>`;
        return;
      }

      const d = res.data;

      container.innerHTML = `
        <div class="page-header">
          <h1 class="page-title">Administrator Dashboard</h1>
          <p class="page-subtitle">System overview, user management, and placement activity monitoring.</p>
        </div>

        <!-- Stats Grid -->
        <div class="stats-grid mb-6">
          <div class="stat-card">
            <div class="stat-icon bg-blue-100 text-blue-600">👥</div>
            <div class="stat-content">
              <div class="stat-value">${d.userCounts?.total || 0}</div>
              <div class="stat-label">Total Users</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon bg-green-100 text-green-600">🎓</div>
            <div class="stat-content">
              <div class="stat-value">${d.userCounts?.students || 0}</div>
              <div class="stat-label">Students</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon bg-purple-100 text-purple-600">👨‍🏫</div>
            <div class="stat-content">
              <div class="stat-value">${d.userCounts?.faculty || 0}</div>
              <div class="stat-label">Approved Faculty/TPO</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon bg-yellow-100 text-yellow-600">⏳</div>
            <div class="stat-content">
              <div class="stat-value">${d.pendingFacultyRequests || 0}</div>
              <div class="stat-label">Pending Faculty Requests</div>
            </div>
          </div>
        </div>

        <!-- Pending Faculty Requests Alert -->
        ${d.pendingFacultyRequests > 0 ? `
          <div class="alert alert-warning mb-6 flex justify-between items-center">
            <div>
              <strong>Action Required:</strong> You have ${d.pendingFacultyRequests} faculty/TPO access request(s) awaiting approval.
            </div>
            <a href="#admin/faculty-requests" class="btn btn-sm btn-warning">Review Requests</a>
          </div>
        ` : ''}

        <div class="grid-2-col gap-6">
          <div class="card">
            <h3 class="card-title mb-4">Placement Drives Summary</h3>
            <div class="data-summary-list">
              <div class="summary-item">
                <span class="summary-label">Published Drives:</span>
                <span class="summary-value font-bold">${d.driveCounts?.published || 0}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Draft Drives:</span>
                <span class="summary-value font-bold">${d.driveCounts?.draft || 0}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Closed Drives:</span>
                <span class="summary-value font-bold">${d.driveCounts?.closed || 0}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Total Applications:</span>
                <span class="summary-value font-bold">${d.applicationCounts?.total || 0}</span>
              </div>
            </div>
          </div>

          <div class="card">
            <h3 class="card-title mb-4">Quick Admin Links</h3>
            <div class="quick-actions-list">
              <a href="#admin/users" class="action-card">
                <span class="action-icon">👥</span>
                <div>
                  <div class="action-title">User Management</div>
                  <div class="action-desc">View, manage roles, and activate/suspend accounts</div>
                </div>
              </a>
              <a href="#admin/faculty-requests" class="action-card">
                <span class="action-icon">📋</span>
                <div>
                  <div class="action-title">Faculty Requests</div>
                  <div class="action-desc">Approve or reject TPO access requests</div>
                </div>
              </a>
              <a href="#reports" class="action-card">
                <span class="action-icon">📊</span>
                <div>
                  <div class="action-title">Placement Reports</div>
                  <div class="action-desc">View detailed analytics and export CSV reports</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
    }
  },
};

export default dashboard;
