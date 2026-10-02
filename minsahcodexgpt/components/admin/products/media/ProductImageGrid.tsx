'use client';

import React from 'react';
import { ProductImage } from '../types';
import { ProductImageThumbnailItem } from './ProductImageThumbnailItem';

export interface ProductImageGridProps {
  images: Array<{
    id: string;
    preview: string;
    isMain: boolean;
  }>;
  onSetMain: (id: string) => void;
  onRemove: (id: string) => void;
}

export function ProductImageGrid({
  images,
  onSetMain,
  onRemove,
}: ProductImageGridProps) {
  if (images.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
      {images.map((image, index) => (
        <ProductImageThumbnailItem
          key={image.id}
          id={image.id}
          previewUrl={image.preview}
          isMain={image.isMain}
          index={index}
          onSetMain={onSetMain}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
