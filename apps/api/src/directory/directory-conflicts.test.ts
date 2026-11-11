import { describe, expect, it } from 'vitest';
import { scheduleConflict, type ScheduleWindow } from './directory-conflicts.js';

const base: ScheduleWindow = {
  id: 'new',
  classId: 'class-a',
  weekday: 'MONDAY',
  startTime: '16:00',
  endTime: '17:30',
  effectiveFrom: '2026-11-01',
  effectiveUntil: null,
  teacherIds: ['teacher-1'],
};

describe('schedule conflicts', () => {
  it('accepts a slot on another day', () => {
    expect(scheduleConflict(base, [{ ...base, id: 'other', weekday: 'TUESDAY' }])).toBeNull();
  });

  it('rejects an overlapping slot for the same class', () => {
    expect(scheduleConflict(base, [{ ...base, id: 'other', startTime: '17:00', endTime: '18:00' }])).toBe('class');
  });

  it('rejects an overlapping slot for the same teacher in another class', () => {
    expect(scheduleConflict(base, [{ ...base, id: 'other', classId: 'class-b' }])).toBe('teacher');
  });

  it('accepts a slot whose effective dates do not overlap', () => {
    expect(scheduleConflict(
      { ...base, effectiveUntil: '2026-11-30' },
      [{ ...base, id: 'other', effectiveFrom: '2026-12-01' }],
    )).toBeNull();
  });

  it('ignores the schedule being edited', () => {
    expect(scheduleConflict({ ...base, id: 'same' }, [{ ...base, id: 'same' }])).toBeNull();
  });
});
