import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/src/app.js';
import { initializeStorage } from '../server/src/storage/storage-init.js';

describe('Authentication API', () => {
  let app;

  beforeAll(async () => {
    await initializeStorage();
    app = createApp();
  });

  it('should register a new student account', async () => {
    const uniqueEmail = `student_${Date.now()}@test.cpg`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Auto Test Student',
        email: uniqueEmail,
        password: 'Password123!',
        role: 'student',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(uniqueEmail);
    expect(res.body.user.role).toBe('student');
    expect(res.body.user.password).toBeUndefined(); // never expose password
  });

  it('should prevent duplicate email registration', async () => {
    const email = `dupe_${Date.now()}@test.cpg`;
    await request(app).post('/api/auth/register').send({
      name: 'User One',
      email,
      password: 'Password123!',
      role: 'student',
    });

    const dupeRes = await request(app).post('/api/auth/register').send({
      name: 'User Two',
      email,
      password: 'Password123!',
      role: 'student',
    });

    expect(dupeRes.status).toBe(409);
    expect(dupeRes.body.success).toBe(false);
  });

  it('should reject invalid login credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nonexistent@test.cpg',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
