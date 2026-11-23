import 'server-only';

import prisma from '@/lib/prisma';
import { cacheDelete, cacheGet, cacheSet } from '@/lib/cache/redis';

export interface UserSessionGuardState {
  active: boolean;
  tokenVersion: number;
  role: string;
}

const SESSION_GUARD_CACHE_TTL_SECONDS = 30;

function sessionGuardKey(userId: string) {
  return `auth:sessguard:${userId}`;
}

/**
 * Fast cached check for whether a user is ACTIVE and what their current tokenVersion is.
 * Cache TTL is 30s, and any logout / password change / ban immediately invalidates the key.
 */
export async function getUserSessionGuard(
  userId: string
): Promise<UserSessionGuardState | null> {
  if (!userId) return null;

  const cacheKey = sessionGuardKey(userId);
  const cached = await cacheGet<UserSessionGuardState>(cacheKey);
  if (cached) return cached;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      status: true,
      tokenVersion: true,
      role: true,
    },
  });

  if (!user) return null;

  const state: UserSessionGuardState = {
    active: user.status === 'ACTIVE',
    tokenVersion: user.tokenVersion,
    role: user.role,
  };

  await cacheSet(cacheKey, state, SESSION_GUARD_CACHE_TTL_SECONDS);
  return state;
}

/**
 * Immediately invalidates every active session for this user across all devices.
 */
export async function bumpUserTokenVersion(userId: string): Promise<number | null> {
  if (!userId) return null;

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
      select: { tokenVersion: true },
    });

    await Promise.all([
      cacheDelete(sessionGuardKey(userId)),
      prisma.refreshToken
        .updateMany({
          where: { userId, revoked: false },
          data: { revoked: true },
        })
        .catch(() => {}),
    ]);

    return updated.tokenVersion;
  } catch (err) {
    console.error('[AuthRevocation] Failed to bump tokenVersion:', err);
    return null;
  }
}

export async function invalidateUserSessionGuardCache(userId: string): Promise<void> {
  if (!userId) return;
  await cacheDelete(sessionGuardKey(userId));
}
