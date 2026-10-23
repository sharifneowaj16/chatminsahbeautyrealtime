'use client';

import React, { useState, useRef } from 'react';
import { Upload, Loader2, ImagePlus, CheckCircle2, AlertCircle } from 'lucide-react';

interface BannerUploadDropzoneProps {
  onUploadSuccess: (url: string) => void;
  className?: string;
}

export default function BannerUploadDropzone({
  onUploadSuccess,
  className = '',
}: BannerUploadDropzoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image file is too large. Maximum size is 8MB.');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bannerId', `hero-${Date.now()}`);

      const res = await fetch('/api/upload/banner', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.url) {
        throw new Error(data.error || data.detail || 'Upload failed');
      }

      onUploadSuccess(data.url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload image';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadFile(e.target.files[0]);
    }
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl.trim()) return;
    onUploadSuccess(manualUrl.trim());
    setManualUrl('');
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
          dragActive
            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
            : 'border-stone-300 hover:border-emerald-500 bg-stone-50/60 dark:bg-stone-900/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2 text-stone-600 dark:text-stone-300">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <p className="text-sm font-medium">Uploading banner image...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                Click to upload or drag & drop banner image
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                Recommended aspect ratio: 4:1 (Desktop 1200x300, Mobile 900x400) • JPG, PNG, WebP up to 8MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Notice */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-xs text-rose-600 bg-rose-50 rounded-lg border border-rose-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Manual URL Form */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-stone-400">Or use image URL:</span>
        <input
          type="url"
          placeholder="https://example.com/banner.jpg or /images/..."
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
          className="flex-1 px-3 py-1.5 rounded-lg border border-stone-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="button"
          onClick={handleManualAdd}
          disabled={!manualUrl.trim()}
          className="px-3 py-1.5 rounded-lg bg-stone-800 text-white font-medium hover:bg-stone-900 disabled:opacity-40 transition-opacity"
        >
          Add
        </button>
      </div>
    </div>
  );
}
