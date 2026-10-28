import { describe, it, expect, beforeAll } from 'vitest';
import { checkEligibility } from '../server/src/services/eligibility.service.js';
import { insertRecord, deleteRecord } from '../server/src/storage/json-store.js';
import { initializeStorage } from '../server/src/storage/storage-init.js';

describe('Eligibility Service', () => {
  let studentUser;
  let studentProfile;
  let drive;

  beforeAll(async () => {
    await initializeStorage();

    studentUser = await insertRecord('users', {
      email: `elig_${Date.now()}@test.cpg`,
      role: 'student',
      name: 'Eligible Candidate',
    });

    studentProfile = await insertRecord('student-profiles', {
      userId: studentUser.id,
      name: 'Eligible Candidate',
      cgpa: 8.5,
      department: 'Computer Science',
      graduationYear: 2025,
      degree: 'B.Tech',
    });

    drive = await insertRecord('placement-drives', {
      companyName: 'Acme Tech',
      jobTitle: 'Developer',
      minCGPA: 8.0,
      eligibleDepartments: ['Computer Science', 'Information Technology'],
      eligibleGraduationYears: [2025],
      eligibleDegrees: ['B.Tech'],
      status: 'published',
      applicationDeadline: new Date(Date.now() + 86400000).toISOString(),
    });
  });

  it('should return eligible: true when student meets all criteria', async () => {
    const res = await checkEligibility(studentUser.id, drive.id);
    expect(res.eligible).toBe(true);
    expect(res.reasons).toBeDefined();
  });

  it('should return eligible: false when CGPA is below requirement', async () => {
    const highDrive = await insertRecord('placement-drives', {
      companyName: 'Strict Corp',
      minCGPA: 9.0, // Higher than student's 8.5
      status: 'published',
      applicationDeadline: new Date(Date.now() + 86400000).toISOString(),
    });

    const res = await checkEligibility(studentUser.id, highDrive.id);
    expect(res.eligible).toBe(false);
    expect(res.reasons.some((r) => r.includes('CGPA'))).toBe(true);

    await deleteRecord('placement-drives', highDrive.id);
  });
});
