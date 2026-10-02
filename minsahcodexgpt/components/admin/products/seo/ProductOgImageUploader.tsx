'use client';

import React, { useRef } from 'react';
import { Upload, Trash2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ProductOgImageUploaderProps {
  previewUrl?: string;
  onFileSelected: (file: File) => void;
  onClear: () => void;
}

export function ProductOgImageUploader({
  previewUrl,
  onFileSelected,
  onClear,
}: ProductOgImageUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <label className="block text-xs font-medium text-[#d0d6e0] mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Share2 className="w-3.5 h-3.5 text-blue-400" />
          Social Share Card Image (1200 × 630 px)
        </span>
        <span className="text-[10px] text-white/40">OpenGraph & Twitter Card Preview</span>
      </label>

      {previewUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-[#232636] bg-[#10121b] max-w-md group">
          <div className="aspect-[1.91/1] w-full">
            <img
              src={previewUrl}
              alt="OG Social Card Preview"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <Button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="p-1.5 bg-black/70 hover:bg-black text-white text-xs rounded-md shadow-sm"
              title="Replace image"
            >
              <Upload className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              onClick={onClear}
              className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs rounded-md shadow-sm"
              title="Remove image"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          className="border border-dashed border-[#232636] hover:border-white/30 rounded-lg p-4 bg-[#10121b] hover:bg-[#131522] cursor-pointer text-center transition-all max-w-md"
        >
          <Share2 className="w-5 h-5 text-white/40 mx-auto mb-1.5" />
          <p className="text-xs text-white/80 font-medium">Upload Social Banner</p>
          <p className="text-[10px] text-white/40 mt-0.5">Recommended 1200x630 pixels for WhatsApp & Facebook</p>
        </div>
      )}
    </div>
  );
}
