import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Flame, Heart } from 'lucide-react';
import type { Product } from '@/contexts/ProductsContext';
import { formatPrice } from '@/utils/currency';
import HomeCountdownTimer from './HomeCountdownTimer';
import { HomeBuyNowAction, HomeOverlayCartAction } from './HomeProductActions';

const brands = [
  { name: 'MAC', logo: 'MAC' },
  { name: 'Dior', logo: 'Dior' },
  { name: 'Fenty Beauty', logo: 'FENTY\nBEAUTY' },
  { name: 'Chanel', logo: 'CHANEL' },
];

interface HomeProductCardItem {
  id: string;
  name: string;
  price: number;
  image: string;
  stock: number;
  hasVariants: boolean;
}

function ProductImage({ src, alt, priority = false }: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  const isUrl = src.startsWith('/') || src.startsWith('http') || src.startsWith('data:');
  if (isUrl) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover rounded-inherit"
        sizes="(max-width: 640px) 50vw, 33vw"
        loading={priority ? 'eager' : 'lazy'}
        priority={priority}
      />
    );
  }

  return <span className="text-4xl">{src}</span>;
}

function renderOverlayCart(product: HomeProductCardItem) {
  return (
    <HomeOverlayCartAction
      productId={product.id}
      productName={product.name}
      productImage={product.image}
      price={product.price}
      stock={product.stock}
      hasVariants={product.hasVariants}
    />
  );
}

function renderBuyNow(product: HomeProductCardItem, className: string) {
  return (
    <HomeBuyNowAction
      productId={product.id}
      productName={product.name}
      productImage={product.image}
      price={product.price}
      stock={product.stock}
      hasVariants={product.hasVariants}
      className={className}
    />
  );
}

