import prisma from '@/lib/prisma';

function buildDeletedEmail(userId: string) {
  return `deleted+${userId}@minsahbeauty.cloud`;
}

export async function anonymizeUserDataById(userId: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return null;
    }

    await tx.account.deleteMany({ where: { userId } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.refreshToken.deleteMany({ where: { userId } });
    await tx.address.deleteMany({ where: { userId } });
    await tx.cartItem.deleteMany({ where: { userId } });
    await tx.wishlistItem.deleteMany({ where: { userId } });
    await tx.review.deleteMany({ where: { userId } });

    await tx.customerBehavior.updateMany({
      where: { userId },
      data: { userId: null },
    });
    await tx.searchHistory.updateMany({
      where: { userId },
      data: { userId: null },
    });
    await tx.campaignAttribution.updateMany({
      where: { userId },
      data: { userId: null },
    });
    await tx.trackingDevice.updateMany({
      where: { userId },
      data: { userId: null },
    });
    await tx.searchClickEvent.updateMany({
      where: { userId },
      data: { userId: null },
    });

    await tx.giftRequest.updateMany({
      where: { senderId: userId },
      data: { senderId: null },
    });
    await tx.giftRequest.updateMany({
      where: { recipientId: userId },
      data: { recipientId: null },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        email: buildDeletedEmail(userId),
        emailVerified: null,
        passwordHash: null,
        firstName: 'Deleted',
        lastName: 'User',
        phone: null,
        dateOfBirth: null,
        gender: null,
        avatar: null,
        phoneVerified: false,
        status: 'INACTIVE',
        loyaltyPoints: 0,
        referralCode: null,
        referredById: null,
        newsletter: false,
        smsNotifications: false,
        promotions: false,
        newProducts: false,
        orderUpdates: false,
        lastLoginAt: null,
      },
    });

    return user;
  });
}

export async function anonymizeUserDataForMetaRequest(input: {
  facebookUserId?: string | null;
  email?: string | null;
}) {
  const facebookUserId = input.facebookUserId?.trim() || null;
  const email = input.email?.trim().toLowerCase() || null;

  let userId: string | null = null;

  if (facebookUserId) {
    const account = await prisma.account.findFirst({
      where: {
        provider: 'facebook',
        providerAccountId: facebookUserId,
      },
      select: { userId: true },
    });

    userId = account?.userId ?? null;
  }

  if (!userId && email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    userId = user?.id ?? null;
  }

  if (!userId) {
    return { found: false as const };
  }

  await anonymizeUserDataById(userId);
  return { found: true as const, userId };
}
