/**
 * Student Profile management module.
 * Supports auto-saving drafts to LocalStorage and server synchronization.
 */

import api from './api.js';
import storage from './storage.js';
import { escapeHtml, loadingSpinner, showToast, debounce } from './ui.js';

let profileData = {};

export const profile = {
  async render(container) {
    container.innerHTML = loadingSpinner('Loading profile...');

    try {
      // Load draft first
      const draft = storage.getProfileDraft();

      // Fetch authoritative from server
      const res = await api.getProfile();
      if (res.success && res.profile) {
        profileData = res.profile;
      } else if (draft) {
        profileData = draft;
      } else {
        profileData = {};
      }

      this.renderForm(container, draft);
    } catch (err) {
      container.innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
    }
  },

  renderForm(container, draft) {
    const p = profileData;
    const skillsList = p.skills || [];
    const projectsList = p.projects || [];
    const internshipsList = p.internships || [];
    const certificationsList = p.certifications || [];
    const achievementsList = p.achievements || [];

    const hasDraft = draft && draft.savedAt;

    container.innerHTML = `
      <div class="page-header flex justify-between items-center">
        <div>
          <h1 class="page-title">My Profile</h1>
          <p class="page-subtitle">Keep your academic and professional details updated for placement eligibility.</p>
        </div>
        <div class="flex items-center gap-3">
          <span id="save-status-indicator" class="text-xs text-muted">
            ${hasDraft ? 'Draft restored from local storage' : 'All changes saved to server'}
          </span>
          <button type="button" id="save-profile-btn" class="btn btn-primary">Save Profile</button>
        </div>
      </div>

      <form id="profile-form" class="space-y-6">
        <!-- Basic Information -->
        <div class="card">
          <h3 class="card-title mb-4">Basic Information</h3>
          <div class="form-grid-3">
            <div class="form-group">
              <label class="form-label" for="prof-name">Full Name *</label>
              <input type="text" id="prof-name" class="form-input" value="${escapeHtml(p.name || '')}" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="prof-email">Email Address *</label>
              <input type="email" id="prof-email" class="form-input" value="${escapeHtml(p.email || '')}" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="prof-phone">Phone Number</label>
              <input type="tel" id="prof-phone" class="form-input" value="${escapeHtml(p.phone || '')}">
            </div>
          </div>
        </div>

        <!-- Academic Details -->
        <div class="card">
          <h3 class="card-title mb-4">Academic Details</h3>
          <div class="form-grid-3">
            <div class="form-group">
              <label class="form-label" for="prof-roll">Roll Number *</label>
              <input type="text" id="prof-roll" class="form-input" value="${escapeHtml(p.rollNumber || '')}" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="prof-degree">Degree *</label>
              <select id="prof-degree" class="form-select" required>
                <option value="">Select Degree</option>
                ${['B.Tech', 'M.Tech', 'BCA', 'MCA', 'B.Sc', 'M.Sc'].map((d) => `
                  <option value="${d}" ${p.degree === d ? 'selected' : ''}>${d}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="prof-dept">Department *</label>
              <select id="prof-dept" class="form-select" required>
                <option value="">Select Department</option>
                ${['Computer Science', 'Information Technology', 'Electronics', 'Electrical', 'Mechanical', 'Civil'].map((dept) => `
                  <option value="${dept}" ${p.department === dept ? 'selected' : ''}>${dept}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="prof-spec">Specialization</label>
              <input type="text" id="prof-spec" class="form-input" value="${escapeHtml(p.specialization || '')}">
            </div>
            <div class="form-group">
              <label class="form-label" for="prof-year">Graduation Year *</label>
              <input type="number" id="prof-year" class="form-input" value="${p.graduationYear || 2025}" min="2020" max="2035" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="prof-cgpa">CGPA (out of 10) *</label>
              <input type="number" step="0.01" min="0" max="10" id="prof-cgpa" class="form-input" value="${p.cgpa || ''}" required>
            </div>
          </div>
          <div class="form-group mt-3">
            <label class="form-label" for="prof-inst">Institution / College Name</label>
            <input type="text" id="prof-inst" class="form-input" value="${escapeHtml(p.institution || '')}">
          </div>
        </div>

        <!-- Technical Skills -->
        <div class="card">
          <h3 class="card-title mb-2">Technical Skills</h3>
          <p class="text-muted text-sm mb-4">Add skills that best reflect your technical knowledge.</p>
          <div class="skills-input-wrapper">
            <div class="skills-tags-container" id="skills-tags">
              ${skillsList.map((skill) => `
                <span class="skill-tag">
                  ${escapeHtml(skill)}
                  <button type="button" class="remove-skill-btn" data-skill="${escapeHtml(skill)}">&times;</button>
                </span>
              `).join('')}
            </div>
            <div class="flex gap-2 mt-3">
              <input type="text" id="new-skill-input" class="form-input" placeholder="Type a skill and press Enter or Add">
              <button type="button" id="add-skill-btn" class="btn btn-secondary">Add</button>
            </div>
          </div>
        </div>

        <!-- Projects -->
        <div class="card">
          <div class="flex justify-between items-center mb-4">
            <h3 class="card-title">Projects</h3>
            <button type="button" id="add-project-btn" class="btn btn-sm btn-secondary">+ Add Project</button>
          </div>
          <div id="projects-list" class="space-y-4">
            ${projectsList.map((proj, idx) => this.renderProjectItem(proj, idx)).join('')}
          </div>
        </div>

        <!-- Internships & Work Experience -->
        <div class="card">
          <div class="flex justify-between items-center mb-4">
            <h3 class="card-title">Internships & Work Experience</h3>
            <button type="button" id="add-internship-btn" class="btn btn-sm btn-secondary">+ Add Experience</button>
          </div>
          <div id="internships-list" class="space-y-4">
            ${internshipsList.map((exp, idx) => this.renderInternshipItem(exp, idx)).join('')}
          </div>
        </div>

        <!-- Online Profiles / Links -->
        <div class="card">
          <h3 class="card-title mb-4">Online Profiles & Links</h3>
          <div class="form-grid-3">
            <div class="form-group">
              <label class="form-label" for="prof-github">GitHub Profile URL</label>
              <input type="url" id="prof-github" class="form-input" value="${escapeHtml(p.githubUrl || '')}" placeholder="https://github.com/username">
            </div>
            <div class="form-group">
              <label class="form-label" for="prof-linkedin">LinkedIn Profile URL</label>
              <input type="url" id="prof-linkedin" class="form-input" value="${escapeHtml(p.linkedinUrl || '')}" placeholder="https://linkedin.com/in/username">
            </div>
            <div class="form-group">
              <label class="form-label" for="prof-portfolio">Portfolio / Website URL</label>
              <input type="url" id="prof-portfolio" class="form-input" value="${escapeHtml(p.portfolioUrl || '')}" placeholder="https://yourportfolio.dev">
            </div>
          </div>
        </div>
      </form>
    `;

    this.attachEventListeners(container);
  },

  renderProjectItem(proj = {}, idx) {
    return `
      <div class="repeatable-card" data-index="${idx}">
        <div class="flex justify-between items-center mb-2">
          <h4 class="font-medium text-sm">Project #${idx + 1}</h4>
          <button type="button" class="btn btn-xs btn-danger remove-project-btn" data-index="${idx}">Remove</button>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">Project Title</label>
            <input type="text" class="form-input proj-title" value="${escapeHtml(proj.title || '')}" placeholder="e.g., E-Commerce Platform">
          </div>
          <div class="form-group">
            <label class="form-label">Technologies Used</label>
            <input type="text" class="form-input proj-tech" value="${escapeHtml(proj.technologies || '')}" placeholder="e.g., React, Node.js, MongoDB">
          </div>
        </div>
        <div class="form-group mt-2">
          <label class="form-label">Description</label>
          <textarea class="form-textarea proj-desc" rows="2" placeholder="Briefly describe what you built, features, and your contribution">${escapeHtml(proj.description || '')}</textarea>
        </div>
        <div class="form-group mt-2">
          <label class="form-label">Project / Demo Link</label>
          <input type="url" class="form-input proj-link" value="${escapeHtml(proj.link || '')}" placeholder="https://github.com/...">
        </div>
      </div>
    `;
  },

  renderInternshipItem(exp = {}, idx) {
    return `
      <div class="repeatable-card" data-index="${idx}">
        <div class="flex justify-between items-center mb-2">
          <h4 class="font-medium text-sm">Experience #${idx + 1}</h4>
          <button type="button" class="btn btn-xs btn-danger remove-internship-btn" data-index="${idx}">Remove</button>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">Company Name</label>
            <input type="text" class="form-input exp-company" value="${escapeHtml(exp.company || '')}" placeholder="e.g., TechCorp India">
          </div>
          <div class="form-group">
            <label class="form-label">Role / Designation</label>
            <input type="text" class="form-input exp-role" value="${escapeHtml(exp.role || '')}" placeholder="e.g., Software Engineering Intern">
          </div>
        </div>
        <div class="form-group mt-2">
          <label class="form-label">Duration</label>
          <input type="text" class="form-input exp-duration" value="${escapeHtml(exp.duration || '')}" placeholder="e.g., May 2024 - Jul 2024">
        </div>
        <div class="form-group mt-2">
          <label class="form-label">Description</label>
          <textarea class="form-textarea exp-desc" rows="2" placeholder="Describe your key responsibilities and achievements">${escapeHtml(exp.description || '')}</textarea>
        </div>
      </div>
    `;
  },

  collectFormData() {
    // Collect basic & academic
    const data = {
      name: document.getElementById('prof-name')?.value.trim() || '',
      email: document.getElementById('prof-email')?.value.trim() || '',
      phone: document.getElementById('prof-phone')?.value.trim() || '',
      rollNumber: document.getElementById('prof-roll')?.value.trim() || '',
      degree: document.getElementById('prof-degree')?.value || '',
      department: document.getElementById('prof-dept')?.value || '',
      specialization: document.getElementById('prof-spec')?.value.trim() || '',
      graduationYear: parseInt(document.getElementById('prof-year')?.value, 10) || 2025,
      cgpa: parseFloat(document.getElementById('prof-cgpa')?.value) || 0,
      institution: document.getElementById('prof-inst')?.value.trim() || '',
      githubUrl: document.getElementById('prof-github')?.value.trim() || '',
      linkedinUrl: document.getElementById('prof-linkedin')?.value.trim() || '',
      portfolioUrl: document.getElementById('prof-portfolio')?.value.trim() || '',
      skills: profileData.skills || [],
      projects: [],
      internships: [],
      certifications: profileData.certifications || [],
      achievements: profileData.achievements || [],
    };

    // Collect projects
    document.querySelectorAll('#projects-list .repeatable-card').forEach((card) => {
      data.projects.push({
        title: card.querySelector('.proj-title')?.value.trim() || '',
        technologies: card.querySelector('.proj-tech')?.value.trim() || '',
        description: card.querySelector('.proj-desc')?.value.trim() || '',
        link: card.querySelector('.proj-link')?.value.trim() || '',
      });
    });

    // Collect internships
    document.querySelectorAll('#internships-list .repeatable-card').forEach((card) => {
      data.internships.push({
        company: card.querySelector('.exp-company')?.value.trim() || '',
        role: card.querySelector('.exp-role')?.value.trim() || '',
        duration: card.querySelector('.exp-duration')?.value.trim() || '',
        description: card.querySelector('.exp-desc')?.value.trim() || '',
      });
    });

    return data;
  },

  attachEventListeners(container) {
    const indicator = container.querySelector('#save-status-indicator');

    // Auto-save draft on any input change (debounced 1s)
    const debouncedSaveDraft = debounce(() => {
      const current = this.collectFormData();
      storage.saveProfileDraft(current);
      if (indicator) {
        indicator.textContent = 'Draft saved locally';
        indicator.className = 'text-xs text-warning';
      }
    }, 1000);

    container.querySelector('#profile-form')?.addEventListener('input', debouncedSaveDraft);

    // Save button (server save)
    container.querySelector('#save-profile-btn')?.addEventListener('click', async () => {
      const data = this.collectFormData();

      if (!data.name || !data.email || !data.rollNumber || !data.degree || !data.department) {
        showToast('Please fill in all required fields marked with *', 'error');
        return;
      }

      if (indicator) {
        indicator.textContent = 'Saving to server...';
        indicator.className = 'text-xs text-muted';
      }

      try {
        const res = await api.updateProfile(data);
        if (res.success) {
          storage.clearProfileDraft();
          profileData = res.profile;
          showToast('Profile saved successfully!', 'success');
          if (indicator) {
            indicator.textContent = 'All changes saved to server';
            indicator.className = 'text-xs text-success';
          }
        } else {
          showToast(res.error || 'Failed to save profile', 'error');
        }
      } catch (err) {
        // If offline, queue for sync
        storage.enqueueOperation({
          type: 'profile-update',
          payload: data,
        });
        showToast('You are offline. Changes saved locally and queued for sync.', 'info');
        if (indicator) {
          indicator.textContent = 'Queued for sync';
          indicator.className = 'text-xs text-warning';
        }
      }
    });

    // Skills handling
    const skillInput = container.querySelector('#new-skill-input');
    const addSkillBtn = container.querySelector('#add-skill-btn');
    const tagsContainer = container.querySelector('#skills-tags');

    const addSkill = () => {
      const val = skillInput.value.trim();
      if (!val) return;
      if (!profileData.skills) profileData.skills = [];
      if (!profileData.skills.includes(val)) {
        profileData.skills.push(val);
        const span = document.createElement('span');
        span.className = 'skill-tag';
        span.innerHTML = `${escapeHtml(val)} <button type="button" class="remove-skill-btn" data-skill="${escapeHtml(val)}">&times;</button>`;
        tagsContainer.appendChild(span);
        skillInput.value = '';
        debouncedSaveDraft();
      }
    };

    addSkillBtn?.addEventListener('click', addSkill);
    skillInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSkill();
      }
    });

    tagsContainer?.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-skill-btn')) {
        const skill = e.target.getAttribute('data-skill');
        profileData.skills = (profileData.skills || []).filter((s) => s !== skill);
        e.target.parentElement.remove();
        debouncedSaveDraft();
      }
    });

    // Add Project button
    container.querySelector('#add-project-btn')?.addEventListener('click', () => {
      const list = container.querySelector('#projects-list');
      const idx = list.querySelectorAll('.repeatable-card').length;
      const div = document.createElement('div');
      div.innerHTML = this.renderProjectItem({}, idx);
      list.appendChild(div.firstElementChild);
      debouncedSaveDraft();
    });

    // Add Internship button
    container.querySelector('#add-internship-btn')?.addEventListener('click', () => {
      const list = container.querySelector('#internships-list');
      const idx = list.querySelectorAll('.repeatable-card').length;
      const div = document.createElement('div');
      div.innerHTML = this.renderInternshipItem({}, idx);
      list.appendChild(div.firstElementChild);
      debouncedSaveDraft();
    });

    // Remove handlers
    container.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-project-btn')) {
        e.target.closest('.repeatable-card').remove();
        debouncedSaveDraft();
      }
      if (e.target.classList.contains('remove-internship-btn')) {
        e.target.closest('.repeatable-card').remove();
        debouncedSaveDraft();
      }
    });
  },
};

export default profile;
