import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { adminUnauthorizedResponse, getVerifiedAdmin } from '@/app/api/admin/_utils';

const META_CAMPAIGNS_KEY = 'meta:ads:campaigns:v1';

type MetaCampaignItem = {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  objective: 'sales' | 'traffic' | 'leads' | 'engagement';
  dailyBudgetBdt: number;
  audienceIds: string[];
  spend: number;
  revenue: number;
  roas: number;
  updatedAt: string;
};

const DEFAULT_CAMPAIGNS: MetaCampaignItem[] = [];

export async function GET(request: NextRequest) {
  const admin = await getVerifiedAdmin(request);
  if (!admin) return adminUnauthorizedResponse();

  const config = await prisma.siteConfig.findUnique({ where: { key: META_CAMPAIGNS_KEY } });
  return NextResponse.json({ campaigns: config?.value ?? DEFAULT_CAMPAIGNS });
}

export async function POST(request: NextRequest) {
  const admin = await getVerifiedAdmin(request);
  if (!admin) return adminUnauthorizedResponse();

  const body = (await request.json()) as Partial<MetaCampaignItem>;
  if (!body.name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const config = await prisma.siteConfig.findUnique({ where: { key: META_CAMPAIGNS_KEY } });
  const existing = (config?.value as MetaCampaignItem[] | null) ?? [];
  const nextCampaign: MetaCampaignItem = {
    id: `meta_${Date.now()}`,
    name: body.name,
    status: body.status ?? 'draft',
    objective: body.objective ?? 'sales',
    dailyBudgetBdt: Number(body.dailyBudgetBdt ?? 0),
    audienceIds: Array.isArray(body.audienceIds) ? body.audienceIds : [],
    spend: Number(body.spend ?? 0),
    revenue: Number(body.revenue ?? 0),
    roas: Number(body.roas ?? 0),
    updatedAt: new Date().toISOString(),
  };

  const campaigns = [nextCampaign, ...existing];
  await prisma.siteConfig.upsert({
    where: { key: META_CAMPAIGNS_KEY },
    update: { value: campaigns },
    create: { key: META_CAMPAIGNS_KEY, value: campaigns },
  });

  return NextResponse.json({ success: true, campaign: nextCampaign, campaigns });
}
