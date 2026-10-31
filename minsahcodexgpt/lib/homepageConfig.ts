import { DESIGN_TOKEN_VALUES } from '@/lib/design-tokens';
import prisma from '@/lib/prisma';
import { defaultBrands, defaultCategories, defaultHomeHeroConfig, defaultHomeSections } from '@/lib/homeData';
import type { HeroSlide, HomeHeroConfig, HomeSection, HomeSectionBrand, HomeSectionCategory } from '@/types/admin';
import { logOperationalError } from '@/lib/observability/logger';
import { DEFAULT_FLASH_DEALS_CONFIG, type FlashDealsConfig, type FlashDealItem } from '@/components/home/flash-deals/types';

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

function normalizeHeroSlides(raw: unknown): HeroSlide[] {
  if (!Array.isArray(raw)) return defaultHomeHeroConfig.slides || [];
  const slides: HeroSlide[] = [];

  for (let idx = 0; idx < raw.length; idx++) {
    const item = raw[idx];
    if (!isRecord(item)) continue;
    const imageUrl = toString(item.imageUrl);
    if (!imageUrl) continue;

    slides.push({
      id: toString(item.id, `slide-${idx}`),
      imageUrl,
      ...(item.mobileImageUrl ? { mobileImageUrl: toString(item.mobileImageUrl) } : {}),
      title: toString(item.title, ''),
      subtitle: toString(item.subtitle, ''),
      linkHref: toString(item.linkHref, ''),
      order: toNumber(item.order, idx + 1),
      isActive: toBoolean(item.isActive, true),
    });
  }

  slides.sort((a, b) => a.order - b.order);
  return slides.length > 0 ? slides : (defaultHomeHeroConfig.slides || []);
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
    slides: normalizeHeroSlides(hero.slides),
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

export function normalizeFlashDealsConfig(raw: unknown): FlashDealsConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return DEFAULT_FLASH_DEALS_CONFIG;
  }
  const obj = raw as Record<string, unknown>;
  const rawItems = Array.isArray(obj.items) ? obj.items : DEFAULT_FLASH_DEALS_CONFIG.items;

  const items: FlashDealItem[] = rawItems.map((item, index) => {
    const it = (item && typeof item === 'object') ? (item as Record<string, unknown>) : {};
    const deal: FlashDealItem = {
      id: String(it.id || `flash-deal-${index}`),
      productId: String(it.productId || ''),
      title: String(it.title || 'Flash Deal Item'),
      imageUrl: String(it.imageUrl || '/images/hero-image.jpg'),
      originalPrice: Number(it.originalPrice) || 0,
      salePrice: Number(it.salePrice) || 0,
      order: Number(it.order) || index + 1,
      isActive: it.isActive !== false,
    };

    if (it.slug) deal.slug = String(it.slug);
    if (it.subtitle) deal.subtitle = String(it.subtitle);
    if (it.discountBadge) deal.discountBadge = String(it.discountBadge);
    if (it.rating != null && Number.isFinite(Number(it.rating))) deal.rating = Number(it.rating);
    if (it.ratingCount != null && Number.isFinite(Number(it.ratingCount))) deal.ratingCount = Number(it.ratingCount);
    if (it.stockUrgencyText) deal.stockUrgencyText = String(it.stockUrgencyText);
    if (it.claimedPercentage != null && Number.isFinite(Number(it.claimedPercentage))) {
      deal.claimedPercentage = Number(it.claimedPercentage);
    }
    if (Array.isArray(it.variants) && it.variants.length > 0) {
      deal.variants = it.variants;
    }

    return deal;
  });

  return {
    isVisible: obj.isVisible !== false,
    badgeText: String(obj.badgeText || DEFAULT_FLASH_DEALS_CONFIG.badgeText),
    title: String(obj.title || DEFAULT_FLASH_DEALS_CONFIG.title),
    subtitle: String(obj.subtitle || DEFAULT_FLASH_DEALS_CONFIG.subtitle),
    timerLabel: String(obj.timerLabel || DEFAULT_FLASH_DEALS_CONFIG.timerLabel),
    endsAt: String(obj.endsAt || DEFAULT_FLASH_DEALS_CONFIG.endsAt),
    items,
  };
}

