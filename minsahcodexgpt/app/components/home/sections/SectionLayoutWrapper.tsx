'use client';

import type { CSSProperties, ReactNode } from 'react';

interface SectionLayoutWrapperProps {
  children: ReactNode;
  id?: string;
  style?: CSSProperties;
  className?: string;
}

export default function SectionLayoutWrapper({
  children,
  id,
  style,
  className = '',
}: SectionLayoutWrapperProps) {
  return (
    <section
      id={id}
      style={style}
      className={`px-4 lg:px-8 py-2 sm:py-3 transition-colors ${className}`}
    >
      <div className="mx-auto max-w-[1440px]">
        {children}
      </div>
    </section>
  );
}
