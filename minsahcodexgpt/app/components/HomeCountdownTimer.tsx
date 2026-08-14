'use client';

import { useEffect, useMemo, useState } from 'react';

interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

interface HomeCountdownTimerProps {
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
      <div className={`mb-4 inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-minsah-secondary shadow-sm ${className}`}>
        {expiredLabel}
      </div>
    );
  }

  const values = [timeLeft.days, timeLeft.hours, timeLeft.minutes, timeLeft.seconds];
  const labels = ['Days', 'Hours', 'Minutes', 'Seconds'];

  return (
    <div className={`mb-4 flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-sm font-semibold text-minsah-secondary">{label}</span>
      <div className="flex gap-1.5" aria-label={`Offer ends in ${timeLeft.days} days, ${timeLeft.hours} hours, ${timeLeft.minutes} minutes and ${timeLeft.seconds} seconds`}>
        {values.map((value, index) => (
          <span key={labels[index]} className="flex items-center gap-1">
            <span className="flex min-w-14 flex-col items-center rounded-xl bg-minsah-primary px-2 py-2 text-white shadow-sm">
              <span className="text-xs font-extrabold leading-none tabular-nums">
                {String(value).padStart(2, '0')}
              </span>
              <span className="mt-1 text-xs font-bold leading-none opacity-90">
                {labels[index]}
              </span>
            </span>
            {index < values.length - 1 && <span className="text-minsah-dark">:</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
