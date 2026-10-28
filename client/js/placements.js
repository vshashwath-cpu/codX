/**
 * Placement drives browsing, filtering, and applications.
 */

import api from './api.js';
import auth from './auth.js';
import storage from './storage.js';
import { escapeHtml, loadingSpinner, emptyState, statusBadge, formatDate, showToast } from './ui.js';

export const placements = {
  // ── Browse Drives (Student View) ──────────────────────────
  async renderDrivesPage(container) {
    container.innerHTML = loadingSpinner('Loading placement drives...');

    try {
      const res = await api.getDrives();
      let drives = [];

      if (res.success && Array.isArray(res.drives)) {
        drives = res.drives;
        storage.cachePlacementDrives(drives);
      } else {
        drives = storage.getCachedDrives();
        if (drives.length > 0) {
          showToast('Showing cached drives (offline mode)', 'info');
        }
      }

      this.renderDrivesList(container, drives);
    } catch (err) {
      const cached = storage.getCachedDrives();
      if (cached.length > 0) {
        this.renderDrivesList(container, cached);
      } else {
        container.innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
      }
    }
  },

  renderDrivesList(container, drives) {
    container.innerHTML = `
      <div class="page-header flex justify-between items-center">
        <div>
          <h1 class="page-title">Placement Drives</h1>
          <p class="page-subtitle">Browse campus placement opportunities, verify your eligibility, and apply.</p>
        </div>
      </div>

      <!-- Search & Filters Bar -->
      <div class="card mb-6 p-4">
        <div class="filters-bar flex gap-3 flex-wrap">
          <input type="text" id="drive-search-input" class="form-input flex-1" placeholder="Search by company or job title...">
          <select id="filter-dept" class="form-select w-auto">
            <option value="">All Departments</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Information Technology">Information Technology</option>
            <option value="Electronics">Electronics</option>
            <option value="Mechanical">Mechanical</option>
          </select>
          <select id="sort-by" class="form-select w-auto">
            <option value="deadline">Sort by Deadline</option>
            <option value="company">Sort by Company</option>
            <option value="recent">Recently Added</option>
          </select>
        </div>
      </div>

      <!-- Drives Grid -->
      <div id="drives-grid" class="drives-grid">
        ${drives.length > 0 ? drives.map((d) => this.renderDriveCard(d)).join('') : emptyState('No placement drives found', 'Check back later for new opportunities.')}
      </div>
    `;

    // Filter event listeners
    const searchInput = container.querySelector('#drive-search-input');
    const deptSelect = container.querySelector('#filter-dept');
    const sortSelect = container.querySelector('#sort-by');
    const grid = container.querySelector('#drives-grid');

    const filterDrives = () => {
      const q = searchInput.value.toLowerCase().trim();
      const dept = deptSelect.value;
      const sort = sortSelect.value;

      let filtered = drives.filter((d) => {
        const matchesQ = !q || d.companyName.toLowerCase().includes(q) || d.jobTitle.toLowerCase().includes(q);
        const matchesDept = !dept || (d.eligibleDepartments && d.eligibleDepartments.includes(dept));
        return matchesQ && matchesDept;
      });

      if (sort === 'company') {
        filtered.sort((a, b) => a.companyName.localeCompare(b.companyName));
      } else if (sort === 'deadline') {
        filtered.sort((a, b) => new Date(a.applicationDeadline || 0) - new Date(b.applicationDeadline || 0));
      }

      grid.innerHTML = filtered.length > 0
        ? filtered.map((d) => this.renderDriveCard(d)).join('')
        : emptyState('No matching drives found', 'Try adjusting your search filters.');
    };

    searchInput?.addEventListener('input', filterDrives);
    deptSelect?.addEventListener('change', filterDrives);
    sortSelect?.addEventListener('change', filterDrives);
  },

  renderDriveCard(drive) {
    const isDeadlinePassed = drive.applicationDeadline && new Date(drive.applicationDeadline) < new Date();
    const skills = drive.requiredSkills || [];

    return `
      <div class="card drive-card">
        <div class="drive-card-header">
          <div>
            <h3 class="drive-company">${escapeHtml(drive.companyName)}</h3>
            <div class="drive-title font-medium">${escapeHtml(drive.jobTitle)}</div>
          </div>
          ${statusBadge(drive.status)}
        </div>

        <div class="drive-details my-3 space-y-1 text-sm text-muted">
          <div>📍 ${escapeHtml(drive.location || 'Not specified')}</div>
          <div>💰 ${escapeHtml(drive.salary || 'Competitive')}</div>
          <div>🎓 Min CGPA: <strong>${drive.minCGPA || 'None'}</strong></div>
          <div>⏳ Deadline: <strong class="${isDeadlinePassed ? 'text-danger' : ''}">${formatDate(drive.applicationDeadline)}</strong></div>
        </div>

        <!-- Skills tags -->
        <div class="skills-mini-tags my-3 flex gap-1 flex-wrap">
          ${skills.slice(0, 4).map((s) => `<span class="badge badge-gray text-xs">${escapeHtml(s)}</span>`).join('')}
          ${skills.length > 4 ? `<span class="badge badge-gray text-xs">+${skills.length - 4}</span>` : ''}
        </div>

        <div class="drive-card-footer flex justify-between items-center mt-4 pt-3 border-t">
          <a href="#drives/${drive.id}" class="btn btn-sm btn-secondary">View Details</a>
          ${auth.hasRole('student') && !isDeadlinePassed && drive.status === 'published' ? `
            <button class="btn btn-sm btn-primary apply-btn" data-drive-id="${drive.id}">Apply Now</button>
          ` : ''}
        </div>
      </div>
    `;
  },

  // ── Drive Detail Page ─────────────────────────────────────
  async renderDriveDetail(container, driveId) {
    container.innerHTML = loadingSpinner('Loading drive details...');

    try {
      const res = await api.getDrive(driveId);
      if (!res.success || !res.drive) {
        container.innerHTML = `<div class="error-banner">Drive not found</div>`;
        return;
      }

      const d = res.drive;
      let eligibility = { eligible: false, reasons: [] };

      // If student, check eligibility
      if (auth.hasRole('student')) {
        try {
          const eligRes = await api.checkEligibility(driveId);
          if (eligRes.success) {
            eligibility = eligRes;
          }
        } catch { /* ignore */ }
      }

      container.innerHTML = `
        <div class="page-header flex justify-between items-center">
          <div>
            <a href="#drives" class="btn btn-sm btn-ghost mb-2">&larr; Back to Drives</a>
            <h1 class="page-title">${escapeHtml(d.companyName)}</h1>
            <p class="page-subtitle">${escapeHtml(d.jobTitle)} &bull; ${escapeHtml(d.location || 'Location Not Specified')}</p>
          </div>
          <div class="flex items-center gap-3">
            ${statusBadge(d.status)}
            ${auth.hasRole('student') && d.status === 'published' ? `
              <button id="detail-apply-btn" class="btn btn-primary" ${!eligibility.eligible ? 'disabled' : ''}>
                Apply Now
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Eligibility Banner for Students -->
        ${auth.hasRole('student') ? `
          <div class="alert ${eligibility.eligible ? 'alert-success' : 'alert-warning'} mb-6">
            <div class="font-bold mb-1">${eligibility.eligible ? '✓ You are eligible for this drive' : '⚠ Eligibility Notice'}</div>
            <ul class="text-sm space-y-1">
              ${eligibility.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <div class="grid-2-col gap-6">
          <!-- Job Details -->
          <div class="space-y-6">
            <div class="card">
              <h3 class="card-title mb-3">Job Description</h3>
              <p class="whitespace-pre-line text-sm">${escapeHtml(d.jobDescription || 'No description provided.')}</p>
            </div>

            <div class="card">
              <h3 class="card-title mb-3">Selection Process</h3>
              <p class="whitespace-pre-line text-sm">${escapeHtml(d.selectionProcess || 'Standard campus selection process.')}</p>
            </div>
          </div>

          <!-- Criteria & Meta -->
          <div class="space-y-6">
            <div class="card">
              <h3 class="card-title mb-4">Drive Information</h3>
              <div class="data-summary-list text-sm">
                <div class="summary-item">
                  <span class="summary-label">Salary / Package:</span>
                  <span class="summary-value font-bold text-success">${escapeHtml(d.salary || '—')}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Application Deadline:</span>
                  <span class="summary-value font-bold">${formatDate(d.applicationDeadline)}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Openings:</span>
                  <span class="summary-value">${d.openings || 'Not specified'}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Minimum CGPA:</span>
                  <span class="summary-value font-bold">${d.minCGPA || 'None'}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Eligible Departments:</span>
                  <span class="summary-value">${(d.eligibleDepartments || []).join(', ') || 'All'}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Eligible Graduation Years:</span>
                  <span class="summary-value">${(d.eligibleGraduationYears || []).join(', ') || 'All'}</span>
                </div>
              </div>
            </div>

            <div class="card">
              <h3 class="card-title mb-3">Required Skills</h3>
              <div class="flex gap-2 flex-wrap">
                ${(d.requiredSkills || []).map((s) => `<span class="badge badge-info">${escapeHtml(s)}</span>`).join('')}
              </div>
            </div>
          </div>
        </div>
      `;

      // Apply button handler
      container.querySelector('#detail-apply-btn')?.addEventListener('click', async () => {
        try {
          const applyRes = await api.applyForDrive(driveId);
          if (applyRes.success) {
            showToast('Application submitted successfully!', 'success');
            window.location.hash = '#applications';
          } else {
            showToast(applyRes.error || 'Failed to submit application', 'error');
          }
        } catch (err) {
          // Offline queue
          storage.enqueueOperation({
            type: 'application-submit',
            payload: { driveId },
          });
          showToast('You are offline. Application queued — Pending Sync', 'info');
        }
      });
    } catch (err) {
      container.innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
    }
  },

  // ── My Applications (Student View) ────────────────────────
  async renderMyApplications(container) {
    container.innerHTML = loadingSpinner('Loading your applications...');

    try {
      const res = await api.getApplications();
      if (!res.success) {
        container.innerHTML = `<div class="error-banner">${escapeHtml(res.error)}</div>`;
        return;
      }

      const apps = res.applications || [];

      container.innerHTML = `
        <div class="page-header">
          <h1 class="page-title">My Applications</h1>
          <p class="page-subtitle">Track the status of all your campus placement applications.</p>
        </div>

        ${apps.length === 0 ? emptyState('No applications submitted yet', 'Browse active placement drives and apply to eligible positions.', '<a href="#drives" class="btn btn-primary">Browse Drives</a>') : `
          <div class="card">
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Role</th>
                    <th>Applied Date</th>
                    <th>Status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  ${apps.map((app) => `
                    <tr>
                      <td><strong>${escapeHtml(app.drive?.companyName || 'Company')}</strong></td>
                      <td>${escapeHtml(app.drive?.jobTitle || 'Role')}</td>
                      <td>${formatDate(app.appliedAt)}</td>
                      <td>${statusBadge(app.status)}</td>
                      <td>
                        <a href="#drives/${app.driveId}" class="btn btn-xs btn-secondary">View Drive</a>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `}
      `;
    } catch (err) {
      container.innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
    }
  },

  // ── Faculty: Manage Drives ────────────────────────────────
  async renderManageDrives(container) {
    container.innerHTML = loadingSpinner('Loading placement drives...');

    try {
      const res = await api.getDrives();
      const drives = res.drives || [];

      container.innerHTML = `
        <div class="page-header flex justify-between items-center">
          <div>
            <h1 class="page-title">Manage Placement Drives</h1>
            <p class="page-subtitle">Create, update, and publish campus recruitment opportunities.</p>
          </div>
          <button id="create-drive-btn" class="btn btn-primary">+ Create New Drive</button>
        </div>

        <div class="card">
          ${drives.length === 0 ? emptyState('No placement drives created yet', 'Click the button above to create your first placement drive.') : `
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Role</th>
                    <th>Package</th>
                    <th>Deadline</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${drives.map((d) => `
                    <tr>
                      <td><strong>${escapeHtml(d.companyName)}</strong></td>
                      <td>${escapeHtml(d.jobTitle)}</td>
                      <td>${escapeHtml(d.salary || '—')}</td>
                      <td>${formatDate(d.applicationDeadline)}</td>
                      <td>${statusBadge(d.status)}</td>
                      <td class="flex gap-2">
                        <a href="#faculty/applications?driveId=${d.id}" class="btn btn-xs btn-secondary">Applications</a>
                        <button class="btn btn-xs btn-ghost toggle-status-btn" data-id="${d.id}" data-status="${d.status}">
                          ${d.status === 'published' ? 'Close' : 'Publish'}
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      `;

      container.querySelector('#create-drive-btn')?.addEventListener('click', () => {
        this.renderDriveFormModal(container);
      });

      container.querySelectorAll('.toggle-status-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          const current = e.target.getAttribute('data-status');
          const next = current === 'published' ? 'closed' : 'published';
          await api.updateDriveStatus(id, next);
          showToast(`Drive status updated to ${next}`, 'success');
          this.renderManageDrives(container);
        });
      });
    } catch (err) {
      container.innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
    }
  },

  renderDriveFormModal(container) {
    const modalContent = `
      <form id="new-drive-form" class="space-y-4">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">Company Name *</label>
            <input type="text" id="df-company" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Job Title *</label>
            <input type="text" id="df-title" class="form-input" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Job Description *</label>
          <textarea id="df-desc" class="form-textarea" rows="3" required></textarea>
        </div>
        <div class="form-grid-3">
          <div class="form-group">
            <label class="form-label">Salary / CTC</label>
            <input type="text" id="df-salary" class="form-input" placeholder="e.g., ₹12,00,000 p.a.">
          </div>
          <div class="form-group">
            <label class="form-label">Location</label>
            <input type="text" id="df-location" class="form-input" placeholder="e.g., Bangalore">
          </div>
          <div class="form-group">
            <label class="form-label">Min CGPA</label>
            <input type="number" step="0.1" min="0" max="10" id="df-cgpa" class="form-input" value="7.0">
          </div>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">Application Deadline *</label>
            <input type="date" id="df-deadline" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Openings</label>
            <input type="number" id="df-openings" class="form-input" placeholder="e.g., 10">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Required Skills (comma separated)</label>
          <input type="text" id="df-skills" class="form-input" placeholder="JavaScript, Python, SQL, System Design">
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select id="df-status" class="form-select">
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </form>
    `;

    // Simple modal injection
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">Create Placement Drive</h3>
          <button class="modal-close" onclick="this.closest('.modal-backdrop').remove()">&times;</button>
        </div>
        <div class="modal-body">${modalContent}</div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-backdrop').remove()">Cancel</button>
          <button id="submit-drive-btn" class="btn btn-primary">Create Drive</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#submit-drive-btn').addEventListener('click', async () => {
      const skillsStr = overlay.querySelector('#df-skills').value;
      const data = {
        companyName: overlay.querySelector('#df-company').value.trim(),
        jobTitle: overlay.querySelector('#df-title').value.trim(),
        jobDescription: overlay.querySelector('#df-desc').value.trim(),
        salary: overlay.querySelector('#df-salary').value.trim(),
        location: overlay.querySelector('#df-location').value.trim(),
        minCGPA: parseFloat(overlay.querySelector('#df-cgpa').value) || 0,
        applicationDeadline: new Date(overlay.querySelector('#df-deadline').value).toISOString(),
        openings: parseInt(overlay.querySelector('#df-openings').value, 10) || null,
        requiredSkills: skillsStr ? skillsStr.split(',').map((s) => s.trim()).filter(Boolean) : [],
        eligibleDepartments: ['Computer Science', 'Information Technology', 'Electronics'],
        eligibleGraduationYears: [2025],
        status: overlay.querySelector('#df-status').value,
      };

      if (!data.companyName || !data.jobTitle || !data.jobDescription) {
        showToast('Please fill all required fields', 'error');
        return;
      }

      const res = await api.createDrive(data);
      if (res.success) {
        showToast('Placement drive created successfully!', 'success');
        overlay.remove();
        this.renderManageDrives(container);
      } else {
        showToast(res.error || 'Failed to create drive', 'error');
      }
    });
  },

  // ── Faculty: Review Applications ──────────────────────────
  async renderReviewApplications(container) {
    container.innerHTML = loadingSpinner('Loading applications for review...');

    try {
      const res = await api.getApplications();
      const apps = res.applications || [];

      container.innerHTML = `
        <div class="page-header">
          <h1 class="page-title">Review Applications</h1>
          <p class="page-subtitle">Review candidate profiles, shortlist candidates, and update selection statuses.</p>
        </div>

        <div class="card">
          ${apps.length === 0 ? emptyState('No applications to review yet', 'Applications submitted by students will appear here.') : `
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Company & Role</th>
                    <th>CGPA</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${apps.map((app) => `
                    <tr>
                      <td>
                        <strong>${escapeHtml(app.student?.name || 'Student')}</strong>
                        <div class="text-xs text-muted">${escapeHtml(app.student?.email || '')}</div>
                      </td>
                      <td>
                        <div>${escapeHtml(app.drive?.companyName || '')}</div>
                        <div class="text-xs text-muted">${escapeHtml(app.drive?.jobTitle || '')}</div>
                      </td>
                      <td><strong>${app.profile?.cgpa || '—'}</strong></td>
                      <td>${escapeHtml(app.profile?.department || '—')}</td>
                      <td>${statusBadge(app.status)}</td>
                      <td>
                        <select class="form-select form-select-sm app-status-select" data-id="${app.id}">
                          <option value="applied" ${app.status === 'applied' ? 'selected' : ''}>Applied</option>
                          <option value="under-review" ${app.status === 'under-review' ? 'selected' : ''}>Under Review</option>
                          <option value="shortlisted" ${app.status === 'shortlisted' ? 'selected' : ''}>Shortlisted</option>
                          <option value="selected" ${app.status === 'selected' ? 'selected' : ''}>Selected</option>
                          <option value="offered" ${app.status === 'offered' ? 'selected' : ''}>Offered</option>
                          <option value="rejected" ${app.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      `;

      container.querySelectorAll('.app-status-select').forEach((sel) => {
        sel.addEventListener('change', async (e) => {
          const id = e.target.getAttribute('data-id');
          const newStatus = e.target.value;
          const remarks = prompt('Add optional remarks for the student:', '');
          const res = await api.updateApplicationStatus(id, newStatus, remarks || '');
          if (res.success) {
            showToast('Application status updated', 'success');
            this.renderReviewApplications(container);
          } else {
            showToast(res.error || 'Failed to update status', 'error');
            this.renderReviewApplications(container);
          }
        });
      });
    } catch (err) {
      container.innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
    }
  },
};

export default placements;
