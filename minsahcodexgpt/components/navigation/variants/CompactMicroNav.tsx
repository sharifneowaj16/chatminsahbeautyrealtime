'use client';

import React from 'react';
import Link from 'next/link';
import { ResolvedSmartButton } from '../useSmartNavButtons';
import SafeSvgRenderer from '../SafeSvgRenderer';

interface CompactMicroNavProps {
  buttons: ResolvedSmartButton[];
}

export const CompactMicroNav: React.FC<CompactMicroNavProps> = ({ buttons }) => {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 md:hidden border-t border-stone-200/70 dark:border-[#23252a] bg-white/95 dark:bg-[#070809]/95 backdrop-blur-lg pb-safe select-none shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      aria-label="Mobile Navigation"
      style={{ touchAction: 'manipulation' }}
    >
      <div className="mx-auto grid grid-cols-5 max-w-md items-center">
        {buttons.map((btn, index) => {
          const isCenterCart = btn.isMiddleCart;

          const inner = (
            <div
              className={`relative flex min-h-11 w-full flex-col items-center justify-center pt-1.5 pb-1 transition-colors ${
                btn.isActive
                  ? 'text-minsah-primary dark:text-emerald-400 font-bold'
                  : 'text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white font-medium'
              }`}
            >
              {/* Glowing Top Micro Indicator Line */}
              {btn.isActive && (
                <span className="absolute top-0 inset-x-3 h-[2px] rounded-full bg-minsah-primary dark:bg-emerald-400 shadow-[0_0_8px_rgba(39,166,68,0.8)]" />
              )}

              <div className="relative">
                {isCenterCart ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-minsah-primary dark:bg-emerald-500 text-white shadow-xs">
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
                    className="w-4 h-4"
                    active={btn.isActive}
                  />
                )}

                {typeof btn.badgeCount === 'number' && btn.badgeCount > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-600 px-0.5 text-[8px] font-black leading-none text-white shadow-xs">
                    {btn.badgeCount > 99 ? '99+' : btn.badgeCount}
                  </span>
                )}
              </div>

              <span className="mt-0.5 truncate text-[9.5px] leading-tight">
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
                className="flex items-center justify-center min-h-11 outline-none"
                aria-label={btn.label}
              >
                {inner}
              </button>
            );
          }

          return (
            <Link
              key={`${btn.key}-${index}`}
              href={btn.href || '/'}
              className="flex items-center justify-center min-h-11 outline-none"
              aria-label={btn.label}
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default CompactMicroNav;

