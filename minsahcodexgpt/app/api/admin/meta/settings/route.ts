import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { adminUnauthorizedResponse, getVerifiedAdmin } from '@/app/api/admin/_utils';

const META_SETTINGS_KEY = 'meta:ads:settings:v1';

const DEFAULT_META_SETTINGS = {
  pixelId: '',
  conversionApiToken: '',
  objective: 'sales',
  dailyBudgetBdt: 3000,
  selectedAudiences: ['cart_7d', 'view_14d'],
};

export async function GET(request: NextRequest) {
  const admin = await getVerifiedAdmin(request);
  if (!admin) return adminUnauthorizedResponse();

  const config = await prisma.siteConfig.findUnique({ where: { key: META_SETTINGS_KEY } });
  return NextResponse.json({
    settings: config?.value ?? DEFAULT_META_SETTINGS,
  });
}

export async function PUT(request: NextRequest) {
  const admin = await getVerifiedAdmin(request);
  if (!admin) return adminUnauthorizedResponse();

  const body = (await request.json()) as Partial<typeof DEFAULT_META_SETTINGS>;
  const settings = {
    ...DEFAULT_META_SETTINGS,
    ...body,
    selectedAudiences: Array.isArray(body.selectedAudiences)
      ? body.selectedAudiences.filter((value): value is string => typeof value === 'string')
      : DEFAULT_META_SETTINGS.selectedAudiences,
    dailyBudgetBdt: Number(body.dailyBudgetBdt ?? DEFAULT_META_SETTINGS.dailyBudgetBdt),
  };

  await prisma.siteConfig.upsert({
    where: { key: META_SETTINGS_KEY },
    update: { value: settings },
    create: { key: META_SETTINGS_KEY, value: settings },
  });

  return NextResponse.json({ success: true, settings });
}
