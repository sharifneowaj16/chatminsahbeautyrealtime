import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth';
import prisma from '@/lib/prisma';
import { AccountLayoutClient } from '@/components/account/account-layout-client';

// Fetch full user from DB using NextAuth session userId
async function getUserFromSession(userId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatar: true,
      role: true,
      status: true,
      emailVerified: true,
      loyaltyPoints: true,
      referralCode: true,
      newsletter: true,
      smsNotifications: true,
      promotions: true,
      newProducts: true,
      orderUpdates: true,
    },
  });

  if (!dbUser || dbUser.status !== 'ACTIVE') return null;

  return {
    id: dbUser.id,
    email: dbUser.email,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    phone: dbUser.phone,
    avatar: dbUser.avatar,
    role: dbUser.role.toLowerCase() as 'customer' | 'vip' | 'premium',
    status: dbUser.status.toLowerCase(),
    emailVerified: !!dbUser.emailVerified,
    loyaltyPoints: dbUser.loyaltyPoints,
    referralCode: dbUser.referralCode,
    preferences: {
      newsletter: dbUser.newsletter,
      smsNotifications: dbUser.smsNotifications,
      promotions: dbUser.promotions,
      newProducts: dbUser.newProducts,
      orderUpdates: dbUser.orderUpdates,
    },
  };
}

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  // Use NextAuth session — this is what middleware already validates
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login?redirect=/account');
  }

  const user = await getUserFromSession(session.user.id);

  if (!user) {
    redirect('/login?redirect=/account');
  }

  return <AccountLayoutClient user={user}>{children}</AccountLayoutClient>;
}
