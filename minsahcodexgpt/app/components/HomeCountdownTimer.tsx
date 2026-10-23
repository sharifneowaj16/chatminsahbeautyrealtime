'use client';

import { useEffect, useMemo, useState } from 'react';
import CountdownTimerGroup from './home/sections/CountdownTimerGroup';

interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

export interface HomeCountdownTimerProps {
  endsAt?: string | Date | null;
  label?: string;
  expiredLabel?: string;
  className?: string;
}

function getTargetTime(endsAt?: string | Date | null) {
  if (!endsAt) return null;
  const time = endsAt instanceof Date ? endsAt.getTime() : new Date(endsAt).getTime();
  return Number.isFinite(time) ? time : null;
}

function getTimeLeft(targetTime: number | null): CountdownParts {
  if (!targetTime) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const diff = targetTime - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, expired: false };
}

export default function HomeCountdownTimer({
  endsAt,
  label = 'Ends in:',
  expiredLabel = 'Offer ended',
  className = '',
}: HomeCountdownTimerProps) {
  const targetTime = useMemo(() => getTargetTime(endsAt), [endsAt]);
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(targetTime));

  useEffect(() => {
    setTimeLeft(getTimeLeft(targetTime));

    if (!targetTime) return undefined;

    const timer = window.setInterval(() => {
      setTimeLeft(getTimeLeft(targetTime));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [targetTime]);

  if (timeLeft.expired) {
    return (
      <div
        className={`inline-flex items-center rounded-full bg-stone-100 border border-stone-200 px-3.5 py-1 text-xs font-bold text-stone-600 shadow-2xs ${className}`}
      >
        {expiredLabel}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2.5 sm:gap-3 ${className}`}>
      {label && (
        <span className="text-xs sm:text-sm font-bold text-[#1c3a13] tracking-tight">
          {label}
        </span>
      )}
      <CountdownTimerGroup
        days={timeLeft.days}
        hours={timeLeft.hours}
        minutes={timeLeft.minutes}
        seconds={timeLeft.seconds}
      />
    </div>
  );
}
