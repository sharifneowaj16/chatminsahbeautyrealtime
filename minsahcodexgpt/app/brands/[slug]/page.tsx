// app/brands/[slug]/page.tsx
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

async function getBrand(slug: string) {
  return prisma.brand.findFirst({
    where: { slug, isActive: true },
    include: {
      products: {
        where: { isActive: true, deletedAt: null },
        include: {
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          category: { select: { name: true, slug: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 48,
      },
    },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) {
    return { title: 'Brand Not Found | Minsah Beauty', robots: { index: false, follow: false } };
  }

  const title = `${brand.name} Products in Bangladesh | Minsah Beauty`;
  const description = brand.description || `Shop ${brand.name} products online in Bangladesh from Minsah Beauty.`;
  const url = absoluteUrl(`/brands/${brand.slug}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website', images: brand.logo ? [{ url: brand.logo, alt: brand.name }] : undefined },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function BrandSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) notFound();

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Brands', item: absoluteUrl('/brands') },
      { '@type': 'ListItem', position: 3, name: brand.name, item: absoluteUrl(`/brands/${brand.slug}`) },
    ],
  };

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${brand.name} Products`,
    url: absoluteUrl(`/brands/${brand.slug}`),
    description: brand.description || `Shop ${brand.name} products at Minsah Beauty.`,
  };

  return (
    <div className="min-h-screen flex flex-col bg-minsah-light">
      <TopBar />
      <Navbar />
      <main className="flex-grow pb-20">
      <section className="bg-white px-4 py-10">
        <div className="container mx-auto">
          <nav className="mb-5 text-sm text-gray-500">
            <Link href="/" className="hover:text-minsah-primary">Home</Link> <span>/</span>{' '}
            <Link href="/brands" className="hover:text-minsah-primary">Brands</Link> <span>/</span>{' '}
            <span className="text-minsah-dark">{brand.name}</span>
          </nav>
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-minsah-accent text-4xl font-bold text-minsah-primary">
              {brand.logo ? <img src={brand.logo} alt={brand.name} className="h-full w-full object-cover" /> : brand.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-minsah-dark">{brand.name} Products</h1>
              <p className="mt-2 max-w-3xl text-minsah-secondary">
                {brand.description || `Shop ${brand.name} products online at Minsah Beauty.`}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8">
        {brand.products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {brand.products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                slug={product.slug}
                name={product.name}
                price={Number((product.salePrice ?? product.price).toString())}
                originalPrice={product.compareAtPrice ? Number(product.compareAtPrice.toString()) : undefined}
                image={product.images[0]?.url || ''}
                category={product.category?.name || ''}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <p className="text-minsah-secondary">No active products found for this brand yet.</p>
            <Link href="/shop" className="mt-4 inline-block rounded-lg bg-minsah-primary px-5 py-2 text-white">Shop all products</Link>
          </div>
        )}
      </section>

      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
    </div>
  );
}
