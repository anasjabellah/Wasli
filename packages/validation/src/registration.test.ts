import { describe, expect, it } from 'vitest';
import { registerCenterSchema, rejectCenterSchema } from './registration.js';

const valid = {
  centerName: 'Centre Atlas',
  centerEmail: 'atlas@example.com',
  centerPhone: '+212522000000',
  city: 'Casablanca',
  firstName: 'Sara',
  lastName: 'Alami',
  email: 'sara@example.com',
  password: 'Correct-horse-1',
  confirmPassword: 'Correct-horse-1',
};

describe('center registration validation', () => {
  it('accepts a complete registration', () => {
    expect(registerCenterSchema.parse(valid).email).toBe('sara@example.com');
  });

  it('rejects a missing center name and a mismatched password', () => {
    expect(registerCenterSchema.safeParse({ ...valid, centerName: ' ' }).success).toBe(false);
    expect(registerCenterSchema.safeParse({ ...valid, confirmPassword: 'other-password' }).success).toBe(false);
  });

  it('requires a rejection reason', () => {
    expect(rejectCenterSchema.safeParse({ reason: '   ' }).success).toBe(false);
    expect(rejectCenterSchema.parse({ reason: 'Dossier incomplet' }).reason).toBe('Dossier incomplet');
  });
});
