'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface ProductFormCardContainerProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ProductFormCardContainer({
  icon: Icon,
  title,
  subtitle,
  badge,
  actions,
  children,
  className,
}: ProductFormCardContainerProps) {
  return (
    <div
      className={clsx(
        'bg-[#161824] rounded-lg border border-[#232636] p-6 shadow-sm space-y-4',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          {Icon && <Icon className="w-5 h-5 text-white/80 shrink-0" />}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[#F7F8F8] tracking-tight">{title}</h2>
              {badge}
            </div>
            {subtitle && <p className="text-xs text-[#8a8f98] mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {actions && <div className="flex items-center space-x-2">{actions}</div>}
      </div>

      <div>{children}</div>
    </div>
  );
}
