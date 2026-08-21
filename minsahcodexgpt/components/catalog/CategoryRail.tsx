'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * ============================================================================
 * Primary Storefront Category Component — Minsah Beauty
 * ============================================================================
 * This is the central, universal Category Rail component for the storefront.
 * It renders the sticky category navigation rail below the site header with:
 * - Dynamic admin synchronization from `/api/categories?activeOnly=true`
 * - Full CRUD support managed via the Admin Dashboard (`/admin/categories`)
 * - Smooth mouse drag-scrolling and touch swipe support
 * - Dynamic active background and indicator bar calculations
 * ============================================================================
 */

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
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDraggingState, setIsDraggingState] = useState(false);

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

  // Momentum & Drag physics refs
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);
  const hasDragged = useRef(false);
  const velX = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const rafId = useRef<number | null>(null);

  // Check scroll edge availability
  const checkScrollEdges = useCallback(() => {
    if (!railRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = railRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  // Fetch dynamic categories from Admin API and synchronize with primary rail
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/categories?activeOnly=true', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.categories && Array.isArray(data.categories) && data.categories.length > 0) {
          const apiCats: CategoryRailItem[] = data.categories.map((c: any) => {
            const slug = c.slug || c.name.toLowerCase().replace(/\s+/g, '-');
            const fileSlug = c.name.replace(/\s+/g, '_');
            return {
              id: c.id || slug,
              name: c.name,
              slug: slug,
              href: c.href || `/shop?category=${encodeURIComponent(c.name)}`,
              image: c.icon || c.image || `/images/categories/${fileSlug}.png`,
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
    checkScrollEdges();
    window.addEventListener('resize', updateIndicator);
    window.addEventListener('resize', checkScrollEdges);
    return () => {
      window.removeEventListener('resize', updateIndicator);
      window.removeEventListener('resize', checkScrollEdges);
    };
  }, [updateIndicator, checkScrollEdges, categories]);

  // Physics-based momentum glide loop
  const stopMomentum = () => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  };

  const applyMomentum = () => {
    if (!railRef.current) return;
    velX.current *= 0.94; // Friction deceleration
    railRef.current.scrollLeft -= velX.current;
    checkScrollEdges();

    if (Math.abs(velX.current) > 0.4) {
      rafId.current = requestAnimationFrame(applyMomentum);
    } else {
      stopMomentum();
    }
  };

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!railRef.current) return;
    stopMomentum();
    isDragging.current = true;
    setIsDraggingState(true);
    hasDragged.current = false;
    startX.current = e.pageX - railRef.current.offsetLeft;
    scrollLeftStart.current = railRef.current.scrollLeft;
    lastX.current = e.pageX;
    lastTime.current = performance.now();
    velX.current = 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !railRef.current) return;
    e.preventDefault();
    const currentX = e.pageX - railRef.current.offsetLeft;
    const walk = (currentX - startX.current) * 1.25;

    if (Math.abs(walk) > 4) {
      hasDragged.current = true;
    }

    railRef.current.scrollLeft = scrollLeftStart.current - walk;
    checkScrollEdges();

    const now = performance.now();
    const dt = now - lastTime.current;
    if (dt > 8) {
      velX.current = ((e.pageX - lastX.current) / dt) * 14;
      lastX.current = e.pageX;
      lastTime.current = now;
    }
  };

  const handleMouseUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setIsDraggingState(false);
    if (Math.abs(velX.current) > 1) {
      applyMomentum();
    }
  };

  // Mouse Wheel Horizontal Passthrough
  const handleWheel = (e: React.WheelEvent) => {
    if (!railRef.current) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      stopMomentum();
      railRef.current.scrollLeft += e.deltaY * 0.85;
      checkScrollEdges();
    }
  };

  // Click handler with drag safety
  const handleCategoryClick = (e: React.MouseEvent, cat: CategoryRailItem) => {
    if (hasDragged.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setActiveCategory(cat.name);
    if (onSelectCategory) {
      onSelectCategory(cat);
    }
  };

  // Arrow navigation
  const scrollByDistance = (direction: 'left' | 'right') => {
    if (!railRef.current) return;
    stopMomentum();
    const distance = direction === 'left' ? -320 : 320;
    railRef.current.scrollBy({ left: distance, behavior: 'smooth' });
    setTimeout(checkScrollEdges, 350);
  };

  return (
    <nav aria-label="Minsah Beauty categories" className={`mb-category-strip group/rail ${className}`}>
      {/* Left Edge Gradient Fade */}
      <div
        className={`mb-rail-fade mb-rail-fade-left ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden="true"
      />

      {/* Right Edge Gradient Fade */}
      <div
        className={`mb-rail-fade mb-rail-fade-right ${canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden="true"
      />

      {/* Desktop Left Chevron Button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByDistance('left')}
          className="mb-rail-arrow mb-rail-arrow-left"
          aria-label="Scroll categories left"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      )}

      {/* Desktop Right Chevron Button */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByDistance('right')}
          className="mb-rail-arrow mb-rail-arrow-right"
          aria-label="Scroll categories right"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      )}

      <div
        ref={railRef}
        id="mbCategoryRail"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onScroll={checkScrollEdges}
        className={`mb-category-scroll ${isDraggingState ? 'dragging' : ''}`}
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
                onClick={(e) => handleCategoryClick(e, cat)}
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
