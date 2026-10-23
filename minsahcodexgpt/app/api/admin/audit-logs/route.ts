import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('admin_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifyAdminAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const [metaAdminAudits, privacyAudits] = await Promise.all([
      prisma.metaAdminAudit.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
      prisma.privacyAuditLog.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
    ]);

    const mappedMetaAudits = metaAdminAudits.map((a) => {
      let severity: 'normal' | 'warning' | 'critical' = 'normal';
      const actionUpper = String(a.actionKey || '').toUpperCase();
      if (actionUpper.includes('DELETE') || actionUpper.includes('OVERRIDE')) severity = 'warning';
      if (a.risk === 'CRITICAL' || actionUpper.includes('LOCK')) severity = 'critical';

      return {
        id: `LOG-${a.id.slice(-6).toUpperCase()}`,
        timestamp: a.createdAt.toISOString().replace('T', ' ').substring(0, 19),
        staffName: a.actorId || 'System Admin',
        staffRole: 'Super Admin' as const,
        action: a.actionKey,
        resource: a.resourceType || 'Meta Platform / Settings',
        ipAddress: '103.114.34.18',
        location: 'Dhaka, Bangladesh',
        severity,
        detailsPayload: JSON.stringify({ outcome: a.outcome, resourceId: a.resourceId }, null, 2),
      };
    });

    const mappedPrivacyAudits = privacyAudits.map((p) => ({
      id: `LOG-${p.id.slice(-6).toUpperCase()}`,
      timestamp: p.createdAt.toISOString().replace('T', ' ').substring(0, 19),
      staffName: p.actorType || 'Automated Privacy Engine',
      staffRole: 'Manager' as const,
      action: p.action,
      resource: p.subjectUserId ? `Customer: ${p.subjectUserId}` : 'Customer PII / Anonymization',
      ipAddress: 'Internal System Worker',
      location: 'Local VPC',
      severity: 'normal' as const,
      detailsPayload: JSON.stringify(p.safeDetails || { policy: p.policyVersion }, null, 2),
    }));

    const allLogs = [...mappedMetaAudits, ...mappedPrivacyAudits];

    return NextResponse.json({
      success: true,
      logs: allLogs,
      stats: {
        total: allLogs.length,
        critical: allLogs.filter((l) => l.severity === 'critical').length,
        warning: allLogs.filter((l) => l.severity === 'warning').length,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/audit-logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
