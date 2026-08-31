import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { toPrismaInputJson } from '@/lib/prisma-json';
import {
  DELIVERY_MESSAGE_CONFIG_KEY,
  HEX_COLOR_REGEX,
  getDeliveryMessageConfig,
  normalizeDeliveryMessageConfig,
} from '@/lib/delivery-message/config';
import {
  getRequestId,
  getRequestLogContext,
  logOperationalError,
  logOperationalInfo,
} from '@/lib/observability/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonWithRequestId(body: unknown, requestId: string, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('x-request-id', requestId);
  response.headers.set('cache-control', 'no-store');
  return response;
}

function validateHexColor(value: unknown, fieldName: string): string | null {
  if (value !== undefined && value !== null) {
    if (typeof value !== 'string' || !HEX_COLOR_REGEX.test(value.trim())) {
      return `${fieldName} must be a valid hex color code (#RGB or #RRGGBB).`;
    }
  }
  return null;
}

// GET /api/admin/delivery-message-config
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const context = getRequestLogContext(request, requestId);
  const { admin, response } = await requireAdminPermission(
    request,
    ADMIN_PERMISSIONS.SETTINGS_VIEW
  );
  if (response) return response;

  try {
    const config = await getDeliveryMessageConfig();
    return jsonWithRequestId({ config, key: DELIVERY_MESSAGE_CONFIG_KEY }, requestId);
  } catch (error) {
    logOperationalError('admin.delivery_message_config.read_failed', error, {
      ...context,
      adminId: admin.adminId,
    });
    return jsonWithRequestId(
      { error: 'Failed to fetch delivery message configuration' },
      requestId,
      { status: 500 }
    );
  }
}

// PUT /api/admin/delivery-message-config
export async function PUT(request: NextRequest) {
  const requestId = getRequestId(request);
  const context = getRequestLogContext(request, requestId);
  const { admin, response } = await requireAdminPermission(
    request,
    ADMIN_PERMISSIONS.SETTINGS_EDIT
  );
  if (response) return response;

  try {
    const body = (await request.json().catch(() => null)) as Record<string, any> | null;
    if (!body || typeof body !== 'object') {
      return jsonWithRequestId(
        { error: 'Valid delivery message configuration payload is required.' },
        requestId,
        { status: 400 }
      );
    }

    // Strict color validation
    const colorChecks = [
      validateHexColor(body.message1?.backgroundColor, 'Message 1 background color'),
      validateHexColor(body.message1?.textColor, 'Message 1 text color'),
      validateHexColor(body.message2?.backgroundColor, 'Message 2 background color'),
      validateHexColor(body.message2?.textColor, 'Message 2 text color'),
      validateHexColor(body.message3?.backgroundColor, 'Message 3 background color'),
      validateHexColor(body.message3?.textColor, 'Message 3 text color'),
    ].filter(Boolean);

    if (colorChecks.length > 0) {
      return jsonWithRequestId(
        { error: colorChecks[0] },
        requestId,
        { status: 400 }
      );
    }

    const normalizedConfig = normalizeDeliveryMessageConfig(body);

    const saved = await prisma.siteConfig.upsert({
      where: { key: DELIVERY_MESSAGE_CONFIG_KEY },
      update: {
        value: toPrismaInputJson(normalizedConfig, 'siteConfig.deliveryMessageConfig'),
      },
      create: {
        key: DELIVERY_MESSAGE_CONFIG_KEY,
        value: toPrismaInputJson(normalizedConfig, 'siteConfig.deliveryMessageConfig'),
      },
    });

    try {
      revalidatePath('/');
      revalidatePath('/products/[id]', 'page');
    } catch {
      // Revalidation error non-fatal
    }

    logOperationalInfo('admin.delivery_message_config.saved', {
      ...context,
      adminId: admin.adminId,
      key: DELIVERY_MESSAGE_CONFIG_KEY,
    });

    return jsonWithRequestId(
      {
        success: true,
        config: normalizedConfig,
        updatedAt: saved.updatedAt,
      },
      requestId
    );
  } catch (error) {
    logOperationalError('admin.delivery_message_config.save_failed', error, {
      ...context,
      adminId: admin.adminId,
    });
    return jsonWithRequestId(
      { error: 'Failed to save delivery message configuration.' },
      requestId,
      { status: 500 }
    );
  }
}
