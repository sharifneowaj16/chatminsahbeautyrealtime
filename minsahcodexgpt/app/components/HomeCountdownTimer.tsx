'use client';

import { useEffect, useState } from 'react';

export default function HomeCountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 7, minutes: 33, seconds: 28 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm text-minsah-secondary">Ends in:</span>
      <div className="flex gap-1">
        {[timeLeft.days, timeLeft.hours, timeLeft.minutes, timeLeft.seconds].map((value, index) => (
          <span key={index} className="flex items-center gap-1">
            <div className="bg-minsah-primary text-white px-2 py-1 rounded text-xs font-bold w-8 text-center tabular-nums">
              {String(value).padStart(2, '0')}
            </div>
            {index < 3 && <span className="text-minsah-dark">:</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
