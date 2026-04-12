import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  uploadFile,
  uploadProductImage,
  validateImageUpload,
  ensureBucketInitialized,
} from '@/lib/storage/minio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await ensureBucketInitialized();
    const formData = await request.formData();
    const file     = formData.get('file') as File | null;
    const folder   = (formData.get('folder') as string) || 'uploads';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const validation = validateImageUpload({ size: file.size, type: file.type });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // products/ folder → sharp দিয়ে WebP convert + resize + cache header
    // অন্য folder → raw upload (avatars, banners etc. এর নিজস্ব route আছে)
    let result: { key: string; url: string };

    if (folder.startsWith('products/')) {
      // folder থেকে productId বের করি: "products/new" → "new", "products/abc123" → "abc123"
      const productId = folder.replace('products/', '') || 'general';
      result = await uploadProductImage(buffer, productId, file.name, file.type);
    } else {
      result = await uploadFile(buffer, file.name, folder, file.type);
    }

    return NextResponse.json({
      success: true,
      key: result.key,
      url: result.url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed', detail: message }, { status: 500 });
  }
}
