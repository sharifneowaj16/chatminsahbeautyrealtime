import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { adminUnauthorizedResponse, getVerifiedAdmin } from '@/app/api/admin/_utils';

const META_AUDIENCES_KEY = 'meta:ads:audiences:v1';

const DEFAULT_AUDIENCES = [
  { id: 'cart_7d', label: 'Cart Abandoners (7D)', size: 3200, event: 'AddToCart', lookbackDays: 7 },
  { id: 'view_14d', label: 'Product Viewers (14D)', size: 7600, event: 'ViewContent', lookbackDays: 14 },
  { id: 'checkout_7d', label: 'Checkout Starters (7D)', size: 2100, event: 'InitiateCheckout', lookbackDays: 7 },
  { id: 'engaged_30d', label: 'High Intent Visitors (30D)', size: 9800, event: 'PageView', lookbackDays: 30 },
];

type AudienceItem = {
  id: string;
  label: string;
  size: number;
  event: string;
  lookbackDays: number;
};

export async function GET(request: NextRequest) {
  const admin = await getVerifiedAdmin(request);
  if (!admin) return adminUnauthorizedResponse();

  const config = await prisma.siteConfig.findUnique({ where: { key: META_AUDIENCES_KEY } });
  return NextResponse.json({
    audiences: config?.value ?? DEFAULT_AUDIENCES,
  });
}

export async function PUT(request: NextRequest) {
  const admin = await getVerifiedAdmin(request);
  if (!admin) return adminUnauthorizedResponse();

  const body = (await request.json()) as { audiences?: AudienceItem[] };
  const audiences = Array.isArray(body.audiences)
    ? body.audiences
        .filter((item) => item && typeof item.id === 'string' && typeof item.label === 'string')
        .map((item) => ({
          id: item.id,
          label: item.label,
          size: Number(item.size ?? 0),
          event: item.event ?? 'CustomEvent',
          lookbackDays: Number(item.lookbackDays ?? 7),
        }))
    : DEFAULT_AUDIENCES;

  await prisma.siteConfig.upsert({
    where: { key: META_AUDIENCES_KEY },
    update: { value: audiences },
    create: { key: META_AUDIENCES_KEY, value: audiences },
  });

  return NextResponse.json({ success: true, audiences });
}
