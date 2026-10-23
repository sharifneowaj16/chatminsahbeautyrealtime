'use client';

import { useState, useEffect } from 'react';

interface FlashDealsTimerState {
  formattedTime: string;
  hours: string;
  minutes: string;
  seconds: string;
  isExpired: boolean;
}

export function useFlashDealsTimer(endsAt?: string | Date): FlashDealsTimerState {
  const [timeLeft, setTimeLeft] = useState<FlashDealsTimerState>({
    formattedTime: '00:00:00',
    hours: '00',
    minutes: '00',
    seconds: '00',
    isExpired: false,
  });

  useEffect(() => {
    if (!endsAt) {
      setTimeLeft({
        formattedTime: '00:00:00',
        hours: '00',
        minutes: '00',
        seconds: '00',
        isExpired: true,
      });
      return;
    }

    const targetTime = new Date(endsAt).getTime();

    const calculate = () => {
      const diff = targetTime - Date.now();

      if (diff <= 0) {
        setTimeLeft({
          formattedTime: '00:00:00',
          hours: '00',
          minutes: '00',
          seconds: '00',
          isExpired: true,
        });
        return;
      }

      const totalSec = Math.floor(diff / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;

      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      const ss = String(s).padStart(2, '0');

      setTimeLeft({
        formattedTime: `${hh}:${mm}:${ss}`,
        hours: hh,
        minutes: mm,
        seconds: ss,
        isExpired: false,
      });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  return timeLeft;
}
