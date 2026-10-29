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
  drive1: 'demo-drive-0001-tcs0-000000000001',
  drive2: 'demo-drive-0002-infy-000000000002',
  drive3: 'demo-drive-0003-wipr-000000000003',
  drive4: 'demo-drive-0004-accn-000000000004',
  drive5: 'demo-drive-0005-capg-000000000005',
  drive6: 'demo-drive-0006-amzn-000000000006',
  driveClosed: 'demo-drive-0007-clos-000000000007',
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
  const futureDateTCS = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString();
  const futureDateInfosys = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString();
  const futureDateWipro = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString();
  const futureDateAccenture = new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString();
  const futureDateCapgemini = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();
  const futureDateAmazon = new Date(Date.now() + 50 * 24 * 60 * 60 * 1000).toISOString();
  const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

  const demoDrives = [
    {
      id: DEMO_IDS.drive1,
      companyName: 'TCS (Tata Consultancy Services)',
      jobTitle: 'Assistant System Engineer',
      jobDescription: 'Tata Consultancy Services is hiring Assistant System Engineers for its premier global delivery teams. Selected candidates undergo comprehensive technical enablement and work on enterprise cloud solutions, full-stack application development, agile modernization, and systems integration across banking, healthcare, retail, and telecommunication domains.',
      requiredSkills: ['Programming', 'Problem Solving', 'Communication', 'Java', 'Python', 'SQL'],
      minCGPA: 6.0,
      eligibleDepartments: ['Computer Science', 'Information Technology', 'Electronics', 'Electrical', 'Mechanical', 'Civil'],
      eligibleGraduationYears: [2024, 2025, 2026],
      eligibleDegrees: ['B.Tech', 'B.E.', 'M.Tech', 'MCA'],
      location: 'Pan-India (Pune, Hyderabad, Chennai, Bangalore, Mumbai)',
      salary: '₹3.6–7 LPA',
      applicationDeadline: futureDateTCS,
      selectionProcess: 'TCS NQT (National Qualifier Test) → Technical Interview → Managerial & HR Discussion',
      openings: 250,
      status: 'published',
      isSample: true,
      creatorId: DEMO_IDS.faculty1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEMO_IDS.drive2,
      companyName: 'Infosys',
      jobTitle: 'Systems Engineer',
      jobDescription: 'Infosys is conducting a campus recruitment drive for Systems Engineer positions. You will work on cutting-edge digital enterprise projects, cloud transformation, enterprise software testing, and core application development for international Fortune 500 partners. High performers will also be considered for Specialist Programmer (₹9.5 LPA) and Digital Specialist Engineer (₹6.5 LPA) profiles.',
      requiredSkills: ['Java', 'Python', 'Logical Reasoning', 'SQL', 'Data Structures'],
      minCGPA: 6.0,
      eligibleDepartments: ['Computer Science', 'Information Technology', 'Electronics', 'Electrical', 'Mechanical'],
      eligibleGraduationYears: [2024, 2025, 2026],
      eligibleDegrees: ['B.Tech', 'B.E.', 'M.Tech', 'MCA', 'M.Sc'],
      location: 'Bangalore, Mysore, Pune, Hyderabad, Bhubaneswar',
      salary: '₹3.5–9 LPA',
      applicationDeadline: futureDateInfosys,
      selectionProcess: 'InfyTQ / Online Assessment (Reasoning, Verbal, Pseudo-code) → Technical Interview → HR Round',
      openings: 180,
      status: 'published',
      isSample: true,
      creatorId: DEMO_IDS.faculty1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEMO_IDS.drive3,
      companyName: 'Wipro',
      jobTitle: 'Project Engineer',
      jobDescription: 'Wipro Elite National Talent Hunt (ENTH) recruitment drive for Project Engineers. Candidates will design and develop next-generation enterprise platforms, cloud-native architectures, enterprise API microservices, and automated DevOps workflows.',
      requiredSkills: ['C', 'Java', 'SQL', 'Aptitude', 'Data Structures', 'Communication'],
      minCGPA: 6.0,
      eligibleDepartments: ['Computer Science', 'Information Technology', 'Electronics', 'Electrical'],
      eligibleGraduationYears: [2024, 2025, 2026],
      eligibleDegrees: ['B.Tech', 'B.E.'],
      location: 'Bangalore, Chennai, Hyderabad, Noida, Kolkata',
      salary: '₹3.5–6.5 LPA',
      applicationDeadline: futureDateWipro,
      selectionProcess: 'Online Assessment (Quantitative Aptitude, Written Communication, Coding) → Technical & HR Interview',
      openings: 120,
      status: 'published',
      isSample: true,
      creatorId: DEMO_IDS.faculty1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEMO_IDS.drive4,
      companyName: 'Accenture',
      jobTitle: 'Associate Software Engineer',
      jobDescription: 'Accenture Technology campus recruitment for Associate Software Engineer (ASE). Innovate and deliver end-to-end technology solutions across artificial intelligence, cloud infrastructure, enterprise security platforms, and full-stack software development.',
      requiredSkills: ['Problem Solving', 'Programming', 'Communication', 'Cloud Fundamentals', 'Python', 'Java'],
      minCGPA: 6.5,
      eligibleDepartments: ['Computer Science', 'Information Technology', 'Electronics', 'Electrical', 'Mechanical'],
      eligibleGraduationYears: [2024, 2025, 2026],
      eligibleDegrees: ['B.Tech', 'B.E.', 'MCA', 'M.Sc'],
      location: 'Bangalore, Hyderabad, Pune, Mumbai, Gurgaon',
      salary: '₹4.5–7 LPA',
      applicationDeadline: futureDateAccenture,
      selectionProcess: 'Cognitive & Technical Assessment → Coding Assessment → Communication Assessment → Interview',
      openings: 150,
      status: 'published',
      isSample: true,
      creatorId: DEMO_IDS.faculty1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEMO_IDS.drive5,
      companyName: 'Capgemini',
      jobTitle: 'Software Engineer',
      jobDescription: 'Capgemini campus hiring drive for Software Engineer. Collaborate with distributed teams worldwide to architect and deliver high-performance cloud applications, API microservices, real-time database management, and automated continuous delivery systems.',
      requiredSkills: ['Python', 'Java', 'Databases', 'Web Technologies', 'Analytical Skills'],
      minCGPA: 6.5,
      eligibleDepartments: ['Computer Science', 'Information Technology', 'Electronics'],
      eligibleGraduationYears: [2024, 2025, 2026],
      eligibleDegrees: ['B.Tech', 'B.E.', 'MCA'],
      location: 'Bangalore, Mumbai, Pune, Chennai, Hyderabad',
      salary: '₹4–7.5 LPA',
      applicationDeadline: futureDateCapgemini,
      selectionProcess: 'Pseudo Code Assessment → English Communication Test → Game-based Aptitude → Technical & HR Interview',
      openings: 90,
      status: 'published',
      isSample: true,
      creatorId: DEMO_IDS.faculty1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEMO_IDS.drive6,
      companyName: 'Amazon',
      jobTitle: 'Software Development Engineer (Entry Level)',
      jobDescription: 'Amazon India university hiring for Software Development Engineer (SDE I). Build highly scalable distributed architectures, cloud-native services on AWS, and algorithms that power millions of customer interactions every second across the globe.',
      requiredSkills: ['Data Structures', 'Algorithms', 'Coding', 'System Design', 'C++', 'Java'],
      minCGPA: 7.0,
      eligibleDepartments: ['Computer Science', 'Information Technology', 'Electronics'],
      eligibleGraduationYears: [2024, 2025, 2026],
      eligibleDegrees: ['B.Tech', 'B.E.', 'M.Tech', 'Dual Degree'],
      location: 'Bangalore, Hyderabad, Chennai, Delhi NCR',
      salary: '₹18–28 LPA',
      applicationDeadline: futureDateAmazon,
      selectionProcess: 'Online Coding Assessment (2 rounds) → 3-4 Rounds of Technical Interviews (Data Structures, Algorithms, Problem Solving, System Design, Amazon Leadership Principles)',
      openings: 35,
      status: 'published',
      isSample: true,
      creatorId: DEMO_IDS.faculty1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEMO_IDS.driveClosed,
      companyName: 'Cognizant',
      jobTitle: 'Programmer Analyst Trainee',
      jobDescription: 'Cognizant campus recruitment for Programmer Analyst Trainee. Opportunities in digital engineering, quality assurance, and cloud infrastructure operations.',
      requiredSkills: ['Java', 'SQL', 'Web Fundamentals', 'Communication'],
      minCGPA: 6.0,
      eligibleDepartments: ['Computer Science', 'Information Technology', 'Electronics'],
      eligibleGraduationYears: [2024, 2025],
      eligibleDegrees: ['B.Tech', 'B.E.', 'MCA'],
      location: 'Chennai, Coimbatore, Bangalore',
      salary: '₹4.0–4.5 LPA',
      applicationDeadline: pastDate,
      selectionProcess: 'GenC Online Assessment → Technical & HR Interview',
      openings: 80,
      status: 'closed',
      isSample: true,
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
