'use client';

import { Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface CollectionToolbarProps {
  title: string;
  subtitle?: string;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  categories: readonly string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  searchPlaceholder?: string;
}

export default function CollectionToolbar({
  title,
  subtitle,
  searchQuery,
  onSearchQueryChange,
  categories,
  selectedCategory,
  onCategoryChange,
  searchPlaceholder = 'Search products, brands, or categories',
}: CollectionToolbarProps) {
  return (
    <section className="border-b border-minsah-accent bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-black text-minsah-dark sm:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-minsah-secondary">{subtitle}</p> : null}
          </div>

          <Input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder={searchPlaceholder}
            label="Search this collection"
            hideLabel
            leading={<Search size={18} aria-hidden="true" />}
            containerClassName="w-full lg:max-w-md"
            className="rounded-2xl border-minsah-border-soft bg-minsah-light/60 py-2.5 text-sm text-minsah-dark focus:border-minsah-primary focus:ring-2 focus:ring-minsah-primary/15"
          />
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide" aria-label={`${title} categories`}>
          {categories.map((category) => {
            const active = selectedCategory === category;
            return (
              <Button
                type="button"
                variant={active ? 'primary' : 'secondary'}
                key={category}
                onClick={() => onCategoryChange(category)}
                aria-pressed={active}
                className="shrink-0 rounded-full px-4 py-2 text-sm"
              >
                {category}
              </Button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
