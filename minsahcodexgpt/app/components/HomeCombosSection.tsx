import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

const comboSlides = [
  {
    title: 'Best Value Combos',
    description: 'Save More with Our Curated Sets',
    gradient: 'from-minsah-primary via-minsah-secondary to-minsah-dark',
  },
  {
    title: 'Premium Combo Deals',
    description: 'Luxury Beauty at Great Prices',
    gradient: 'from-purple-600 via-pink-500 to-orange-400',
  },
  {
    title: 'Complete Care Sets',
    description: 'Everything You Need in One Box',
    gradient: 'from-blue-500 via-teal-400 to-green-400',
  },
];

const currentComboSlide = 0;

export default function HomeCombosSection() {
  const activeSlide = comboSlides[currentComboSlide];

  return (
    <section className="px-4 py-6 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-minsah-dark">Browse by Combos</h2>
        <Link href="/combos" aria-label="View all combos" className="text-sm text-minsah-primary font-semibold flex items-center gap-1">
          View all <ChevronRight size={16} />
        </Link>
      </div>

      <div className="relative" style={{ minHeight: '248px' }}>
        <Link href="/combos" className="block">
          <div
            className={`bg-gradient-to-br ${activeSlide.gradient} rounded-3xl p-6 h-[200px] flex items-center justify-between overflow-hidden`}
            style={{ transition: 'background 0.5s ease' }}
          >
            <div className="text-white z-10 flex min-h-[92px] flex-1 flex-col justify-center">
              <h3 className="text-2xl font-bold mb-2">{activeSlide.title}</h3>
              <p className="min-h-[20px] text-sm opacity-90">{activeSlide.description}</p>
            </div>
            <div className="relative h-20 w-20 flex-shrink-0 opacity-25" aria-hidden="true">
              <div className="absolute inset-2 rounded-2xl border-4 border-white/70" />
              <div className="absolute left-1/2 top-1 h-[72px] w-3 -translate-x-1/2 rounded-full bg-white/70" />
              <div className="absolute left-1 top-1/2 h-3 w-[72px] -translate-y-1/2 rounded-full bg-white/70" />
              <div className="absolute left-5 top-0 h-5 w-7 -rotate-12 rounded-full border-4 border-white/70" />
              <div className="absolute right-5 top-0 h-5 w-7 rotate-12 rounded-full border-4 border-white/70" />
            </div>
          </div>
        </Link>

        <div className="flex justify-center gap-1.5 mt-3">
          {comboSlides.map((_, index) => (
            <div key={index} className="h-1.5 w-6 overflow-hidden rounded-full">
              <span
                className="block h-full w-full origin-center rounded-full bg-minsah-primary transition-[opacity,transform] duration-300 ease-out"
                style={{
                  opacity: currentComboSlide === index ? 1 : 0.4,
                  transform: currentComboSlide === index ? 'scaleX(1)' : 'scaleX(0.25)',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link href="/combos" className="bg-minsah-accent rounded-xl p-4 flex items-center gap-3">
          <div className="text-3xl">💄</div>
          <div>
            <h4 className="font-semibold text-sm text-minsah-dark">Makeup Combos</h4>
            <p className="text-xs font-medium text-minsah-dark/80">From Tk 1001</p>
          </div>
        </Link>
        <Link href="/combos" className="bg-minsah-accent rounded-xl p-4 flex items-center gap-3">
          <div className="text-3xl">✨</div>
          <div>
            <h4 className="font-semibold text-sm text-minsah-dark">Skincare Sets</h4>
            <p className="text-xs font-medium text-minsah-dark/80">From Tk 1001</p>
          </div>
        </Link>
      </div>
    </section>
  );
}
