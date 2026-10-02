'use client';

import React, { useState } from 'react';
import { Package } from 'lucide-react';

export interface ProductThumbnailCellProps {
  src?: string;
  alt: string;
}

export function ProductThumbnailCell({ src, alt }: ProductThumbnailCellProps) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="w-8 h-8 bg-[#1b1e2c] border border-[#232636] rounded-md flex items-center justify-center overflow-hidden shrink-0">
      {src && !hasError ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover rounded-md"
          onError={() => setHasError(true)}
          loading="lazy"
        />
      ) : (
        <Package className="w-4 h-4 text-white/30" />
      )}
    </div>
  );
}