export async function hydrateFlashDealsWithLiveProducts(
  config: FlashDealsConfig,
  options?: { forAdmin?: boolean }
): Promise<FlashDealsConfig> {
  if (!config.items || config.items.length === 0) {
    return config;
  }

  const productIds = Array.from(
    new Set(
      config.items
        .map((item) => item.productId)
        .filter((id): id is string => Boolean(id && typeof id === 'string' && id.trim() && id !== 'custom-deal'))
    )
  );

  if (productIds.length === 0) {
    return config;
  }

  try {
    const liveProducts = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        deletedAt: null,
        ...(options?.forAdmin ? {} : { isActive: true }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        quantity: true,
        isActive: true,
        images: {
          where: { isDefault: true },
          take: 1,
          select: { url: true },
        },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            sku: true,
            name: true,
            price: true,
            quantity: true,
            attributes: true,
            image: true,
          },
        },
      },
    });

    const liveProductMap = new Map(liveProducts.map((p) => [p.id, p]));
    const hydratedItems: FlashDealItem[] = [];

    for (const item of config.items) {
      if (!options?.forAdmin && !item.isActive) {
        continue;
      }

      const live = item.productId ? liveProductMap.get(item.productId) : null;
      if (!live) {
        // If product is deleted or missing from DB
        if (options?.forAdmin) {
          hydratedItems.push(item);
        }
        // For storefront, completely skip deleted or inactive products
        continue;
      }

      const origPrice = Number(live.price) || item.originalPrice;
      const salePrice = item.salePrice > 0 ? item.salePrice : Math.round(origPrice * 0.85);
      const discountAmount = Math.max(0, origPrice - salePrice);
      const autoBadge = discountAmount > 0 ? `৳${discountAmount} OFF` : item.discountBadge;

      const liveVariants = (live.variants || []).map((v) => ({
        id: v.id,
        sku: v.sku || '',
        name: v.name,
        price: v.price ? Number(v.price) : origPrice,
        stock: v.quantity,
        attributes: (v.attributes && typeof v.attributes === 'object') ? (v.attributes as Record<string, string>) : null,
        image: v.image || null,
      }));

      const resolvedImage = live.images[0]?.url || item.imageUrl || '/images/hero-image.jpg';

      const stockUrgencyText =
        live.quantity <= 5 && live.quantity > 0
          ? `Only ${live.quantity} units left!`
          : item.stockUrgencyText;

      const hydratedDeal: FlashDealItem = {
        ...item,
        title: live.name || item.title,
        slug: live.slug || item.slug,
        originalPrice: origPrice,
        salePrice: salePrice,
        imageUrl: resolvedImage,
        isActive: options?.forAdmin ? item.isActive : (item.isActive && live.isActive),
      };

      if (autoBadge) hydratedDeal.discountBadge = autoBadge;
      if (stockUrgencyText) hydratedDeal.stockUrgencyText = stockUrgencyText;
      if (liveVariants.length > 0) {
        hydratedDeal.variants = liveVariants;
      } else if (item.variants && item.variants.length > 0) {
        hydratedDeal.variants = item.variants;
      }

      hydratedItems.push(hydratedDeal);
    }

    return {
      ...config,
      items: hydratedItems,
    };
  } catch (error) {
    logOperationalError('flash_deals.hydration_failed', error);
    return config;
  }
}

export async function getHomePageConfig() {
  const [sectionsRaw, categoriesRaw, brandsRaw, heroRaw, flashDealsRaw] = await Promise.all([
    getSiteConfigValue('homeSections'),
    getSiteConfigValue('homeCategories'),
    getSiteConfigValue('homeBrands'),
    getSiteConfigValue('homeHero'),
    getSiteConfigValue('flashDeals'),
  ]);

  const rawNormalizedFlashDeals = normalizeFlashDealsConfig(flashDealsRaw);
  const hydratedFlashDeals = await hydrateFlashDealsWithLiveProducts(rawNormalizedFlashDeals);

  return {
    sections: normalizeHomeSections(sectionsRaw),
    categories: normalizeHomeCategories(categoriesRaw),
    brands: normalizeHomeBrands(brandsRaw),
    hero: normalizeHeroConfig(heroRaw),
    flashDeals: hydratedFlashDeals,
  };
}

export type HomePageConfig = Awaited<ReturnType<typeof getHomePageConfig>>;
