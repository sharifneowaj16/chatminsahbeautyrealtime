import { AddressesClient } from '@/components/account/addresses-client';
import type { UserAddress } from '@/types/user';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth/jwt';
import prisma from '@/lib/prisma';

async function getUserAddresses(): Promise<UserAddress[]> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return [];

    const payload = await verifyAccessToken(token);
    if (!payload?.userId) return [];

    const dbAddresses = await prisma.address.findMany({
      where: { userId: payload.userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return dbAddresses.map((db) => ({
      id: db.id,
      type: db.type.toLowerCase() as 'shipping' | 'billing',
      isDefault: db.isDefault,
      firstName: db.firstName,
      lastName: db.lastName,
      company: db.company ?? '',
      addressLine1: db.street1,
      addressLine2: db.street2 ?? '',
      city: db.city,
      state: db.state,
      postalCode: db.postalCode,
      country: db.country,
      phone: db.phone ?? '',
    }));
  } catch {
    return [];
  }
}

export default async function AddressesPage() {
  const addresses = await getUserAddresses();
  return <AddressesClient initialAddresses={addresses} />;
}
