import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(_: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const rows = await prisma.$queryRawUnsafe<Array<{
    status: string;
    requestedAt: Date;
    completedAt: Date | null;
  }>>(
    `SELECT "status","requestedAt","completedAt" FROM "DataDeletionRequest"
     WHERE "confirmationCode"=$1 LIMIT 1`,
    code
  );
  const row = rows[0];
  if (!row) return NextResponse.json({ ok: false, error: 'Request not found' }, { status: 404 });
  return NextResponse.json({
    ok: true,
    status: row.status,
    requestedAt: row.requestedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  });
}
