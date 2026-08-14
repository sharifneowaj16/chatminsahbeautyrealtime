import Image from 'next/image';
import type { ReactNode } from 'react';

type CatalogProductImageProps = {
  src?: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  fallback?: ReactNode;
  quality?: number;
  fit?: 'contain' | 'cover';
  padding?: 'none' | 'sm' | 'md';
};

const NEXT_IMAGE_HTTPS_HOSTS = new Set([
  'minsahbeauty.cloud',
  'minio.minsahbeauty.cloud',
  'storage.minsahbeauty.cloud',
  'lh3.googleusercontent.com',
  'graph.facebook.com',
  'platform-lookaside.fbsbx.com',
  'placehold.co',
]);

const NEXT_IMAGE_HTTP_HOSTS = new Set(['minio', 'localhost']);

function isNextImageSource(src: string): boolean {
  if (src.startsWith('/') && !src.startsWith('//')) return true;
  if (!src.startsWith('http://') && !src.startsWith('https://')) return false;

  try {
    const url = new URL(src);
    if (url.protocol === 'https:') return NEXT_IMAGE_HTTPS_HOSTS.has(url.hostname);
    return url.protocol === 'http:' && NEXT_IMAGE_HTTP_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function getPaddingClass(padding: CatalogProductImageProps['padding']): string {
  if (padding === 'none') return '';
  if (padding === 'sm') return 'p-1';
  return 'p-3';
}

export default function CatalogProductImage({
  src,
  alt,
  sizes,
  priority = false,
  className = '',
  fallback = '✨',
  quality = 72,
  fit = 'contain',
  padding = 'md',
}: CatalogProductImageProps) {
  const normalizedSrc = src?.trim() || '';
  const fitClass = fit === 'cover' ? 'object-cover' : 'object-contain';
  const paddingClass = getPaddingClass(padding);
  const imageClassName = `h-full w-full ${fitClass} ${paddingClass} transition-transform duration-300 motion-reduce:transition-none ${className}`.trim();

  let media: ReactNode;

  if (normalizedSrc && isNextImageSource(normalizedSrc)) {
    media = (
      <Image
        src={normalizedSrc}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        quality={quality}
        className={imageClassName}
      />
    );
  } else if (
    normalizedSrc.startsWith('data:') ||
    normalizedSrc.startsWith('blob:') ||
    normalizedSrc.startsWith('http://') ||
    normalizedSrc.startsWith('https://')
  ) {
    media = (
      <img
        src={normalizedSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        className={imageClassName}
      />
    );
  } else {
    media = (
      <span className="flex h-full w-full items-center justify-center text-5xl text-minsah-secondary" aria-hidden="true">
        {fallback}
      </span>
    );
  }

  return <span className="relative block h-full w-full overflow-hidden">{media}</span>;
}
