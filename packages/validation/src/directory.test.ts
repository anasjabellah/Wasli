import { describe, expect, it } from 'vitest';
import { scheduleWriteSchema, studentWriteSchema } from './directory.js';

describe('directory validation', () => {
  it('rejects a student without a name', () => {
    expect(studentWriteSchema.safeParse({ firstName: ' ', lastName: 'Bennani' }).success).toBe(false);
  });

  it('rejects a schedule that ends before it starts', () => {
    const result = scheduleWriteSchema.safeParse({
      classId: '11111111-1111-4111-8111-111111111111',
      weekday: 'MONDAY',
      startTime: '18:00',
      endTime: '17:00',
      effectiveFrom: '2026-11-10',
    });
    expect(result.success).toBe(false);
  });
});
