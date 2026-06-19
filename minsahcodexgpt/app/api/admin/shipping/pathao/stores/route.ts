import { NextRequest, NextResponse } from 'next/server';
import { adminUnauthorizedResponse, getVerifiedAdmin } from '@/app/api/admin/_utils';
import { fetchPathaoStores, resolvePathaoStore } from '@/lib/pathao';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const admin = await getVerifiedAdmin(request);
  if (!admin) return adminUnauthorizedResponse();

  try {
    const [stores, resolvedStore] = await Promise.all([
      fetchPathaoStores(),
      resolvePathaoStore(),
    ]);

    return NextResponse.json({
      stores,
      selectedStore: resolvedStore,
      configuredStoreId: process.env.PATHAO_STORE_ID ? Number(process.env.PATHAO_STORE_ID) : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'PATHAO_STORES_FAILED',
      },
      { status: 502 }
    );
  }
}
