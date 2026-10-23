'use client';

interface CountdownSeparatorProps {
  className?: string;
}

export default function CountdownSeparator({ className = '' }: CountdownSeparatorProps) {
  return (
    <span
      className={`font-mono text-base sm:text-lg font-bold text-[#1c3a13]/70 select-none pb-3 sm:pb-3.5 ${className}`}
      aria-hidden="true"
    >
      :
    </span>
  );
}
