import 'server-only';

import prisma from '@/lib/prisma';
import {
  getBangladeshPhoneVariations,
  normalizeBangladeshPhoneNumber,
} from '@/lib/phone';

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const cleaned = fullName.trim().replace(/\s+/g, ' ');
  if (!cleaned) return { firstName: 'Guest', lastName: 'Customer' };
  const parts = cleaned.split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  const lastName = parts.pop() || '';
  return { firstName: parts.join(' '), lastName };
}

/**
 * Resolves an existing active customer by Bangladesh phone number or creates
 * a lightweight guest customer record so Order.userId is always valid without
 * forcing login before checkout.
 */
export async function resolveOrCreateGuestCheckoutUser(params: {
  fullName: string;
  phone: string;
}): Promise<string> {
  const normalizedPhone = normalizeBangladeshPhoneNumber(params.phone);
  if (!normalizedPhone) {
    throw new Error('INVALID_GUEST_PHONE');
  }

  const phoneVariations = getBangladeshPhoneVariations(normalizedPhone);
  const existing = await prisma.user.findFirst({
    where: {
      status: 'ACTIVE',
      OR: [
        { phone: { in: phoneVariations } },
        { verifiedPhone: { in: phoneVariations } },
      ],
    },
    orderBy: [{ lastLoginAt: 'desc' }, { createdAt: 'asc' }],
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const { firstName, lastName } = splitFullName(params.fullName);
  const created = await prisma.user.create({
    data: {
      email: null,
      phone: normalizedPhone,
      firstName,
      lastName: lastName || null,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      loyaltyPoints: 0,
    },
    select: { id: true },
  });

  return created.id;
}
