/**
 * Interactive Resume Builder with Live Preview, PDF Download, and AI Analysis.
 */

import api from './api.js';
import storage from './storage.js';
import { escapeHtml, loadingSpinner, emptyState, showToast, debounce } from './ui.js';

let currentResume = null;

export const resumeBuilder = {
  async render(container, resumeId) {
    if (resumeId) {
      await this.renderEditor(container, resumeId);
    } else {
      await this.renderList(container);
    }
  },

  async renderList(container) {
    container.innerHTML = loadingSpinner('Loading your resumes...');

    try {
      const res = await api.getResumes();
      const resumes = res.resumes || [];

      container.innerHTML = `
        <div class="page-header flex justify-between items-center">
          <div>
            <h1 class="page-title">Resume Builder</h1>
            <p class="page-subtitle">Create, polish, and export professional placement resumes with AI feedback.</p>
          </div>
          <button id="create-new-resume-btn" class="btn btn-primary">+ Create New Resume</button>
        </div>

        ${resumes.length === 0 ? emptyState('No resumes created yet', 'Build your first professional resume using our interactive builder.', '<button id="create-first-resume-btn" class="btn btn-primary">Start Building</button>') : `
          <div class="grid-3-col gap-6">
            ${resumes.map((r) => `
              <div class="card resume-card">
                <div class="flex justify-between items-center mb-3">
                  <h3 class="font-bold">${escapeHtml(r.title || 'Untitled Resume')}</h3>
                  <span class="badge badge-info">${escapeHtml(r.template || 'Professional')}</span>
                </div>
                <p class="text-xs text-muted mb-4">Last updated: ${new Date(r.updatedAt || r.createdAt).toLocaleDateString()}</p>
                <div class="flex gap-2">
                  <a href="#resume-builder/${r.id}" class="btn btn-sm btn-primary flex-1 text-center">Edit</a>
                  <button class="btn btn-sm btn-secondary download-pdf-btn" data-id="${r.id}">PDF</button>
                  <button class="btn btn-sm btn-ghost delete-resume-btn" data-id="${r.id}">🗑</button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      `;

      const createHandler = async () => {
        const title = prompt('Enter a title for your resume:', 'Placement Resume');
        if (!title) return;

        const resCreate = await api.createResume({
          title,
          template: 'professional',
          sections: {
            personalInfo: {},
            objective: '',
            education: [],
            skills: [],
            projects: [],
            internships: [],
            certifications: [],
            achievements: [],
          },
        });

        if (resCreate.success && resCreate.resume) {
          window.location.hash = `#resume-builder/${resCreate.resume.id}`;
        } else {
          showToast(resCreate.error || 'Failed to create resume', 'error');
        }
      };

      container.querySelector('#create-new-resume-btn')?.addEventListener('click', createHandler);
      container.querySelector('#create-first-resume-btn')?.addEventListener('click', createHandler);

      container.querySelectorAll('.download-pdf-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          await this.downloadPDF(id);
        });
      });

      container.querySelectorAll('.delete-resume-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          if (!confirm('Are you sure you want to delete this resume?')) return;
          const id = e.target.getAttribute('data-id');
          await api.deleteResume(id);
          showToast('Resume deleted', 'info');
          this.renderList(container);
        });
      });
    } catch (err) {
      container.innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
    }
  },

  async renderEditor(container, resumeId) {
    container.innerHTML = loadingSpinner('Loading resume editor...');

    try {
      const res = await api.getResume(resumeId);
      if (!res.success || !res.resume) {
        container.innerHTML = `<div class="error-banner">Resume not found</div>`;
        return;
      }

      currentResume = res.resume;
      const s = currentResume.sections || {};
      const pi = s.personalInfo || {};

      container.innerHTML = `
        <div class="page-header flex justify-between items-center">
          <div>
            <a href="#resume-builder" class="btn btn-sm btn-ghost mb-2">&larr; Back to Resumes</a>
            <h1 class="page-title">${escapeHtml(currentResume.title || 'Resume Editor')}</h1>
          </div>
          <div class="flex items-center gap-3">
            <span id="resume-save-indicator" class="text-xs text-muted">All changes saved</span>
            <button id="ai-analyze-btn" class="btn btn-warning btn-sm">✨ AI Review</button>
            <button id="download-editor-pdf-btn" class="btn btn-secondary btn-sm">Download PDF</button>
            <button id="save-resume-btn" class="btn btn-primary btn-sm">Save</button>
          </div>
        </div>

        <div class="resume-editor-layout">
          <!-- Left: Editor Forms -->
          <div class="resume-forms-column space-y-6">
            <!-- Template Selection -->
            <div class="card p-4 flex justify-between items-center">
              <span class="font-medium text-sm">Resume Template:</span>
              <select id="resume-template-select" class="form-select w-auto">
                <option value="professional" ${currentResume.template === 'professional' ? 'selected' : ''}>Professional (Blue)</option>
                <option value="modern" ${currentResume.template === 'modern' ? 'selected' : ''}>Modern (Slate Dark)</option>
              </select>
            </div>

            <!-- Personal Info -->
            <div class="card">
              <h3 class="card-title mb-4">Personal Information</h3>
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label">Full Name</label>
                  <input type="text" id="res-name" class="form-input" value="${escapeHtml(pi.name || '')}">
                </div>
                <div class="form-group">
                  <label class="form-label">Email</label>
                  <input type="email" id="res-email" class="form-input" value="${escapeHtml(pi.email || '')}">
                </div>
                <div class="form-group">
                  <label class="form-label">Phone</label>
                  <input type="tel" id="res-phone" class="form-input" value="${escapeHtml(pi.phone || '')}">
                </div>
                <div class="form-group">
                  <label class="form-label">Location</label>
                  <input type="text" id="res-loc" class="form-input" value="${escapeHtml(pi.location || '')}">
                </div>
              </div>
            </div>

            <!-- Summary / Objective -->
            <div class="card">
              <h3 class="card-title mb-3">Professional Summary / Objective</h3>
              <textarea id="res-objective" class="form-textarea" rows="3" placeholder="Brief 2-3 sentence summary of your career focus and key technical strengths...">${escapeHtml(s.objective || '')}</textarea>
            </div>

            <!-- Technical Skills -->
            <div class="card">
              <h3 class="card-title mb-3">Technical Skills</h3>
              <p class="text-xs text-muted mb-2">Separate skills with commas</p>
              <textarea id="res-skills" class="form-textarea" rows="2" placeholder="JavaScript, Python, React, Node.js, SQL, Docker, Git">${escapeHtml(Array.isArray(s.skills) ? s.skills.join(', ') : s.skills || '')}</textarea>
            </div>
          </div>

          <!-- Right: Live Preview -->
          <div class="resume-preview-column">
            <div class="card resume-preview-card p-6" id="resume-preview-panel">
              <!-- Live preview injected here -->
            </div>
          </div>
        </div>
      `;

      this.attachEditorListeners(container, resumeId);
      this.updateLivePreview();
    } catch (err) {
      container.innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
    }
  },

  updateLivePreview() {
    const preview = document.getElementById('resume-preview-panel');
    if (!preview) return;

    const name = document.getElementById('res-name')?.value || 'Your Name';
    const email = document.getElementById('res-email')?.value || 'email@example.com';
    const phone = document.getElementById('res-phone')?.value || '+91 9876543210';
    const loc = document.getElementById('res-loc')?.value || 'City, Country';
    const obj = document.getElementById('res-objective')?.value || '';
    const skills = document.getElementById('res-skills')?.value || '';

    const template = document.getElementById('resume-template-select')?.value || 'professional';

    preview.innerHTML = `
      <div class="resume-preview-doc ${template === 'modern' ? 'preview-modern' : 'preview-professional'}">
        <div class="text-center mb-4">
          <h2 class="text-2xl font-bold text-primary">${escapeHtml(name)}</h2>
          <div class="text-xs text-muted mt-1">${escapeHtml(email)} &bull; ${escapeHtml(phone)} &bull; ${escapeHtml(loc)}</div>
        </div>

        ${obj ? `
          <div class="preview-section mb-4">
            <h4 class="preview-section-title">Career Objective</h4>
            <p class="text-xs text-gray-700 leading-relaxed">${escapeHtml(obj)}</p>
          </div>
        ` : ''}

        ${skills ? `
          <div class="preview-section mb-4">
            <h4 class="preview-section-title">Technical Skills</h4>
            <p class="text-xs text-gray-700">${escapeHtml(skills)}</p>
          </div>
        ` : ''}
      </div>
    `;
  },

  attachEditorListeners(container, resumeId) {
    const saveIndicator = container.querySelector('#resume-save-indicator');

    const debouncedSave = debounce(async () => {
      this.updateLivePreview();
      const payload = this.collectResumeData();
      storage.saveResumeDraft(resumeId, payload);
      if (saveIndicator) {
        saveIndicator.textContent = 'Draft saved locally';
        saveIndicator.className = 'text-xs text-warning';
      }
    }, 800);

    container.querySelectorAll('.form-input, .form-textarea, .form-select').forEach((el) => {
      el.addEventListener('input', debouncedSave);
    });

    // Save to server button
    container.querySelector('#save-resume-btn')?.addEventListener('click', async () => {
      const payload = this.collectResumeData();
      if (saveIndicator) saveIndicator.textContent = 'Saving to server...';

      const res = await api.updateResume(resumeId, payload);
      if (res.success) {
        storage.clearResumeDraft(resumeId);
        showToast('Resume saved to server!', 'success');
        if (saveIndicator) {
          saveIndicator.textContent = 'All changes saved';
          saveIndicator.className = 'text-xs text-success';
        }
      } else {
        showToast(res.error || 'Failed to save resume', 'error');
      }
    });

    // Download PDF
    container.querySelector('#download-editor-pdf-btn')?.addEventListener('click', async () => {
      await this.downloadPDF(resumeId);
    });

    // AI Review
    container.querySelector('#ai-analyze-btn')?.addEventListener('click', async () => {
      await this.triggerAIAnalysis(container);
    });
  },

  collectResumeData() {
    const skillsRaw = document.getElementById('res-skills')?.value || '';
    const skillsArr = skillsRaw.split(',').map((s) => s.trim()).filter(Boolean);

    return {
      template: document.getElementById('resume-template-select')?.value || 'professional',
      sections: {
        personalInfo: {
          name: document.getElementById('res-name')?.value || '',
          email: document.getElementById('res-email')?.value || '',
          phone: document.getElementById('res-phone')?.value || '',
          location: document.getElementById('res-loc')?.value || '',
        },
        objective: document.getElementById('res-objective')?.value || '',
        skills: skillsArr,
        education: currentResume?.sections?.education || [],
        projects: currentResume?.sections?.projects || [],
        internships: currentResume?.sections?.internships || [],
        certifications: currentResume?.sections?.certifications || [],
        achievements: currentResume?.sections?.achievements || [],
      },
    };
  },

  async downloadPDF(resumeId) {
    try {
      showToast('Generating PDF...', 'info');
      const res = await api.downloadResumePDF(resumeId);
      if (res.success && res.data) {
        const url = window.URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resume-${resumeId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        showToast('PDF downloaded successfully!', 'success');
      } else {
        showToast(res.error || 'Failed to generate PDF', 'error');
      }
    } catch (err) {
      showToast(err.message || 'PDF download failed', 'error');
    }
  },

  async triggerAIAnalysis(container) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">✨ AI Resume Analysis</h3>
          <button class="modal-close" onclick="this.closest('.modal-backdrop').remove()">&times;</button>
        </div>
        <div class="modal-body" id="ai-modal-body">
          <p class="text-sm text-muted mb-4">Paste an optional target job description to get tailored keyword matching and alignment scores:</p>
          <textarea id="ai-target-jd" class="form-textarea mb-4" rows="4" placeholder="Optional: Paste job description here..."></textarea>
          <button id="run-ai-analysis-btn" class="btn btn-primary w-full">Analyze with AI</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#run-ai-analysis-btn').addEventListener('click', async () => {
      const modalBody = overlay.querySelector('#ai-modal-body');
      const jd = overlay.querySelector('#ai-target-jd').value.trim();
      modalBody.innerHTML = loadingSpinner('Analyzing resume with AI (this may take up to 20 seconds)...');

      try {
        const res = await api.analyzeResume({
          resumeId: currentResume.id,
          jobDescription: jd,
        });

        if (res.success && res.analysis) {
          const a = res.analysis;
          modalBody.innerHTML = `
            <div class="ai-analysis-results space-y-4">
              <!-- Score Badge -->
              <div class="text-center p-4 bg-blue-50 rounded-lg">
                <div class="text-3xl font-extrabold text-primary">${a.score} / 100</div>
                <div class="text-xs text-muted mt-1">AI Placement Readiness Score</div>
              </div>

              <!-- Strengths -->
              <div>
                <h4 class="font-bold text-success text-sm mb-1">✓ Key Strengths</h4>
                <ul class="text-xs list-disc list-inside space-y-1">
                  ${(a.strengths || []).map((s) => `<li>${escapeHtml(s)}</li>`).join('')}
                </ul>
              </div>

              <!-- Missing Skills -->
              <div>
                <h4 class="font-bold text-warning text-sm mb-1">⚠ Suggested Skills to Add</h4>
                <div class="flex gap-1 flex-wrap mt-1">
                  ${(a.missingSkills || []).map((s) => `<span class="badge badge-warning text-xs">${escapeHtml(s)}</span>`).join('')}
                </div>
              </div>

              <!-- Actionable Recommendations -->
              <div>
                <h4 class="font-bold text-primary text-sm mb-1">💡 Recommendations</h4>
                <ul class="text-xs list-disc list-inside space-y-1">
                  ${(a.recommendations || []).map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
                </ul>
              </div>

              <p class="text-xs text-muted italic mt-4">${escapeHtml(a.disclaimer || '')}</p>
            </div>
          `;
        } else {
          modalBody.innerHTML = `
            <div class="error-banner mb-4">${escapeHtml(res.error || 'AI Analysis failed')}</div>
            <button class="btn btn-secondary w-full" onclick="this.closest('.modal-backdrop').remove()">Close</button>
          `;
        }
      } catch (err) {
        modalBody.innerHTML = `
          <div class="error-banner mb-4">${escapeHtml(err.message)}</div>
          <button class="btn btn-secondary w-full" onclick="this.closest('.modal-backdrop').remove()">Close</button>
        `;
      }
    });
  },
};

export default resumeBuilder;
