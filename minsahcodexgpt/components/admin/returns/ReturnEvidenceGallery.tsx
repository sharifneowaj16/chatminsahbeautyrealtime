'use client';

import React, { useState } from 'react';
import { ImageIcon, X, ZoomIn } from 'lucide-react';

export interface ReturnEvidenceGalleryProps {
  images?: string[] | null;
  className?: string;
}

export const ReturnEvidenceGallery: React.FC<ReturnEvidenceGalleryProps> = ({
  images,
  className = '',
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!images || images.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-center text-xs text-slate-500">
        <ImageIcon className="w-5 h-5 mx-auto text-slate-600 mb-1" />
        No customer defect photos or proof attachments provided.
      </div>
    );
  }

  return (
    <>
      <div className={`space-y-2 ${className}`}>
        <label className="text-xs font-semibold text-slate-300 block flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-rose-400" />
          Customer Proof Photos ({images.length})
        </label>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((imgUrl, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedImage(imgUrl)}
              className="relative aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-900 group cursor-pointer"
            >
              <img
                src={imgUrl}
                alt={`Proof ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <ZoomIn className="w-4 h-4 text-white" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 p-2">
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImage}
              alt="Enlarged proof"
              className="max-h-[80vh] w-auto mx-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ReturnEvidenceGallery;
