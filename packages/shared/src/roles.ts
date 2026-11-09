export const MEMBERSHIP_ROLES = [
  'PLATFORM_ADMIN',
  'CENTER_ADMIN',
  'TEACHER',
  'RECEPTION',
  'PARENT',
] as const;

export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const CENTER_SCOPED_ROLES = [
  'CENTER_ADMIN',
  'TEACHER',
  'RECEPTION',
  'PARENT',
] as const satisfies readonly MembershipRole[];
