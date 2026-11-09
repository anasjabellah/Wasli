import { Module } from '@nestjs/common';

/**
 * Staff invitations are not implemented yet.
 * A future invitation stores a hashed single-use token, an expiry, the center,
 * the email, and a role of TEACHER or RECEPTION only. The center admin creates
 * it after the center is ACTIVE. Accepting it creates the membership in that
 * tenant. It must never grant CENTER_ADMIN or PLATFORM_ADMIN.
 */
@Module({})
export class MembershipsModule {}
