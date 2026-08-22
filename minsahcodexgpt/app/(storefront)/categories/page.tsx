// app/categories/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Package } from 'lucide-react';
import prisma from '@/lib/prisma';
import { absoluteUrl } from '@/lib/seo';
import CatalogProductImage from '@/components/catalog/CatalogProductImage';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Beauty Product Categories',
  description: 'Browse Minsah Beauty product categories including hair care, skin care, makeup, perfume, nails and spa products in Bangladesh.',
  alternates: { canonical: absoluteUrl('/categories') },
  openGraph: {
    title: 'Beauty Product Categories',
    description: 'Browse Minsah Beauty product categories in Bangladesh.',
    url: absoluteUrl('/categories'),
    type: 'website',
  },
};

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    where: { isActive: true, parentId: null },
    include: { _count: { select: { products: true } } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-grow py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Beauty Product Categories</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Browse beauty and personal care products by category at Minsah Beauty.
            </p>
          </div>

          {categories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="relative bg-gradient-to-br from-minsah-surface-soft to-minsah-surface-accent rounded-lg p-8 hover:shadow-lg transition group"
                >
                  <div className="w-16 h-16 mb-4 rounded-full bg-white/70 flex items-center justify-center overflow-hidden">
                    {category.image ? (
                      <span className="relative block h-full w-full">
                        <CatalogProductImage src={category.image} alt={category.name} sizes="64px" padding="sm" />
                      </span>
                    ) : (
                      <Package className="w-9 h-9 text-minsah-action-primary" />
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{category.name}</h2>
                  {category.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{category.description}</p>}
                  <p className="text-gray-600 group-hover:text-minsah-action-primary transition flex items-center">
                    {_countLabel(category._count.products)} <ArrowRight className="w-4 h-4 ml-2" />
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center rounded-xl bg-white p-10 shadow-sm">
              <p className="text-gray-600">No active categories found.</p>
              <Link href="/shop" className="mt-4 inline-block rounded-lg bg-minsah-action-primary hover:bg-minsah-action-primary-hover px-5 py-2 text-white">Shop all products</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function _countLabel(count: number) {
  return `${count} ${count === 1 ? 'product' : 'products'}`;
}
