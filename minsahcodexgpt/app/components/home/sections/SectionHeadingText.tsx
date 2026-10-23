'use client';

interface SectionHeadingTextProps {
  title: string;
  className?: string;
}

export default function SectionHeadingText({
  title,
  className = '',
}: SectionHeadingTextProps) {
  return (
    <h2
      className={`text-xl sm:text-2xl lg:text-[28px] font-extrabold tracking-tight text-[#1c3a13] leading-snug truncate ${className}`}
    >
      {title}
    </h2>
  );
}
