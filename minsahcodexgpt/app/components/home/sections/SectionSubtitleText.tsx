'use client';

interface SectionSubtitleTextProps {
  subtitle?: string | null;
  className?: string;
}

export default function SectionSubtitleText({
  subtitle,
  className = '',
}: SectionSubtitleTextProps) {
  if (!subtitle) return null;

  return (
    <p
      className={`mt-1 text-xs sm:text-sm font-normal text-stone-500 tracking-normal line-clamp-1 sm:line-clamp-none ${className}`}
    >
      {subtitle}
    </p>
  );
}
