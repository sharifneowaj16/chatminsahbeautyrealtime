'use client';

import React from 'react';

export default function WelcomeSparklesLayer() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Top Gold Sparkle */}
      <div className="absolute top-16 left-8 animate-pulse">
        <svg fill="none" height="24" viewBox="0 0 24 24" width="24">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" fill="#F3E5AB" fillOpacity="0.9" />
        </svg>
      </div>

      {/* Right Rose Sparkle */}
      <div className="absolute top-24 right-10 animate-bounce" style={{ animationDuration: '3s' }}>
        <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" fill="#E8A598" fillOpacity="0.9" />
        </svg>
      </div>

      {/* Bottom Left Gold Sparkle */}
      <div className="absolute bottom-20 left-12 animate-pulse" style={{ animationDelay: '1.2s' }}>
        <svg fill="none" height="20" viewBox="0 0 24 24" width="20">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" fill="#C59A27" fillOpacity="0.8" />
        </svg>
      </div>

      {/* Bottom Right Glow Sparkle */}
      <div className="absolute bottom-28 right-8 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}>
        <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" fill="#D4F6A2" fillOpacity="0.9" />
        </svg>
      </div>

      {/* Subtle Falling Shimmer / Confetti Specks */}
      <div className="absolute top-10 left-1/4 w-1.5 h-3 bg-[#C59A27] rounded-full rotate-45 opacity-60 animate-pulse" />
      <div className="absolute top-6 right-1/4 w-2 h-2 bg-[#E8A598] rounded-full opacity-70 animate-pulse" style={{ animationDelay: '1.2s' }} />
      <div className="absolute top-12 left-2/3 w-1.5 h-2.5 bg-[#4b6723] rounded-sm opacity-50 animate-pulse" style={{ animationDelay: '2.1s' }} />
    </div>
  );
}
