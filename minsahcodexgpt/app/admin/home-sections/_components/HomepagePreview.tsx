'use client';

import { Eye, EyeOff, ExternalLink, LayoutGrid, Monitor } from 'lucide-react';
import type { HomeHeroConfig, HomeSection } from '@/types/admin';

type HomepagePreviewProps = {
  hero: HomeHeroConfig;
  sections: HomeSection[];
};

function sectionLabel(section: HomeSection) {
  const count = section.settings.itemsToShow ?? 0;
  const layout = section.settings.layout ?? 'default';
  return count > 0 ? `${count} items · ${layout}` : layout;
}

export default function HomepagePreview({ hero, sections }: HomepagePreviewProps) {
  const orderedSections = [...sections].sort((a, b) => a.order - b.order);
  const visibleCount = orderedSections.filter((section) => section.isVisible).length;

  return (
    <aside className="sticky top-6 overflow-hidden rounded-2xl border border-[#232636] bg-[#161824] shadow-sm">
      <div className="flex items-center justify-between border-b border-[#232636] bg-[#0b0c10] px-4 py-3">
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-[#5e6ad2]" />
          <div>
            <h2 className="text-sm font-bold text-[#f7f8f8]">Live structure preview</h2>
            <p className="text-xs text-[#8a8f98]">Unsaved changes are shown here.</p>
          </div>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-8 items-center gap-1 rounded-lg px-3 text-xs font-medium text-[#5e6ad2] hover:bg-[#5e6ad2]/10 transition-colors"
        >
          Public site
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="max-h-[calc(100vh-8rem)] space-y-3 overflow-y-auto p-4">
        <section
          className={`rounded-xl border p-4 ${hero.isVisible ? 'border-[#232636] bg-[#0b0c10]' : 'border-[#232636] bg-[#10121b] opacity-60'}`}
          aria-label="Hero preview"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wide text-[#5e6ad2]">Hero</span>
            {hero.isVisible ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4 text-[#8a8f98]" />}
          </div>
          <p className="text-xs font-semibold text-[#8a8f98]">{hero.eyebrow || 'No eyebrow'}</p>
          <h3 className="mt-1 text-lg font-bold leading-tight text-[#f7f8f8]">{hero.title || 'Untitled hero'}</h3>
          <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#8a8f98]">{hero.subtitle || 'No subtitle'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#5e6ad2] px-3 py-1 text-xs font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
              {hero.primaryCtaText || 'Primary CTA'}
            </span>
            <span className="rounded-full border border-[#5e6ad2]/40 bg-[#5e6ad2]/10 px-3 py-1 text-xs font-medium text-[#5e6ad2]">
              {hero.secondaryCtaText || 'Secondary CTA'}
            </span>
          </div>
        </section>

        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-bold uppercase tracking-wide text-[#8a8f98]">Section order</p>
          <span className="text-xs text-[#8a8f98]">{visibleCount}/{orderedSections.length} visible</span>
        </div>

        {orderedSections.map((section, index) => (
          <section
            key={section.id}
            className={`rounded-xl border p-3 ${section.isVisible ? 'border-[#232636] bg-[#161824]' : 'border-[#232636] bg-[#10121b] opacity-55'}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5e6ad2]/15 text-xs font-bold text-[#5e6ad2]">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="truncate text-sm font-bold text-[#f7f8f8]">{section.title || 'Untitled section'}</h3>
                    <p className="mt-0.5 truncate text-xs text-[#8a8f98]">{section.subtitle || section.type}</p>
                  </div>
                  {section.isVisible ? <Eye className="h-4 w-4 shrink-0 text-emerald-600" /> : <EyeOff className="h-4 w-4 shrink-0 text-[#8a8f98]" />}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-[#8a8f98]">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>{sectionLabel(section)}</span>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
