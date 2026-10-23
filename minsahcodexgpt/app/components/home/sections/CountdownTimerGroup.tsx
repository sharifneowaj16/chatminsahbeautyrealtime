'use client';

import CountdownDigitBox from './CountdownDigitBox';
import CountdownSeparator from './CountdownSeparator';

interface CountdownTimerGroupProps {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  className?: string;
}

export default function CountdownTimerGroup({
  days,
  hours,
  minutes,
  seconds,
  className = '',
}: CountdownTimerGroupProps) {
  const showDays = days > 0;

  return (
    <div
      className={`inline-flex items-center gap-1 sm:gap-1.5 ${className}`}
      aria-label={`Time remaining: ${days} days, ${hours} hours, ${minutes} minutes, and ${seconds} seconds`}
    >
      {showDays && (
        <>
          <CountdownDigitBox value={days} label="Days" />
          <CountdownSeparator />
        </>
      )}
      <CountdownDigitBox value={hours} label="Hours" />
      <CountdownSeparator />
      <CountdownDigitBox value={minutes} label="Mins" />
      <CountdownSeparator />
      <CountdownDigitBox value={seconds} label="Secs" />
    </div>
  );
}
