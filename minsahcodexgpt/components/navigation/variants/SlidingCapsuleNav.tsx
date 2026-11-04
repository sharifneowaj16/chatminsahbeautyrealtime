'use client';

import React from 'react';
import Link from 'next/link';
import { ResolvedSmartButton } from '../useSmartNavButtons';
import SafeSvgRenderer from '../SafeSvgRenderer';

interface SlidingCapsuleNavProps {
  buttons: ResolvedSmartButton[];
}

export const SlidingCapsuleNav: React.FC<SlidingCapsuleNavProps> = ({ buttons }) => {
  const activeIndex = buttons.findIndex((b) => b.isActive);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 md:hidden pb-safe select-none"
      aria-label="Mobile Navigation"
      style={{ touchAction: 'manipulation' }}
    >
      <div className="mx-auto max-w-md px-3 pb-2 pt-1">
        <div className="relative flex items-center justify-between rounded-2xl border border-stone-200/80 dark:border-[#23252a] bg-white/90 dark:bg-[#0f1011]/90 p-1 shadow-2xl backdrop-blur-xl">
          {/* Sliding Capsule Highlight Indicator */}
          {activeIndex >= 0 && activeIndex < buttons.length && (
            <div
              className="absolute bottom-1 top-1 rounded-xl bg-minsah-primary/10 dark:bg-[#5e6ad2]/20 border border-minsah-primary/20 dark:border-[#5e6ad2]/30 transition-transform duration-300 ease-out pointer-events-none"
              style={{
                width: `calc((100% - 8px) / ${buttons.length})`,
                transform: `translateX(calc(${activeIndex} * 100%))`,
              }}
            />
          )}

          {buttons.map((btn, index) => {
            const isCenterCart = btn.isMiddleCart;
            const content = (
              <div
                className={`relative flex min-h-11 min-w-11 w-full flex-col items-center justify-center py-1 transition-transform active:scale-95 ${
                  btn.isActive
                    ? 'text-minsah-primary dark:text-[#5e6ad2] font-bold'
                    : 'text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white font-medium'
                }`}
              >
                <div className="relative">
                  {/* Distinct Elevated Look for Center Cart */}
                  {isCenterCart ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-minsah-primary dark:bg-[#5e6ad2] text-white shadow-md">
                      <SafeSvgRenderer
                        buttonKey={btn.iconKey}
                        iconType={btn.iconType}
                        customSvg={btn.customSvg}
                        className="w-4 h-4 text-white"
                        active={true}
                      />
                    </div>
                  ) : (
                    <SafeSvgRenderer
                      buttonKey={btn.iconKey}
                      iconType={btn.iconType}
                      customSvg={btn.customSvg}
                      className="w-5 h-5"
                      active={btn.isActive}
                    />
                  )}

                  {/* Realtime Live Counter Badge */}
                  {typeof btn.badgeCount === 'number' && btn.badgeCount > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black leading-none text-white shadow-sm ring-1 ring-white dark:ring-[#0f1011]">
                      {btn.badgeCount > 99 ? '99+' : btn.badgeCount}
                    </span>
                  )}
                </div>

                <span className="mt-0.5 truncate text-[10px] leading-tight tracking-tight">
                  {btn.label}
                </span>
              </div>
            );

            if (btn.onClick) {
              return (
                <button
                  key={`${btn.key}-${index}`}
                  type="button"
                  onClick={btn.onClick}
                  className="flex-1 flex items-center justify-center min-h-11 outline-none"
                  aria-label={btn.label}
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={`${btn.key}-${index}`}
                href={btn.href || '/'}
                className="flex-1 flex items-center justify-center min-h-11 outline-none"
                aria-label={btn.label}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default SlidingCapsuleNav;

