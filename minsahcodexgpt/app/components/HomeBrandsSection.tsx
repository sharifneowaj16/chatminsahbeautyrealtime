import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { HomeSection, HomeSectionBrand } from '@/types/admin';
import { defaultBrands } from '@/lib/homeData';
import { DESIGN_TOKEN_VALUES } from '@/lib/design-tokens';

interface HomeBrandsSectionProps {
  section: HomeSection;
  brands?: HomeSectionBrand[];
}

function selectedSet(section: HomeSection): Set<string> {
  return new Set((section.settings.selectedBrandIds ?? []).map((item) => item.toLowerCase().trim()).filter(Boolean));
}

function sectionLimit(section: HomeSection, fallback = 4): number {
  return Math.max(1, Math.min(24, section.settings.itemsToShow ?? fallback));
}

function getGridClassName(layout?: HomeSection['settings']['layout']): string {
  if (layout === 'grid-3') {
    return 'grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:gap-4';
  }
  if (layout === 'grid-2') {
    return 'grid grid-cols-2 gap-3.5 sm:grid-cols-2 md:gap-4 max-w-2xl mx-auto';
  }
  // Default grid-4
  return 'grid grid-cols-2 gap-3.5 sm:grid-cols-4 md:gap-5';
}

export default function HomeBrandsSection({
  section,
  brands = defaultBrands,
}: HomeBrandsSectionProps) {
  // Fast bail-out for performance: if section is toggled off, render nothing
  if (section.isVisible === false) {
    return null;
  }

  const selected = selectedSet(section);
  const sourceBrands = brands.length > 0 ? brands : defaultBrands;

  const filteredBrands = (selected.size > 0
    ? sourceBrands.filter((brand) =>
        selected.has(brand.id.toLowerCase()) ||
        selected.has(brand.slug.toLowerCase()) ||
        selected.has(brand.name.toLowerCase())
      )
    : sourceBrands)
    .filter((brand) => brand.isVisible !== false)
    .slice(0, sectionLimit(section, 4));

  if (filteredBrands.length === 0) {
    return null;
  }

  const title = section.title || 'Popular Brands';
  const subtitle = section.subtitle ?? 'Shop by trusted beauty brands';
  const viewAllHref = section.settings.viewAllHref || '/brands';
  const ctaText = section.settings.ctaText || 'View all';
  const showViewAll = section.settings.showViewAll !== false;
  const layout = section.settings.layout;
  const isHorizontalScroll = layout === 'horizontal-scroll';

  return (
    <section
      className="minsah-fade-up px-4 py-10 lg:px-8 lg:py-14"
      style={{
        backgroundColor: section.settings.backgroundColor || DESIGN_TOKEN_VALUES.surface.panel,
      }}
      aria-label={title}
    >
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold tracking-tight text-minsah-dark">{title}</h2>
            {subtitle && <p className="mt-1 text-xs font-normal text-minsah-secondary">{subtitle}</p>}
          </div>
          {showViewAll && (
            <Link
              href={viewAllHref}
              aria-label={`${ctaText} ${title}`}
              className="minsah-tap-target minsah-touch-target min-h-10 inline-flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold text-minsah-primary hover:bg-minsah-surface-subtle transition-colors"
            >
              {ctaText} <ChevronRight size={14} />
            </Link>
          )}
        </div>

        {/* Brands Grid / Horizontal Scroll */}
        {isHorizontalScroll ? (
          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
            {filteredBrands.map((brand) => (
              <Link
                key={brand.id}
                href={`/brands/${brand.slug}`}
                className="minsah-tap-target group flex h-28 w-40 shrink-0 items-center justify-center rounded-xl border border-stone-200/80 bg-white p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-minsah-primary/40 hover:shadow-md"
              >
                <span className="whitespace-pre-line text-center text-sm font-semibold tracking-wide text-minsah-dark group-hover:text-minsah-primary transition-colors">
                  {brand.logo || brand.name}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className={getGridClassName(layout)}>
            {filteredBrands.map((brand) => (
              <Link
                key={brand.id}
                href={`/brands/${brand.slug}`}
                className="minsah-tap-target group flex aspect-square sm:aspect-[4/3] items-center justify-center rounded-xl border border-stone-200/80 bg-white p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-minsah-primary/40 hover:shadow-md"
              >
                <span className="whitespace-pre-line text-center text-sm font-semibold tracking-wide text-minsah-dark group-hover:text-minsah-primary transition-colors">
                  {brand.logo || brand.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
