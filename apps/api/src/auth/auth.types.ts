import type { AccountProfile, MembershipRole } from '@wasli/shared';

export type CenterAccess = {
  centerId: string;
  role: MembershipRole;
};

export type AuthContext = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  locale: 'fr' | 'ar';
  roles: MembershipRole[];
  centers: CenterAccess[];
};

export function toProfile(context: AuthContext): AccountProfile {
  return {
    id: context.userId,
    email: context.email,
    firstName: context.firstName,
    lastName: context.lastName,
    phone: context.phone,
    locale: context.locale,
    roles: context.roles,
  };
}
