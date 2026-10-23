'use client';

import React from 'react';
import type { HeroSlide, HomeHeroContainerProps } from './types';
import MobileHeroSlider from './MobileHeroSlider';
import DesktopHeroSlider from './DesktopHeroSlider';

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: 'slide-pink-authentic',
    imageUrl: '/images/banners/minsah-hero-pink-authentic.jpg',
    title: 'Minsah Original | Authentic | Trusted',
    subtitle: '100% Genuine Korean Skincare & Beauty Products in Bangladesh',
    linkHref: '/shop',
    order: 1,
    isActive: true,
  },
  {
    id: 'slide-hero-curated',
    imageUrl: '/images/hero-image.jpg',
    title: 'Dewy Glow & Pure Botanical Radiance',
    subtitle: 'Direct Import Korean Formulations Dispatched in 24-48 Hours',
    linkHref: '/shop?section=new-in',
    order: 2,
    isActive: true,
  },
];

export default function HomeHeroContainer({
  slides,
  defaultImageUrl,
  title,
  subtitle,
  primaryCtaHref,
}: HomeHeroContainerProps) {
  // If dynamic slides provided from database/config, use them; otherwise fallback to default slides
  let activeSlides = (slides && slides.length > 0)
    ? slides.filter((s) => s.isActive)
    : DEFAULT_SLIDES;

  if (activeSlides.length === 0 && defaultImageUrl) {
    activeSlides = [
      {
        id: 'slide-default-single',
        imageUrl: defaultImageUrl,
        title: title || 'Minsah Beauty',
        subtitle: subtitle || 'Authentic K-Beauty in Bangladesh',
        linkHref: primaryCtaHref || '/shop',
        order: 1,
        isActive: true,
      },
    ];
  }

  return (
    <section className="w-full bg-stone-50/60 dark:bg-stone-900/40 pt-1 sm:pt-2 pb-0.5 sm:pb-1">
      {/* 1. Mobile Slider (88vw + 10% peek, 3s auto-slide) */}
      <MobileHeroSlider slides={activeSlides} intervalMs={3000} />

      {/* 2. Desktop Slider (10% peek, panoramic 280-310px, 3s auto-slide, hover-pause) */}
      <DesktopHeroSlider slides={activeSlides} intervalMs={3000} />
    </section>
  );
}
