'use client';

import { useCallback, useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, X } from 'lucide-react';

import CatalogProductImage from '@/components/catalog/CatalogProductImage';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useSwipe } from '@/hooks/useSwipeAndScrollHeader';

interface ImageItem {
  url: string;
  alt?: string;
}

interface ProductGalleryProps {
  images: ImageItem[] | string[];
  productName: string;
  discountPct: number | null;
  isNew: boolean;
  overrideImage?: string | null;
}

export default function ProductGallery({
  images,
  productName,
  discountPct,
  isNew,
  overrideImage,
}: ProductGalleryProps) {
  const normalizedImages: ImageItem[] = (images as (string | ImageItem)[])
    .map((image) => (typeof image === 'string' ? { url: image, alt: productName } : image))
    .filter((image) => Boolean(image?.url));

  const safeImages = normalizedImages.length
    ? normalizedImages
    : [{ url: '/placeholder.jpg', alt: `${productName} ছবি পাওয়া যায়নি` }];

  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [dismissedOverride, setDismissedOverride] = useState<string | null>(null);
  const variantUrl = overrideImage && dismissedOverride !== overrideImage ? overrideImage : null;

  const prev = useCallback(() => {
    setDismissedOverride(overrideImage || null);
    setActiveIdx((index) => (index === 0 ? safeImages.length - 1 : index - 1));
  }, [overrideImage, safeImages.length]);

  const next = useCallback(() => {
    setDismissedOverride(overrideImage || null);
    setActiveIdx((index) => (index === safeImages.length - 1 ? 0 : index + 1));
  }, [overrideImage, safeImages.length]);

  useEffect(() => {
    if (!zoomed || safeImages.length <= 1) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        prev();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        next();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [next, prev, safeImages.length, zoomed]);

  const displayUrl = variantUrl || safeImages[activeIdx]?.url;
  const displayAlt = variantUrl
    ? `${productName} নির্বাচিত ভ্যারিয়েন্ট ছবি`
    : safeImages[activeIdx]?.alt || productName;
  const activeImageNumber = variantUrl ? 'ভ্যারিয়েন্ট ছবি' : `${activeIdx + 1} / ${safeImages.length}`;

  const handleGalleryKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setZoomed(true);
      }
      if (safeImages.length > 1 && event.key === 'ArrowLeft') {
        event.preventDefault();
        prev();
      }
      if (safeImages.length > 1 && event.key === 'ArrowRight') {
        event.preventDefault();
        next();
      }
    },
    [next, prev, safeImages.length],
  );

  const swipeHandlers = useSwipe({ onSwipeLeft: next, onSwipeRight: prev });

  return (
    <>
      <section className="w-full" aria-label={`${productName} ছবি গ্যালারি`} lang="bn">
        <div
          className="relative aspect-[4/3] cursor-zoom-in select-none overflow-hidden rounded-2xl bg-minsah-surface-soft outline-none focus-visible:ring-2 focus-visible:ring-minsah-border-focus focus-visible:ring-offset-2 touch-pan-y md:aspect-square md:rounded-3xl"
          role="button"
          tabIndex={0}
          aria-label={`${productName} ছবি বড় করে দেখুন। ${activeImageNumber}`}
          {...swipeHandlers}
          onClick={() => setZoomed(true)}
          onKeyDown={handleGalleryKeyDown}
        >
          <CatalogProductImage
            src={displayUrl}
            alt={displayAlt}
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            quality={82}
            className="pointer-events-none md:p-4"
          />

          <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
            {discountPct && discountPct > 0 ? <Badge tone="danger">-{discountPct}%</Badge> : null}
            {isNew ? <Badge tone="info">নতুন</Badge> : null}
          </div>

          {variantUrl ? (
            <div className="pointer-events-none absolute bottom-14 left-1/2 -translate-x-1/2 rounded-full bg-minsah-surface-inverse/80 px-3 py-1 text-xs text-minsah-text-inverse">
              ভ্যারিয়েন্ট ছবি
            </div>
          ) : null}

          <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-minsah-surface-elevated/90 px-2.5 py-1.5 text-xs font-bold text-minsah-text-primary shadow-sm backdrop-blur-sm">
            <ZoomIn className="h-4 w-4" aria-hidden="true" />
            <span>ছবি বড় করুন</span>
          </div>

          {safeImages.length > 1 ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="আগের ছবি দেখুন"
                onClick={(event) => {
                  event.stopPropagation();
                  prev();
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-minsah-surface-elevated/90 shadow-sm backdrop-blur-sm md:left-3"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="পরের ছবি দেখুন"
                onClick={(event) => {
                  event.stopPropagation();
                  next();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-minsah-surface-elevated/90 shadow-sm backdrop-blur-sm md:right-3"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            </>
          ) : null}

          {safeImages.length > 1 ? (
            <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5" aria-hidden="true">
              {safeImages.map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${
                    index === activeIdx && !variantUrl
                      ? 'w-4 bg-minsah-action-primary'
                      : 'w-1.5 bg-minsah-border-default'
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-minsah-text-muted">
          <span aria-live="polite">
            {variantUrl ? 'ভ্যারিয়েন্ট ছবি দেখানো হচ্ছে' : `ছবি ${activeIdx + 1} / ${safeImages.length}`}
          </span>
          <span className="hidden sm:inline">সোয়াইপ, তীরচিহ্ন বা থাম্বনেইল দিয়ে ছবি বদলান</span>
        </div>

        {safeImages.length > 1 ? (
          <div className="mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 scrollbar-hide" aria-label="পণ্যের ছোট ছবি">
            {safeImages.map((image, index) => (
              <Button
                key={image.url}
                type="button"
                variant="secondary"
                size="icon"
                aria-label={`${productName} ছবি ${index + 1} দেখুন`}
                aria-pressed={index === activeIdx && !variantUrl}
                onClick={() => {
                  setDismissedOverride(overrideImage || null);
                  setActiveIdx(index);
                }}
                className={`h-16 min-h-16 w-16 min-w-16 shrink-0 snap-start overflow-hidden rounded-xl border-2 bg-minsah-surface-soft p-1 md:h-20 md:min-h-20 md:w-20 md:min-w-20 ${
                  index === activeIdx && !variantUrl
                    ? 'border-minsah-border-strong shadow-md'
                    : 'border-transparent hover:border-minsah-border-default'
                }`}
              >
                <span className="relative block h-full w-full">
                  <CatalogProductImage src={image.url} alt={image.alt || `${productName} ${index + 1}`} sizes="80px" padding="sm" />
                </span>
              </Button>
            ))}
          </div>
        ) : null}
      </section>

      <Modal
        open={zoomed}
        onClose={() => setZoomed(false)}
        ariaLabel={`${productName} বড় ছবি`}
        size="full"
        showCloseButton={false}
        panelClassName="border-0 bg-minsah-surface-inverse"
        bodyClassName="relative max-h-[92dvh] min-h-[80dvh] p-0"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="বড় ছবি বন্ধ করুন"
          onClick={() => setZoomed(false)}
          className="absolute right-3 top-3 z-10 bg-minsah-surface-panel/15 text-minsah-text-inverse hover:bg-minsah-surface-panel/25 hover:text-minsah-text-inverse"
        >
          <X className="h-5 w-5" />
        </Button>

        {safeImages.length > 1 ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="বড় ছবিতে আগের ছবি দেখুন"
              onClick={prev}
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 bg-minsah-surface-panel/15 text-minsah-text-inverse hover:bg-minsah-surface-panel/25 hover:text-minsah-text-inverse md:left-6"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="বড় ছবিতে পরের ছবি দেখুন"
              onClick={next}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 bg-minsah-surface-panel/15 text-minsah-text-inverse hover:bg-minsah-surface-panel/25 hover:text-minsah-text-inverse md:right-6"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        ) : null}

        <div className="relative h-[82dvh] w-full">
          <CatalogProductImage
            src={displayUrl}
            alt={displayAlt}
            sizes="92vw"
            quality={88}
            padding="none"
            className="rounded-xl"
          />
        </div>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-minsah-surface-panel/10 px-3 py-1.5 text-sm text-minsah-text-inverse/80" aria-live="polite">
          {activeImageNumber}
        </div>
      </Modal>
    </>
  );
}
