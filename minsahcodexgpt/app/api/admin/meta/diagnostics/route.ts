import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminPermission, requireSuperAdmin } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { executeMetaAdminAction } from '@/lib/meta/admin/service';
import { metaAdminActionErrorResponse, readJsonObject } from '@/app/api/admin/meta/_shared/response';
import { enqueueMetaCatalogDiagnosticsJob } from '@/lib/jobs/queues';
import { buildCatalogDiagnosticsIdempotencyKey } from '@/lib/jobs/idempotency';

export const dynamic = 'force-dynamic';

type DiagnosticDb = {
  metaCatalogDiagnostic: { findMany(args: unknown): Promise<unknown[]>; count(args: unknown): Promise<number> };
};
const db = prisma as unknown as DiagnosticDb;

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_VIEW);
  if (response) return response;
  const catalogId = request.nextUrl.searchParams.get('catalogId')?.trim() || undefined;
  const status = request.nextUrl.searchParams.get('status')?.trim().toUpperCase();
  const severity = request.nextUrl.searchParams.get('severity')?.trim().toUpperCase();
  const retailerId = request.nextUrl.searchParams.get('retailerId')?.trim() || undefined;
  const limit = Math.max(1, Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 100) || 100, 250));
  const where = {
    ...(catalogId ? { catalogId } : {}),
    ...(status && ['ACTIVE', 'RESOLVED'].includes(status) ? { status } : {}),
    ...(severity && ['INFO', 'WARNING', 'ERROR', 'CRITICAL'].includes(severity) ? { severity } : {}),
    ...(retailerId ? { items: { some: { retailerId } } } : {}),
  };
  const [diagnostics, total] = await Promise.all([
    db.metaCatalogDiagnostic.findMany({
      where,
      orderBy: [{ status: 'asc' }, { severity: 'desc' }, { lastSeenAt: 'desc' }],
      take: limit,
      select: {
        id: true, catalogId: true, diagnosticKey: true, issueType: true, severity: true, title: true,
        description: true, affectedItemCount: true, status: true, correlationId: true, firstSeenAt: true,
        lastSeenAt: true, resolvedAt: true,
        items: { where: { status: 'ACTIVE' }, orderBy: { retailerId: 'asc' }, take: 50, select: { id: true, retailerId: true, providerItemId: true, status: true, firstSeenAt: true, lastSeenAt: true } },
      },
    }),
    db.metaCatalogDiagnostic.count({ where }),
  ]);
  return NextResponse.json({ ok: true, diagnostics, total, limit });
}

export async function POST(request: NextRequest) {
  const { admin, response } = await requireSuperAdmin(request);
  if (response) return response;
  try {
    const body = await readJsonObject(request);
    const catalogId = typeof body.catalogId === 'string' && body.catalogId.trim() ? body.catalogId.trim() : undefined;
    const executed = await executeMetaAdminAction({
      request,
      actorId: admin.adminId,
      actionKey: 'META_DIAGNOSTICS_SYNC',
      resourceType: 'META_CATALOG',
      resourceId: catalogId ?? null,
      payload: { catalogId: catalogId ?? null },
      reason: typeof body.reason === 'string' ? body.reason : 'Manual Catalog Diagnostics import',
      run: () => enqueueMetaCatalogDiagnosticsJob({
        catalogId,
        idempotencyKey: `${buildCatalogDiagnosticsIdempotencyKey(catalogId, new Date())}:manual:${new Date().toISOString().slice(11, 16)}`,
        requestedBy: admin.adminId,
      }),
    });
    return NextResponse.json({ ok: true, ...executed.result, auditId: executed.auditId }, { status: 202 });
  } catch (error) {
    return metaAdminActionErrorResponse(error);
  }
}
