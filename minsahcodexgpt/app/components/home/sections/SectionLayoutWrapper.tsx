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
      className={`px-4 lg:px-8 pt-3 sm:pt-4 lg:pt-5 pb-6 sm:pb-8 lg:pb-10 transition-colors ${className}`}
    >
      <div className="mx-auto max-w-[1440px]">
        {children}
      </div>
    </section>
  );
}
