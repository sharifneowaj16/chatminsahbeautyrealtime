'use client';

import React, { useRef, useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

export interface ProductImageDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  error?: string;
  disabled?: boolean;
}

export function ProductImageDropzone({
  onFilesSelected,
  error,
  disabled = false,
}: ProductImageDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith('image/')
      );
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/jpg,image/webp"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-150',
          isDragOver
            ? 'border-[#5e6ad2] bg-[#5e6ad2]/10 scale-[0.99]'
            : 'border-[#232636] hover:border-white/30 bg-[#10121b] hover:bg-[#131522]',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center mx-auto mb-2 text-white/80">
          <Upload className="w-5 h-5" />
        </div>
        <p className="text-xs font-medium text-[#F7F8F8]">
          Click to upload or drag & drop high-res images
        </p>
        <p className="text-[11px] text-white/40 mt-1">
          Supports PNG, JPG, JPEG, WEBP (Up to 10MB each)
        </p>
        <Button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          disabled={disabled}
          className="mt-3 inline-flex items-center px-4 py-1.5 bg-[#5e6ad2] hover:bg-[#525ec2] text-white text-xs font-medium rounded-lg shadow-sm"
        >
          <Upload className="w-3.5 h-3.5 mr-1.5" /> Browse Files
        </Button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-rose-400 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}
