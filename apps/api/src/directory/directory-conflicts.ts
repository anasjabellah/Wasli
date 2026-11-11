export type ScheduleWindow = {
  id: string;
  classId: string;
  weekday: string;
  startTime: string;
  endTime: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  teacherIds: string[];
};

export function scheduleConflict(
  candidate: ScheduleWindow,
  existing: ScheduleWindow[],
): 'class' | 'teacher' | null {
  for (const other of existing) {
    if (other.id === candidate.id || other.weekday !== candidate.weekday) continue;
    if (!clocksOverlap(candidate.startTime, candidate.endTime, other.startTime, other.endTime)) continue;
    if (!datesOverlap(candidate.effectiveFrom, candidate.effectiveUntil, other.effectiveFrom, other.effectiveUntil)) continue;
    if (other.classId === candidate.classId) return 'class';
    if (candidate.teacherIds.some((teacherId) => other.teacherIds.includes(teacherId))) return 'teacher';
  }
  return null;
}

function clocksOverlap(start: string, end: string, otherStart: string, otherEnd: string): boolean {
  return start < otherEnd && otherStart < end;
}

function datesOverlap(from: string, until: string | null, otherFrom: string, otherUntil: string | null): boolean {
  const end = until ?? '9999-12-31';
  const otherEnd = otherUntil ?? '9999-12-31';
  return from <= otherEnd && otherFrom <= end;
}
