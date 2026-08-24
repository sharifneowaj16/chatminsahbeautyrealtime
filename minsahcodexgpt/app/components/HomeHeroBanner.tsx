import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Gift, Sparkles } from 'lucide-react';

interface HomeHeroBannerProps {
  featuredImage?: string;
  featuredProductName?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  primaryCtaText?: string;
  primaryCtaHref?: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  badgeOne?: string;
  badgeTwo?: string;
  backgroundClass?: string;
}

function isImageUrl(src?: string) {
  return Boolean(src && (src.startsWith('/') || src.startsWith('http') || src.startsWith('data:')));
}

const DEFAULT_HERO_TITLE = 'Authentic Korean Skincare & Beauty Products in Bangladesh';
const genericHeroTitles = new Set(['home', 'hero', 'banner', 'homepage']);

export default function HomeHeroBanner({
  featuredImage,
  featuredProductName,
  eyebrow = 'Premium Beauty Deals',
  title = DEFAULT_HERO_TITLE,
  subtitle = 'Shop skincare, makeup, and curated beauty essentials with clear prices, fast delivery options, and cash on delivery support.',
  primaryCtaText = 'Shop Now',
  primaryCtaHref = '/shop',
  secondaryCtaText = 'Today’s Offers',
  secondaryCtaHref = '/flash-sale',
  badgeOne = 'Authentic Products',
  badgeTwo = 'Cash on Delivery',
  backgroundClass = 'from-minsah-light via-white to-minsah-accent/70',
}: HomeHeroBannerProps) {
  const hasImage = isImageUrl(featuredImage);
  const rawTitle = (title || '').trim();
  const safeHeroTitle = genericHeroTitles.has(rawTitle.toLowerCase())
    ? DEFAULT_HERO_TITLE
    : rawTitle || DEFAULT_HERO_TITLE;

  return (
    <section className="bg-minsah-surface-page px-4 py-8 sm:py-12 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 overflow-hidden rounded-xl border border-stone-200/70 bg-white p-6 shadow-xs sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:p-10">
        <div className="relative z-10 flex flex-col items-start">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-minsah-surface-subtle border border-stone-200/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-minsah-primary">
            <Sparkles size={13} />
            {eyebrow}
          </div>

          <h1 className="max-w-2xl text-3xl font-bold leading-[1.12] tracking-[-0.025em] text-minsah-dark sm:text-4xl lg:text-[44px]">
            {safeHeroTitle}
          </h1>

          <p className="mt-4 max-w-xl text-sm font-normal leading-relaxed text-minsah-secondary sm:text-base">
            {subtitle}
          </p>

          <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href={primaryCtaHref}
              className="minsah-tap-target inline-flex items-center justify-center gap-2 rounded-full bg-minsah-primary px-6 py-3 text-sm font-semibold tracking-wide text-white shadow-xs hover:bg-minsah-dark focus:outline-none focus:ring-2 focus:ring-minsah-primary focus:ring-offset-2"
            >
              {primaryCtaText} <ArrowRight size={16} />
            </Link>
            <Link
              href={secondaryCtaHref}
              className="minsah-tap-target inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold tracking-wide text-minsah-dark hover:border-minsah-primary hover:bg-minsah-surface-subtle focus:outline-none focus:ring-2 focus:ring-minsah-primary focus:ring-offset-2"
            >
              {secondaryCtaText} <Gift size={16} />
            </Link>
          </div>

          <div className="mt-6 grid w-full grid-cols-2 gap-3 text-xs font-medium text-minsah-secondary sm:flex sm:w-auto sm:flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-minsah-surface-subtle px-3 py-1.5">
              <BadgeCheck size={14} className="text-minsah-primary" /> {badgeOne}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-minsah-surface-subtle px-3 py-1.5">
              <BadgeCheck size={14} className="text-minsah-primary" /> {badgeTwo}
            </span>
          </div>
        </div>

        <div className="relative min-h-[260px] overflow-hidden rounded-lg border border-stone-200/70 bg-minsah-surface-subtle p-6 sm:min-h-[320px]">
          <div className="relative z-10 flex h-full min-h-[220px] items-center justify-center">
            {hasImage ? (
              <div className="relative h-56 w-56 overflow-hidden rounded-lg bg-white border border-stone-200/60 p-4 shadow-sm sm:h-64 sm:w-64">
                <Image
                  src={featuredImage as string}
                  alt={featuredProductName || 'Featured beauty product'}
                  fill
                  priority
                  sizes="(max-width: 768px) 224px, 256px"
                  className="object-contain p-2"
                />
              </div>
            ) : (
              <div className="relative h-56 w-56 rounded-lg bg-white border border-stone-200/60 p-5 text-minsah-dark shadow-sm sm:h-64 sm:w-64">
                <div className="h-full rounded-md bg-minsah-surface-subtle p-4">
                  <div className="mb-4 h-28 rounded bg-white/80" />
                  <div className="h-3 w-28 rounded-full bg-minsah-primary/30" />
                  <div className="mt-2 h-3 w-20 rounded-full bg-minsah-secondary/25" />
                  <div className="mt-5 h-9 rounded-full bg-minsah-primary" />
                </div>
              </div>
            )}
          </div>

          <div className="absolute bottom-4 left-4 right-4 z-20 rounded-lg border border-stone-200/80 bg-white/90 p-3 shadow-xs backdrop-blur">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-minsah-secondary">Featured</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-minsah-dark">
              {featuredProductName || 'Beauty essentials ready for your daily routine'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
