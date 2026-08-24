import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Tag } from 'lucide-react';

export interface HomeCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
}

const CATEGORY_COLORS = [
  'bg-minsah-surface-accent',
  'bg-blue-100',
  'bg-minsah-surface-accent',
  'bg-yellow-100',
  'bg-green-100',
  'bg-orange-100',
  'bg-red-100',
  'bg-teal-100',
];

function getPlaceholderCategories(): HomeCategory[] {
  return Array.from({ length: 8 }, (_, index) => ({
    id: `category-placeholder-${index}`,
    name: '',
    slug: '',
    icon: '',
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  }));
}

function getCategoryHref(category: HomeCategory) {
  const slug = category.slug || category.name.toLowerCase().replace(/\s+/g, '-');
  return `/categories/${slug}`;
}

function isImageIcon(icon: string) {
  return icon.startsWith('/') || icon.startsWith('http') || icon.startsWith('data:');
}

interface HomeCategoriesSectionProps {
  categories: HomeCategory[];
  title?: string;
  subtitle?: string;
  itemsToShow?: number;
  showViewAll?: boolean;
  selectedCategoryIds?: string[];
}

export default function HomeCategoriesSection({
  categories,
  title = 'Category Shortcuts',
  subtitle = 'Find your beauty essentials faster',
  itemsToShow = 8,
  showViewAll = true,
  selectedCategoryIds = [],
}: HomeCategoriesSectionProps) {
  const selectedSet = new Set(selectedCategoryIds.map((item) => item.toLowerCase()));
  const filteredCategories = selectedSet.size > 0
    ? categories.filter((category) => selectedSet.has(category.id.toLowerCase()) || selectedSet.has(category.slug.toLowerCase()) || selectedSet.has(category.name.toLowerCase()))
    : categories;
  const limit = Math.max(1, Math.min(16, itemsToShow));
  const visibleCategories = (filteredCategories.length > 0 ? filteredCategories.slice(0, limit) : getPlaceholderCategories().slice(0, limit));

  return (
    <section className="bg-white px-4 py-10 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-minsah-dark">{title}</h2>
            {subtitle && <p className="mt-1 text-xs font-normal text-minsah-secondary">{subtitle}</p>}
          </div>
          {showViewAll && (
            <Link
              href="/categories"
              aria-label="View all categories"
              className="inline-flex items-center gap-1 rounded-full bg-minsah-surface-subtle px-3.5 py-1.5 text-xs font-semibold text-minsah-primary transition hover:bg-minsah-accent"
            >
              View All <ChevronRight size={14} />
            </Link>
          )}
        </div>

        <div className="flex min-h-[112px] gap-4 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-4 lg:grid-cols-8 lg:overflow-visible">
          {visibleCategories.map((category) => (
            <Link
              key={category.id || category.name}
              href={category.name ? getCategoryHref(category) : '#'}
              className={`group flex w-20 flex-shrink-0 flex-col items-center gap-2 rounded-lg p-2 transition hover:bg-minsah-surface-subtle sm:w-auto ${category.name ? '' : 'pointer-events-none'}`}
              aria-hidden={!category.name}
              tabIndex={category.name ? undefined : -1}
            >
              <div className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full ${category.color} text-minsah-primary ring-1 ring-stone-200/70 transition group-hover:scale-105`}>
                {category.icon && isImageIcon(category.icon) ? (
                  <Image
                    src={category.icon}
                    alt={category.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : category.name ? (
                  <span className="text-lg font-bold">{category.name.charAt(0).toUpperCase()}</span>
                ) : (
                  <Tag size={22} className="opacity-40" />
                )}
              </div>
              <span className="min-h-[28px] text-center text-xs font-medium leading-4 text-minsah-dark">
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
