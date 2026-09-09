export function MetricCard({
  title,
  value,
  subtitle,
  tone = 'neutral',
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
}) {
  const toneClass = {
    neutral: 'border-white/[0.08] bg-[#151516]',
    good: 'border-white/[0.15] bg-white/[0.08]',
    warn: 'border-white/[0.10] bg-white/[0.06]',
    bad: 'border-white/[0.08] bg-white/[0.04]',
  }[tone];

  const valueClass = {
    neutral: 'text-[#F7F8F8]',
    good: 'text-white',
    warn: 'text-white/80',
    bad: 'text-white/60',
  }[tone];

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-sm font-medium text-[#8A8F98]">{title}</p>
      <p className={`mt-2 text-2xl font-bold ${valueClass}`}>{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-[#62666D]">{subtitle}</p> : null}
    </div>
  );
}