export default function HomeProductSections({ products }: { products: Product[] }) {
  const activeProducts = products.filter((product) => product.status === 'active');

  const newArrivals = [...activeProducts]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)
    .map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      sku: product.category,
      stock: product.stock,
      hasVariants: Boolean(product.variants?.length),
    }));

  const forYouProducts = activeProducts.slice(0, 6).map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.image,
    stock: product.stock,
    hasVariants: Boolean(product.variants?.length),
  }));

  const recommendations = [...activeProducts]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 6)
    .map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      rating: Math.round(product.rating),
      reviews: product.reviews,
      image: product.image,
      stock: product.stock,
      hasVariants: Boolean(product.variants?.length),
    }));

  const favourites = [...activeProducts]
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    .slice(0, 6)
    .map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      rating: Math.round(product.rating ?? 0),
      reviews: product.reviews ?? 0,
      image: product.image,
      stock: product.stock,
      hasVariants: Boolean(product.variants?.length),
    }));

  const flashSaleProducts = activeProducts
    .filter((product) => product.originalPrice != null && product.originalPrice > product.price)
    .slice(0, 4)
    .map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice as number,
      discount: Math.round(((product.originalPrice as number - product.price) / (product.originalPrice as number)) * 100),
      image: product.image,
      stock: product.stock,
      hasVariants: Boolean(product.variants?.length),
    }));

  return (
    <div className="min-h-screen bg-minsah-light pb-20">
      <section className="px-4 py-6 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="text-orange-500" size={24} />
            <h2 className="text-lg font-bold text-minsah-dark">Flash Sale</h2>
          </div>
          <Link href="/flash-sale" className="text-sm text-minsah-primary font-semibold">
            Shop Now
          </Link>
        </div>

        <HomeCountdownTimer />

        <div className="grid grid-cols-2 gap-3">
          {flashSaleProducts.map((product, index) => (
            <div key={product.id} className="bg-white rounded-xl p-3 shadow-sm relative">
              <Link href={`/products/${product.id}`}>
                <div className="relative mb-2">
                  <div className="w-full aspect-square bg-minsah-accent rounded-lg flex items-center justify-center overflow-hidden mb-2 relative">
                    <ProductImage src={product.image} alt={product.name} priority={index < 2} />
                  </div>
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                    {product.discount}%
                  </div>
                  {renderOverlayCart(product)}
                </div>
                <h3 className="text-xs font-semibold text-minsah-dark mb-1 line-clamp-2">{product.name}</h3>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-minsah-primary">{formatPrice(product.price)}</span>
                  <span className="text-xs text-minsah-secondary line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                </div>
              </Link>
              {renderBuyNow(product, 'w-full')}
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-minsah-dark">New Arrival</h2>
          <Link href="/new-arrivals" aria-label="View all new arrivals" className="text-sm text-minsah-primary font-semibold flex items-center gap-1">
            View all <ChevronRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {newArrivals.slice(0, 4).map((product, index) => (
            <div key={product.id} className="bg-minsah-accent rounded-2xl p-3">
              <Link href={`/products/${product.id}`}>
                <div className="relative mb-2">
                  <div className="w-full aspect-square bg-white rounded-xl flex items-center justify-center overflow-hidden mb-2 relative">
                    <ProductImage src={product.image} alt={product.name} priority={index < 2} />
                  </div>
                  <div className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <Heart size={16} className="text-minsah-secondary" />
                  </div>
                  {renderOverlayCart(product)}
                </div>
                <h3 className="text-xs font-semibold text-minsah-dark mb-1 line-clamp-2">{product.name}</h3>
                <p className="text-xs text-minsah-secondary mb-1">{product.sku}</p>
                <span className="text-sm font-bold text-minsah-primary mb-2 block">
                  {formatPrice(product.price)}
                </span>
              </Link>
              {renderBuyNow(product, 'w-full')}
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-6 bg-minsah-light">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-minsah-dark">For You</h2>
          <Link href="/for-you" aria-label="View all products for you" className="text-sm text-minsah-primary font-semibold flex items-center gap-1">
            View all <ChevronRight size={16} />
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {forYouProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-2xl p-3 flex-shrink-0 w-36">
              <Link href={`/products/${product.id}`}>
                <div className="relative mb-2">
                  <div className="w-full aspect-square bg-minsah-accent rounded-xl flex items-center justify-center overflow-hidden mb-2 relative">
                    <ProductImage src={product.image} alt={product.name} />
                  </div>
                  <div className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <Heart size={14} className="text-minsah-secondary" />
                  </div>
                  {renderOverlayCart(product)}
                </div>
                <h3 className="text-xs font-semibold text-minsah-dark mb-1 line-clamp-2">{product.name}</h3>
                <span className="text-sm font-bold text-minsah-primary block mb-2">
                  {formatPrice(product.price)}
                </span>
              </Link>
              {renderBuyNow(product, 'w-full')}
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-minsah-dark">Recommendation</h2>
          <Link href="/recommendations" aria-label="View all recommendations" className="text-sm text-minsah-primary font-semibold flex items-center gap-1">
            View all <ChevronRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {recommendations.slice(0, 6).map((product) => (
            <div key={product.id} className="bg-minsah-accent rounded-xl p-2">
              <Link href={`/products/${product.id}`}>
                <div className="relative mb-2">
                  <div className="w-full aspect-square bg-white rounded-lg flex items-center justify-center overflow-hidden mb-1 relative">
                    <ProductImage src={product.image} alt={product.name} />
                  </div>
                  <div className="absolute top-1 right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <Heart size={12} className="text-minsah-secondary" />
                  </div>
                  {renderOverlayCart(product)}
                </div>
                <h3 className="text-[10px] font-semibold text-minsah-dark mb-1 line-clamp-2">{product.name}</h3>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs font-bold text-minsah-primary">{formatPrice(product.price)}</span>
                </div>
                <div className="flex items-center gap-1 mb-2">
                  <div className="flex text-amber-700 text-[10px]">
                    {'★'.repeat(product.rating)}{'☆'.repeat(5 - product.rating)}
                  </div>
                  <span className="text-[9px] font-medium text-minsah-dark/75">({product.reviews})</span>
                </div>
              </Link>
              {renderBuyNow(product, 'w-full text-xs')}
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-6 bg-minsah-light">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-minsah-dark">Favourite</h2>
          <Link href="/favourites" aria-label="View all favourites" className="text-sm text-minsah-primary font-semibold flex items-center gap-1">
            View all <ChevronRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {favourites.slice(0, 6).map((product) => (
            <div key={product.id} className="bg-white rounded-xl p-2">
              <Link href={`/products/${product.id}`}>
                <div className="relative mb-2">
                  <div className="w-full aspect-square bg-minsah-accent rounded-lg flex items-center justify-center overflow-hidden mb-1 relative">
                    <ProductImage src={product.image} alt={product.name} />
                  </div>
                  <div className="absolute top-1 right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <Heart size={12} className="text-red-500 fill-red-500" />
                  </div>
                  {renderOverlayCart(product)}
                </div>
                <h3 className="text-[10px] font-semibold text-minsah-dark mb-1 line-clamp-2">{product.name}</h3>
                <span className="text-xs font-bold text-minsah-primary block mb-2">
                  {formatPrice(product.price)}
                </span>
              </Link>
              {renderBuyNow(product, 'w-full text-xs')}
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-minsah-dark">Browse Popular Brand</h2>
          <Link href="/brands" aria-label="View all popular brands" className="text-sm text-minsah-primary font-semibold flex items-center gap-1">
            View all <ChevronRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {brands.map((brand) => (
            <Link
              key={brand.name}
              href={`/brands/${brand.name.toLowerCase().replace(' ', '-')}`}
              className="bg-white border-2 border-minsah-accent rounded-full aspect-square flex items-center justify-center p-2 hover:border-minsah-primary transition"
            >
              <span className="text-xs font-bold text-minsah-dark text-center whitespace-pre-line">
                {brand.logo}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
