import { DESIGN_TOKEN_VALUES } from '@/lib/design-tokens';
import prisma from '@/lib/prisma';
import { defaultBrands, defaultCategories, defaultHomeHeroConfig, defaultHomeSections } from '@/lib/homeData';
import type { HomeHeroConfig, HomeSection, HomeSectionBrand, HomeSectionCategory } from '@/types/admin';
import { logOperationalError } from '@/lib/observability/logger';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function toString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function normalizeHomeSection(raw: unknown, fallback: HomeSection): HomeSection {
  const section = isRecord(raw) ? raw : {};
  const settings = isRecord(section.settings) ? section.settings : {};

  return {
    ...fallback,
    id: toString(section.id, fallback.id),
    type: (toString(section.type, fallback.type) || fallback.type) as HomeSection['type'],
    title: toString(section.title, fallback.title),
    subtitle: toString(section.subtitle, fallback.subtitle ?? ''),
    isVisible: toBoolean(section.isVisible, fallback.isVisible),
    order: toNumber(section.order, fallback.order),
    settings: {
      ...fallback.settings,
      showViewAll: toBoolean(settings.showViewAll, fallback.settings.showViewAll ?? true),
      itemsToShow: Math.max(1, Math.min(24, toNumber(settings.itemsToShow, fallback.settings.itemsToShow ?? 6))),
      layout: (toString(settings.layout, fallback.settings.layout ?? 'grid-2') || 'grid-2') as HomeSection['settings']['layout'],
      backgroundColor: toString(settings.backgroundColor, fallback.settings.backgroundColor ?? DESIGN_TOKEN_VALUES.surface.panel),
      viewAllHref: toString(settings.viewAllHref, fallback.settings.viewAllHref ?? ''),
      ctaText: toString(settings.ctaText, fallback.settings.ctaText ?? ''),
      ctaHref: toString(settings.ctaHref, fallback.settings.ctaHref ?? ''),
      selectedProductIds: normalizeStringArray(settings.selectedProductIds),
      selectedCategoryIds: normalizeStringArray(settings.selectedCategoryIds),
      selectedBrandIds: normalizeStringArray(settings.selectedBrandIds),
    },
  };
}

export function normalizeHomeSections(raw: unknown): HomeSection[] {
  const savedSections = Array.isArray(raw) ? raw : [];
  const savedByType = new Map<string, unknown>();

  for (const section of savedSections) {
    if (isRecord(section) && typeof section.type === 'string') {
      savedByType.set(section.type, section);
    }
  }

  const merged = defaultHomeSections.map((fallback) => normalizeHomeSection(savedByType.get(fallback.type), fallback));

  // Keep any custom future section saved by admin without breaking the homepage.
  for (const section of savedSections) {
    if (isRecord(section) && typeof section.type === 'string' && !defaultHomeSections.some((item) => item.type === section.type)) {
      const fallback: HomeSection = {
        id: toString(section.id, `section-${section.type}`),
        type: section.type as HomeSection['type'],
        title: toString(section.title, section.type),
        isVisible: toBoolean(section.isVisible, true),
        order: toNumber(section.order, merged.length + 1),
        settings: {},
      };
      merged.push(normalizeHomeSection(section, fallback));
    }
  }

  return merged.sort((a, b) => a.order - b.order);
}

export function normalizeHeroConfig(raw: unknown): HomeHeroConfig {
  const hero = isRecord(raw) ? raw : {};

  return {
    ...defaultHomeHeroConfig,
    isVisible: toBoolean(hero.isVisible, defaultHomeHeroConfig.isVisible),
    eyebrow: toString(hero.eyebrow, defaultHomeHeroConfig.eyebrow),
    title: toString(hero.title, defaultHomeHeroConfig.title),
    subtitle: toString(hero.subtitle, defaultHomeHeroConfig.subtitle),
    primaryCtaText: toString(hero.primaryCtaText, defaultHomeHeroConfig.primaryCtaText),
    primaryCtaHref: toString(hero.primaryCtaHref, defaultHomeHeroConfig.primaryCtaHref),
    secondaryCtaText: toString(hero.secondaryCtaText, defaultHomeHeroConfig.secondaryCtaText),
    secondaryCtaHref: toString(hero.secondaryCtaHref, defaultHomeHeroConfig.secondaryCtaHref),
    imageUrl: toString(hero.imageUrl, defaultHomeHeroConfig.imageUrl ?? ''),
    featuredProductName: toString(hero.featuredProductName, defaultHomeHeroConfig.featuredProductName ?? ''),
    badgeOne: toString(hero.badgeOne, defaultHomeHeroConfig.badgeOne ?? ''),
    badgeTwo: toString(hero.badgeTwo, defaultHomeHeroConfig.badgeTwo ?? ''),
    backgroundClass: toString(hero.backgroundClass, defaultHomeHeroConfig.backgroundClass ?? ''),
  };
}

export function normalizeHomeCategories(raw: unknown): HomeSectionCategory[] {
  const categories = Array.isArray(raw) ? raw : defaultCategories;

  return categories
    .reduce<HomeSectionCategory[]>((normalized, item, index) => {
      if (!isRecord(item)) return normalized;
      const name = toString(item.name);
      if (!name) return normalized;

      normalized.push({
        id: toString(item.id, `home-category-${index}`),
        name,
        slug: toString(item.slug, name.toLowerCase().replace(/\s+/g, '-')),
        icon: toString(item.icon, name.charAt(0).toUpperCase()),
        color: toString(item.color, 'bg-pink-100'),
        isVisible: toBoolean(item.isVisible, true),
        order: toNumber(item.order, index + 1),
        productCount: toNumber(item.productCount, 0),
      });
      return normalized;
    }, [])
    .sort((a, b) => a.order - b.order);
}

export function normalizeHomeBrands(raw: unknown): HomeSectionBrand[] {
  const brands = Array.isArray(raw) ? raw : defaultBrands;

  return brands
    .map((item, index) => {
      if (!isRecord(item)) return null;
      const name = toString(item.name);
      if (!name) return null;

      return {
        id: toString(item.id, `home-brand-${index}`),
        name,
        slug: toString(item.slug, name.toLowerCase().replace(/\s+/g, '-')),
        logo: toString(item.logo, name),
        productCount: toNumber(item.productCount, 0),
        isVisible: toBoolean(item.isVisible, true),
        order: toNumber(item.order, index + 1),
      } satisfies HomeSectionBrand;
    })
    .filter((item): item is HomeSectionBrand => Boolean(item))
    .sort((a, b) => a.order - b.order);
}

async function getSiteConfigValue(key: string): Promise<unknown> {
  try {
    const config = await prisma.siteConfig.findUnique({ where: { key } });
    return config?.value ?? null;
  } catch (error) {
    logOperationalError('homepage.config_load_failed', error, { key });
    return null;
  }
}

export async function getHomePageConfig() {
  const [sectionsRaw, categoriesRaw, brandsRaw, heroRaw] = await Promise.all([
    getSiteConfigValue('homeSections'),
    getSiteConfigValue('homeCategories'),
    getSiteConfigValue('homeBrands'),
    getSiteConfigValue('homeHero'),
  ]);

  return {
    sections: normalizeHomeSections(sectionsRaw),
    categories: normalizeHomeCategories(categoriesRaw),
    brands: normalizeHomeBrands(brandsRaw),
    hero: normalizeHeroConfig(heroRaw),
  };
}

export type HomePageConfig = Awaited<ReturnType<typeof getHomePageConfig>>;
