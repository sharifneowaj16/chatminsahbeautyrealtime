'use client';

import React from 'react';
import { Image as ImageIcon, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

export interface ProductImageThumbnailItemProps {
  id: string;
  previewUrl: string;
  isMain: boolean;
  index: number;
  onSetMain: (id: string) => void;
  onRemove: (id: string) => void;
}

export function ProductImageThumbnailItem({
  id,
  previewUrl,
  isMain,
  index,
  onSetMain,
  onRemove,
}: ProductImageThumbnailItemProps) {
  return (
    <div
      className={clsx(
        'relative group rounded-lg overflow-hidden border-2 transition-all duration-150',
        isMain
          ? 'border-[#5e6ad2] ring-2 ring-[#5e6ad2]/30 shadow-md'
          : 'border-[#232636] hover:border-white/30'
      )}
    >
      <div className="aspect-square bg-[#10121b]">
        <img
          src={previewUrl}
          alt={`Product image ${index + 1}`}
          className="w-full h-full object-cover"
        />
      </div>

      {isMain ? (
        <div className="absolute top-1.5 left-1.5 bg-[#5e6ad2] text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Main
        </div>
      ) : (
        <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-sm text-white/80 text-[10px] font-mono px-1.5 py-0.5 rounded">
          #{index + 1}
        </div>
      )}

      {/* Hover Actions Overlay */}
      <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
        {!isMain && (
          <Button
            type="button"
            aria-label={`Set image ${index + 1} as main`}
            onClick={() => onSetMain(id)}
            className="p-1.5 bg-[#161824] hover:bg-[#10121b] text-white/90 border border-white/20 rounded-full transition-all"
            title="Set as Main Image"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </Button>
        )}
        <Button
          type="button"
          aria-label={`Remove image ${index + 1}`}
          onClick={() => onRemove(id)}
          className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full transition-all"
          title="Delete Image"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
