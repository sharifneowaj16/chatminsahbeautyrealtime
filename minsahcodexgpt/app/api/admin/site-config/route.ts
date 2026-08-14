import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import { toPrismaInputJson } from '@/lib/prisma-json';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import {
  HOME_CONFIG_KEYS,
  isHomeConfigKey,
  normalizeHomeConfigValue,
  validateHomeConfigValue,
  type HomeConfigKey,
  type HomeConfigValidationIssue,
} from '@/lib/admin/home-config-validation';
import {
  getRequestId,
  getRequestLogContext,
  logOperationalError,
  logOperationalInfo,
  logOperationalWarning,
} from '@/lib/observability/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonWithRequestId(body: unknown, requestId: string, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('x-request-id', requestId);
  response.headers.set('cache-control', 'no-store');
  return response;
}

// GET /api/admin/site-config?key=homeSections
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const context = getRequestLogContext(request, requestId);
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.SETTINGS_VIEW);
  if (response) return response;

  try {
    const key = request.nextUrl.searchParams.get('key');

    if (!isHomeConfigKey(key)) {
      return jsonWithRequestId(
        { error: 'A supported homepage configuration key is required.' },
        requestId,
        { status: 400 }
      );
    }

    const config = await prisma.siteConfig.findUnique({ where: { key } });
    const value = config ? normalizeHomeConfigValue(key, config.value) : null;

    logOperationalInfo('admin.site_config.read', {
      ...context,
      adminId: admin.adminId,
      key,
      found: Boolean(config),
    });

    return jsonWithRequestId({ value, key }, requestId);
  } catch (error) {
    logOperationalError('admin.site_config.read_failed', error, {
      ...context,
      adminId: admin.adminId,
    });
    return jsonWithRequestId({ error: 'Failed to fetch config' }, requestId, { status: 500 });
  }
}

// PUT /api/admin/site-config
// Body: { key: HomeConfigKey, value: unknown }
export async function PUT(request: NextRequest) {
  const requestId = getRequestId(request);
  const context = getRequestLogContext(request, requestId);
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.SETTINGS_EDIT);
  if (response) return response;

  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 256_000) {
      return jsonWithRequestId({ error: 'Configuration payload is too large.' }, requestId, { status: 413 });
    }

    const body = await request.json().catch(() => null) as {
      key?: unknown;
      value?: unknown;
      configs?: Array<{ key?: unknown; value?: unknown }>;
    } | null;

    const rawConfigs = Array.isArray(body?.configs)
      ? body.configs
      : body
        ? [{ key: body.key, value: body.value }]
        : [];

    if (rawConfigs.length === 0 || rawConfigs.length > HOME_CONFIG_KEYS.length) {
      return jsonWithRequestId(
        { error: 'One or more supported homepage configurations are required.' },
        requestId,
        { status: 400 }
      );
    }

    const seenKeys = new Set<string>();
    const normalizedConfigs: Array<{
      key: HomeConfigKey;
      value: Prisma.InputJsonValue;
    }> = [];
    const validationIssues: Array<HomeConfigValidationIssue & { key: HomeConfigKey }> = [];

    for (const entry of rawConfigs) {
      if (!isHomeConfigKey(entry.key) || seenKeys.has(entry.key)) {
        return jsonWithRequestId(
          { error: 'Configuration keys must be supported and unique.' },
          requestId,
          { status: 400 }
        );
      }

      const key = entry.key;
      seenKeys.add(key);
      const normalizedValue = normalizeHomeConfigValue(key, entry.value);
      const issues = await validateHomeConfigValue(key, normalizedValue);
      validationIssues.push(...issues.map((issue) => ({ ...issue, key })));
      normalizedConfigs.push({
        key,
        value: toPrismaInputJson(normalizedValue, `config.${key}`),
      });
    }

    if (validationIssues.length > 0) {
      logOperationalWarning('admin.site_config.validation_failed', {
        ...context,
        adminId: admin.adminId,
        keys: normalizedConfigs.map((entry) => entry.key),
        issueCodes: validationIssues.map((issue) => issue.code),
      });

      return jsonWithRequestId(
        {
          error: 'Homepage configuration contains invalid or inactive references.',
          issues: validationIssues,
        },
        requestId,
        { status: 422 }
      );
    }

    const configs = await prisma.$transaction(
      normalizedConfigs.map((entry) => prisma.siteConfig.upsert({
        where: { key: entry.key },
        update: { value: entry.value },
        create: { key: entry.key, value: entry.value },
      }))
    );

    revalidatePath('/');

    logOperationalInfo('admin.site_config.saved', {
      ...context,
      adminId: admin.adminId,
      keys: normalizedConfigs.map((entry) => entry.key),
    });

    return jsonWithRequestId(
      {
        success: true,
        configs: configs.map((config) => ({
          key: config.key,
          value: config.value,
          updatedAt: config.updatedAt,
        })),
      },
      requestId
    );
  } catch (error) {
    logOperationalError('admin.site_config.save_failed', error, {
      ...context,
      adminId: admin.adminId,
    });
    return jsonWithRequestId({ error: 'Failed to save config' }, requestId, { status: 500 });
  }
}
