import { describe, it, expect } from 'vitest';
import {
  registerSchema, loginSchema,
  createProjectSchema, updateProjectSchema,
  createTaskSchema, updateTaskSchema,
  createTagSchema, reorderSchema,
} from '../schemas/index';

describe('auth schemas', () => {
  it('validates register input', () => {
    const valid = { email: 'a@b.com', password: '12345678', name: 'Test' };
    expect(registerSchema.parse(valid)).toEqual(valid);
  });

  it('rejects short password', () => {
    expect(() => registerSchema.parse({ email: 'a@b.com', password: '123', name: 'T' }))
      .toThrow();
  });

  it('rejects invalid email', () => {
    expect(() => loginSchema.parse({ email: 'not-email', password: '12345678' }))
      .toThrow();
  });
});

describe('project schemas', () => {
  it('validates create project', () => {
    const input = { name: 'Work', color: '#ff5733' };
    expect(createProjectSchema.parse(input)).toEqual(input);
  });

  it('rejects invalid hex color', () => {
    expect(() => createProjectSchema.parse({ name: 'X', color: 'red' })).toThrow();
  });

  it('allows partial update', () => {
    expect(updateProjectSchema.parse({ name: 'New' })).toEqual({ name: 'New' });
    expect(updateProjectSchema.parse({})).toEqual({});
  });
});

describe('task schemas', () => {
  it('validates create task with defaults', () => {
    const result = createTaskSchema.parse({ title: 'Buy milk' });
    expect(result).toEqual({
      title: 'Buy milk',
      priority: 4,
      urgent: false,
      important: false,
    });
  });

  it('validates full task create', () => {
    const input = {
      title: 'Deploy', projectId: '550e8400-e29b-41d4-a716-446655440000',
      priority: 1, urgent: true, important: true,
    };
    expect(createTaskSchema.parse(input)).toMatchObject(input);
  });

  it('rejects empty title', () => {
    expect(() => createTaskSchema.parse({ title: '' })).toThrow();
  });
});

describe('reorder schema', () => {
  it('validates reorder items', () => {
    const input = { items: [
      { id: '550e8400-e29b-41d4-a716-446655440000', sortOrder: 0 },
      { id: '550e8400-e29b-41d4-a716-446655440001', sortOrder: 1 },
    ]};
    expect(reorderSchema.parse(input)).toEqual(input);
  });

  it('rejects empty items', () => {
    expect(() => reorderSchema.parse({ items: [] })).toThrow();
  });
});

describe('tag schemas', () => {
  it('validates create tag input', () => {
    const input = { name: 'Work', color: '#ef4444' };
    expect(createTagSchema.parse(input)).toEqual(input);
  });

  it('rejects empty tag name', () => {
    expect(() => createTagSchema.parse({ name: '', color: '#ef4444' })).toThrow();
  });

  it('rejects invalid hex color', () => {
    expect(() => createTagSchema.parse({ name: 'Work', color: '#123' })).toThrow();
    expect(() => createTagSchema.parse({ name: 'Work', color: 'blue' })).toThrow();
  });
});

