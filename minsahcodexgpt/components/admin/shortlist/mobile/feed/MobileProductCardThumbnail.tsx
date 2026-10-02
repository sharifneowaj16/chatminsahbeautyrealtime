'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface MobileProductCardThumbnailProps {
  thumbnailUrl?: string;
  title: string;
  volumeSpec: string;
}

export const MobileProductCardThumbnail: React.FC<MobileProductCardThumbnailProps> = ({
  thumbnailUrl,
  title,
  volumeSpec,
}) => {
  return (
    <div className="w-13 h-13 rounded-lg bg-[#102135] border border-[#1f2f45] overflow-hidden shrink-0 flex items-center justify-center relative select-none">
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-500">
          <Sparkles className="h-5 w-5 text-indigo-400" />
        </div>
      )}
      <span className="absolute bottom-0 right-0 bg-[#06101c]/90 text-[8px] font-mono px-0.5 text-indigo-400 font-bold">
        {volumeSpec}
      </span>
    </div>
  );
};
