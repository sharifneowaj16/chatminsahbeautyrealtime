export interface HeroSlide {
  id: string;
  imageUrl: string;
  mobileImageUrl?: string;
  title?: string;
  subtitle?: string;
  linkHref?: string;
  order: number;
  isActive: boolean;
}

export interface HeroCategoryPill {
  id: string;
  name: string;
  iconName: string;
  href: string;
}

export interface HomeHeroContainerProps {
  slides?: HeroSlide[];
  defaultImageUrl?: string;
  title?: string;
  subtitle?: string;
  primaryCtaText?: string;
  primaryCtaHref?: string;
  eyebrow?: string;
  badgeOne?: string;
  badgeTwo?: string;
}
