'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface SplitScrollStyles {
  isDesktop: boolean;
  leftStyle: React.CSSProperties;
  rightStyle: React.CSSProperties;
}

/* ──────────────────────────────────────────────────────────────────────────
 * useSplitScrollTrigger
 * ──────────────────────────────────────────────────────────────────────────
 * Premium Desktop Split-Scroll for Seed Product Hero.
 *
 * Architecture:
 *   Left Column  = Gallery (shorter)  → position: sticky  (LOCKS in place)
 *   Right Column = Commerce (taller)  → position: relative (scrolls freely)
 *
 * Scroll Sequence (Desktop ≥ 1024 px):
 *
 *   ↓ DOWN SCROLL:
 *     1. Page scrolls → gallery (left) scrolls into view
 *     2. All 5 gallery images become visible → gallery LOCKS (sticky)
 *     3. Right commerce stack (BuyBox → Accordions → Reels → Bundle) scrolls
 *     4. Container bottom reached → gallery RELEASES → both exit together
 *
 *   ↑ UP SCROLL (reverse):
 *     1. Both scroll up together into container
 *     2. Gallery re-locks at top → right column scrolls up through content
 *     3. Right column reaches its top → both scroll up out of view
 *
 * Bidirectional Sticky (gallery taller than viewport):
 *   ↓ Down: locks when gallery BOTTOM is visible (user saw all 5 images)
 *   ↑ Up:   locks at top: 88px (user sees image 1 immediately)
 *
 * Mobile / Tablet (< 1024 px): completely inert, normal document flow.
 *
 * Performance:
 *   • Zero React re-renders on scroll (useRef + direct DOM mutation)
 *   • requestAnimationFrame throttle (max 1 calc per paint frame)
 *   • 5 px scroll-direction dead zone (no trackpad micro-jitter)
 *   • Debounced ResizeObserver — 150 ms (accordion / variant safe)
 * ──────────────────────────────────────────────────────────────────────── */

const NAV_OFFSET = 88;            // Height of sticky navigation pill + gap
const BOTTOM_BUFFER = 24;         // Bottom breathing room
const DIRECTION_THRESHOLD = 5;    // px before direction flip registers
const RO_DEBOUNCE_MS = 150;       // ResizeObserver debounce

export function useSplitScrollTrigger() {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);

  // Only isDesktop uses React state (needed for conditional rendering in parent)
  const [isDesktop, setIsDesktop] = useState(false);

  // All scroll-driven values are refs — zero re-renders on scroll
  const lastScrollY = useRef(0);
  const scrollDir = useRef<'down' | 'up'>('down');
  const dirAccum = useRef(0);
  const rafId = useRef(0);
  const appliedTop = useRef('');

  /* ── Core Calculation ─────────────────────────────────────────────── */
  const calculate = useCallback(() => {
    if (typeof window === 'undefined') return;

    const desktop = window.innerWidth >= 1024;
    setIsDesktop(prev => (prev !== desktop ? desktop : prev));

    const leftEl = leftColumnRef.current;
    const rightEl = rightColumnRef.current;

    // ── Mobile / Tablet: strip all inline styles, normal flow ──
    if (!desktop) {
      if (leftEl) {
        leftEl.style.position = '';
        leftEl.style.top = '';
        leftEl.style.alignSelf = '';
        leftEl.style.transition = '';
      }
      if (rightEl) {
        rightEl.style.position = '';
        rightEl.style.top = '';
        rightEl.style.alignSelf = '';
      }
      appliedTop.current = '';
      return;
    }

    if (!leftEl) return;

    // ── Scroll Direction Detection with 5 px Dead Zone ──
    const y = window.scrollY;
    const delta = y - lastScrollY.current;

    if (delta !== 0) {
      const wasDown = scrollDir.current === 'down';
      if ((wasDown && delta < 0) || (!wasDown && delta > 0)) {
        // Accumulating in opposite direction
        dirAccum.current += delta;
      } else {
        // Same direction — reset accumulator
        dirAccum.current = 0;
      }
      if (Math.abs(dirAccum.current) >= DIRECTION_THRESHOLD) {
        scrollDir.current = dirAccum.current > 0 ? 'down' : 'up';
        dirAccum.current = 0;
      }
    }
    lastScrollY.current = y;

    // ── Sticky Top Calculation for Left (Gallery) Column ──
    const vh = window.innerHeight;
    const available = vh - NAV_OFFSET - BOTTOM_BUFFER;
    const leftH = leftEl.offsetHeight;

    let newTop: string;

    if (leftH <= available) {
      // Gallery fits entirely within viewport → always pin at nav offset
      // User sees all 5 images, then gallery locks perfectly
      newTop = `${NAV_OFFSET}px`;
    } else {
      // Gallery taller than viewport → bidirectional sticky
      if (scrollDir.current === 'down') {
        // ↓ Scrolling down: pin when gallery BOTTOM edge is visible
        // This ensures user has seen ALL 5 images before the gallery locks
        const offset = vh - leftH - BOTTOM_BUFFER;
        newTop = `${offset}px`;
      } else {
        // ↑ Scrolling up: pin at top so Image 1 is immediately visible
        newTop = `${NAV_OFFSET}px`;
      }
    }

    // Apply to DOM only when value actually changes (avoids layout thrash)
    if (appliedTop.current !== newTop || leftEl.style.position !== 'sticky') {
      leftEl.style.position = 'sticky';
      leftEl.style.top = newTop;
      leftEl.style.alignSelf = 'flex-start';
      // Subtle transition only when gallery is taller than viewport (direction reversal)
      leftEl.style.transition = leftH > available ? 'top 0.12s ease-out' : '';
      appliedTop.current = newTop;
    }

    // ── Right Column: ensure normal flow (no stale sticky from prior logic) ──
    if (rightEl && rightEl.style.position === 'sticky') {
      rightEl.style.position = '';
      rightEl.style.top = '';
      rightEl.style.alignSelf = '';
    }
  }, []);

  /* ── rAF-Throttled Scroll Handler ──────────────────────────────────── */
  const onScroll = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(calculate);
  }, [calculate]);

  /* ── Lifecycle ────────────────────────────────────────────────────── */
  useEffect(() => {
    // Initial calculation on mount
    calculate();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', calculate, { passive: true });

    // Debounced ResizeObserver (accordion expand/collapse & variant change safe)
    let roTimer: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(() => {
      if (roTimer) clearTimeout(roTimer);
      roTimer = setTimeout(calculate, RO_DEBOUNCE_MS);
    });

    if (containerRef.current) ro.observe(containerRef.current);
    if (leftColumnRef.current) ro.observe(leftColumnRef.current);
    if (rightColumnRef.current) ro.observe(rightColumnRef.current);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', calculate);
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (roTimer) clearTimeout(roTimer);
      ro.disconnect();
    };
  }, [calculate, onScroll]);

  /* ── SSR-Safe Initial Styles ──────────────────────────────────────── *
   * These provide a correct first paint before useEffect runs.         *
   * calculate() then owns all values via direct DOM mutation.           *
   * ─────────────────────────────────────────────────────────────────── */
  const leftStyle: React.CSSProperties = isDesktop
    ? { position: 'sticky', top: `${NAV_OFFSET}px`, alignSelf: 'flex-start' }
    : {};

  const rightStyle: React.CSSProperties = isDesktop
    ? {}   // Right column: normal document flow — scrolls freely
    : {};

  return {
    containerRef,
    leftColumnRef,
    rightColumnRef,
    isDesktop,
    leftStyle,
    rightStyle,
  };
}
