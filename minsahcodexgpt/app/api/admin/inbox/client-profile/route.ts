import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { adminUnauthorizedResponse, getVerifiedAdmin } from '@/app/api/admin/_utils';

export const dynamic = 'force-dynamic';

type ClientProfile = {
  platform: 'facebook' | 'instagram' | 'whatsapp' | 'youtube';
  participantId: string;
  phoneNumber: string;
  realName: string;
  address: string;
  district: string;
  thana: string;
};

function keyFor(platform: ClientProfile['platform'], participantId: string) {
  return `inbox:client-profile:v1:${platform}:${participantId}`;
}

const EMPTY_PROFILE: Omit<ClientProfile, 'platform' | 'participantId'> = {
  phoneNumber: '',
  realName: '',
  address: '',
  district: '',
  thana: '',
};

export async function GET(request: NextRequest) {
  const admin = await getVerifiedAdmin(request);
  if (!admin) return adminUnauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const platform = (searchParams.get('platform') || 'facebook') as ClientProfile['platform'];
  const participantId = searchParams.get('participantId') || '';
  if (!participantId) {
    return NextResponse.json({ error: 'participantId is required' }, { status: 400 });
  }

  const config = await prisma.siteConfig.findUnique({
    where: { key: keyFor(platform, participantId) },
  });

  return NextResponse.json({
    profile: {
      platform,
      participantId,
      ...EMPTY_PROFILE,
      ...(config?.value as Partial<typeof EMPTY_PROFILE> | undefined),
    },
  });
}

export async function PUT(request: NextRequest) {
  const admin = await getVerifiedAdmin(request);
  if (!admin) return adminUnauthorizedResponse();

  const body = (await request.json().catch(() => null)) as Partial<ClientProfile> | null;
  const platform = (body?.platform || 'facebook') as ClientProfile['platform'];
  const participantId = body?.participantId || '';
  if (!participantId) {
    return NextResponse.json({ error: 'participantId is required' }, { status: 400 });
  }

  const nextValue = {
    phoneNumber: String(body?.phoneNumber || '').trim(),
    realName: String(body?.realName || '').trim(),
    address: String(body?.address || '').trim(),
    district: String(body?.district || '').trim(),
    thana: String(body?.thana || '').trim(),
  };

  await prisma.siteConfig.upsert({
    where: { key: keyFor(platform, participantId) },
    update: { value: nextValue },
    create: { key: keyFor(platform, participantId), value: nextValue },
  });

  return NextResponse.json({
    success: true,
    profile: { platform, participantId, ...nextValue },
  });
}

