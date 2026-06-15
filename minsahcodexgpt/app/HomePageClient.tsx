'use client';

import { ProductsProvider, type Product, useProducts } from '@/contexts/ProductsContext';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useState, useEffect, useMemo } from 'react';
import { Heart, ChevronRight, Flame } from 'lucide-react';
import { formatPrice } from '@/utils/currency';
import HomeSearch from './components/HomeSearch';

const CartStepper = dynamic(() => import('@/components/cart/CartStepper'), {
  ssr: false,
  loading: () => (
    <span
      className="block h-8 w-8 rounded-full bg-[#FACC15]/60 shadow-[0_4px_14px_rgba(250,204,21,0.20)]"
      aria-hidden="true"
    />
  ),
});

const CardBuyNowButton = dynamic(() => import('@/components/cart/CardBuyNowButton'), {
  ssr: false,
  loading: () => (
    <span
      className="block h-10 w-full rounded-2xl bg-[#3D1F0E]/15"
      aria-hidden="true"
    />
  ),
});

// ✅ Fix E: priority prop যোগ করা হয়েছে
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

const brands = [
  { name: 'MAC', logo: 'MAC' },
  { name: 'Dior', logo: 'Dior' },
  { name: 'Fenty Beauty', logo: 'FENTY\nBEAUTY' },
  { name: 'Chanel', logo: 'CHANEL' },
];

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

const DEFAULT_CATEGORY_ICON = '🏷️';

export interface HomeCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
}

const comboSlides = [
  {
    title: 'Best Value Combos',
    description: 'Save More with Our Curated Sets',
    gradient: 'from-minsah-primary via-minsah-secondary to-minsah-dark',
    image: '🎁',
  },
  {
    title: 'Premium Combo Deals',
    description: 'Luxury Beauty at Great Prices',
    gradient: 'from-purple-600 via-pink-500 to-orange-400',
    image: '💎',
  },
  {
    title: 'Complete Care Sets',
    description: 'Everything You Need in One Box',
    gradient: 'from-blue-500 via-teal-400 to-green-400',
    image: '✨',
  },
];

interface HomeProductCardItem {
  id: string;
  name: string;
  price: number;
  image: string;
  stock: number;
  hasVariants: boolean;
}

