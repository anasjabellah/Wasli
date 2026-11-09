import { describe, expect, it } from 'vitest';
import { loginSchema } from './auth.js';
import { createPickupRequestSchema } from './parent-pickup.js';

describe('parent request schemas', () => {
  it('rejects a short password and a student id that is not a UUID', () => {
    expect(loginSchema.safeParse({ identifier: 'parent@example.com', password: 'short' }).success).toBe(
      false,
    );
    expect(createPickupRequestSchema.safeParse({ studentId: 'student-1' }).success).toBe(false);
  });
});
