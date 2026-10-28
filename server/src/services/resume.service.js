import { findById, findRecords, insertRecord, updateRecord, deleteRecord } from '../storage/json-store.js';

export async function createResume(userIdOrData, maybeData) {
  let userId, resumeData;
  if (typeof userIdOrData === 'object' && userIdOrData !== null) {
    userId = userIdOrData.userId;
    resumeData = userIdOrData;
  } else {
    userId = userIdOrData;
    resumeData = maybeData || {};
  }
  return await insertRecord('resumes', {
    userId,
    title: resumeData.title || 'Untitled Resume',
    template: resumeData.template || 'professional',
    sections: {
      personalInfo: resumeData.sections?.personalInfo || {},
      objective: resumeData.sections?.objective || '',
      education: resumeData.sections?.education || [],
      skills: resumeData.sections?.skills || [],
      projects: resumeData.sections?.projects || [],
      internships: resumeData.sections?.internships || [],
      certifications: resumeData.sections?.certifications || [],
      achievements: resumeData.sections?.achievements || [],
      responsibilities: resumeData.sections?.responsibilities || [],
      links: resumeData.sections?.links || {},
    },
  });
}

export async function getResumesByUser(userId) {
  return await findRecords('resumes', (r) => r.userId === userId);
}

export async function getResumeById(resumeId) {
  return await findById('resumes', resumeId);
}

export async function updateResume(resumeId, userIdOrUpdates, maybeUpdates) {
  let userId, updates;
  if (maybeUpdates !== undefined) {
    userId = userIdOrUpdates;
    updates = maybeUpdates;
  } else {
    updates = userIdOrUpdates;
  }

  const resume = await findById('resumes', resumeId);
  if (!resume) {
    throw Object.assign(new Error('Resume not found'), { status: 404 });
  }
  if (userId && resume.userId !== userId) {
    throw Object.assign(new Error('Access denied'), { status: 403 });
  }

  return await updateRecord('resumes', resumeId, updates);
}

export async function deleteResume(resumeId, userId) {
  const resume = await findById('resumes', resumeId);
  if (!resume) {
    throw Object.assign(new Error('Resume not found'), { status: 404 });
  }
  if (resume.userId !== userId) {
    throw Object.assign(new Error('Access denied'), { status: 403 });
  }

  return await deleteRecord('resumes', resumeId);
}

export default { createResume, getResumesByUser, getResumeById, updateResume, deleteResume };
