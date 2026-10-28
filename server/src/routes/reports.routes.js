import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  readCollection,
  findRecords,
  findOne,
  countRecords,
} from '../storage/json-store.js';

const router = Router();

// All report routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// GET /api/dashboard/student — student dashboard data
// ---------------------------------------------------------------------------
router.get('/dashboard/student', authorize('student'), async (req, res) => {
  try {
    const userId = req.session.userId;

    // Profile completion
    const profile = await findOne(
      'student-profiles',
      (p) => p.userId === userId
    );
    const profileCompletion = calculateProfileCompletion(profile);

    // Available published drives
    const drives = await findRecords(
      'placement-drives',
      (d) => d.status === 'published'
    );

    // Application summary
    const applications = await findRecords(
      'applications',
      (a) => a.studentId === userId
    );

    const applicationsSummary = {
      total: applications.length,
      pending: applications.filter((a) => a.status === 'pending').length,
      reviewed: applications.filter((a) => a.status === 'reviewed').length,
      shortlisted: applications.filter((a) => a.status === 'shortlisted').length,
      selected: applications.filter((a) => a.status === 'selected').length,
      rejected: applications.filter((a) => a.status === 'rejected').length,
    };

    // Recent notifications
    const allNotifications = await findRecords(
      'notifications',
      (n) => n.userId === userId
    );
    const recentNotifications = allNotifications
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5);

    return res.status(200).json({
      success: true,
      data: {
        profileCompletion,
        availableDrives: drives.length,
        applicationsSummary,
        recentNotifications,
      },
    });
  } catch (err) {
    console.error('[Reports] Student dashboard error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to load student dashboard.',
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/dashboard/faculty — faculty dashboard
// ---------------------------------------------------------------------------
router.get('/dashboard/faculty', authorize('faculty', 'admin'), async (req, res) => {
  try {
    const userId = req.session.userId;

    // Drives created by this faculty
    const myDrives = await findRecords(
      'placement-drives',
      (d) => d.creatorId === userId
    );

    const activeDrives = myDrives.filter(
      (d) => d.status === 'published'
    ).length;

    // Application counts for faculty's drives
    const driveIds = new Set(myDrives.map((d) => d.id));
    const applications = await findRecords('applications', (a) =>
      driveIds.has(a.driveId)
    );

    const applicationCounts = {
      total: applications.length,
      pending: applications.filter((a) => a.status === 'pending').length,
      reviewed: applications.filter((a) => a.status === 'reviewed').length,
      shortlisted: applications.filter((a) => a.status === 'shortlisted').length,
      selected: applications.filter((a) => a.status === 'selected').length,
      rejected: applications.filter((a) => a.status === 'rejected').length,
    };

    return res.status(200).json({
      success: true,
      data: {
        totalDrives: myDrives.length,
        activeDrives,
        applicationCounts,
      },
    });
  } catch (err) {
    console.error('[Reports] Faculty dashboard error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to load faculty dashboard.',
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/dashboard/admin — admin dashboard
// ---------------------------------------------------------------------------
router.get('/dashboard/admin', authorize('admin'), async (req, res) => {
  try {
    const users = await readCollection('users');
    const drives = await readCollection('placement-drives');
    const applications = await readCollection('applications');

    const userCounts = {
      total: users.length,
      students: users.filter((u) => u.role === 'student').length,
      faculty: users.filter((u) => u.role === 'faculty').length,
      admins: users.filter((u) => u.role === 'admin').length,
      pending: users.filter(
        (u) => u.role === 'faculty' && u.status === 'pending'
      ).length,
    };

    const driveCounts = {
      total: drives.length,
      draft: drives.filter((d) => d.status === 'draft').length,
      published: drives.filter((d) => d.status === 'published').length,
      closed: drives.filter((d) => d.status === 'closed').length,
      archived: drives.filter((d) => d.status === 'archived').length,
    };

    const applicationStats = {
      total: applications.length,
      pending: applications.filter((a) => a.status === 'pending').length,
      reviewed: applications.filter((a) => a.status === 'reviewed').length,
      shortlisted: applications.filter((a) => a.status === 'shortlisted').length,
      selected: applications.filter((a) => a.status === 'selected').length,
      rejected: applications.filter((a) => a.status === 'rejected').length,
    };

    const pendingFacultyRequests = users.filter(
      (u) => u.role === 'faculty' && u.status === 'pending'
    ).length;

    return res.status(200).json({
      success: true,
      data: {
        userCounts,
        driveCounts,
        applicationStats,
        pendingFacultyRequests,
      },
    });
  } catch (err) {
    console.error('[Reports] Admin dashboard error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to load admin dashboard.',
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reports/placements — placement report (faculty/admin)
// ---------------------------------------------------------------------------
router.get(
  '/reports/placements',
  authorize('faculty', 'admin'),
  async (req, res) => {
    try {
      const drives = await readCollection('placement-drives');
      const applications = await readCollection('applications');
      const users = await readCollection('users');

      // Build a student lookup
      const studentMap = new Map();
      for (const u of users) {
        if (u.role === 'student') {
          const { password: _pw, ...safe } = u;
          studentMap.set(u.id, safe);
        }
      }

      // Build placement data per drive
      const placements = [];
      for (const drive of drives) {
        const driveApps = applications.filter((a) => a.driveId === drive.id);
        const selected = driveApps.filter((a) => a.status === 'selected');

        placements.push({
          driveId: drive.id,
          companyName: drive.companyName,
          jobTitle: drive.jobTitle,
          salary: drive.salary,
          location: drive.location,
          totalApplications: driveApps.length,
          shortlisted: driveApps.filter((a) => a.status === 'shortlisted').length,
          selected: selected.length,
          rejected: driveApps.filter((a) => a.status === 'rejected').length,
          selectedStudents: selected.map((a) => ({
            applicationId: a.id,
            student: studentMap.get(a.studentId) || { id: a.studentId },
            appliedAt: a.createdAt,
          })),
        });
      }

      // Summary stats
      const totalStudentsPlaced = new Set(
        applications
          .filter((a) => a.status === 'selected')
          .map((a) => a.studentId)
      ).size;

      const totalOffers = applications.filter(
        (a) => a.status === 'selected'
      ).length;

      return res.status(200).json({
        success: true,
        data: {
          summary: {
            totalDrives: drives.length,
            totalApplications: applications.length,
            totalStudentsPlaced,
            totalOffers,
          },
          placements,
        },
      });
    } catch (err) {
      console.error('[Reports] Placements error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate placement report.',
      });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/reports/placements/export — CSV export (faculty/admin)
// ---------------------------------------------------------------------------
router.get(
  '/reports/placements/export',
  authorize('faculty', 'admin'),
  async (req, res) => {
    try {
      const drives = await readCollection('placement-drives');
      const applications = await readCollection('applications');
      const users = await readCollection('users');

      const userMap = new Map();
      for (const u of users) {
        userMap.set(u.id, u);
      }

      const driveMap = new Map();
      for (const d of drives) {
        driveMap.set(d.id, d);
      }

      // CSV header
      const csvRows = [
        [
          'Application ID',
          'Student Name',
          'Student Email',
          'Company',
          'Job Title',
          'Status',
          'Salary',
          'Location',
          'Applied At',
          'Remarks',
        ].join(','),
      ];

      for (const app of applications) {
        const student = userMap.get(app.studentId);
        const drive = driveMap.get(app.driveId);

        csvRows.push(
          [
            escapeCSV(app.id),
            escapeCSV(student?.name || 'Unknown'),
            escapeCSV(student?.email || 'Unknown'),
            escapeCSV(drive?.companyName || 'Unknown'),
            escapeCSV(drive?.jobTitle || 'Unknown'),
            escapeCSV(app.status || ''),
            escapeCSV(drive?.salary || ''),
            escapeCSV(drive?.location || ''),
            escapeCSV(app.createdAt || ''),
            escapeCSV(app.remarks || ''),
          ].join(',')
        );
      }

      const csvContent = csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="placement-report-${new Date().toISOString().slice(0, 10)}.csv"`
      );

      return res.send(csvContent);
    } catch (err) {
      console.error('[Reports] CSV export error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to export placement report.',
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate profile completion percentage based on filled fields.
 */
function calculateProfileCompletion(profile) {
  if (!profile) return 0;

  const fields = [
    'name',
    'email',
    'phone',
    'rollNumber',
    'degree',
    'specialization',
    'department',
    'institution',
    'graduationYear',
    'cgpa',
  ];

  const arrayFields = [
    'skills',
    'projects',
    'internships',
    'certifications',
    'achievements',
  ];

  const totalFields = fields.length + arrayFields.length;
  let filledCount = 0;

  for (const f of fields) {
    if (profile[f] !== undefined && profile[f] !== null && profile[f] !== '') {
      filledCount++;
    }
  }

  for (const f of arrayFields) {
    if (Array.isArray(profile[f]) && profile[f].length > 0) {
      filledCount++;
    }
  }

  return Math.round((filledCount / totalFields) * 100);
}

/**
 * Escape a value for CSV output.
 */
function escapeCSV(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default router;
