import 'server-only';

import prisma from '@/lib/prisma';
import {
  normalizeHeroConfig,
  normalizeHomeBrands,
  normalizeHomeCategories,
  normalizeHomeSections,
} from '@/lib/homepageConfig';
import type { HomeSection } from '@/types/admin';

export const HOME_CONFIG_KEYS = [
  'homeSections',
  'homeHero',
  'homeCategories',
  'homeBrands',
] as const;

export type HomeConfigKey = (typeof HOME_CONFIG_KEYS)[number];

export type HomeConfigValidationIssue = {
  field: string;
  code: string;
  message: string;
  values?: string[];
};

export function isHomeConfigKey(value: unknown): value is HomeConfigKey {
  return typeof value === 'string' && HOME_CONFIG_KEYS.includes(value as HomeConfigKey);
}

function hasUnsafeUrl(value: string | undefined) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith('javascript:') || normalized.startsWith('data:text/html');
}

function uniqueNonEmpty(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function normalizeHomeConfigValue(key: HomeConfigKey, value: unknown) {
  if (key === 'homeSections') return normalizeHomeSections(value);
  if (key === 'homeHero') return normalizeHeroConfig(value);
  if (key === 'homeCategories') return normalizeHomeCategories(value);
  return normalizeHomeBrands(value);
}

function validateSectionShape(sections: HomeSection[]) {
  const issues: HomeConfigValidationIssue[] = [];
  const ids = new Set<string>();
  const types = new Set<string>();

  sections.forEach((section, index) => {
    if (ids.has(section.id)) {
      issues.push({
        field: `value[${index}].id`,
        code: 'DUPLICATE_SECTION_ID',
        message: `Duplicate section id: ${section.id}`,
        values: [section.id],
      });
    }
    ids.add(section.id);

    if (types.has(section.type)) {
      issues.push({
        field: `value[${index}].type`,
        code: 'DUPLICATE_SECTION_TYPE',
        message: `Only one ${section.type} section is supported.`,
        values: [section.type],
      });
    }
    types.add(section.type);

    if (!section.title.trim()) {
      issues.push({
        field: `value[${index}].title`,
        code: 'EMPTY_SECTION_TITLE',
        message: 'Visible homepage sections require a title.',
      });
    }

    if (hasUnsafeUrl(section.settings.viewAllHref) || hasUnsafeUrl(section.settings.ctaHref)) {
      issues.push({
        field: `value[${index}].settings`,
        code: 'UNSAFE_SECTION_URL',
        message: 'Homepage CTA URLs cannot use executable URL schemes.',
      });
    }
  });

  return issues;
}

async function validateSelectedReferences(sections: HomeSection[]) {
  const productKeys = uniqueNonEmpty(
    sections.flatMap((section) => section.settings.selectedProductIds ?? [])
  );
  const categoryKeys = uniqueNonEmpty(
    sections.flatMap((section) => section.settings.selectedCategoryIds ?? [])
  );
  const brandKeys = uniqueNonEmpty(
    sections.flatMap((section) => section.settings.selectedBrandIds ?? [])
  );

  const [products, categoryConfig, brandConfig] = await Promise.all([
    productKeys.length
      ? prisma.product.findMany({
          where: {
            deletedAt: null,
            isActive: true,
            OR: productKeys.flatMap((key) => [{ id: key }, { slug: key }]),
          },
          select: { id: true, slug: true },
        })
      : Promise.resolve([]),
    categoryKeys.length
      ? prisma.siteConfig.findUnique({ where: { key: 'homeCategories' }, select: { value: true } })
      : Promise.resolve(null),
    brandKeys.length
      ? prisma.siteConfig.findUnique({ where: { key: 'homeBrands' }, select: { value: true } })
      : Promise.resolve(null),
  ]);

  const categories = normalizeHomeCategories(categoryConfig?.value ?? null)
    .filter((item) => item.isVisible !== false);
  const brands = normalizeHomeBrands(brandConfig?.value ?? null)
    .filter((item) => item.isVisible !== false);

  const validProductKeys = new Set(products.flatMap((item) => [item.id, item.slug, item.slug.toLowerCase()]));
  const validCategoryKeys = new Set(categories.flatMap((item) => [item.id, item.slug, item.name, item.slug.toLowerCase(), item.name.toLowerCase()]));
  const validBrandKeys = new Set(brands.flatMap((item) => [item.id, item.slug, item.name, item.slug.toLowerCase(), item.name.toLowerCase()]));

  const invalidProducts = productKeys.filter((key) => !validProductKeys.has(key) && !validProductKeys.has(key.toLowerCase()));
  const invalidCategories = categoryKeys.filter((key) => !validCategoryKeys.has(key) && !validCategoryKeys.has(key.toLowerCase()));
  const invalidBrands = brandKeys.filter((key) => !validBrandKeys.has(key) && !validBrandKeys.has(key.toLowerCase()));

  const issues: HomeConfigValidationIssue[] = [];
  if (invalidProducts.length) {
    issues.push({
      field: 'value.settings.selectedProductIds',
      code: 'INVALID_OR_INACTIVE_PRODUCTS',
      message: 'Some selected products are missing, inactive, or deleted.',
      values: invalidProducts,
    });
  }
  if (invalidCategories.length) {
    issues.push({
      field: 'value.settings.selectedCategoryIds',
      code: 'INVALID_OR_INACTIVE_CATEGORIES',
      message: 'Some selected homepage categories are missing or hidden.',
      values: invalidCategories,
    });
  }
  if (invalidBrands.length) {
    issues.push({
      field: 'value.settings.selectedBrandIds',
      code: 'INVALID_OR_INACTIVE_BRANDS',
      message: 'Some selected homepage brands are missing or hidden.',
      values: invalidBrands,
    });
  }

  return issues;
}

export async function validateHomeConfigValue(key: HomeConfigKey, normalizedValue: unknown) {
  const issues: HomeConfigValidationIssue[] = [];

  if (key === 'homeSections') {
    const sections = normalizedValue as HomeSection[];
    issues.push(...validateSectionShape(sections));
    issues.push(...await validateSelectedReferences(sections));
  }

  if (key === 'homeHero') {
    const hero = normalizedValue as ReturnType<typeof normalizeHeroConfig>;
    if (!hero.title.trim()) {
      issues.push({ field: 'value.title', code: 'EMPTY_HERO_TITLE', message: 'Hero title is required.' });
    }
    if (hasUnsafeUrl(hero.primaryCtaHref) || hasUnsafeUrl(hero.secondaryCtaHref) || hasUnsafeUrl(hero.imageUrl)) {
      issues.push({
        field: 'value',
        code: 'UNSAFE_HERO_URL',
        message: 'Hero links and image URL cannot use executable URL schemes.',
      });
    }
  }

  return issues;
}
