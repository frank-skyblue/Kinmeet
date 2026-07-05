import { describe, it, expect } from 'vitest';
import { loginSchema, updateProfileSchema } from '../../middleware/schemas';

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'TestPass123',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('normalizes email', () => {
    const result = loginSchema.safeParse({
      email: '  User@Example.COM  ',
      password: 'TestPass123',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('rejects missing email and password', () => {
    const result = loginSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'TestPass123',
    });

    expect(result.success).toBe(false);
  });
});

describe('updateProfileSchema', () => {
  it('accepts partial profile updates', () => {
    const result = updateProfileSchema.safeParse({
      firstName: 'Updated',
      about: 'New bio',
    });

    expect(result.success).toBe(true);
  });

  it('accepts valid dateOfBirth', () => {
    const result = updateProfileSchema.safeParse({
      dateOfBirth: '1990-06-15',
    });

    expect(result.success).toBe(true);
  });

  it('rejects future dateOfBirth', () => {
    const result = updateProfileSchema.safeParse({
      dateOfBirth: '3000-01-01',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'Invalid date of birth')).toBe(true);
    }
  });

  it('rejects invalid gender', () => {
    const result = updateProfileSchema.safeParse({
      gender: 'invalid',
    });

    expect(result.success).toBe(false);
  });

  it('strips unknown fields such as email and password', () => {
    const result = updateProfileSchema.safeParse({
      firstName: 'Safe',
      email: 'hacked@test.com',
      password: 'hacked',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ firstName: 'Safe' });
    }
  });

  it('accepts valid educationLevel', () => {
    const result = updateProfileSchema.safeParse({
      educationLevel: "Bachelor's Degree",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.educationLevel).toBe("Bachelor's Degree");
    }
  });

  it('rejects invalid educationLevel', () => {
    const result = updateProfileSchema.safeParse({
      educationLevel: 'PhD in Everything',
    });

    expect(result.success).toBe(false);
  });
});