// ✅ Fix D: Inner component where homepage product state is consumed
function HomePageInner({ initialCategories = [] }: { initialCategories?: HomeCategory[] }) {
  const { products } = useProducts();

  const currentComboSlide = 0;
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 7, minutes: 33, seconds: 28 });
  const [categories, setCategories] = useState<HomeCategory[]>(initialCategories);

  const activeProducts = useMemo(
    () => products.filter(p => p.status === 'active'),
    [products]
  );

  const newArrivals = useMemo(
    () =>
      [...activeProducts]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8)
        .map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          image: p.image,
          sku: p.category,
          stock: p.stock,
          hasVariants: Boolean(p.variants?.length),
        })),
    [activeProducts]
  );

  const forYouProducts = useMemo(
    () =>
      activeProducts.slice(0, 6).map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.image,
        stock: p.stock,
        hasVariants: Boolean(p.variants?.length),
      })),
    [activeProducts]
  );

  const recommendations = useMemo(
    () =>
      [...activeProducts]
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 6)
        .map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          rating: Math.round(p.rating),
          reviews: p.reviews,
          image: p.image,
          stock: p.stock,
          hasVariants: Boolean(p.variants?.length),
        })),
    [activeProducts]
  );

  const favourites = useMemo(
    () =>
      [...activeProducts]
        .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
        .slice(0, 6)
        .map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          rating: Math.round(p.rating ?? 0),
          reviews: p.reviews ?? 0,
          image: p.image,
          stock: p.stock,
          hasVariants: Boolean(p.variants?.length),
        })),
    [activeProducts]
  );

  const flashSaleProducts = useMemo(
    () =>
      activeProducts
        .filter(p => p.originalPrice != null && p.originalPrice > p.price)
        .slice(0, 4)
        .map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          originalPrice: p.originalPrice as number,
          discount: Math.round(((p.originalPrice as number - p.price) / (p.originalPrice as number)) * 100),
          image: p.image,
          stock: p.stock,
          hasVariants: Boolean(p.variants?.length),
        })),
    [activeProducts]
  );

  const renderHomeOverlayCart = (product: HomeProductCardItem) => {
    if (product.stock === 0) return null;
    return (
      <div
        className="absolute bottom-2.5 right-2.5 z-10"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <CartStepper
          productId={product.id}
          productName={product.name}
          productImage={product.image}
          price={product.price}
          maxStock={product.stock}
          hasRequiredVariants={product.hasVariants}
          disabled={product.stock === 0}
          circleAdd={true}
        />
      </div>
    );
  };

  const renderHomeBuyNowButton = (product: HomeProductCardItem, className: string) => {
    return (
      <CardBuyNowButton
        productId={product.id}
        productName={product.name}
        productImage={product.image}
        price={product.price}
        disabled={product.stock === 0}
        className={className}
      />
    );
  };

  useEffect(() => {
    if (categories.length > 0) return;

    fetch('/api/categories?activeOnly=true')
      .then(res => res.json())
      .then(data => {
        if (data.categories) {
          const mapped = data.categories.map((cat: { id: string; name: string; slug: string; icon?: string }, index: number) => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            icon: cat.icon || DEFAULT_CATEGORY_ICON,
            color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
          }));
          setCategories(mapped);
        }
      })
      .catch(() => {});
  }, [categories.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-minsah-light pb-20">
      {/* Header */}
      <header className="bg-minsah-dark text-minsah-light sticky top-0 z-50 shadow-md">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs">9:41</span>
            </div>
            <h1 className="text-xl font-bold">Home</h1>
            <div className="w-12"></div>
          </div>

          <HomeSearch />
        </div>
      </header>

      <main id="main-content">
      {/* Browse by Categories */}
      <section className="px-4 py-6 bg-white">
        <h2 className="text-lg font-bold text-minsah-dark mb-4">Browse by Categories</h2>
        <div className="flex min-h-[92px] gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {(categories.length > 0 ? categories : Array.from({ length: 6 }, (_, index) => ({
            id: `category-placeholder-${index}`,
            name: '',
            slug: '',
            icon: '',
            color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
          }))).map((category) => (
            <Link
              key={category.id ?? category.name}
              href={category.name ? `/categories/${category.slug ?? category.name.toLowerCase().replace(/\s+/g, '-')}` : '#'}
              className={`flex flex-col items-center gap-2 flex-shrink-0 ${category.name ? '' : 'pointer-events-none'}`}
              aria-hidden={!category.name}
              tabIndex={category.name ? undefined : -1}
            >
              <div className={`w-16 h-16 ${category.color} rounded-full flex items-center justify-center text-3xl overflow-hidden`}>
                {category.icon && (category.icon.startsWith('/') || category.icon.startsWith('http'))
                  ? <img src={category.icon} alt={category.name} className="w-full h-full object-cover" />
                  : category.icon || <span className="h-7 w-7 rounded-full bg-white/60" />
                }
              </div>
              <span className="min-h-[16px] text-xs text-minsah-dark font-medium text-center">
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Browse by Combos */}
      <section className="px-4 py-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-minsah-dark">Browse by Combos</h2>
          <Link href="/combos" aria-label="View all combos" className="text-sm text-minsah-primary font-semibold flex items-center gap-1">
            View all <ChevronRight size={16} />
          </Link>
        </div>

        <div className="relative" style={{ minHeight: '248px' }}>
          {/* Combo Carousel */}
          <Link href="/combos" className="block">
            <div
              className={`bg-gradient-to-br ${comboSlides[currentComboSlide].gradient} rounded-3xl p-6 h-[200px] flex items-center justify-between overflow-hidden`}
              style={{ transition: 'background 0.5s ease' }}
            >
              <div className="text-white z-10 flex min-h-[92px] flex-1 flex-col justify-center">
                <h3 className="text-2xl font-bold mb-2">{comboSlides[currentComboSlide].title}</h3>
                <p className="min-h-[20px] text-sm opacity-90">{comboSlides[currentComboSlide].description}</p>
              </div>
              <div className="relative h-20 w-20 flex-shrink-0 opacity-25" aria-hidden="true">
                <div className="absolute inset-2 rounded-2xl border-4 border-white/70" />
                <div className="absolute left-1/2 top-1 h-[72px] w-3 -translate-x-1/2 rounded-full bg-white/70" />
                <div className="absolute left-1 top-1/2 h-3 w-[72px] -translate-y-1/2 rounded-full bg-white/70" />
                <div className="absolute left-5 top-0 h-5 w-7 -rotate-12 rounded-full border-4 border-white/70" />
                <div className="absolute right-5 top-0 h-5 w-7 rotate-12 rounded-full border-4 border-white/70" />
              </div>
            </div>
          </Link>

          {/* Slide Indicators */}
          <div className="flex justify-center gap-1.5 mt-3">
            {comboSlides.map((_, index) => (
              <div
                key={index}
                className="h-1.5 w-6 overflow-hidden rounded-full"
              >
                <span
                  className="block h-full w-full origin-center rounded-full bg-minsah-primary transition-[opacity,transform] duration-300 ease-out"
                  style={{
                    opacity: currentComboSlide === index ? 1 : 0.4,
                    transform: currentComboSlide === index ? 'scaleX(1)' : 'scaleX(0.25)',
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Combo Categories Preview */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link href="/combos" className="bg-minsah-accent rounded-xl p-4 flex items-center gap-3">
            <div className="text-3xl">💄</div>
            <div>
              <h4 className="font-semibold text-sm text-minsah-dark">Makeup Combos</h4>
              <p className="text-xs font-medium text-minsah-dark/80">From Tk 1001</p>
            </div>
          </Link>
          <Link href="/combos" className="bg-minsah-accent rounded-xl p-4 flex items-center gap-3">
            <div className="text-3xl">✨</div>
            <div>
              <h4 className="font-semibold text-sm text-minsah-dark">Skincare Sets</h4>
              <p className="text-xs font-medium text-minsah-dark/80">From Tk 1001</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Flash Sale */}
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

        {/* Countdown Timer */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-minsah-secondary">Ends in:</span>
          <div className="flex gap-1">
            {[timeLeft.days, timeLeft.hours, timeLeft.minutes, timeLeft.seconds].map((val, i) => (
              <span key={i} className="flex items-center gap-1">
                <div className="bg-minsah-primary text-white px-2 py-1 rounded text-xs font-bold w-8 text-center tabular-nums">
                  {String(val).padStart(2, '0')}
                </div>
                {i < 3 && <span className="text-minsah-dark">:</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Flash Sale Products — ✅ Fix E: index added, priority on first 2 */}
        <div className="grid grid-cols-2 gap-3">
          {flashSaleProducts.map((product, index) => (
            <div key={product.id} className="bg-white rounded-xl p-3 shadow-sm relative">
              <Link href={`/products/${product.id}`}>
                <div className="relative mb-2">
                  <div className="w-full aspect-square bg-minsah-accent rounded-lg flex items-center justify-center overflow-hidden mb-2 relative">
                    <ProductImage
                      src={product.image}
                      alt={product.name}
                      priority={index < 2}
                    />
                  </div>
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                    {product.discount}%
                  </div>
                  {renderHomeOverlayCart(product)}
                </div>
                <h3 className="text-xs font-semibold text-minsah-dark mb-1 line-clamp-2">{product.name}</h3>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-minsah-primary">
                    {formatPrice(product.price)}
                  </span>
                  <span className="text-xs text-minsah-secondary line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                </div>
              </Link>
              {renderHomeBuyNowButton(product, 'w-full')}
            </div>
          ))}
        </div>
      </section>

      {/* New Arrival — ✅ Fix E: index added, priority on first 2 */}
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
                    <ProductImage
                      src={product.image}
                      alt={product.name}
                      priority={index < 2}
                    />
                  </div>
                  <div className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <Heart size={16} className="text-minsah-secondary" />
                  </div>
                  {renderHomeOverlayCart(product)}
                </div>
                <h3 className="text-xs font-semibold text-minsah-dark mb-1 line-clamp-2">{product.name}</h3>
                <p className="text-xs text-minsah-secondary mb-1">{product.sku}</p>
                <span className="text-sm font-bold text-minsah-primary mb-2 block">
                  {formatPrice(product.price)}
                </span>
              </Link>
              {renderHomeBuyNowButton(product, 'w-full')}
            </div>
          ))}
        </div>
      </section>

      {/* For You */}
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
                  {renderHomeOverlayCart(product)}
                </div>
                <h3 className="text-xs font-semibold text-minsah-dark mb-1 line-clamp-2">{product.name}</h3>
                <span className="text-sm font-bold text-minsah-primary block mb-2">
                  {formatPrice(product.price)}
                </span>
              </Link>
              {renderHomeBuyNowButton(product, 'w-full')}
            </div>
          ))}
        </div>
      </section>

      {/* Recommendation */}
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
                  {renderHomeOverlayCart(product)}
                </div>
                <h3 className="text-[10px] font-semibold text-minsah-dark mb-1 line-clamp-2">{product.name}</h3>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs font-bold text-minsah-primary">
                    {formatPrice(product.price)}
                  </span>
                </div>
                <div className="flex items-center gap-1 mb-2">
                  <div className="flex text-amber-700 text-[10px]">
                    {'★'.repeat(product.rating)}{'☆'.repeat(5 - product.rating)}
                  </div>
                  <span className="text-[9px] font-medium text-minsah-dark/75">({product.reviews})</span>
                </div>
              </Link>
              {renderHomeBuyNowButton(product, 'w-full text-xs')}
            </div>
          ))}
        </div>
      </section>

      {/* Favourite */}
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
                  {renderHomeOverlayCart(product)}
                </div>
                <h3 className="text-[10px] font-semibold text-minsah-dark mb-1 line-clamp-2">{product.name}</h3>
                <span className="text-xs font-bold text-minsah-primary block mb-2">
                  {formatPrice(product.price)}
                </span>
              </Link>
              {renderHomeBuyNowButton(product, 'w-full text-xs')}
            </div>
          ))}
        </div>
      </section>

      {/* Browse Popular Brand */}
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
      </main>
    </div>
  );
}

// ✅ Fix D: Outer export wraps everything in ProductsProvider
export default function HomePageClient({
  initialProducts = [],
  initialCategories = [],
}: {
  initialProducts?: Product[];
  initialCategories?: HomeCategory[];
}) {
  return (
    <ProductsProvider activeOnly limit={48} initialProducts={initialProducts}>
      <HomePageInner initialCategories={initialCategories} />
    </ProductsProvider>
  );
}
