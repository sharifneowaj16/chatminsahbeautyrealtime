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
    <section className={`bg-gradient-to-br px-4 py-6 sm:py-8 lg:px-6 ${backgroundClass}`}>
      <div className="mx-auto grid max-w-7xl gap-6 overflow-hidden rounded-[2rem] border border-minsah-accent bg-white/85 p-5 shadow-sm sm:p-7 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:p-8">
        <div className="relative z-10 flex flex-col items-start">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-minsah-accent px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-minsah-primary">
            <Sparkles size={14} />
            {eyebrow}
          </div>

          <h1 className="max-w-2xl text-3xl font-black leading-[1.05] tracking-tight text-minsah-dark sm:text-4xl lg:text-5xl">
            {safeHeroTitle}
          </h1>

          <p className="mt-4 max-w-xl text-sm font-medium leading-6 text-minsah-secondary sm:text-base">
            {subtitle}
          </p>

          <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href={primaryCtaHref}
              className="minsah-tap-target inline-flex items-center justify-center gap-2 rounded-full bg-minsah-primary px-6 py-3 text-sm font-bold text-white shadow-md shadow-minsah-primary/20 hover:bg-minsah-dark focus:outline-none focus:ring-2 focus:ring-minsah-primary focus:ring-offset-2"
            >
              {primaryCtaText} <ArrowRight size={17} />
            </Link>
            <Link
              href={secondaryCtaHref}
              className="minsah-tap-target inline-flex items-center justify-center gap-2 rounded-full border border-minsah-primary/20 bg-white px-6 py-3 text-sm font-bold text-minsah-primary hover:border-minsah-primary hover:bg-minsah-light focus:outline-none focus:ring-2 focus:ring-minsah-primary focus:ring-offset-2"
            >
              {secondaryCtaText} <Gift size={17} />
            </Link>
          </div>

          <div className="mt-6 grid w-full grid-cols-2 gap-3 text-xs font-semibold text-minsah-secondary sm:flex sm:w-auto sm:flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-minsah-light px-3 py-2">
              <BadgeCheck size={15} className="text-minsah-primary" /> {badgeOne}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-minsah-light px-3 py-2">
              <BadgeCheck size={15} className="text-minsah-primary" /> {badgeTwo}
            </span>
          </div>
        </div>

        <div className="relative min-h-[240px] overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-minsah-primary via-minsah-secondary to-minsah-dark p-5 text-white sm:min-h-[300px]">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-minsah-accent/25 blur-2xl" />

          <div className="relative z-10 flex h-full min-h-[220px] items-center justify-center">
            {hasImage ? (
              <div className="minsah-float-soft relative h-56 w-56 overflow-hidden rounded-[1.75rem] bg-white shadow-2xl shadow-black/20 sm:h-64 sm:w-64">
                <Image
                  src={featuredImage as string}
                  alt={featuredProductName || 'Featured beauty product'}
                  fill
                  priority
                  sizes="(max-width: 768px) 224px, 256px"
                  className="object-contain p-4"
                />
              </div>
            ) : (
              <div className="minsah-float-soft relative h-56 w-56 rounded-[1.75rem] bg-white p-5 text-minsah-dark shadow-2xl shadow-black/20 sm:h-64 sm:w-64">
                <div className="h-full rounded-[1.35rem] bg-minsah-accent p-4">
                  <div className="mb-4 h-28 rounded-[1.15rem] bg-white/80" />
                  <div className="h-3 w-28 rounded-full bg-minsah-primary/30" />
                  <div className="mt-2 h-3 w-20 rounded-full bg-minsah-secondary/25" />
                  <div className="mt-5 h-9 rounded-full bg-minsah-primary" />
                </div>
              </div>
            )}
          </div>

          <div className="absolute bottom-5 left-5 right-5 z-20 rounded-2xl border border-white/20 bg-white/15 p-3 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/75">Featured</p>
            <p className="mt-1 truncate text-sm font-bold">
              {featuredProductName || 'Beauty essentials ready for your daily routine'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
