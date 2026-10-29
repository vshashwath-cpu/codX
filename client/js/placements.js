/**
 * Placement drives browsing, filtering, real-time eligibility check, and applications.
 */

import api from './api.js';
import auth from './auth.js';
import storage from './storage.js';
import { escapeHtml, loadingSpinner, emptyState, statusBadge, formatDate, showToast } from './ui.js';

// ── Company Branding Helpers ─────────────────────────────────
const COMPANY_BRANDS = {
  'tcs': {
    name: 'Tata Consultancy Services',
    short: 'TCS',
    bg: '#003366',
    fg: '#ffffff',
    accent: '#00a3e0',
    svg: `<svg viewBox="0 0 40 40" width="36" height="36" fill="none"><rect width="40" height="40" rx="10" fill="#0b2545"/><path d="M10 14h20M20 14v16" stroke="#00a3e0" stroke-width="3" stroke-linecap="round"/><circle cx="28" cy="24" r="3" fill="#ffffff"/></svg>`,
  },
  'infosys': {
    name: 'Infosys',
    short: 'INFY',
    bg: '#007cc3',
    fg: '#ffffff',
    accent: '#5ac8fa',
    svg: `<svg viewBox="0 0 40 40" width="36" height="36" fill="none"><rect width="40" height="40" rx="10" fill="#007cc3"/><text x="20" y="26" fill="#ffffff" font-size="14" font-weight="800" text-anchor="middle" font-family="system-ui, sans-serif">INFY</text></svg>`,
  },
  'wipro': {
    name: 'Wipro',
    short: 'WIPRO',
    bg: '#341f97',
    fg: '#ffffff',
    accent: '#54a0ff',
    svg: `<svg viewBox="0 0 40 40" width="36" height="36" fill="none"><rect width="40" height="40" rx="10" fill="#2d1b69"/><circle cx="15" cy="20" r="5" fill="#ee5253"/><circle cx="25" cy="16" r="4" fill="#10ac84"/><circle cx="25" cy="25" r="4" fill="#ff9f43"/></svg>`,
  },
  'accenture': {
    name: 'Accenture',
    short: 'ACN',
    bg: '#481173',
    fg: '#ffffff',
    accent: '#a100ff',
    svg: `<svg viewBox="0 0 40 40" width="36" height="36" fill="none"><rect width="40" height="40" rx="10" fill="#1e0538"/><path d="M14 13l8 7-8 7" stroke="#a100ff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="26" cy="20" r="3" fill="#ffffff"/></svg>`,
  },
  'capgemini': {
    name: 'Capgemini',
    short: 'CAPG',
    bg: '#0070ad',
    fg: '#ffffff',
    accent: '#1dd1a1',
    svg: `<svg viewBox="0 0 40 40" width="36" height="36" fill="none"><rect width="40" height="40" rx="10" fill="#0070ad"/><path d="M20 12c-4.4 0-8 3.6-8 8 0 5 8 10 8 10s8-5 8-10c0-4.4-3.6-8-8-8z" fill="#ffffff" opacity="0.9"/></svg>`,
  },
  'amazon': {
    name: 'Amazon',
    short: 'AMZN',
    bg: '#131921',
    fg: '#ff9900',
    accent: '#ff9900',
    svg: `<svg viewBox="0 0 40 40" width="36" height="36" fill="none"><rect width="40" height="40" rx="10" fill="#131921"/><text x="20" y="22" fill="#ffffff" font-size="12" font-weight="700" text-anchor="middle" font-family="system-ui, sans-serif">a</text><path d="M13 27c4 3 10 3 14 0" stroke="#ff9900" stroke-width="2.5" stroke-linecap="round"/><path d="M26 25l2 2-1 2" stroke="#ff9900" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  'cognizant': {
    name: 'Cognizant',
    short: 'CTS',
    bg: '#0033a0',
    fg: '#ffffff',
    accent: '#00b0b9',
    svg: `<svg viewBox="0 0 40 40" width="36" height="36" fill="none"><rect width="40" height="40" rx="10" fill="#0033a0"/><path d="M26 15a8 8 0 100 10" stroke="#00b0b9" stroke-width="3.5" stroke-linecap="round"/><circle cx="20" cy="20" r="2.5" fill="#ffffff"/></svg>`,
  },
  'google': {
    name: 'Google India',
    short: 'GOOG',
    bg: '#1a73e8',
    fg: '#ffffff',
    accent: '#ea4335',
    svg: `<svg viewBox="0 0 40 40" width="36" height="36" fill="none"><rect width="40" height="40" rx="10" fill="#f8f9fa" stroke="#e8eaed"/><text x="20" y="26" fill="#1a73e8" font-size="16" font-weight="800" text-anchor="middle" font-family="system-ui, sans-serif">G</text></svg>`,
  },
  'microsoft': {
    name: 'Microsoft',
    short: 'MSFT',
    bg: '#0078d4',
    fg: '#ffffff',
    accent: '#7fba00',
    svg: `<svg viewBox="0 0 40 40" width="36" height="36" fill="none"><rect width="40" height="40" rx="10" fill="#24292e"/><rect x="13" y="13" width="6" height="6" fill="#f25022"/><rect x="21" y="13" width="6" height="6" fill="#7fba00"/><rect x="13" y="21" width="6" height="6" fill="#00a4ef"/><rect x="21" y="21" width="6" height="6" fill="#ffb900"/></svg>`,
  },
};

function getCompanyBrand(companyName) {
  if (!companyName) {
    return {
      name: 'Company',
      short: 'CMP',
      bg: '#2c3e50',
      fg: '#ffffff',
      accent: '#3498db',
      svg: `<div class="company-logo-avatar default-brand">💼</div>`,
    };
  }

  const normalized = companyName.toLowerCase().replace(/[^a-z]/g, '');
  for (const [key, brand] of Object.entries(COMPANY_BRANDS)) {
    if (normalized.includes(key)) {
      return {
        ...brand,
        svg: `<div class="company-logo-avatar" style="background: ${brand.bg}; color: ${brand.fg};">${brand.svg}</div>`,
      };
    }
  }

  // Deterministic color palette for other companies
  const colors = [
    { bg: '#0984e3', fg: '#ffffff', accent: '#74b9ff' },
    { bg: '#6c5ce7', fg: '#ffffff', accent: '#a29bfe' },
    { bg: '#00b894', fg: '#ffffff', accent: '#55efc4' },
    { bg: '#e17055', fg: '#ffffff', accent: '#fab1a0' },
    { bg: '#2d3436', fg: '#ffffff', accent: '#636e72' },
  ];
  let hash = 0;
  for (let i = 0; i < companyName.length; i++) {
    hash = (hash << 5) - hash + companyName.charCodeAt(i);
    hash |= 0;
  }
  const color = colors[Math.abs(hash) % colors.length];
  const words = companyName.trim().split(/\s+/);
  const initials = (words[0][0] + (words[1] ? words[1][0] : '')).toUpperCase();

  return {
    name: companyName,
    short: initials,
    ...color,
    svg: `<div class="company-logo-avatar" style="background: ${color.bg}; color: ${color.fg};"><span class="avatar-initials">${initials}</span></div>`,
  };
}

// ── Deadline & Status Calculation Helpers ────────────────────
function getDeadlineInfo(deadlineStr, driveStatus) {
  if (driveStatus === 'closed') {
    return {
      label: 'Closed',
      pillClass: 'deadline-closed',
      isClosed: true,
      isUrgent: false,
      daysLeft: 0,
    };
  }

  if (!deadlineStr) {
    return {
      label: 'Open',
      pillClass: 'deadline-open',
      isClosed: false,
      isUrgent: false,
      daysLeft: null,
    };
  }

  const deadline = new Date(deadlineStr).getTime();
  const now = Date.now();
  const diffMs = deadline - now;
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs <= 0) {
    return {
      label: 'Closed',
      pillClass: 'deadline-closed',
      isClosed: true,
      isUrgent: false,
      daysLeft: 0,
    };
  }

  if (daysLeft <= 5) {
    return {
      label: `⚡ Closing in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`,
      pillClass: 'deadline-urgent',
      isClosed: false,
      isUrgent: true,
      daysLeft,
    };
  }

  return {
    label: `⏳ ${daysLeft} days left`,
    pillClass: 'deadline-open',
    isClosed: false,
    isUrgent: false,
    daysLeft,
  };
}

// ── Local Eligibility Evaluation Helper ───────────────────────
function evaluateEligibility(drive, profile) {
  if (!profile) {
    return {
      eligible: true,
      reasons: ['Complete your student profile to verify full academic eligibility.'],
    };
  }

  const reasons = [];

  // 1. CGPA check
  if (drive.minCGPA && drive.minCGPA > 0) {
    const studentCGPA = parseFloat(profile.cgpa) || 0;
    if (studentCGPA < drive.minCGPA) {
      reasons.push(`Min CGPA required: ${drive.minCGPA} (Your CGPA: ${studentCGPA.toFixed(2)})`);
    }
  }

  // 2. Department check
  if (drive.eligibleDepartments && drive.eligibleDepartments.length > 0) {
    const studentDept = (profile.department || '').trim().toLowerCase();
    const allowed = drive.eligibleDepartments.map((d) => d.toLowerCase());
    if (studentDept && !allowed.includes(studentDept)) {
      reasons.push(`Eligible branches: ${drive.eligibleDepartments.slice(0, 3).join(', ')}${drive.eligibleDepartments.length > 3 ? '...' : ''}`);
    }
  }

  // 3. Graduation Year check
  if (drive.eligibleGraduationYears && drive.eligibleGraduationYears.length > 0) {
    const studentYear = parseInt(profile.graduationYear, 10);
    if (studentYear && !drive.eligibleGraduationYears.includes(studentYear)) {
      reasons.push(`Graduation batches: ${drive.eligibleGraduationYears.join(', ')}`);
    }
  }

  // 4. Degree check
  if (drive.eligibleDegrees && drive.eligibleDegrees.length > 0) {
    const studentDegree = (profile.degree || '').trim().toLowerCase();
    const allowedDegrees = drive.eligibleDegrees.map((d) => d.toLowerCase());
    if (studentDegree && !allowedDegrees.includes(studentDegree)) {
      reasons.push(`Eligible degrees: ${drive.eligibleDegrees.join(', ')}`);
    }
  }

  // 5. Deadline check
  const deadlinePassed = drive.applicationDeadline && new Date(drive.applicationDeadline) < new Date();
  if (deadlinePassed) {
    reasons.push('Application deadline has passed.');
  }

  // 6. Status check
  if (drive.status !== 'published') {
    reasons.push(`Drive is currently ${drive.status}.`);
  }

  return {
    eligible: reasons.length === 0,
    reasons: reasons.length === 0 ? ['You meet all academic criteria!'] : reasons,
  };
}

export const placements = {
  // Current session cache
  _cachedDrives: [],
  _appliedDriveIds: new Set(),
  _studentProfile: null,

  // ── Browse Drives (Student View) ──────────────────────────
  async renderDrivesPage(container) {
    container.innerHTML = loadingSpinner('Loading placement recruitment drives...');

    try {
      // Concurrently fetch drives, applications, and profile
      const [drivesRes, appsRes, profileRes] = await Promise.all([
        api.getDrives(),
        auth.hasRole('student') ? api.getApplications().catch(() => ({ success: false })) : Promise.resolve({ success: false }),
        auth.hasRole('student') ? api.getProfile().catch(() => ({ success: false })) : Promise.resolve({ success: false }),
      ]);

      let drives = [];
      if (drivesRes.success) {
        drives = drivesRes.drives || drivesRes.data || [];
        storage.cachePlacementDrives(drives);
      } else {
        drives = storage.getCachedDrives();
        if (drives.length > 0) {
          showToast('Showing cached drives (offline mode)', 'info');
        }
      }

      this._cachedDrives = drives;

      // Track applied drives for student
      this._appliedDriveIds = new Set();
      if (appsRes.success) {
        const apps = appsRes.applications || appsRes.data || [];
        apps.forEach((a) => {
          if (a.driveId) this._appliedDriveIds.add(a.driveId);
        });
      }

      // Store student profile
      if (profileRes.success && (profileRes.profile || profileRes.data)) {
        this._studentProfile = profileRes.profile || profileRes.data;
      }

      this.renderDrivesList(container, drives);
    } catch (err) {
      console.error('[Placements] Load error:', err);
      const cached = storage.getCachedDrives();
      if (cached.length > 0) {
        this.renderDrivesList(container, cached);
      } else {
        container.innerHTML = `
          <div class="card p-6 text-center">
            <div class="text-error font-bold mb-2">Failed to load placement drives</div>
            <p class="text-sm text-muted mb-4">${escapeHtml(err.message)}</p>
            <button class="btn btn-primary" onclick="window.location.reload()">Retry</button>
          </div>
        `;
      }
    }
  },

  renderDrivesList(container, drives) {
    const isStudent = auth.hasRole('student');

    container.innerHTML = `
      <div class="page-header flex justify-between items-center flex-wrap gap-4 mb-4">
        <div>
          <h1 class="page-title">Campus Placement Drives</h1>
          <p class="page-subtitle">Explore verified campus recruitment opportunities, verify eligibility, and submit applications.</p>
        </div>
        <div class="flex items-center gap-2">
          ${isStudent ? `
            <a href="#applications" class="btn btn-secondary btn-sm">
              📋 My Applications <span class="badge badge-primary ml-1">${this._appliedDriveIds.size}</span>
            </a>
          ` : `
            <button id="faculty-create-btn" class="btn btn-primary btn-sm">+ Create Drive</button>
          `}
        </div>
      </div>

      <!-- Sample Opportunities Disclaimer Banner -->
      <div class="alert alert-info sample-disclaimer-banner mb-5">
        <div class="flex items-start gap-3">
          <span class="text-xl">ℹ️</span>
          <div class="text-sm">
            <strong class="font-semibold">Illustrative Sample Recruitment Opportunities:</strong>
            The companies, compensation packages, and eligibility requirements shown below represent realistic campus hiring profiles for readiness training. Packages, eligibility criteria, and deadlines are fully configurable by placement coordinators.
          </div>
        </div>
      </div>

      <!-- Search & Advanced Filters Bar -->
      <div class="card filter-card mb-6 p-4">
        <div class="filter-controls-grid">
          <!-- Search input -->
          <div class="search-input-wrap">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              id="drive-search-input"
              class="form-input search-field"
              placeholder="Search by company, role (e.g. SDE), or skills (e.g. Python, Java)..."
            />
          </div>

          <!-- Department / Branch filter -->
          <div class="filter-select-wrap">
            <select id="filter-dept" class="form-select">
              <option value="">All Branches</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Electronics">Electronics</option>
              <option value="Electrical">Electrical</option>
              <option value="Mechanical">Mechanical</option>
            </select>
          </div>

          <!-- Salary filter -->
          <div class="filter-select-wrap">
            <select id="filter-salary" class="form-select">
              <option value="all">All Packages</option>
              <option value="3.5">₹3.5+ LPA</option>
              <option value="6">₹6.0+ LPA</option>
              <option value="10">₹10.0+ LPA</option>
              <option value="18">₹18.0+ LPA (Dream / Tier-1)</option>
            </select>
          </div>

          <!-- Status filter -->
          <div class="filter-select-wrap">
            <select id="filter-status" class="form-select">
              <option value="all">All Statuses</option>
              <option value="open" selected>Open & Active</option>
              <option value="urgent">Closing Soon (≤ 5 days)</option>
              <option value="closed">Closed Drives</option>
            </select>
          </div>

          <!-- Eligibility filter (students only) -->
          ${isStudent ? `
            <div class="filter-select-wrap">
              <select id="filter-eligibility" class="form-select">
                <option value="all">All Opportunities</option>
                <option value="eligible">Eligible for Me</option>
                <option value="applied">Already Applied</option>
              </select>
            </div>
          ` : ''}

          <!-- Sort dropdown -->
          <div class="filter-select-wrap">
            <select id="sort-by" class="form-select">
              <option value="deadline">Sort: Deadline (Earliest)</option>
              <option value="salary-high">Sort: Package (High to Low)</option>
              <option value="company-az">Sort: Company (A-Z)</option>
              <option value="recent">Sort: Recently Added</option>
            </select>
          </div>
        </div>

        <!-- Filter results status & reset -->
        <div class="filter-meta flex justify-between items-center mt-3 pt-3 border-t text-xs text-muted">
          <div id="filter-counter">
            Showing <strong class="text-primary" id="visible-count">${drives.length}</strong> of ${drives.length} recruitment opportunities
          </div>
          <button id="clear-filters-btn" class="btn btn-ghost btn-xs">Reset All Filters</button>
        </div>
      </div>

      <!-- Drives Grid -->
      <div id="drives-grid" class="drives-grid">
        ${this.renderDrivesCardsHTML(drives)}
      </div>
    `;

    // Hook up interactive filtering
    this.attachFilterListeners(container, drives);

    // Hook up apply buttons
    this.attachApplyButtonListeners(container);

    // Faculty create button handler
    container.querySelector('#faculty-create-btn')?.addEventListener('click', () => {
      this.renderDriveFormModal(container);
    });
  },

  renderDrivesCardsHTML(drives) {
    if (!drives || drives.length === 0) {
      return emptyState('No placement drives found', 'Try adjusting your search query or branch filters.');
    }
    return drives.map((d) => this.renderDriveCard(d)).join('');
  },

  renderDriveCard(drive) {
    const isStudent = auth.hasRole('student');
    const brand = getCompanyBrand(drive.companyName);
    const deadlineInfo = getDeadlineInfo(drive.applicationDeadline, drive.status);
    const hasApplied = this._appliedDriveIds.has(drive.id);
    const elig = isStudent ? evaluateEligibility(drive, this._studentProfile) : { eligible: true, reasons: [] };
    const skills = drive.requiredSkills || [];

    // CTC numeric extract for badge styling
    const isHighPackage = (drive.salary || '').includes('18') || (drive.salary || '').includes('25') || (drive.salary || '').includes('22');

    return `
      <div class="card drive-card ${deadlineInfo.isClosed ? 'drive-card-closed' : ''} ${hasApplied ? 'drive-card-applied' : ''}" data-drive-id="${drive.id}">
        <!-- Top brand bar -->
        <div class="drive-card-header">
          <div class="flex items-center gap-3">
            ${brand.svg}
            <div>
              <div class="flex items-center gap-2">
                <h3 class="drive-company-name">${escapeHtml(drive.companyName)}</h3>
                ${drive.isSample ? '<span class="badge badge-sample">Sample</span>' : ''}
              </div>
              <div class="drive-job-title">${escapeHtml(drive.jobTitle)}</div>
            </div>
          </div>
          <span class="deadline-pill ${deadlineInfo.pillClass}">
            <span class="pill-dot ${deadlineInfo.isUrgent ? 'pulse' : ''}"></span>
            ${escapeHtml(deadlineInfo.label)}
          </span>
        </div>

        <!-- Package and metadata row -->
        <div class="drive-package-row my-3 flex justify-between items-center">
          <div class="package-highlight ${isHighPackage ? 'package-tier1' : ''}">
            <span class="package-currency">💰</span>
            <span class="package-text font-bold">${escapeHtml(drive.salary || 'Competitive CTC')}</span>
          </div>
          <div class="location-text text-xs text-muted">
            📍 ${escapeHtml(drive.location || 'Multiple Locations')}
          </div>
        </div>

        <!-- Key eligibility & batch info -->
        <div class="drive-meta-grid text-xs text-muted mb-3">
          <div class="meta-item">
            <span class="meta-label">Min CGPA:</span>
            <strong class="text-body">${drive.minCGPA ? drive.minCGPA.toFixed(1) : 'None'}</strong>
          </div>
          <div class="meta-item">
            <span class="meta-label">Openings:</span>
            <strong class="text-body">${drive.openings || 'Multiple'}</strong>
          </div>
          <div class="meta-item">
            <span class="meta-label">Branches:</span>
            <strong class="text-body" title="${(drive.eligibleDepartments || []).join(', ')}">
              ${(drive.eligibleDepartments || []).length > 0 ? `${drive.eligibleDepartments[0]}${drive.eligibleDepartments.length > 1 ? ` +${drive.eligibleDepartments.length - 1}` : ''}` : 'All Branches'}
            </strong>
          </div>
          <div class="meta-item">
            <span class="meta-label">Deadline:</span>
            <strong class="text-body">${formatDate(drive.applicationDeadline)}</strong>
          </div>
        </div>

        <!-- Skills pills -->
        <div class="skills-row flex gap-1 flex-wrap mb-4">
          ${skills.slice(0, 3).map((s) => `<span class="badge badge-skill">${escapeHtml(s)}</span>`).join('')}
          ${skills.length > 3 ? `<span class="badge badge-skill-more" title="${skills.slice(3).map(escapeHtml).join(', ')}">+${skills.length - 3}</span>` : ''}
        </div>

        <!-- Live Student Eligibility Indicator -->
        ${isStudent ? `
          <div class="card-eligibility-status ${hasApplied ? 'status-applied' : elig.eligible ? 'status-eligible' : 'status-ineligible'} mb-4">
            ${hasApplied ? `
              <span class="status-icon">✓</span>
              <span class="status-text">Application Submitted</span>
            ` : elig.eligible ? `
              <span class="status-icon">✓</span>
              <span class="status-text">Eligible for this drive</span>
            ` : `
              <span class="status-icon">⚠</span>
              <span class="status-text" title="${escapeHtml(elig.reasons.join(' • '))}">${escapeHtml(elig.reasons[0] || 'Criteria not met')}</span>
            `}
          </div>
        ` : ''}

        <!-- Card Actions -->
        <div class="drive-card-footer flex justify-between items-center pt-3 border-t">
          <a href="#drives/${drive.id}" class="btn btn-sm btn-secondary view-details-btn">
            View Details
          </a>

          ${isStudent ? `
            ${hasApplied ? `
              <button class="btn btn-sm btn-applied" disabled>
                ✓ Applied
              </button>
            ` : deadlineInfo.isClosed ? `
              <button class="btn btn-sm btn-disabled" disabled>
                Closed
              </button>
            ` : elig.eligible ? `
              <button class="btn btn-sm btn-primary apply-now-btn" data-drive-id="${drive.id}">
                Apply Now &rarr;
              </button>
            ` : `
              <button class="btn btn-sm btn-disabled" disabled title="Check requirements in Details">
                Not Eligible
              </button>
            `}
          ` : `
            <a href="#faculty/applications?driveId=${drive.id}" class="btn btn-sm btn-outline-primary">
              Review Apps
            </a>
          `}
        </div>
      </div>
    `;
  },

  // ── Filter & Search Logic ─────────────────────────────────
  attachFilterListeners(container, drives) {
    const searchInput = container.querySelector('#drive-search-input');
    const deptSelect = container.querySelector('#filter-dept');
    const salarySelect = container.querySelector('#filter-salary');
    const statusSelect = container.querySelector('#filter-status');
    const eligSelect = container.querySelector('#filter-eligibility');
    const sortSelect = container.querySelector('#sort-by');
    const grid = container.querySelector('#drives-grid');
    const counter = container.querySelector('#visible-count');
    const clearBtn = container.querySelector('#clear-filters-btn');

    const runFilters = () => {
      const q = (searchInput?.value || '').toLowerCase().trim();
      const dept = deptSelect?.value || '';
      const salaryThreshold = salarySelect?.value || 'all';
      const status = statusSelect?.value || 'all';
      const eligFilter = eligSelect?.value || 'all';
      const sort = sortSelect?.value || 'deadline';

      let filtered = drives.filter((d) => {
        // Search query across company, role, skills, description
        if (q) {
          const inCompany = (d.companyName || '').toLowerCase().includes(q);
          const inTitle = (d.jobTitle || '').toLowerCase().includes(q);
          const inSkills = (d.requiredSkills || []).some((s) => s.toLowerCase().includes(q));
          const inDesc = (d.jobDescription || '').toLowerCase().includes(q);
          if (!inCompany && !inTitle && !inSkills && !inDesc) return false;
        }

        // Department filter
        if (dept) {
          const depts = (d.eligibleDepartments || []).map((x) => x.toLowerCase());
          if (depts.length > 0 && !depts.includes(dept.toLowerCase())) return false;
        }

        // Salary package filter
        if (salaryThreshold !== 'all') {
          const numThresh = parseFloat(salaryThreshold);
          // Parse numbers out of salary string (e.g. "₹3.5–9 LPA" or "₹18–28 LPA")
          const numbers = (d.salary || '').match(/[\d.]+/g);
          if (numbers && numbers.length > 0) {
            const maxSalary = Math.max(...numbers.map(Number));
            if (maxSalary < numThresh) return false;
          }
        }

        // Status filter
        const isExpired = d.applicationDeadline && new Date(d.applicationDeadline) < new Date();
        const isClosed = d.status === 'closed' || isExpired;
        const daysLeft = d.applicationDeadline ? Math.ceil((new Date(d.applicationDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 999;

        if (status === 'open') {
          if (isClosed) return false;
        } else if (status === 'urgent') {
          if (isClosed || daysLeft > 5 || daysLeft <= 0) return false;
        } else if (status === 'closed') {
          if (!isClosed) return false;
        }

        // Student eligibility filter
        if (eligFilter === 'eligible') {
          const check = evaluateEligibility(d, this._studentProfile);
          if (!check.eligible) return false;
        } else if (eligFilter === 'applied') {
          if (!this._appliedDriveIds.has(d.id)) return false;
        }

        return true;
      });

      // Sorting
      if (sort === 'company-az') {
        filtered.sort((a, b) => a.companyName.localeCompare(b.companyName));
      } else if (sort === 'salary-high') {
        const getVal = (sal) => {
          const nums = (sal || '').match(/[\d.]+/g);
          return nums ? Math.max(...nums.map(Number)) : 0;
        };
        filtered.sort((a, b) => getVal(b.salary) - getVal(a.salary));
      } else if (sort === 'recent') {
        filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      } else {
        // Earliest deadline
        filtered.sort((a, b) => new Date(a.applicationDeadline || '2099-12-31') - new Date(b.applicationDeadline || '2099-12-31'));
      }

      // Update grid and counter
      if (counter) counter.textContent = filtered.length;
      if (grid) {
        grid.innerHTML = this.renderDrivesCardsHTML(filtered);
        this.attachApplyButtonListeners(grid);
      }
    };

    searchInput?.addEventListener('input', runFilters);
    deptSelect?.addEventListener('change', runFilters);
    salarySelect?.addEventListener('change', runFilters);
    statusSelect?.addEventListener('change', runFilters);
    eligSelect?.addEventListener('change', runFilters);
    sortSelect?.addEventListener('change', runFilters);

    clearBtn?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (deptSelect) deptSelect.value = '';
      if (salarySelect) salarySelect.value = 'all';
      if (statusSelect) statusSelect.value = 'all';
      if (eligSelect) eligSelect.value = 'all';
      if (sortSelect) sortSelect.value = 'deadline';
      runFilters();
    });

    // Default trigger once to ensure "Open & Active" filter is applied cleanly
    runFilters();
  },

  // ── Apply Now Button Listeners ─────────────────────────────
  attachApplyButtonListeners(container) {
    container.querySelectorAll('.apply-now-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const driveId = btn.getAttribute('data-drive-id');
        const drive = this._cachedDrives.find((d) => d.id === driveId);
        if (drive) {
          this.showApplyModal(drive, this._studentProfile, (appliedDriveId) => {
            // Update button instantly to "✓ Applied"
            btn.className = 'btn btn-sm btn-applied';
            btn.disabled = true;
            btn.innerHTML = '✓ Applied';

            // Update card status bar
            const card = btn.closest('.drive-card');
            if (card) {
              card.classList.add('drive-card-applied');
              const statusBar = card.querySelector('.card-eligibility-status');
              if (statusBar) {
                statusBar.className = 'card-eligibility-status status-applied mb-4';
                statusBar.innerHTML = '<span class="status-icon">✓</span><span class="status-text">Application Submitted</span>';
              }
            }
          });
        }
      });
    });
  },

  // ── Interactive Application Confirmation Modal ──────────────
  showApplyModal(drive, profile, onSuccess) {
    const brand = getCompanyBrand(drive.companyName);
    const user = auth.getUser() || {};
    const studentName = profile?.fullName || user.name || 'Student Candidate';
    const rollNo = profile?.rollNumber || profile?.usn || 'Not Specified';
    const dept = profile?.department || 'Engineering';
    const cgpa = profile?.cgpa ? parseFloat(profile.cgpa).toFixed(2) : 'N/A';
    const email = user.email || 'student@campus.edu';

    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop active';
    overlay.innerHTML = `
      <div class="modal-dialog modal-apply-dialog">
        <div class="modal-header">
          <div class="flex items-center gap-3">
            ${brand.svg}
            <div>
              <h3 class="modal-title">Confirm Campus Application</h3>
              <p class="modal-subtitle">${escapeHtml(drive.companyName)} &bull; ${escapeHtml(drive.jobTitle)}</p>
            </div>
          </div>
          <button class="modal-close" id="modal-close-btn">&times;</button>
        </div>

        <div class="modal-body space-y-4">
          <!-- Summary Banner -->
          <div class="apply-summary-banner p-3 rounded-lg flex justify-between items-center bg-gray-50 border">
            <div>
              <div class="text-xs text-muted">Role & Compensation</div>
              <strong class="text-sm font-semibold">${escapeHtml(drive.jobTitle)}</strong>
              <div class="text-xs text-success font-bold">${escapeHtml(drive.salary || 'Competitive CTC')}</div>
            </div>
            <div class="text-right">
              <div class="text-xs text-muted">Deadline</div>
              <strong class="text-xs font-semibold">${formatDate(drive.applicationDeadline)}</strong>
              <div class="text-xs text-muted">📍 ${escapeHtml(drive.location || 'Multiple')}</div>
            </div>
          </div>

          <!-- Student Profile Snapshot -->
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-muted mb-2">Candidate Profile Snapshot</h4>
            <div class="grid-2 gap-2 text-xs p-3 bg-gray-50 rounded-lg border">
              <div><span class="text-muted">Full Name:</span> <strong>${escapeHtml(studentName)}</strong></div>
              <div><span class="text-muted">Roll / USN:</span> <strong>${escapeHtml(rollNo)}</strong></div>
              <div><span class="text-muted">Department:</span> <strong>${escapeHtml(dept)}</strong></div>
              <div><span class="text-muted">CGPA:</span> <strong class="text-primary font-bold">${escapeHtml(cgpa)}</strong> (Min: ${drive.minCGPA || 'None'})</div>
              <div class="col-span-2"><span class="text-muted">Registered Email:</span> <strong>${escapeHtml(email)}</strong></div>
            </div>
          </div>

          <!-- Academic Criteria Verification Checklist -->
          <div class="criteria-checklist space-y-1 text-xs">
            <div class="flex items-center gap-2 text-success">
              <span>✓</span> Minimum CGPA requirement verified (${drive.minCGPA || 'None'} required)
            </div>
            <div class="flex items-center gap-2 text-success">
              <span>✓</span> Department & graduation batch verified
            </div>
            <div class="flex items-center gap-2 text-success">
              <span>✓</span> In-app notifications & placement status tracking enabled
            </div>
          </div>

          <!-- Declaration Checkbox -->
          <div class="apply-declaration-box pt-2 border-t">
            <label class="flex items-start gap-2 cursor-pointer text-xs">
              <input type="checkbox" id="apply-declaration-check" class="mt-0.5" checked />
              <span>
                I certify that my academic records and contact details are accurate. I agree to participate in the selection process as scheduled by the placement cell and ${escapeHtml(drive.companyName)}.
              </span>
            </label>
          </div>
        </div>

        <div class="modal-footer flex justify-between items-center">
          <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
          <button class="btn btn-primary" id="modal-confirm-apply-btn">
            Confirm & Submit Application
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('#modal-close-btn')?.addEventListener('click', close);
    overlay.querySelector('#modal-cancel-btn')?.addEventListener('click', close);

    const check = overlay.querySelector('#apply-declaration-check');
    const submitBtn = overlay.querySelector('#modal-confirm-apply-btn');

    check?.addEventListener('change', () => {
      submitBtn.disabled = !check.checked;
    });

    submitBtn?.addEventListener('click', async () => {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Submitting Application...';

      try {
        const idempotencyKey = `apply-${drive.id}-${Date.now()}`;
        const res = await api.applyForDrive(drive.id, idempotencyKey);

        if (res.success) {
          showToast(`🎉 Application submitted for ${drive.companyName}!`, 'success');
          this._appliedDriveIds.add(drive.id);
          close();
          if (onSuccess) onSuccess(drive.id);
        } else {
          showToast(res.error || 'Failed to submit application', 'error');
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Confirm & Submit Application';
        }
      } catch (err) {
        console.error('[Placements] Apply error:', err);
        // Offline fallback queue
        storage.enqueueOperation({
          type: 'application-submit',
          payload: { driveId: drive.id },
        });
        showToast('Application queued for sync (offline mode)', 'info');
        this._appliedDriveIds.add(drive.id);
        close();
        if (onSuccess) onSuccess(drive.id);
      }
    });
  },

  // ── Drive Detail Page ─────────────────────────────────────
  async renderDriveDetail(container, driveId) {
    container.innerHTML = loadingSpinner('Loading recruitment drive details...');

    try {
      const [driveRes, profileRes, appsRes] = await Promise.all([
        api.getDrive(driveId),
        auth.hasRole('student') ? api.getProfile().catch(() => ({ success: false })) : Promise.resolve({ success: false }),
        auth.hasRole('student') ? api.getApplications().catch(() => ({ success: false })) : Promise.resolve({ success: false }),
      ]);

      const d = driveRes.drive || driveRes.data;
      if (!driveRes.success || !d) {
        container.innerHTML = `
          <div class="card p-6 text-center">
            <h2 class="text-error font-bold mb-2">Drive Not Found</h2>
            <p class="text-sm text-muted mb-4">The requested placement drive does not exist or has been removed.</p>
            <a href="#drives" class="btn btn-primary">&larr; Back to Placement Drives</a>
          </div>
        `;
        return;
      }

      const isStudent = auth.hasRole('student');
      const brand = getCompanyBrand(d.companyName);
      const deadlineInfo = getDeadlineInfo(d.applicationDeadline, d.status);

      // Check applied status
      let hasApplied = false;
      if (appsRes.success) {
        const apps = appsRes.applications || appsRes.data || [];
        hasApplied = apps.some((a) => a.driveId === d.id);
        if (hasApplied) this._appliedDriveIds.add(d.id);
      }

      // Profile and eligibility
      const profile = (profileRes.success && (profileRes.profile || profileRes.data)) ? (profileRes.profile || profileRes.data) : null;
      const eligibility = isStudent ? evaluateEligibility(d, profile) : { eligible: true, reasons: [] };

      // Selection Process breakdown
      let selectionRounds = [];
      if (d.selectionProcess) {
        selectionRounds = d.selectionProcess
          .split(/→|->|\n/)
          .map((r) => r.trim())
          .filter(Boolean);
      }
      if (selectionRounds.length === 0) {
        selectionRounds = [
          'Online Cognitive & Technical Assessment',
          'Technical Domain Interview',
          'HR & Culture Fit Round',
        ];
      }

      container.innerHTML = `
        <!-- Breadcrumb & Back -->
        <div class="mb-4">
          <a href="#drives" class="btn btn-sm btn-ghost">&larr; Back to Placement Drives</a>
        </div>

        <!-- Sample Disclaimer Banner -->
        <div class="alert alert-info mb-5 flex items-start gap-3">
          <span class="text-xl">ℹ️</span>
          <div class="text-sm">
            <strong>Sample Opportunity Notice:</strong> This recruitment profile is an illustrative campus recruitment opportunity used for training and placement simulation. Compensation packages and criteria are editable by placement coordinators.
          </div>
        </div>

        <!-- Hero Header Card -->
        <div class="card drive-hero-card mb-6 p-6">
          <div class="flex justify-between items-start flex-wrap gap-4">
            <div class="flex items-center gap-4">
              <div class="hero-brand-logo">
                ${brand.svg}
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <h1 class="page-title mb-0">${escapeHtml(d.companyName)}</h1>
                  ${d.isSample ? '<span class="badge badge-sample">Sample</span>' : ''}
                </div>
                <div class="text-lg font-medium text-body mb-1">${escapeHtml(d.jobTitle)}</div>
                <div class="text-sm text-muted flex items-center gap-3 flex-wrap">
                  <span>📍 ${escapeHtml(d.location || 'Multiple Locations')}</span>
                  <span>💰 <strong class="text-success font-bold">${escapeHtml(d.salary || 'Competitive')}</strong></span>
                  <span>👥 Openings: <strong>${d.openings || 'Multiple'}</strong></span>
                </div>
              </div>
            </div>

            <!-- Action buttons & status -->
            <div class="flex flex-col items-end gap-2">
              <span class="deadline-pill ${deadlineInfo.pillClass}">
                <span class="pill-dot ${deadlineInfo.isUrgent ? 'pulse' : ''}"></span>
                ${escapeHtml(deadlineInfo.label)}
              </span>

              ${isStudent ? `
                ${hasApplied ? `
                  <button class="btn btn-applied" disabled>✓ Application Submitted</button>
                ` : deadlineInfo.isClosed ? `
                  <button class="btn btn-disabled" disabled>Drive Closed</button>
                ` : eligibility.eligible ? `
                  <button id="hero-apply-btn" class="btn btn-primary">Apply Now &rarr;</button>
                ` : `
                  <button class="btn btn-disabled" disabled title="Academic criteria not met">Not Eligible</button>
                `}
              ` : `
                <a href="#faculty/applications?driveId=${d.id}" class="btn btn-primary">Review Applications</a>
              `}
            </div>
          </div>
        </div>

        <!-- Student Real-time Eligibility Banner -->
        ${isStudent ? `
          <div class="card p-4 mb-6 ${hasApplied ? 'bg-indigo-50 border-indigo-200' : eligibility.eligible ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}">
            <div class="flex items-center gap-3">
              <span class="text-2xl">${hasApplied ? '🎉' : eligibility.eligible ? '✅' : '⚠️'}</span>
              <div>
                <h4 class="font-bold text-sm ${hasApplied ? 'text-indigo-900' : eligibility.eligible ? 'text-green-900' : 'text-amber-900'}">
                  ${hasApplied ? 'You have submitted an application for this drive' : eligibility.eligible ? 'You meet all academic criteria for this placement drive' : 'Eligibility Notice'}
                </h4>
                <ul class="text-xs space-y-0.5 mt-1 text-muted">
                  ${eligibility.reasons.map((r) => `<li>&bull; ${escapeHtml(r)}</li>`).join('')}
                </ul>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- 2-Column Content Grid -->
        <div class="grid-2 gap-6">
          <!-- Left Column: Job Description & Selection Process -->
          <div class="space-y-6">
            <!-- Job Description -->
            <div class="card">
              <h3 class="card-title mb-3">Role Overview & Responsibilities</h3>
              <div class="whitespace-pre-line text-sm text-body leading-relaxed">
                ${escapeHtml(d.jobDescription || 'No description provided.')}
              </div>
            </div>

            <!-- Selection Process Timeline -->
            <div class="card">
              <h3 class="card-title mb-4">Selection Process Breakdown</h3>
              <div class="selection-rounds-timeline space-y-3">
                ${selectionRounds.map((round, idx) => `
                  <div class="selection-round-card flex items-start gap-3 p-3 rounded-lg border bg-gray-50">
                    <div class="round-badge font-bold text-xs bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                      ${idx + 1}
                    </div>
                    <div>
                      <div class="font-semibold text-sm">${escapeHtml(round)}</div>
                      <div class="text-xs text-muted">Evaluation stage for shortlisted campus candidates.</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Right Column: Criteria, Skills & Meta -->
          <div class="space-y-6">
            <!-- Drive Specifications -->
            <div class="card">
              <h3 class="card-title mb-3">Academic & Eligibility Criteria</h3>
              <div class="data-summary-list text-sm space-y-2">
                <div class="summary-item flex justify-between py-1 border-b">
                  <span class="text-muted">Minimum CGPA:</span>
                  <strong class="text-primary">${d.minCGPA ? d.minCGPA.toFixed(1) : 'No Minimum CGPA'}</strong>
                </div>
                <div class="summary-item flex justify-between py-1 border-b">
                  <span class="text-muted">Eligible Branches:</span>
                  <strong class="text-right">${(d.eligibleDepartments || []).join(', ') || 'All Engineering Branches'}</strong>
                </div>
                <div class="summary-item flex justify-between py-1 border-b">
                  <span class="text-muted">Graduation Batches:</span>
                  <strong>${(d.eligibleGraduationYears || []).join(', ') || 'All Batches'}</strong>
                </div>
                <div class="summary-item flex justify-between py-1 border-b">
                  <span class="text-muted">Eligible Degrees:</span>
                  <strong>${(d.eligibleDegrees || []).join(', ') || 'B.Tech / B.E. / MCA'}</strong>
                </div>
                <div class="summary-item flex justify-between py-1 border-b">
                  <span class="text-muted">Application Deadline:</span>
                  <strong>${formatDate(d.applicationDeadline)}</strong>
                </div>
              </div>
            </div>

            <!-- Required Skills -->
            <div class="card">
              <h3 class="card-title mb-3">Required Technical & Soft Skills</h3>
              <div class="flex gap-2 flex-wrap">
                ${(d.requiredSkills || []).map((s) => `<span class="badge badge-skill">${escapeHtml(s)}</span>`).join('')}
              </div>
            </div>

            <!-- Student Checklist -->
            ${isStudent && profile ? `
              <div class="card bg-gray-50 border">
                <h3 class="card-title text-sm mb-3">Your Academic Check</h3>
                <div class="space-y-2 text-xs">
                  <div class="flex justify-between items-center">
                    <span>CGPA (${profile.cgpa || '0'} vs ${d.minCGPA || '0'} min):</span>
                    <strong class="${parseFloat(profile.cgpa || 0) >= (d.minCGPA || 0) ? 'text-success' : 'text-error'}">
                      ${parseFloat(profile.cgpa || 0) >= (d.minCGPA || 0) ? '✓ Meets Criteria' : '✗ Below Minimum'}
                    </strong>
                  </div>
                  <div class="flex justify-between items-center">
                    <span>Department (${profile.department || 'Not Set'}):</span>
                    <strong class="${!d.eligibleDepartments?.length || d.eligibleDepartments.map((x) => x.toLowerCase()).includes((profile.department || '').toLowerCase()) ? 'text-success' : 'text-error'}">
                      ${!d.eligibleDepartments?.length || d.eligibleDepartments.map((x) => x.toLowerCase()).includes((profile.department || '').toLowerCase()) ? '✓ Eligible Branch' : '✗ Ineligible Branch'}
                    </strong>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      // Apply button in hero
      const heroApplyBtn = container.querySelector('#hero-apply-btn');
      heroApplyBtn?.addEventListener('click', () => {
        this.showApplyModal(d, profile, () => {
          this.renderDriveDetail(container, driveId);
        });
      });
    } catch (err) {
      console.error('[Placements] Detail error:', err);
      container.innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
    }
  },

  // ── My Applications (Student View) ────────────────────────
  async renderMyApplications(container) {
    container.innerHTML = loadingSpinner('Loading your submitted applications...');

    try {
      const res = await api.getApplications();
      if (!res.success) {
        container.innerHTML = `<div class="error-banner">${escapeHtml(res.error)}</div>`;
        return;
      }

      const apps = res.applications || res.data || [];

      container.innerHTML = `
        <div class="page-header flex justify-between items-center flex-wrap gap-4 mb-6">
          <div>
            <h1 class="page-title">My Applications</h1>
            <p class="page-subtitle">Track real-time progress, shortlisting, and selection updates for all your campus drives.</p>
          </div>
          <a href="#drives" class="btn btn-primary btn-sm">Explore More Drives</a>
        </div>

        ${apps.length === 0 ? emptyState(
          'No campus applications submitted yet',
          'Browse open placement drives from top recruiters and submit your profile.',
          '<a href="#drives" class="btn btn-primary mt-3">Browse Placement Drives</a>'
        ) : `
          <div class="card p-0 overflow-hidden">
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Role & Package</th>
                    <th>Applied Date</th>
                    <th>Application Status</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${apps.map((app) => {
                    const brand = getCompanyBrand(app.drive?.companyName);
                    return `
                      <tr>
                        <td>
                          <div class="flex items-center gap-3">
                            ${brand.svg}
                            <div>
                              <strong class="font-semibold text-body">${escapeHtml(app.drive?.companyName || 'Company')}</strong>
                              <div class="text-xs text-muted">📍 ${escapeHtml(app.drive?.location || 'India')}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div class="font-medium">${escapeHtml(app.drive?.jobTitle || 'Role')}</div>
                          <div class="text-xs text-success font-semibold">${escapeHtml(app.drive?.salary || '—')}</div>
                        </td>
                        <td class="text-sm">${formatDate(app.appliedAt || app.createdAt)}</td>
                        <td>${statusBadge(app.status)}</td>
                        <td class="text-right">
                          <a href="#drives/${app.driveId}" class="btn btn-xs btn-secondary">
                            View Drive
                          </a>
                        </td>
                      </tr>
                    `;
                  }).join('')}
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
      const drives = res.drives || res.data || [];

      container.innerHTML = `
        <div class="page-header flex justify-between items-center mb-6">
          <div>
            <h1 class="page-title">Manage Placement Drives</h1>
            <p class="page-subtitle">Configure sample opportunities, create new recruitment drives, and review applicants.</p>
          </div>
          <button id="create-drive-btn" class="btn btn-primary">+ Create New Drive</button>
        </div>

        <div class="card p-0 overflow-hidden">
          ${drives.length === 0 ? emptyState('No placement drives created yet', 'Click the button above to publish your first drive.') : `
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Company & Role</th>
                    <th>Package</th>
                    <th>Min CGPA</th>
                    <th>Deadline</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${drives.map((d) => `
                    <tr>
                      <td>
                        <strong>${escapeHtml(d.companyName)}</strong>
                        <div class="text-xs text-muted">${escapeHtml(d.jobTitle)}</div>
                      </td>
                      <td>${escapeHtml(d.salary || '—')}</td>
                      <td><strong>${d.minCGPA || '—'}</strong></td>
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
        <div class="grid-2 gap-4">
          <div class="form-group">
            <label class="form-label">Company Name *</label>
            <input type="text" id="df-company" class="form-input" placeholder="e.g. TCS, Amazon, Infosys" required>
          </div>
          <div class="form-group">
            <label class="form-label">Job Title *</label>
            <input type="text" id="df-title" class="form-input" placeholder="e.g. Assistant System Engineer" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Job Description *</label>
          <textarea id="df-desc" class="form-textarea" rows="3" placeholder="Describe the role, responsibilities, and department" required></textarea>
        </div>
        <div class="grid-2 gap-4">
          <div class="form-group">
            <label class="form-label">Salary / Package</label>
            <input type="text" id="df-salary" class="form-input" placeholder="e.g. ₹4.5–7 LPA">
          </div>
          <div class="form-group">
            <label class="form-label">Location</label>
            <input type="text" id="df-location" class="form-input" placeholder="e.g. Bangalore, Hyderabad">
          </div>
        </div>
        <div class="grid-2 gap-4">
          <div class="form-group">
            <label class="form-label">Min CGPA</label>
            <input type="number" step="0.1" min="0" max="10" id="df-cgpa" class="form-input" value="6.5">
          </div>
          <div class="form-group">
            <label class="form-label">Application Deadline *</label>
            <input type="date" id="df-deadline" class="form-input" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Required Skills (comma separated)</label>
          <input type="text" id="df-skills" class="form-input" placeholder="Python, Java, Problem Solving, SQL">
        </div>
        <div class="form-group">
          <label class="form-label">Selection Process Stages (separated by ->)</label>
          <input type="text" id="df-selection" class="form-input" placeholder="Online Test -> Technical Interview -> HR Round">
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

    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop active';
    overlay.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">Create Placement Drive</h3>
          <button class="modal-close" id="modal-close-df">&times;</button>
        </div>
        <div class="modal-body">${modalContent}</div>
        <div class="modal-footer flex justify-between">
          <button class="btn btn-secondary" id="modal-cancel-df">Cancel</button>
          <button id="submit-drive-btn" class="btn btn-primary">Create Drive</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('#modal-close-df')?.addEventListener('click', close);
    overlay.querySelector('#modal-cancel-df')?.addEventListener('click', close);

    overlay.querySelector('#submit-drive-btn')?.addEventListener('click', async () => {
      const skillsStr = overlay.querySelector('#df-skills').value;
      const data = {
        companyName: overlay.querySelector('#df-company').value.trim(),
        jobTitle: overlay.querySelector('#df-title').value.trim(),
        jobDescription: overlay.querySelector('#df-desc').value.trim(),
        salary: overlay.querySelector('#df-salary').value.trim() || '₹4.5–7 LPA',
        location: overlay.querySelector('#df-location').value.trim() || 'Bangalore',
        minCGPA: parseFloat(overlay.querySelector('#df-cgpa').value) || 0,
        applicationDeadline: new Date(overlay.querySelector('#df-deadline').value).toISOString(),
        selectionProcess: overlay.querySelector('#df-selection').value.trim() || 'Online Assessment -> Technical Interview -> HR',
        requiredSkills: skillsStr ? skillsStr.split(',').map((s) => s.trim()).filter(Boolean) : ['Programming', 'Communication'],
        eligibleDepartments: ['Computer Science', 'Information Technology', 'Electronics'],
        eligibleGraduationYears: [2024, 2025, 2026],
        status: overlay.querySelector('#df-status').value,
        isSample: true,
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
    container.innerHTML = loadingSpinner('Loading candidate applications for review...');

    try {
      const res = await api.getApplications();
      const apps = res.applications || res.data || [];

      container.innerHTML = `
        <div class="page-header mb-6">
          <h1 class="page-title">Review Student Applications</h1>
          <p class="page-subtitle">Inspect candidate profiles, evaluate eligibility, and update selection statuses.</p>
        </div>

        <div class="card p-0 overflow-hidden">
          ${apps.length === 0 ? emptyState('No applications submitted yet', 'Student submissions will appear here.') : `
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Company & Role</th>
                    <th>CGPA</th>
                    <th>Branch</th>
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
                        <strong>${escapeHtml(app.drive?.companyName || '')}</strong>
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
