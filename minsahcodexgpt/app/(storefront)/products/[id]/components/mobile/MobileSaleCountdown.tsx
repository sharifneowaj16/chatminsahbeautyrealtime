'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useProductOffer } from '@/components/offer/useProductOffer';

export interface MobileSaleCountdownProps {
  className?: string;
}

export function MobileSaleCountdown({ className = '' }: MobileSaleCountdownProps) {
  const { offer } = useProductOffer();
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (offer.saleState !== 'active' || !offer.saleEndsAt) {
      setTimeLeft(null);
      return;
    }

    const targetDate = new Date(offer.saleEndsAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = targetDate - now;

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [offer.saleState, offer.saleEndsAt]);

  if (!timeLeft) return null;

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 px-2 py-1 text-rose-700 dark:text-rose-300 text-xs font-medium border border-rose-200/60 dark:border-rose-900/50 ${className}`}
    >
      <Clock size={12} className="shrink-0 animate-pulse" />
      <span>Sale ends:</span>
      <span className="font-mono font-bold">
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
    </div>
  );
}

export default MobileSaleCountdown;
