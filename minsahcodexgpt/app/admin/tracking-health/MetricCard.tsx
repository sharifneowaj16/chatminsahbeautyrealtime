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
    neutral: 'border-[#2A2A32] bg-[#1E1E24]',
    good: 'border-emerald-800/40 bg-emerald-950/70',
    warn: 'border-amber-800/40 bg-amber-950/70',
    bad: 'border-red-800/40 bg-red-950/70',
  }[tone];

  const valueClass = {
    neutral: 'text-[#F5F3F0]',
    good: 'text-emerald-400',
    warn: 'text-amber-400',
    bad: 'text-red-400',
  }[tone];

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-sm font-medium text-[#9A9691]">{title}</p>
      <p className={`mt-2 text-2xl font-bold ${valueClass}`}>{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-[#6B6864]">{subtitle}</p> : null}
    </div>
  );
}
