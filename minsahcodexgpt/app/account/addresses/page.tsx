import { redirect } from 'next/navigation';
import { AddressesClient } from '@/components/account/addresses-client';
import type { UserAddress } from '@/types/user';
import { getCustomerSession } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

async function getUserAddresses(userId: string): Promise<UserAddress[]> {
  const dbAddresses = await prisma.address.findMany({
    where: { userId },
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
    pathao_city_id: db.pathaoCityId ?? undefined,
    pathao_zone_id: db.pathaoZoneId ?? undefined,
    pathao_area_id: db.pathaoAreaId ?? undefined,
  }));
}

export default async function AddressesPage() {
  const sessionUser = await getCustomerSession();
  if (!sessionUser) {
    redirect('/login?redirect=/account/addresses');
  }

  const addresses = await getUserAddresses(sessionUser.id);
  return <AddressesClient initialAddresses={addresses} />;
}
