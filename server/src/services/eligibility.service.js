import { findById, findOne } from '../storage/json-store.js';

/**
 * Check if a student is eligible for a placement drive.
 * @param {string} studentId - User ID of the student
 * @param {string} driveId - ID of the placement drive
 * @returns {{ eligible: boolean, reasons: string[] }}
 */
export async function checkEligibility(studentId, driveId) {
  const reasons = [];

  const profile = await findOne('student-profiles', (p) => p.userId === studentId);
  if (!profile) {
    return { eligible: false, reasons: ['Student profile not found. Please complete your profile first.'] };
  }

  const drive = await findById('placement-drives', driveId);
  if (!drive) {
    return { eligible: false, reasons: ['Placement drive not found.'] };
  }

  if (drive.status !== 'published') {
    reasons.push(`Drive is not open for applications (status: ${drive.status}).`);
  }

  if (drive.applicationDeadline && new Date(drive.applicationDeadline) < new Date()) {
    reasons.push('Application deadline has passed.');
  }

  if (drive.minCGPA && profile.cgpa < drive.minCGPA) {
    reasons.push(`Minimum CGPA required: ${drive.minCGPA}. Your CGPA: ${profile.cgpa}.`);
  }

  if (drive.eligibleDepartments && drive.eligibleDepartments.length > 0) {
    const depts = drive.eligibleDepartments.map((d) => d.toLowerCase());
    if (!depts.includes((profile.department || '').toLowerCase())) {
      reasons.push(`Your department (${profile.department || 'not set'}) is not eligible. Eligible: ${drive.eligibleDepartments.join(', ')}.`);
    }
  }

  if (drive.eligibleGraduationYears && drive.eligibleGraduationYears.length > 0) {
    if (!drive.eligibleGraduationYears.includes(profile.graduationYear)) {
      reasons.push(`Your graduation year (${profile.graduationYear || 'not set'}) is not eligible. Eligible: ${drive.eligibleGraduationYears.join(', ')}.`);
    }
  }

  if (drive.eligibleDegrees && drive.eligibleDegrees.length > 0) {
    const degrees = drive.eligibleDegrees.map((d) => d.toLowerCase());
    if (!degrees.includes((profile.degree || '').toLowerCase())) {
      reasons.push(`Your degree (${profile.degree || 'not set'}) is not eligible. Eligible: ${drive.eligibleDegrees.join(', ')}.`);
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons: reasons.length === 0 ? ['You meet all eligibility criteria.'] : reasons,
  };
}

export default { checkEligibility };
