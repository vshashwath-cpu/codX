import { describe, it, expect, beforeEach } from 'vitest';
import { readCollection, writeCollection, insertRecord, findById, findOne, updateRecord, deleteRecord } from '../server/src/storage/json-store.js';

describe('JSON Store Service', () => {
  const collection = 'users';

  it('should allow inserting a new record', async () => {
    const record = await insertRecord(collection, {
      name: 'Test Student',
      email: 'test@unit.cpg',
      role: 'student',
    });

    expect(record).toBeDefined();
    expect(record.id).toBeDefined();
    expect(record.name).toBe('Test Student');
    expect(record.createdAt).toBeDefined();

    // Clean up
    await deleteRecord(collection, record.id);
  });

  it('should find a record by ID', async () => {
    const inserted = await insertRecord(collection, {
      name: 'Findable User',
      email: 'findable@unit.cpg',
      role: 'student',
    });

    const found = await findById(collection, inserted.id);
    expect(found).toBeDefined();
    expect(found.id).toBe(inserted.id);
    expect(found.name).toBe('Findable User');

    // Clean up
    await deleteRecord(collection, inserted.id);
  });

  it('should update a record with partial fields', async () => {
    const unique = Date.now();
    const inserted = await insertRecord(collection, {
      name: 'Old Name',
      email: `update_${unique}@unit.cpg`,
      role: 'student',
    });

    const updated = await updateRecord(collection, inserted.id, { name: 'New Name' });
    expect(updated).toBeDefined();
    expect(updated.name).toBe('New Name');
    expect(updated.email).toBe(`update_${unique}@unit.cpg`);

    // Clean up
    await deleteRecord(collection, inserted.id);
  });

  it('should reject invalid collection names', async () => {
    await expect(readCollection('invalid_collection')).rejects.toThrow();
  });
});
