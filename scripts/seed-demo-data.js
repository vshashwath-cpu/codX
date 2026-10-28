/**
 * Seed demo data for development and testing.
 * Safe to run multiple times — skips records with existing IDs.
 * 
 * WARNING: This creates demo accounts with known passwords.
 * Do NOT use in production. Remove or change credentials before deployment.
 * 
 * Demo credentials:
 *   Student:  student@demo.cpg / Demo@1234
 *   Faculty:  faculty@demo.cpg / Demo@1234
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'storage', 'data');

// Fixed UUIDs for demo data to prevent duplicates on re-run
const DEMO_IDS = {
  student1: 'demo-student-0001-0001-000000000001',
  student2: 'demo-student-0002-0002-000000000002',
  student3: 'demo-student-0003-0003-000000000003',
  faculty1: 'demo-faculty-0001-0001-000000000001',
  drive1: 'demo-drive-0001-0001-000000000001',
  drive2: 'demo-drive-0002-0002-000000000002',
  drive3: 'demo-drive-0003-0003-000000000003',
  app1: 'demo-app-0001-0001-000000000001',
  app2: 'demo-app-0002-0002-000000000002',
};

async function readJSON(filename) {
  const filePath = path.join(dataDir, filename);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeJSON(filename, data) {
  const filePath = path.join(dataDir, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function mergeRecords(existing, newRecords) {
  const existingIds = new Set(existing.map((r) => r.id));
  let added = 0;
  for (const record of newRecords) {
    if (!existingIds.has(record.id)) {
      existing.push(record);
      added++;
    }
  }
  return added;
}

async function seed() {
  console.log('\n  College Placement Guide — Demo Data Seeder');
  console.log('  ' + '='.repeat(44) + '\n');

  // Ensure data dir exists
  await fs.mkdir(dataDir, { recursive: true });

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash('Demo@1234', 12);

  // --- USERS ---
  const demoUsers = [
    {
      id: DEMO_IDS.student1,
      email: 'student@demo.cpg',
      password: passwordHash,
      name: 'Aarav Sharma',
      role: 'student',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEMO_IDS.student2,
      email: 'priya@demo.cpg',
      password: passwordHash,
      name: 'Priya Patel',
      role: 'student',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEMO_IDS.student3,
      email: 'rahul@demo.cpg',
      password: passwordHash,
      name: 'Rahul Kumar',
      role: 'student',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEMO_IDS.faculty1,
      email: 'faculty@demo.cpg',
      password: passwordHash,
      name: 'Dr. Meera Nair',
      role: 'faculty',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
  ];

  let users = await readJSON('users.json');
  const usersAdded = mergeRecords(users, demoUsers);
  await writeJSON('users.json', users);
  console.log(`  Users: ${usersAdded} added (${demoUsers.length - usersAdded} already existed)`);

  // --- STUDENT PROFILES ---
  const demoProfiles = [
    {
      id: 'demo-profile-0001-0001-000000000001',
      userId: DEMO_IDS.student1,
      name: 'Aarav Sharma',
      email: 'student@demo.cpg',
      phone: '9876543210',
      rollNumber: 'CS2024001',
      degree: 'B.Tech',
      specialization: 'Computer Science',
      department: 'Computer Science',
      institution: 'National Institute of Technology',
      graduationYear: 2025,
      cgpa: 8.5,
      skills: ['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'Git', 'Docker'],
      projects: [
        { title: 'E-Commerce Platform', description: 'Full-stack web app with React and Node.js', technologies: 'React, Node.js, MongoDB', link: 'https://github.com/aarav/ecommerce' },
        { title: 'ML Image Classifier', description: 'CNN-based image classification using TensorFlow', technologies: 'Python, TensorFlow, Flask', link: '' },
      ],
      internships: [
        { company: 'TechCorp India', role: 'Software Engineering Intern', duration: 'May 2024 - Jul 2024', description: 'Developed REST APIs and microservices' },
      ],
      certifications: ['AWS Cloud Practitioner', 'Google Data Analytics'],
      achievements: ['Dean\'s List 2023-24', 'Hackathon Winner - CodeFest 2024'],
      githubUrl: 'https://github.com/aarav-demo',
      linkedinUrl: 'https://linkedin.com/in/aarav-demo',
      portfolioUrl: 'https://aarav-demo.dev',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-profile-0002-0002-000000000002',
      userId: DEMO_IDS.student2,
      name: 'Priya Patel',
      email: 'priya@demo.cpg',
      phone: '9876543211',
      rollNumber: 'EC2024002',
      degree: 'B.Tech',
      specialization: 'Electronics',
      department: 'Electronics',
      institution: 'National Institute of Technology',
      graduationYear: 2025,
      cgpa: 9.1,
      skills: ['MATLAB', 'Python', 'Embedded Systems', 'VHDL', 'C++'],
      projects: [
        { title: 'IoT Weather Station', description: 'Arduino-based weather monitoring system', technologies: 'Arduino, Python, AWS IoT', link: '' },
      ],
      internships: [],
      certifications: ['MATLAB Certification'],
      achievements: ['Gold Medal - Electronics Design Contest'],
      githubUrl: '',
      linkedinUrl: 'https://linkedin.com/in/priya-demo',
      portfolioUrl: '',
      createdAt: now,
      updatedAt: now,
    },
  ];

  let profiles = await readJSON('student-profiles.json');
  const profilesAdded = mergeRecords(profiles, demoProfiles);
  await writeJSON('student-profiles.json', profiles);
  console.log(`  Profiles: ${profilesAdded} added`);

  // --- PLACEMENT DRIVES ---
  const futureDate1 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const futureDate2 = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString();
  const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

  const demoDrives = [
    {
      id: DEMO_IDS.drive1,
      companyName: 'Google India',
      jobTitle: 'Software Engineer',
      jobDescription: 'Join Google as a Software Engineer. Work on large-scale distributed systems, search infrastructure, and cloud services. You will design, develop, test, deploy, and maintain software solutions.',
      requiredSkills: ['Data Structures', 'Algorithms', 'Python', 'Java', 'System Design'],
      minCGPA: 8.0,
      eligibleDepartments: ['Computer Science', 'Information Technology', 'Electronics'],
      eligibleGraduationYears: [2025],
      eligibleDegrees: ['B.Tech', 'M.Tech'],
      location: 'Bangalore, India',
      salary: '₹25,00,000 per annum',
      applicationDeadline: futureDate1,
      selectionProcess: 'Online Test → Technical Interview (2 rounds) → HR Interview',
      openings: 15,
      status: 'published',
      creatorId: DEMO_IDS.faculty1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEMO_IDS.drive2,
      companyName: 'Microsoft',
      jobTitle: 'Associate Software Developer',
      jobDescription: 'Work with cutting-edge technologies at Microsoft. Develop innovative solutions in Azure cloud services, Office 365, and AI platforms.',
      requiredSkills: ['C++', 'C#', 'JavaScript', 'Cloud Computing'],
      minCGPA: 7.5,
      eligibleDepartments: ['Computer Science', 'Information Technology'],
      eligibleGraduationYears: [2025],
      eligibleDegrees: ['B.Tech', 'M.Tech'],
      location: 'Hyderabad, India',
      salary: '₹22,00,000 per annum',
      applicationDeadline: futureDate2,
      selectionProcess: 'Coding Challenge → Group Discussion → Technical Interview → HR Interview',
      openings: 20,
      status: 'published',
      creatorId: DEMO_IDS.faculty1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEMO_IDS.drive3,
      companyName: 'Infosys',
      jobTitle: 'Systems Engineer',
      jobDescription: 'Join Infosys as a Systems Engineer. Work on digital transformation projects for global clients across banking, healthcare, and retail domains.',
      requiredSkills: ['Java', 'SQL', 'Problem Solving'],
      minCGPA: 6.5,
      eligibleDepartments: ['Computer Science', 'Information Technology', 'Electronics', 'Mechanical', 'Electrical'],
      eligibleGraduationYears: [2025],
      eligibleDegrees: ['B.Tech', 'M.Tech', 'BCA', 'MCA'],
      location: 'Multiple Locations',
      salary: '₹6,50,000 per annum',
      applicationDeadline: pastDate,
      selectionProcess: 'Online Test → Interview',
      openings: 100,
      status: 'closed',
      creatorId: DEMO_IDS.faculty1,
      createdAt: now,
      updatedAt: now,
    },
  ];

  let drives = await readJSON('placement-drives.json');
  const drivesAdded = mergeRecords(drives, demoDrives);
  await writeJSON('placement-drives.json', drives);
  console.log(`  Drives: ${drivesAdded} added`);

  // --- APPLICATIONS ---
  const demoApplications = [
    {
      id: DEMO_IDS.app1,
      studentId: DEMO_IDS.student1,
      driveId: DEMO_IDS.drive1,
      status: 'shortlisted',
      idempotencyKey: 'demo-idem-key-001',
      appliedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEMO_IDS.app2,
      studentId: DEMO_IDS.student1,
      driveId: DEMO_IDS.drive3,
      status: 'applied',
      idempotencyKey: 'demo-idem-key-002',
      appliedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  ];

  let applications = await readJSON('applications.json');
  const appsAdded = mergeRecords(applications, demoApplications);
  await writeJSON('applications.json', applications);
  console.log(`  Applications: ${appsAdded} added`);

  // --- APPLICATION HISTORY ---
  const demoHistory = [
    {
      id: 'demo-hist-0001-0001-000000000001',
      applicationId: DEMO_IDS.app1,
      previousStatus: null,
      newStatus: 'applied',
      actorId: DEMO_IDS.student1,
      remarks: 'Application submitted',
      timestamp: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-hist-0002-0002-000000000002',
      applicationId: DEMO_IDS.app1,
      previousStatus: 'applied',
      newStatus: 'shortlisted',
      actorId: DEMO_IDS.faculty1,
      remarks: 'Strong profile with relevant experience',
      timestamp: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-hist-0003-0003-000000000003',
      applicationId: DEMO_IDS.app2,
      previousStatus: null,
      newStatus: 'applied',
      actorId: DEMO_IDS.student1,
      remarks: 'Application submitted',
      timestamp: now,
      createdAt: now,
      updatedAt: now,
    },
  ];

  let history = await readJSON('application-history.json');
  const histAdded = mergeRecords(history, demoHistory);
  await writeJSON('application-history.json', history);
  console.log(`  History: ${histAdded} added`);

  // --- NOTIFICATIONS ---
  const demoNotifications = [
    {
      id: 'demo-notif-0001-0001-000000000001',
      recipientId: DEMO_IDS.student1,
      title: 'New Placement Drive: Google India',
      message: 'Google India is hiring Software Engineers. Check your eligibility and apply before the deadline!',
      type: 'drive',
      read: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-notif-0002-0002-000000000002',
      recipientId: DEMO_IDS.student1,
      title: 'Application Shortlisted!',
      message: 'Your application for Software Engineer at Google India has been shortlisted. Prepare for the next round.',
      type: 'shortlist',
      read: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-notif-0003-0003-000000000003',
      recipientId: DEMO_IDS.student2,
      title: 'New Placement Drive: Microsoft',
      message: 'Microsoft is hiring Associate Software Developers. Check your eligibility and apply!',
      type: 'drive',
      read: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  let notifications = await readJSON('notifications.json');
  const notifsAdded = mergeRecords(notifications, demoNotifications);
  await writeJSON('notifications.json', notifications);
  console.log(`  Notifications: ${notifsAdded} added`);

  console.log('\n  Demo data seeding complete!');
  console.log('\n  ⚠ Demo credentials (for development only):');
  console.log('    Student:  student@demo.cpg / Demo@1234');
  console.log('    Student:  priya@demo.cpg   / Demo@1234');
  console.log('    Faculty:  faculty@demo.cpg / Demo@1234');
  console.log('\n  ⚠ Change or remove these accounts before any deployment.\n');
}

seed().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
