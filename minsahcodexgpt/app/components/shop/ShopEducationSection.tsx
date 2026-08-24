import { FlaskConical, ShieldCheck, Sparkles } from 'lucide-react';

const pillars = [
  {
    icon: FlaskConical,
    tag: 'FORMULATION STANDARD',
    title: 'Active Botanicals & Centella',
    description:
      'Every formula is selected for biocompatibility and barrier support. Featuring clinically backed concentrations of Centella Asiatica, Niacinamide, and botanical antioxidants.',
  },
  {
    icon: ShieldCheck,
    tag: 'AUTHENTICITY GUARANTEE',
    title: 'Direct Lab & Brand Sourcing',
    description:
      '100% genuine products sourced directly from authorized manufacturers and global laboratories with strict temperature-controlled storage and batch verification.',
  },
  {
    icon: Sparkles,
    tag: 'TARGETED RITUALS',
    title: 'Curated Regimens for Your Skin',
    description:
      'Streamlined morning and evening routines designed to calm redness, boost collagen synthesis, and reinforce moisture barrier resilience across diverse climate conditions.',
  },
];

export default function ShopEducationSection() {
  return (
    <section
      className="mt-16 rounded-xl border border-stone-200 bg-white p-6 sm:p-8 lg:p-10 shadow-xs"
      aria-labelledby="shop-education-heading"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-minsah-primary">
          THE MINSAH STANDARD
        </p>
        <h2
          id="shop-education-heading"
          className="mt-2 text-2xl font-bold tracking-tight text-minsah-dark sm:text-3xl"
        >
          Clinical Precision. Botanical Purity.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-minsah-secondary">
          We curate verified high-performance skincare to deliver visible skin health without compromise.
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <div
              key={pillar.tag}
              className="flex flex-col rounded-lg border border-stone-200/70 bg-minsah-surface-subtle p-5 transition-all duration-200 hover:border-stone-300"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-stone-200/80 text-minsah-primary shadow-xs">
                <Icon size={18} aria-hidden="true" />
              </div>
              <span className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                {pillar.tag}
              </span>
              <h3 className="mt-1 text-base font-bold text-minsah-dark">
                {pillar.title}
              </h3>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-minsah-secondary">
                {pillar.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
