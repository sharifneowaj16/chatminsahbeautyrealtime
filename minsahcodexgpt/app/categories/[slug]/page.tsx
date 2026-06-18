// app/categories/[slug]/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import Navbar from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import TopBar from '@/app/components/TopBar';
import ProductCard from '@/app/components/ProductCard';
import { absoluteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ slug: string }> };

async function getCategory(slug: string) {
  return prisma.category.findFirst({
    where: { slug, isActive: true, parentId: null },
    include: {
      children: { where: { isActive: true }, orderBy: { name: 'asc' } },
      products: {
        where: { isActive: true, deletedAt: null },
        include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
        orderBy: { updatedAt: 'desc' },
        take: 48,
      },
    },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) {
    return { title: 'Category Not Found | Minsah Beauty', robots: { index: false, follow: false } };
  }

  const title = `${category.name} Products in Bangladesh | Minsah Beauty`;
  const description = category.description || `Shop ${category.name} beauty products online in Bangladesh from Minsah Beauty.`;
  const url = absoluteUrl(`/categories/${category.slug}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website', images: category.image ? [{ url: category.image, alt: category.name }] : undefined },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function CategorySlugPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Categories', item: absoluteUrl('/categories') },
      { '@type': 'ListItem', position: 3, name: category.name, item: absoluteUrl(`/categories/${category.slug}`) },
    ],
  };

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} Products`,
    url: absoluteUrl(`/categories/${category.slug}`),
    description: category.description || `Shop ${category.name} products at Minsah Beauty.`,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Navbar />
      <main className="flex-grow py-12">
        <div className="container mx-auto px-4">
          <nav className="mb-6 text-sm text-gray-500">
            <Link href="/" className="hover:text-pink-600">Home</Link> <span>/</span>{' '}
            <Link href="/categories" className="hover:text-pink-600">Categories</Link> <span>/</span>{' '}
            <span className="text-gray-900">{category.name}</span>
          </nav>

          <header className="mb-10 rounded-2xl bg-gradient-to-br from-pink-50 to-purple-50 p-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">{category.name} Products</h1>
            <p className="max-w-3xl text-gray-600">
              {category.description || `Explore ${category.name} products available at Minsah Beauty.`}
            </p>
            {category.children.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {category.children.map((child) => (
                  <Link key={child.id} href={`/shop?category=${encodeURIComponent(category.slug)}&subcategory=${encodeURIComponent(child.slug)}`} className="rounded-full bg-white px-3 py-1 text-sm text-gray-700 shadow-sm hover:text-pink-600">
                    {child.name}
                  </Link>
                ))}
              </div>
            )}
          </header>

          {category.products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {category.products.map((product) => {
                const image = product.images[0]?.url || '';
                return (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    slug={product.slug}
                    name={product.name}
                    price={Number((product.salePrice ?? product.price).toString())}
                    originalPrice={product.compareAtPrice ? Number(product.compareAtPrice.toString()) : undefined}
                    image={image}
                    category={category.name}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center rounded-xl bg-white p-10 shadow-sm">
              <p className="text-gray-600">No products found in this category yet.</p>
              <Link href="/shop" className="mt-4 inline-block rounded-lg bg-pink-600 px-5 py-2 text-white">Shop all products</Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
    </div>
  );
}
