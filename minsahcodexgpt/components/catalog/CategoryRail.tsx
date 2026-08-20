'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface CategoryRailItem {
  id: string;
  name: string;
  slug: string;
  href: string;
  image?: string;
}

export const defaultCategoryRailItems: CategoryRailItem[] = [
  { id: 'cat-for-you', name: 'For You', slug: 'for-you', href: '/#for-you', image: '/images/categories/For_You.svg' },
  { id: 'cat-makeup', name: 'Makeup', slug: 'makeup', href: '/shop?category=Makeup', image: '/images/categories/Makeup.png' },
  { id: 'cat-skincare', name: 'Skincare', slug: 'skincare', href: '/shop?category=Skincare', image: '/images/categories/Skincare.png' },
  { id: 'cat-hair-care', name: 'Hair Care', slug: 'hair-care', href: '/shop?category=Hair%20Care', image: '/images/categories/Hair_Care.png' },
  { id: 'cat-hair-color', name: 'Hair Color', slug: 'hair-color', href: '/shop?category=Hair%20Color', image: '/images/categories/Hair_Color.png' },
  { id: 'cat-lip-care', name: 'Lip Care', slug: 'lip-care', href: '/shop?category=Lip%20Care', image: '/images/categories/Lip_Care.png' },
  { id: 'cat-sunscreen', name: 'Sunscreen', slug: 'sunscreen', href: '/shop?category=Sunscreen', image: '/images/categories/Sunscreen.png' },
  { id: 'cat-serum', name: 'Serum', slug: 'serum', href: '/shop?category=Serum', image: '/images/categories/Serum.png' },
  { id: 'cat-fragrance', name: 'Fragrance', slug: 'fragrance', href: '/shop?category=Fragrance', image: '/images/categories/Fragrance.png' },
  { id: 'cat-bath-body', name: 'Bath & Body', slug: 'bath-body', href: '/shop?category=Bath%20%26%20Body', image: '/images/categories/Bath_&_Body.png' },
  { id: 'cat-new-arrivals', name: 'New Arrivals', slug: 'new-arrivals', href: '/shop?sort=newest', image: '/images/categories/New_Arrivals.png' },
  { id: 'cat-tools', name: 'Tools', slug: 'tools', href: '/shop?category=Tools', image: '/images/categories/Tools.png' },
  { id: 'cat-offers', name: 'Offers', slug: 'offers', href: '/flash-sale', image: '/images/categories/Offers.png' },
];

export interface CategoryRailProps {
  initialCategories?: CategoryRailItem[];
  defaultActiveCategory?: string;
  className?: string;
  onSelectCategory?: (category: CategoryRailItem) => void;
}

export default function CategoryRail({
  initialCategories = defaultCategoryRailItems,
  defaultActiveCategory = 'For You',
  className = '',
  onSelectCategory,
}: CategoryRailProps) {
  const [categories, setCategories] = useState<CategoryRailItem[]>(initialCategories);
  const [activeCategory, setActiveCategory] = useState<string>(defaultActiveCategory);

  const [indicatorStyle, setIndicatorStyle] = useState<{ transform: string; width: string }>({
    transform: 'translateX(0px)',
    width: '108px',
  });
  const [activeBgStyle, setActiveBgStyle] = useState<{ transform: string; width: string }>({
    transform: 'translateX(16px)',
    width: '76px',
  });

  const railRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Fetch dynamic categories from API
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/categories?activeOnly=true', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.categories?.length) {
          const apiCats: CategoryRailItem[] = data.categories.map((c: any) => {
            const slug = c.slug || c.name.toLowerCase().replace(/\s+/g, '-');
            const fileSlug = c.name.replace(/\s+/g, '_');
            return {
              id: c.id || slug,
              name: c.name,
              slug: slug,
              href: c.href || `/shop?category=${encodeURIComponent(c.name)}`,
              image: `/images/categories/${fileSlug}.png`,
            };
          });
          setCategories([
            { id: 'cat-for-you', name: 'For You', slug: 'for-you', href: '/#for-you', image: '/images/categories/For_You.svg' },
            ...apiCats,
          ]);
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  // Update active indicator and background positions
  const updateIndicator = useCallback(() => {
    const activeEl = cellRefs.current.get(activeCategory);
    if (activeEl) {
      const left = activeEl.offsetLeft;
      const width = activeEl.offsetWidth;
      const bgWidth = Math.round(width * 0.7);
      const bgOffset = Math.round((width - bgWidth) / 2);
      setIndicatorStyle({
        transform: `translateX(${left}px)`,
        width: `${width}px`,
      });
      setActiveBgStyle({
        transform: `translateX(${left + bgOffset}px)`,
        width: `${bgWidth}px`,
      });
    }
  }, [activeCategory]);

  useEffect(() => {
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator, categories]);

  // Mouse Drag Scroll for Category Rail
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!railRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - railRef.current.offsetLeft);
    setScrollLeft(railRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !railRef.current) return;
    e.preventDefault();
    const x = e.pageX - railRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    railRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleCategoryClick = (cat: CategoryRailItem) => {
    setActiveCategory(cat.name);
    if (onSelectCategory) {
      onSelectCategory(cat);
    }
  };

  return (
    <nav aria-label="Minsah Beauty categories" className={`mb-category-strip ${className}`}>
      <div
        ref={railRef}
        id="mbCategoryRail"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`mb-category-scroll ${isDragging ? 'dragging' : ''}`}
      >
        <div aria-hidden="true" className="mb-active-bg" id="mbActiveBg" style={activeBgStyle} />
        <div aria-hidden="true" className="mb-indicator" id="mbIndicator" style={indicatorStyle} />

        {categories.map((cat) => {
          const isActive = activeCategory === cat.name;
          return (
            <div key={cat.id} className="mb-category-cell">
              <Link
                ref={(el) => {
                  if (el) cellRefs.current.set(cat.name, el);
                  else cellRefs.current.delete(cat.name);
                }}
                href={cat.href}
                onClick={() => handleCategoryClick(cat)}
                aria-current={isActive ? 'page' : undefined}
                data-category={cat.name}
                className={`mb-category ${isActive ? 'active' : ''}`}
              >
                <span aria-hidden="true" className="mb-cat-icon">
                  {cat.slug === 'for-you' || cat.name === 'For You' ? (
                    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
                      <path
                        className="mb-icon-stroke"
                        d="M9.8 6.7h12.4c1.9 0 3.5 1.45 3.7 3.35l1.55 14.05c.23 2.16-1.45 4.05-3.62 4.05H8.17c-2.17 0-3.85-1.89-3.62-4.05L6.1 10.05A3.74 3.74 0 0 1 9.8 6.7Z"
                      />
                      <path
                        className="mb-icon-accent-soft"
                        d="M10.05 11.65c.35 3.07 2.87 5.4 5.95 5.4 3.09 0 5.61-2.33 5.96-5.4a7.18 7.18 0 0 1-11.91 0Z"
                      />
                      <path
                        className="mb-icon-stroke"
                        d="M10.05 11.65c0 3.23 2.66 5.85 5.95 5.85 3.3 0 5.96-2.62 5.96-5.85"
                      />
                      <circle className="mb-icon-accent" cx="24.6" cy="24.6" r="1.15" />
                    </svg>
                  ) : (
                    <img
                      alt=""
                      aria-hidden="true"
                      src={cat.image || `/images/categories/${cat.slug}.png`}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </span>
                <span className="mb-cat-label">{cat.name}</span>
              </Link>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
