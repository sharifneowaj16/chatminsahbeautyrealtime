'use client';

interface CountdownDigitBoxProps {
  value: number;
  label: string;
  className?: string;
}

export default function CountdownDigitBox({
  value,
  label,
  className = '',
}: CountdownDigitBoxProps) {
  const formatted = String(value).padStart(2, '0');

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl bg-[#1c3a13] px-2.5 py-1.5 sm:px-3 sm:py-2 min-w-[48px] sm:min-w-[54px] shadow-sm border border-[#1c3a13]/20 ${className}`}
    >
      <span className="font-mono text-base sm:text-lg font-black tracking-tight text-[#D4F6A2] tabular-nums leading-none">
        {formatted}
      </span>
      <span className="mt-1 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-stone-200/90 leading-none select-none">
        {label}
      </span>
    </div>
  );
}
