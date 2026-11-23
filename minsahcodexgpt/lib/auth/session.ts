import 'server-only';

import { getServerSession } from 'next-auth';
import type { NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth/nextauth';

export interface CustomerSessionUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: string;
}

/**
 * Single Source of Truth for customer authentication across all Server Components,
 * Route Handlers, and Server Actions.
 * Validation of ACTIVE status and tokenVersion happens inside NextAuth jwt/session callbacks.
 */
export async function getCustomerSession(): Promise<CustomerSessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session || session.revoked || !session.user?.id) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    role: session.user.role || 'CUSTOMER',
  };
}

/**
 * Unified helper for API route handlers. Keeps optional NextRequest signature for drop-in compatibility.
 */
export async function getAuthenticatedUserId(_request?: NextRequest): Promise<string | null> {
  const user = await getCustomerSession();
  return user?.id ?? null;
}
