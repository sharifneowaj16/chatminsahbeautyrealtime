'use client';

import type { ReactNode } from 'react';

interface ProductGridContainerProps {
  children: ReactNode;
  columns?: 3 | 4 | 5;
  className?: string;
}

export default function ProductGridContainer({
  children,
  columns = 5,
  className = '',
}: ProductGridContainerProps) {
  let colClass = 'grid grid-cols-2 gap-2.5 sm:gap-3.5 md:grid-cols-3 lg:grid-cols-5 md:gap-4 lg:gap-4';
  if (columns === 3) {
    colClass = 'grid grid-cols-2 gap-2.5 sm:gap-3.5 md:grid-cols-3 md:gap-4';
  } else if (columns === 4) {
    colClass = 'grid grid-cols-2 gap-2.5 sm:gap-3.5 md:grid-cols-3 lg:grid-cols-4 md:gap-4';
  }

  return <div className={`${colClass} ${className}`}>{children}</div>;
}
