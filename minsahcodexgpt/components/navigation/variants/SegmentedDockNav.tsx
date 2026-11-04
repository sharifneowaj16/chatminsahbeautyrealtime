'use client';

import React from 'react';
import Link from 'next/link';
import { ResolvedSmartButton } from '../useSmartNavButtons';
import SafeSvgRenderer from '../SafeSvgRenderer';

interface SegmentedDockNavProps {
  buttons: ResolvedSmartButton[];
}

export const SegmentedDockNav: React.FC<SegmentedDockNavProps> = ({ buttons }) => {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 md:hidden pb-safe select-none"
      aria-label="Mobile Navigation"
      style={{ touchAction: 'manipulation' }}
    >
      <div className="mx-auto max-w-lg px-2 pb-2">
        <div className="grid grid-cols-5 divide-x divide-stone-200/60 dark:divide-[#23252a] rounded-xl border border-stone-200/80 dark:border-[#23252a] bg-stone-50/95 dark:bg-[#090a0b]/95 shadow-xl backdrop-blur-md overflow-hidden">
          {buttons.map((btn, index) => {
            const isCenterCart = btn.isMiddleCart;

            const innerContent = (
              <div
                className={`relative flex min-h-11 w-full flex-col items-center justify-center py-1 transition-all ${
                  btn.isActive
                    ? 'bg-white dark:bg-[#1a1c1e] text-minsah-primary dark:text-emerald-400 font-bold shadow-inner'
                    : 'text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white font-medium'
                }`}
              >
                <div className="relative">
                  {isCenterCart ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-minsah-primary dark:bg-emerald-600 text-white shadow-xs">
                      <SafeSvgRenderer
                        buttonKey={btn.iconKey}
                        iconType={btn.iconType}
                        customSvg={btn.customSvg}
                        className="w-3.5 h-3.5 text-white"
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

                  {typeof btn.badgeCount === 'number' && btn.badgeCount > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black leading-none text-white shadow-xs">
                      {btn.badgeCount > 99 ? '99+' : btn.badgeCount}
                    </span>
                  )}
                </div>

                <span className="mt-0.5 truncate text-[10px] leading-tight">
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
                  className="flex items-center justify-center min-h-11 w-full outline-none"
                  aria-label={btn.label}
                >
                  {innerContent}
                </button>
              );
            }

            return (
              <Link
                key={`${btn.key}-${index}`}
                href={btn.href || '/'}
                className="flex items-center justify-center min-h-11 w-full outline-none"
                aria-label={btn.label}
              >
                {innerContent}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default SegmentedDockNav;

