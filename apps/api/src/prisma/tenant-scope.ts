import type { Prisma } from '../generated/prisma/client.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertCenterId(centerId: string): void {
  if (!UUID_PATTERN.test(centerId)) {
    throw new Error('centerId must be a UUID');
  }
}

export async function applyTenantScope(
  tx: Prisma.TransactionClient,
  centerId: string,
  userId?: string,
): Promise<void> {
  assertCenterId(centerId);
  if (userId) {
    assertCenterId(userId);
  }
  await tx.$executeRaw`SELECT set_config('app.center_id', ${centerId}, true)`;
  await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
  await tx.$executeRaw`SELECT set_config('app.user_id', ${userId ?? ''}, true)`;
}

export async function applyPlatformScope(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
  await tx.$executeRaw`SELECT set_config('app.center_id', '', true)`;
}
