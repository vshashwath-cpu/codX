import { findById, findOne, findRecords, insertRecord, updateRecord } from '../storage/json-store.js';
import { checkEligibility } from './eligibility.service.js';
import { createNotification } from './notification.service.js';

const VALID_STATUSES = ['applied', 'under-review', 'shortlisted', 'selected', 'rejected', 'offered'];

const VALID_TRANSITIONS = {
  'applied': ['under-review', 'shortlisted', 'rejected'],
  'under-review': ['shortlisted', 'rejected'],
  'shortlisted': ['selected', 'rejected'],
  'selected': ['offered', 'rejected'],
  'rejected': [],
  'offered': [],
};

export async function applyForDrive(studentId, driveId, idempotencyKey) {
  // Check idempotency
  if (idempotencyKey) {
    const existing = await findOne('applications', (a) => a.idempotencyKey === idempotencyKey);
    if (existing) {
      return { duplicate: true, application: existing };
    }
  }

  // Check for existing application
  const existingApp = await findOne('applications', (a) => a.studentId === studentId && a.driveId === driveId);
  if (existingApp) {
    return { duplicate: true, application: existingApp };
  }

  // Check eligibility
  const eligibility = await checkEligibility(studentId, driveId);
  if (!eligibility.eligible) {
    throw Object.assign(new Error('Not eligible: ' + eligibility.reasons.join(' ')), { status: 400 });
  }

  // Create application
  const application = await insertRecord('applications', {
    studentId,
    driveId,
    status: 'applied',
    idempotencyKey: idempotencyKey || null,
    appliedAt: new Date().toISOString(),
  });

  // Create history entry
  await insertRecord('application-history', {
    applicationId: application.id,
    previousStatus: null,
    newStatus: 'applied',
    actorId: studentId,
    remarks: 'Application submitted',
    timestamp: new Date().toISOString(),
  });

  // Create notification for student
  const drive = await findById('placement-drives', driveId);
  await createNotification({
    recipientId: studentId,
    title: 'Application Submitted',
    message: `Your application for ${drive?.jobTitle || 'position'} at ${drive?.companyName || 'company'} has been submitted.`,
    type: 'application',
  });

  return { duplicate: false, application };
}

export async function getApplicationsByStudent(studentId) {
  const apps = await findRecords('applications', (a) => a.studentId === studentId);
  // Enrich with drive data
  const enriched = [];
  for (const app of apps) {
    const drive = await findById('placement-drives', app.driveId);
    enriched.push({ ...app, drive: drive || null });
  }
  return enriched;
}

export async function getApplicationsByDrive(driveId) {
  const apps = await findRecords('applications', (a) => a.driveId === driveId);
  const enriched = [];
  for (const app of apps) {
    const user = await findById('users', app.studentId);
    const profile = await findOne('student-profiles', (p) => p.userId === app.studentId);
    enriched.push({
      ...app,
      student: user ? { id: user.id, name: user.name, email: user.email } : null,
      profile: profile || null,
    });
  }
  return enriched;
}

export async function getApplicationById(applicationId) {
  const app = await findById('applications', applicationId);
  if (!app) return null;

  const drive = await findById('placement-drives', app.driveId);
  const history = await findRecords('application-history', (h) => h.applicationId === applicationId);
  history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return { ...app, drive: drive || null, history };
}

export async function updateApplicationStatus(applicationId, newStatus, actorId, remarks) {
  if (!VALID_STATUSES.includes(newStatus)) {
    throw Object.assign(new Error(`Invalid status: ${newStatus}`), { status: 400 });
  }

  const app = await findById('applications', applicationId);
  if (!app) {
    throw Object.assign(new Error('Application not found'), { status: 404 });
  }

  const allowed = VALID_TRANSITIONS[app.status] || [];
  if (!allowed.includes(newStatus)) {
    throw Object.assign(new Error(`Cannot transition from "${app.status}" to "${newStatus}"`), { status: 400 });
  }

  const previousStatus = app.status;

  const updated = await updateRecord('applications', applicationId, { status: newStatus });

  await insertRecord('application-history', {
    applicationId,
    previousStatus,
    newStatus,
    actorId,
    remarks: remarks || '',
    timestamp: new Date().toISOString(),
  });

  // Notify student
  const drive = await findById('placement-drives', app.driveId);
  const statusLabels = {
    'under-review': 'Under Review',
    'shortlisted': 'Shortlisted',
    'selected': 'Selected',
    'rejected': 'Not Selected',
    'offered': 'Offer Extended',
  };

  await createNotification({
    recipientId: app.studentId,
    title: `Application ${statusLabels[newStatus] || newStatus}`,
    message: `Your application for ${drive?.jobTitle || 'position'} at ${drive?.companyName || 'company'} has been updated to: ${statusLabels[newStatus] || newStatus}.${remarks ? ' Remarks: ' + remarks : ''}`,
    type: newStatus === 'shortlisted' ? 'shortlist' : newStatus === 'selected' || newStatus === 'offered' ? 'selection' : 'status-change',
  });

  return updated;
}

export default { applyForDrive, getApplicationsByStudent, getApplicationsByDrive, getApplicationById, updateApplicationStatus };
