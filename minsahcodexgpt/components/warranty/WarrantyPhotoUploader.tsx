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
        <span className="text-xs font-bold text-[#062402] uppercase tracking-wider">
          Attach Photos
        </span>
        <span className="text-[11px] text-[#43483f]">
          {hasUploadedPhoto ? '1 added' : '0 added'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {hasUploadedPhoto && (
          <div className="h-20 rounded-xl bg-white border border-[#E2DED8]/60 p-2 flex items-center gap-2.5 shadow-sm relative overflow-hidden">
            <div className="relative w-16 h-full rounded-lg overflow-hidden shrink-0">
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
                <span className="text-[11px] font-bold text-[#062402] truncate">
                  Defect Photo
                </span>
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={onRemovePhoto}
                  className="text-[#ba1a1a] hover:opacity-80"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-[10px] text-[#4b6723] font-medium">
                ✓ Verified QR
              </span>
            </div>
          </div>
        )}

        <label
          onClick={onAddPhoto}
          className="h-20 rounded-xl bg-[#F8FAF7] border border-dashed border-[#B5C4BB] flex items-center justify-center gap-2 p-2 cursor-pointer hover:bg-[#efeeeb] transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-white text-[#4b6723] flex items-center justify-center shadow-sm shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#062402]">Hologram Seal</span>
            <span className="text-[10px] text-[#43483f]">Tap to add</span>
          </div>
        </label>
      </div>
    </div>
  );
}
