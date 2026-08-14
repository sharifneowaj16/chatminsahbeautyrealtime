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
    <aside className="sticky top-6 overflow-hidden rounded-2xl border border-minsah-accent bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-minsah-accent bg-minsah-light px-4 py-3">
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-minsah-primary" />
          <div>
            <h2 className="text-sm font-bold text-minsah-dark">Live structure preview</h2>
            <p className="text-xs text-minsah-secondary">Unsaved changes are shown here.</p>
          </div>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-xs font-bold text-minsah-primary hover:bg-minsah-accent/40"
        >
          Public site
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="max-h-[calc(100vh-8rem)] space-y-3 overflow-y-auto p-4">
        <section
          className={`rounded-xl border p-4 ${hero.isVisible ? 'border-minsah-accent bg-minsah-light' : 'border-gray-200 bg-gray-50 opacity-60'}`}
          aria-label="Hero preview"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wide text-minsah-primary">Hero</span>
            {hero.isVisible ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4 text-gray-500" />}
          </div>
          <p className="text-xs font-semibold text-minsah-secondary">{hero.eyebrow || 'No eyebrow'}</p>
          <h3 className="mt-1 text-lg font-bold leading-tight text-minsah-dark">{hero.title || 'Untitled hero'}</h3>
          <p className="mt-2 line-clamp-3 text-xs leading-5 text-minsah-secondary">{hero.subtitle || 'No subtitle'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-minsah-primary px-3 py-1 text-xs font-bold text-white">
              {hero.primaryCtaText || 'Primary CTA'}
            </span>
            <span className="rounded-full border border-minsah-primary px-3 py-1 text-xs font-bold text-minsah-primary">
              {hero.secondaryCtaText || 'Secondary CTA'}
            </span>
          </div>
        </section>

        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-bold uppercase tracking-wide text-minsah-secondary">Section order</p>
          <span className="text-xs text-minsah-secondary">{visibleCount}/{orderedSections.length} visible</span>
        </div>

        {orderedSections.map((section, index) => (
          <section
            key={section.id}
            className={`rounded-xl border p-3 ${section.isVisible ? 'border-minsah-accent bg-white' : 'border-gray-200 bg-gray-50 opacity-55'}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-minsah-accent/60 text-xs font-black text-minsah-primary">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="truncate text-sm font-bold text-minsah-dark">{section.title || 'Untitled section'}</h3>
                    <p className="mt-0.5 truncate text-xs text-minsah-secondary">{section.subtitle || section.type}</p>
                  </div>
                  {section.isVisible ? <Eye className="h-4 w-4 shrink-0 text-emerald-600" /> : <EyeOff className="h-4 w-4 shrink-0 text-gray-500" />}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-minsah-secondary">
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
