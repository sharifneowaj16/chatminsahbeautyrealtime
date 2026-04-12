// app/api/upload/product/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  uploadProductImage,
  validateImageUpload,
  ensureBucketInitialized,
} from '@/lib/storage/minio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await ensureBucketInitialized();

    const formData  = await request.formData();
    const file      = formData.get('file') as File | null;
    const productId = (formData.get('productId') as string) || 'general';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate before reading into memory
    const validation = validateImageUpload({ size: file.size, type: file.type });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // uploadProductImage এর ভেতরে sharp দিয়ে:
    // 1. Max 1200×1200 resize
    // 2. WebP convert (quality 82)
    // 3. Cache-Control: public, max-age=31536000, immutable header যোগ
    const result = await uploadProductImage(buffer, productId, file.name, file.type);

    return NextResponse.json({
      success: true,
      key: result.key,
      url: result.url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Product image upload error:', error);
    return NextResponse.json({ error: 'Upload failed', detail: message }, { status: 500 });
  }
}
