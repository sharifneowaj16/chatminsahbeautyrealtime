'use client';

import { useCallback, useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, X, Sparkles } from 'lucide-react';

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
        <div className="flex flex-col-reverse gap-3 lg:flex-row lg:items-start">
          {/* Desktop Vertical Thumbnail Rail (Hidden on Mobile) */}
          {safeImages.length > 1 && (
            <div className="hidden lg:flex lg:flex-col lg:gap-2.5 lg:w-20 lg:shrink-0 max-h-[580px] overflow-y-auto pr-1 scrollbar-thin">
              {safeImages.map((image, index) => {
                const isSelected = index === activeIdx && !variantUrl;
                return (
                  <button
                    key={image.url}
                    type="button"
                    onClick={() => {
                      setDismissedOverride(overrideImage || null);
                      setActiveIdx(index);
                    }}
                    aria-label={`${productName} ছবি ${index + 1} দেখুন`}
                    className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border transition-all duration-200 bg-minsah-surface-subtle p-1 ${
                      isSelected
                        ? 'border-minsah-action-primary shadow-xs scale-[1.02] ring-2 ring-minsah-action-primary/20'
                        : 'border-minsah-border-subtle hover:border-minsah-border-default opacity-80 hover:opacity-100'
                    }`}
                  >
                    <span className="relative block h-full w-full rounded-md overflow-hidden">
                      <CatalogProductImage
                        src={image.url}
                        alt={image.alt || `${productName} ${index + 1}`}
                        sizes="80px"
                        padding="none"
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Main Large Image Viewport */}
          <div className="relative flex-1">
            <div
              className="relative aspect-[4/3] sm:aspect-[1/1] w-full cursor-zoom-in select-none overflow-hidden rounded-xl border border-stone-200/80 bg-minsah-surface-subtle outline-none focus-visible:ring-2 focus-visible:ring-minsah-border-focus touch-pan-y shadow-xs"
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
                sizes="(max-width: 768px) 100vw, 55vw"
                priority
                quality={88}
                className="pointer-events-none p-2 sm:p-4 transition-transform duration-300 hover:scale-[1.02]"
              />

              {/* Floating Badges */}
              <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5 z-10">
                {discountPct && discountPct > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-minsah-action-primary px-2.5 py-1 text-xs font-semibold tracking-wide text-white shadow-xs">
                    -{discountPct}% OFF
                  </span>
                ) : null}
                {isNew ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-minsah-action-secondary px-2.5 py-1 text-xs font-semibold text-white shadow-xs">
                    <Sparkles className="h-3 w-3" /> নতুন
                  </span>
                ) : null}
              </div>

              {variantUrl ? (
                <div className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 rounded-full bg-minsah-surface-inverse/80 px-3.5 py-1 text-xs font-medium text-white shadow-xs backdrop-blur-sm">
                  ভ্যারিয়েন্ট ছবি
                </div>
              ) : null}

              {/* Zoom Trigger Pill */}
              <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-minsah-text-primary shadow-xs backdrop-blur-md">
                <ZoomIn className="h-3.5 w-3.5 text-minsah-action-primary" aria-hidden="true" />
                <span className="hidden sm:inline">বড় করুন</span>
              </div>

              {/* Prev / Next Chevrons on Mobile & Tablet */}
              {safeImages.length > 1 && (
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
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 text-minsah-text-primary shadow-md backdrop-blur-md hover:bg-white hover:scale-105 transition-all"
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
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 text-minsah-text-primary shadow-md backdrop-blur-md hover:bg-white hover:scale-105 transition-all"
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </>
              )}

              {/* Pagination Dots (Mobile) */}
              {safeImages.length > 1 && (
                <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 z-10" aria-hidden="true">
                  {safeImages.map((_, index) => (
                    <span
                      key={index}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        index === activeIdx && !variantUrl
                          ? 'w-5 bg-minsah-action-primary shadow-sm'
                          : 'w-1.5 bg-minsah-border-default/80'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Thumbnail Carousel (Visible on Mobile/Tablet only) */}
            {safeImages.length > 1 && (
              <div className="mt-3 flex lg:hidden snap-x snap-mandatory gap-2 overflow-x-auto pb-1 scrollbar-hide" aria-label="পণ্যের ছোট ছবি">
                {safeImages.map((image, index) => {
                  const isSelected = index === activeIdx && !variantUrl;
                  return (
                    <button
                      key={image.url}
                      type="button"
                      aria-label={`${productName} ছবি ${index + 1} দেখুন`}
                      onClick={() => {
                        setDismissedOverride(overrideImage || null);
                        setActiveIdx(index);
                      }}
                      className={`h-16 w-16 min-w-16 shrink-0 snap-start overflow-hidden rounded-xl border-2 transition-all p-1 bg-minsah-surface-subtle ${
                        isSelected
                          ? 'border-minsah-action-primary shadow-sm scale-105'
                          : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                    >
                      <span className="relative block h-full w-full rounded-lg overflow-hidden">
                        <CatalogProductImage src={image.url} alt={image.alt || `${productName} ${index + 1}`} sizes="64px" padding="none" />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* High-Resolution Zoom Lightbox Modal */}
      <Modal
        open={zoomed}
        onClose={() => setZoomed(false)}
        ariaLabel={`${productName} বড় ছবি`}
        size="full"
        showCloseButton={false}
        panelClassName="border-0 bg-neutral-950/95 backdrop-blur-xl"
        bodyClassName="relative max-h-[94dvh] min-h-[85dvh] p-0 flex items-center justify-center"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="বড় ছবি বন্ধ করুন"
          onClick={() => setZoomed(false)}
          className="absolute right-4 top-4 z-20 h-11 w-11 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
        >
          <X className="h-6 w-6" />
        </Button>

        {safeImages.length > 1 && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="বড় ছবিতে আগের ছবি দেখুন"
              onClick={prev}
              className="absolute left-4 top-1/2 z-20 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all md:left-8"
            >
              <ChevronLeft className="h-7 w-7" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="বড় ছবিতে পরের ছবি দেখুন"
              onClick={next}
              className="absolute right-4 top-1/2 z-20 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all md:right-8"
            >
              <ChevronRight className="h-7 w-7" />
            </Button>
          </>
        )}

        <div className="relative h-[82dvh] w-full max-w-5xl mx-auto flex items-center justify-center p-4">
          <CatalogProductImage
            src={displayUrl}
            alt={displayAlt}
            sizes="95vw"
            quality={92}
            padding="none"
            className="rounded-2xl max-h-full object-contain drop-shadow-2xl"
          />
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-md" aria-live="polite">
          {activeImageNumber}
        </div>
      </Modal>
    </>
  );
}
