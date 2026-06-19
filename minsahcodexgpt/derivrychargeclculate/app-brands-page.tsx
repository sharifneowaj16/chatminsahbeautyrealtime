// app/brands/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import Navbar from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import TopBar from '@/app/components/TopBar';
import { absoluteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Beauty Brands in Bangladesh | Minsah Beauty',
  description: 'Shop authentic beauty, hair care, skincare, makeup and fragrance brands online in Bangladesh from Minsah Beauty.',
  alternates: { canonical: absoluteUrl('/brands') },
  openGraph: {
    title: 'Beauty Brands in Bangladesh | Minsah Beauty',
    description: 'Shop beauty brands online in Bangladesh from Minsah Beauty.',
    url: absoluteUrl('/brands'),
    type: 'website',
  },
};

export default async function BrandsPage() {
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="min-h-screen flex flex-col bg-minsah-light">
      <TopBar />
      <Navbar />
      <main className="flex-grow pb-20">
      <section className="bg-white px-4 py-10 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-minsah-dark">Beauty Brands</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm md:text-base text-minsah-secondary">
          Discover beauty, hair care, skincare, makeup and fragrance brands available at Minsah Beauty.
        </p>
      </section>

      <section className="container mx-auto px-4 py-8">
        {brands.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {brands.map((brand) => (
              <Link key={brand.id} href={`/brands/${brand.slug}`} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition group text-center">
                <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl bg-minsah-accent text-3xl font-bold text-minsah-primary group-hover:scale-105 transition">
                  {brand.logo ? <img src={brand.logo} alt={brand.name} className="h-full w-full object-cover" /> : brand.name.slice(0, 1).toUpperCase()}
                </div>
                <h2 className="font-semibold text-sm text-minsah-dark mb-1">{brand.name}</h2>
                {brand.description && <p className="mb-2 line-clamp-2 text-xs text-minsah-secondary">{brand.description}</p>}
                <p className="text-xs text-minsah-secondary">{brand._count.products} Products</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <p className="text-minsah-secondary">No active brands found.</p>
            <Link href="/shop" className="mt-4 inline-block rounded-lg bg-minsah-primary px-5 py-2 text-white">Shop all products</Link>
          </div>
        )}
      </section>
      </main>
      <Footer />
    </div>
  );
}
