import Link from 'next/link';

export interface HomeCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
}

const CATEGORY_COLORS = [
  'bg-pink-100',
  'bg-blue-100',
  'bg-purple-100',
  'bg-yellow-100',
  'bg-green-100',
  'bg-orange-100',
  'bg-red-100',
  'bg-teal-100',
];

function getPlaceholderCategories(): HomeCategory[] {
  return Array.from({ length: 6 }, (_, index) => ({
    id: `category-placeholder-${index}`,
    name: '',
    slug: '',
    icon: '',
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  }));
}

export default function HomeCategoriesSection({ categories }: { categories: HomeCategory[] }) {
  const visibleCategories = categories.length > 0 ? categories : getPlaceholderCategories();

  return (
    <section className="px-4 py-6 bg-white">
      <h2 className="text-lg font-bold text-minsah-dark mb-4">Browse by Categories</h2>
      <div className="flex min-h-[92px] gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {visibleCategories.map((category) => (
          <Link
            key={category.id || category.name}
            href={category.name ? `/categories/${category.slug || category.name.toLowerCase().replace(/\s+/g, '-')}` : '#'}
            className={`flex flex-col items-center gap-2 flex-shrink-0 ${category.name ? '' : 'pointer-events-none'}`}
            aria-hidden={!category.name}
            tabIndex={category.name ? undefined : -1}
          >
            <div className={`w-16 h-16 ${category.color} rounded-full flex items-center justify-center text-3xl overflow-hidden`}>
              {category.icon && (category.icon.startsWith('/') || category.icon.startsWith('http')) ? (
                <img src={category.icon} alt={category.name} className="w-full h-full object-cover" />
              ) : (
                category.icon || <span className="h-7 w-7 rounded-full bg-white/60" />
              )}
            </div>
            <span className="min-h-[16px] text-xs text-minsah-dark font-medium text-center">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
