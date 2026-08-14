import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { uploadAvatar, validateImageUpload } from '@/lib/storage/minio';
import { getAuthenticatedUserId } from '@/app/api/auth/_utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authenticatedUserId = await getAuthenticatedUserId(request);
  if (!authenticatedUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const requestedUserId = formData.get('userId') as string | null;
    const userId = requestedUserId || authenticatedUserId;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (requestedUserId && requestedUserId !== authenticatedUserId) {
      return NextResponse.json({ error: 'Forbidden: Cannot upload avatar for another user' }, { status: 403 });
    }

    const validation = validateImageUpload({ size: file.size, type: file.type });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadAvatar(buffer, userId, file.name, file.type);

    return NextResponse.json({
      success: true,
      key: result.key,
      url: result.url,
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Upload failed', detail: message }, { status: 500 });
  }
}
