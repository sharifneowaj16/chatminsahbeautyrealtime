'use client';

import React from 'react';
import Image from 'next/image';
import { Camera, Trash2 } from 'lucide-react';

interface WarrantyPhotoUploaderProps {
  hasUploadedPhoto: boolean;
  uploadedPhotoUrl?: string;
  onRemovePhoto: () => void;
  onAddPhoto: () => void;
}

export default function WarrantyPhotoUploader({
  hasUploadedPhoto,
  uploadedPhotoUrl = '/images/categories/Skincare.png',
  onRemovePhoto,
  onAddPhoto,
}: WarrantyPhotoUploaderProps) {
  return (
    <div className="flex flex-col gap-2 pt-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">
          Attach Photos
        </span>
        <span className="text-xs text-[#828fff] font-mono">
          {hasUploadedPhoto ? '1 added' : '0 added'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {hasUploadedPhoto && (
          <div className="h-20 rounded-xl bg-[#0f1011] border border-[#23252a] p-2 flex items-center gap-2.5 shadow-sm relative overflow-hidden">
            <div className="relative w-16 h-full rounded-lg overflow-hidden shrink-0 bg-[#141516]">
              <Image
                src={uploadedPhotoUrl}
                alt="Defect photo"
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-between h-full min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#f7f8f8] truncate">
                  Defect Photo
                </span>
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={onRemovePhoto}
                  className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-[10px] text-[#27a644] font-medium">
                ✓ Verified Proof
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onAddPhoto}
          className="h-20 rounded-xl border border-dashed border-[#23252a] bg-[#141516] hover:border-[#5e6ad2]/50 hover:bg-[#18191a] flex flex-col items-center justify-center gap-1.5 text-[#8a8f98] hover:text-[#f7f8f8] active:scale-95 transition-all cursor-pointer"
        >
          <Camera className="w-5 h-5 text-[#828fff]" />
          <span className="text-[11px] font-semibold">
            {hasUploadedPhoto ? 'Add Another Photo' : 'Upload Proof'}
          </span>
        </button>
      </div>
    </div>
  );
}