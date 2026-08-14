import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedAdmin, adminUnauthorizedResponse } from '@/app/api/admin/_utils';
import { getAdAccount } from '@/lib/meta-business/marketing';
import { metaErrorResponse } from '@/app/api/admin/meta/_shared/response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!(await getVerifiedAdmin(request))) return adminUnauthorizedResponse();
  try {
    return NextResponse.json({ account: await getAdAccount() });
  } catch (error) {
    return metaErrorResponse(error);
  }
}
