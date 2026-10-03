'use client';

import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useProductOffer } from '@/components/offer/useProductOffer';

export interface DesktopSaleCountdownProps {
  className?: string;
}

export function DesktopSaleCountdown({ className = '' }: DesktopSaleCountdownProps) {
  const { offer } = useProductOffer();
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!offer.saleEndsAt || offer.saleState !== 'active') {
      setTimeLeft(null);
      return;
    }

    const target = new Date(offer.saleEndsAt).getTime();

    const update = () => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [offer.saleEndsAt, offer.saleState]);

  if (!timeLeft) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-mono font-medium ${className}`}
    >
      <Clock size={12} className="shrink-0" />
      <span>
        Ends in {String(timeLeft.hours).padStart(2, '0')}:
        {String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')}
      </span>
    </div>
  );
}

export default DesktopSaleCountdown;
