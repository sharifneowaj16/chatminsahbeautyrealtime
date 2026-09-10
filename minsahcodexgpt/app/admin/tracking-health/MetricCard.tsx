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
    neutral: 'border-[#232636] bg-[#161824]',
    good: 'border-white/[0.15] bg-white/[0.08]',
    warn: 'border-white/[0.10] bg-white/[0.06]',
    bad: 'border-[#232636] bg-white/[0.04]',
  }[tone];

  const valueClass = {
    neutral: 'text-[#F7F8F8]',
    good: 'text-white',
    warn: 'text-white/80',
    bad: 'text-white/60',
  }[tone];

  return (
    <div className={`linear-card rounded-xl border p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10)] hover:border-white/[0.15] transition-all duration-150 ${toneClass}`}>
      <p className="text-xs font-medium text-white/50 tracking-tight">{title}</p>
      <p className={`mt-1.5 text-xl font-bold tracking-tight ${valueClass}`}>{value}</p>
      {subtitle ? <p className="mt-1 text-[11px] text-white/40">{subtitle}</p> : null}
    </div>
  );
}
