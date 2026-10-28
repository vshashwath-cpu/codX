/**
 * Create the initial administrator account.
 * Prompts for credentials interactively or uses environment variables.
 * 
 * Usage:
 *   node scripts/create-admin.js
 * 
 * Or with environment variables:
 *   ADMIN_EMAIL=admin@cpg.local ADMIN_PASSWORD=securepassword ADMIN_NAME="Admin" node scripts/create-admin.js
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { createInterface } from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const usersPath = path.join(rootDir, 'storage', 'data', 'users.json');

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function createAdmin() {
  console.log('\n  College Placement Guide — Admin Setup');
  console.log('  ' + '='.repeat(40) + '\n');

  // Check if users file exists
  let users = [];
  try {
    const data = await fs.readFile(usersPath, 'utf-8');
    users = JSON.parse(data);
  } catch {
    // File doesn't exist — create data dir
    await fs.mkdir(path.dirname(usersPath), { recursive: true });
  }

  // Check for existing admin
  const existingAdmin = users.find((u) => u.role === 'admin');
  if (existingAdmin) {
    console.log(`  An administrator account already exists: ${existingAdmin.email}`);
    const overwrite = await prompt('  Create another admin? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('  Aborted.');
      process.exit(0);
    }
  }

  // Get credentials
  let email = process.env.ADMIN_EMAIL;
  let password = process.env.ADMIN_PASSWORD;
  let name = process.env.ADMIN_NAME;

  if (!email) {
    email = await prompt('  Admin email: ');
  }
  if (!name) {
    name = await prompt('  Admin name: ');
  }
  if (!password) {
    password = await prompt('  Admin password (min 8 characters): ');
  }

  // Validate
  if (!email || !email.includes('@')) {
    console.error('  Error: Invalid email address.');
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error('  Error: Password must be at least 8 characters.');
    process.exit(1);
  }
  if (!name || name.length < 2) {
    console.error('  Error: Name must be at least 2 characters.');
    process.exit(1);
  }

  // Check duplicate email
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    console.error(`  Error: Email "${email}" is already registered.`);
    process.exit(1);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create admin user
  const adminUser = {
    id: crypto.randomUUID(),
    email: email.toLowerCase(),
    password: hashedPassword,
    name,
    role: 'admin',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  users.push(adminUser);
  await fs.writeFile(usersPath, JSON.stringify(users, null, 2), 'utf-8');

  console.log(`\n  ✓ Administrator account created successfully!`);
  console.log(`    Email: ${email}`);
  console.log(`    Name:  ${name}`);
  console.log(`    ID:    ${adminUser.id}`);
  console.log('\n  ⚠ Keep these credentials safe. Do not share them.\n');
}

createAdmin().catch((err) => {
  console.error('Failed to create admin:', err.message);
  process.exit(1);
});
