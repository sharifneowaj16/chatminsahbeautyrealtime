'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export interface ProductFormHeaderProps {
  title: string;
  subtitle: string;
  backHref?: string;
  actions?: React.ReactNode;
}

export function ProductFormHeader({
  title,
  subtitle,
  backHref = '/admin/products',
  actions,
}: ProductFormHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex items-center space-x-3">
        {backHref && (
          <Link
            href={backHref}
            className="w-8 h-8 rounded-lg bg-[#161824] border border-[#232636] flex items-center justify-center text-white/70 hover:text-white hover:bg-[#1b1e2c] active:scale-[0.96] transition-all"
            title="Back to Products"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        )}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F7F8F8]">{title}</h1>
          <p className="text-xs text-white/50 mt-0.5">{subtitle}</p>
        </div>
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
