'use client';

import { DESIGN_TOKEN_VALUES } from '@/lib/design-tokens';





import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, CheckCircle2, Eye, EyeOff, GripVertical, Loader2, Save,
  ChevronDown, ChevronUp, Settings
} from 'lucide-react';
import { defaultHomeHeroConfig, defaultHomeSections } from '@/lib/homeData';
import { HomeHeroConfig, HomeSection, SectionType } from '@/types/admin';
import HomepagePreview from './_components/HomepagePreview';

export default function HomeSectionsPage() {
  const [sections, setSections] = useState<HomeSection[]>(defaultHomeSections);
  const [heroConfig, setHeroConfig] = useState<HomeHeroConfig>(defaultHomeHeroConfig);
  const [showSettings, setShowSettings] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<Array<{ message: string; values?: string[] }>>([]);

  const markDirty = () => {
    setHasUnsavedChanges(true);
    setSaveMessage(null);
    setValidationIssues([]);
  };

  // Toggle section visibility
  const toggleVisibility = (id: string) => {
    setSections((current) => current.map((section) =>
      section.id === id ? { ...section, isVisible: !section.isVisible } : section
    ));
    markDirty();
  };

  // Move section up/down
  const moveSection = (id: string, direction: 'up' | 'down') => {
    const index = sections.findIndex((section) => section.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sections.length - 1)
    ) {
      return;
    }

    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];

    // Update order numbers
    newSections.forEach((section, i) => {
      section.order = i + 1;
    });

    setSections(newSections);
    markDirty();
  };

  // Update section settings
  const updateSectionSettings = (id: string, settings: Partial<HomeSection['settings']>) => {
    setSections((current) => current.map((section) =>
      section.id === id
        ? { ...section, settings: { ...section.settings, ...settings } }
        : section
    ));
    markDirty();
  };

  // Update section title
  const updateSectionTitle = (id: string, title: string) => {
    setSections((current) => current.map((section) =>
      section.id === id ? { ...section, title } : section
    ));
    markDirty();
  };

  const updateSectionSubtitle = (id: string, subtitle: string) => {
    setSections((current) => current.map((section) =>
      section.id === id ? { ...section, subtitle } : section
    ));
    markDirty();
  };

  const csvToArray = (value: string) =>
    value.split(',').map(item => item.trim()).filter(Boolean);

  const arrayToCsv = (value?: string[]) => (value || []).join(', ');

  const getSelectionLabel = (type: SectionType) => {
    if (type === 'categories') return 'Selected category IDs/slugs';
    if (type === 'brands') return 'Selected brand IDs/slugs';
    if (['flash-sale', 'new-arrivals', 'for-you', 'recommendations', 'favourites'].includes(type)) {
      return 'Selected product IDs/slugs';
    }
    return 'Selected item IDs/slugs';
  };

  // Save both homepage configuration records atomically.
  const saveChanges = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    setValidationIssues([]);

    try {
      const response = await fetch('/api/admin/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: [
            { key: 'homeSections', value: sections },
            { key: 'homeHero', value: heroConfig },
          ],
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setValidationIssues(Array.isArray(data.issues) ? data.issues : []);
        throw new Error(data.error || 'Failed to save homepage configuration.');
      }

      const savedSections = data.configs?.find((entry: { key?: string }) => entry.key === 'homeSections')?.value;
      const savedHero = data.configs?.find((entry: { key?: string }) => entry.key === 'homeHero')?.value;
      if (Array.isArray(savedSections)) setSections(savedSections);
      if (savedHero) setHeroConfig({ ...defaultHomeHeroConfig, ...savedHero });

      setHasUnsavedChanges(false);
      setSaveMessage('Homepage configuration saved successfully.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Failed to save homepage configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  // Load normalized values from the same API contract used for saves.
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch('/api/admin/site-config?key=homeSections').then((response) => response.json()),
      fetch('/api/admin/site-config?key=homeHero').then((response) => response.json()),
    ])
      .then(([sectionsData, heroData]) => {
        if (cancelled) return;
        if (Array.isArray(sectionsData.value)) setSections(sectionsData.value);
        if (heroData.value) setHeroConfig({ ...defaultHomeHeroConfig, ...heroData.value });
        setHasUnsavedChanges(false);
      })
      .catch(() => {
        if (!cancelled) setSaveMessage('Saved homepage configuration could not be loaded. Defaults are shown.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [hasUnsavedChanges]);

  const getSectionIcon = (type: SectionType) => {
    const icons: Record<SectionType, string> = {
      'categories': 'CAT',
      'promotion': 'PROMO',
      'combos': 'COMBO',
      'flash-sale': 'FLASH',
      'new-arrivals': 'NEW',
      'for-you': 'YOU',
      'recommendations': 'REC',
      'favourites': 'FAV',
      'brands': 'BRAND',
    };
    return icons[type];
  };

  return (
    <div className="p-6 space-y-6">
      {isLoading ? <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800"><Loader2 className="h-4 w-4 animate-spin" /> Loading saved homepage configuration…</div> : null}
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-[#F5F3F0]">Home Page Sections</h1>
            <p className="text-[#9A9691] mt-1 text-sm">Manage all sections displayed on the homepage</p>
          </div>
          <Button
            onClick={saveChanges}
            disabled={isSaving || isLoading || !hasUnsavedChanges}
            className="flex min-h-11 items-center gap-2 rounded-lg bg-[#D07A60] px-4 py-2 text-white font-medium transition hover:bg-[#E08D70] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {isSaving ? 'Saving…' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
          </Button>
        </div>

        {/* Hero Builder */}
        <div className="rounded-xl border border-[#2A2A32] bg-[#1E1E24] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#F5F3F0]">Hero / Banner Builder</h2>
              <p className="text-sm text-[#9A9691]">Control homepage hero copy, image, and CTA links.</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[#9A9691]">
              <Input
                type="checkbox"
                checked={heroConfig.isVisible}
                onChange={(e) => { setHeroConfig({ ...heroConfig, isVisible: e.target.checked }); markDirty(); }}
                className="h-4 w-4 rounded border-[#2A2A32] bg-[#14141A] text-[#D07A60] focus:ring-[#D07A60]"
              />
              Show hero
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#9A9691]">Eyebrow</label>
              <Input
                value={heroConfig.eyebrow}
                onChange={(e) => { setHeroConfig({ ...heroConfig, eyebrow: e.target.value }); markDirty(); }}
                className="w-full rounded-lg border border-[#2A2A32] bg-[#14141A] text-[#F5F3F0] px-3 py-2 focus:border-[#D07A60] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#9A9691]">Featured image URL</label>
              <Input
                value={heroConfig.imageUrl || ''}
                onChange={(e) => { setHeroConfig({ ...heroConfig, imageUrl: e.target.value }); markDirty(); }}
                className="w-full rounded-lg border border-[#2A2A32] bg-[#14141A] text-[#F5F3F0] px-3 py-2 focus:border-[#D07A60] focus:outline-none"
                placeholder="/uploads/hero.jpg or https://..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[#9A9691]">Hero title</label>
              <Input
                value={heroConfig.title}
                onChange={(e) => { setHeroConfig({ ...heroConfig, title: e.target.value }); markDirty(); }}
                className="w-full rounded-lg border border-minsah-accent px-3 py-2 text-lg font-semibold focus:border-minsah-primary focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[#9A9691]">Subtitle</label>
              <Textarea
                value={heroConfig.subtitle}
                onChange={(e) => { setHeroConfig({ ...heroConfig, subtitle: e.target.value }); markDirty(); }}
                rows={2}
                className="w-full rounded-lg border border-[#2A2A32] bg-[#14141A] text-[#F5F3F0] px-3 py-2 focus:border-[#D07A60] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#9A9691]">Primary CTA text</label>
              <Input
                value={heroConfig.primaryCtaText}
                onChange={(e) => { setHeroConfig({ ...heroConfig, primaryCtaText: e.target.value }); markDirty(); }}
                className="w-full rounded-lg border border-[#2A2A32] bg-[#14141A] text-[#F5F3F0] px-3 py-2 focus:border-[#D07A60] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#9A9691]">Primary CTA link</label>
              <Input
                value={heroConfig.primaryCtaHref}
                onChange={(e) => { setHeroConfig({ ...heroConfig, primaryCtaHref: e.target.value }); markDirty(); }}
                className="w-full rounded-lg border border-[#2A2A32] bg-[#14141A] text-[#F5F3F0] px-3 py-2 focus:border-[#D07A60] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#9A9691]">Secondary CTA text</label>
              <Input
                value={heroConfig.secondaryCtaText}
                onChange={(e) => { setHeroConfig({ ...heroConfig, secondaryCtaText: e.target.value }); markDirty(); }}
                className="w-full rounded-lg border border-[#2A2A32] bg-[#14141A] text-[#F5F3F0] px-3 py-2 focus:border-[#D07A60] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#9A9691]">Secondary CTA link</label>
              <Input
                value={heroConfig.secondaryCtaHref}
                onChange={(e) => { setHeroConfig({ ...heroConfig, secondaryCtaHref: e.target.value }); markDirty(); }}
                className="w-full rounded-lg border border-[#2A2A32] bg-[#14141A] text-[#F5F3F0] px-3 py-2 focus:border-[#D07A60] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {saveMessage ? (
          <div
            role={validationIssues.length ? 'alert' : 'status'}
            className={`mt-4 flex items-start gap-3 rounded-xl border p-4 text-sm ${
              validationIssues.length || saveMessage.toLowerCase().includes('failed') || saveMessage.toLowerCase().includes('could not')
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {validationIssues.length ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />}
            <div>
              <p className="font-semibold">{saveMessage}</p>
              {validationIssues.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {validationIssues.map((issue, index) => (
                    <li key={`${issue.message}-${index}`}>
                      {issue.message}
                      {issue.values?.length ? `: ${issue.values.join(', ')}` : ''}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-6">
          <HomepagePreview hero={heroConfig} sections={sections} />
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="bg-[#1E1E24] p-4 rounded-xl border border-[#2A2A32] shadow-sm">
            <div className="text-2xl font-bold text-[#D07A60]">{sections.length}</div>
            <div className="text-sm text-[#9A9691]">Total Sections</div>
          </div>
          <div className="bg-[#1E1E24] p-4 rounded-xl border border-[#2A2A32] shadow-sm">
            <div className="text-2xl font-bold text-green-600">{sections.filter(s => s.isVisible).length}</div>
            <div className="text-sm text-[#9A9691]">Visible</div>
          </div>
          <div className="bg-[#1E1E24] p-4 rounded-xl border border-[#2A2A32] shadow-sm">
            <div className="text-2xl font-bold text-gray-600">{sections.filter(s => !s.isVisible).length}</div>
            <div className="text-sm text-[#9A9691]">Hidden</div>
          </div>
          <div className="bg-[#1E1E24] p-4 rounded-xl border border-[#2A2A32] shadow-sm">
            <div className="text-2xl font-bold text-blue-600">
              {sections.reduce((sum, s) => sum + (s.settings.itemsToShow || 0), 0)}
            </div>
            <div className="text-sm text-[#9A9691]">Total Items</div>
          </div>
        </div>
      </div>

      {/* Management Links */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Link href="/admin/home-sections/categories" className="bg-[#1E1E24] p-4 rounded-xl border border-[#2A2A32] hover:border-[#D07A60] transition text-center shadow-sm"
        >
          <div className="text-sm font-bold mb-2 text-[#D07A60]">CAT</div>
          <div className="font-semibold text-[#F5F3F0] text-sm">Categories</div>
        </Link>
        <Link href="/admin/home-sections/products" className="bg-[#1E1E24] p-4 rounded-xl border border-[#2A2A32] hover:border-[#D07A60] transition text-center shadow-sm"
        >
          <div className="text-sm font-bold mb-2 text-[#D07A60]">PROD</div>
          <div className="font-semibold text-[#F5F3F0] text-sm">Products</div>
        </Link>
        <Link href="/admin/home-sections/combos" className="bg-[#1E1E24] p-4 rounded-xl border border-[#2A2A32] hover:border-[#D07A60] transition text-center shadow-sm"
        >
          <div className="text-sm font-bold mb-2 text-[#D07A60]">COMBO</div>
          <div className="font-semibold text-[#F5F3F0] text-sm">Combos</div>
        </Link>
        <Link href="/admin/home-sections/brands" className="bg-[#1E1E24] p-4 rounded-xl border border-[#2A2A32] hover:border-[#D07A60] transition text-center shadow-sm"
        >
          <div className="text-sm font-bold mb-2 text-[#D07A60]">BRAND</div>
          <div className="font-semibold text-[#F5F3F0] text-sm">Brands</div>
        </Link>
        <Link href="/admin/home-sections/slides" className="bg-[#1E1E24] p-4 rounded-xl border border-[#2A2A32] hover:border-[#D07A60] transition text-center shadow-sm"
        >
          <div className="text-sm font-bold mb-2 text-[#D07A60]">SLIDE</div>
          <div className="font-semibold text-[#F5F3F0] text-sm">Slides</div>
        </Link>
      </div>

      {/* Sections List */}
      <div className="bg-[#1E1E24] rounded-xl border border-[#2A2A32] shadow-sm overflow-hidden">
        <div className="bg-[#14141A] text-[#9A9691] px-6 py-4 flex items-center gap-4 text-sm font-semibold border-b border-[#2A2A32]">
          <GripVertical size={20} />
          <span className="flex-1 font-semibold">Section</span>
          <span className="w-24 text-center font-semibold">Visibility</span>
          <span className="w-32 text-center font-semibold">Layout</span>
          <span className="w-24 text-center font-semibold">Items</span>
          <span className="w-36 text-center font-semibold">Actions</span>
        </div>

        <div className="divide-y divide-[#2A2A32]">
          {sections.map((section, index) => (
            <div
              key={section.id}
              className={`relative px-6 py-4 flex items-center gap-4 transition ${
                !section.isVisible ? 'bg-[#14141A]/50 opacity-60' : 'hover:bg-[#26262E]/50'
              }`}
            >
              {/* Drag Handle & Icon */}
              <div className="flex items-center gap-3">
                <GripVertical size={20} className="text-[#9A9691] cursor-move" />
                <span className="text-xs font-bold px-2 py-1 bg-[#14141A] border border-[#2A2A32] rounded text-[#D07A60]">{getSectionIcon(section.type)}</span>
              </div>

              {/* Section Info */}
              <div className="flex-1">
                <Input
                  type="text"
                  value={section.title}
                  onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                  className="font-semibold text-[#F5F3F0] bg-transparent border-b border-transparent hover:border-[#D07A60] focus:border-[#D07A60] focus:outline-none transition w-full"
                />
                <Input
                  type="text"
                  value={section.subtitle || ''}
                  onChange={(e) => updateSectionSubtitle(section.id, e.target.value)}
                  placeholder="Optional subtitle"
                  className="mt-1 w-full bg-transparent text-xs text-[#9A9691] border-b border-transparent hover:border-[#D07A60] focus:border-[#D07A60] focus:outline-none transition"
                />
                <div className="text-xs text-[#9A9691] mt-1">
                  Type: {section.type} | Order: #{section.order}
                </div>
              </div>

              {/* Visibility Toggle */}
              <div className="w-24 flex justify-center">
                <Button
                  onClick={() => toggleVisibility(section.id)}
                  aria-label={`${section.isVisible ? 'Hide' : 'Show'} ${section.title}`}
                  className={`p-2 rounded-lg transition ${
                    section.isVisible
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {section.isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                </Button>
              </div>

              {/* Layout */}
              <div className="w-32 text-center">
                <Select
                  value={section.settings.layout}
                  onChange={(e) => updateSectionSettings(section.id, { layout: e.target.value as HomeSection['settings']['layout'] })}
                  className="px-2 py-1 text-sm border border-minsah-accent rounded focus:outline-none focus:border-minsah-primary"
                >
                  <option value="grid-2">Grid 2</option>
                  <option value="grid-3">Grid 3</option>
                  <option value="grid-4">Grid 4</option>
                  <option value="horizontal-scroll">Scroll</option>
                </Select>
              </div>

              {/* Items Count */}
              <div className="w-24 text-center">
                <Input
                  type="number"
                  value={section.settings.itemsToShow}
                  onChange={(e) => updateSectionSettings(section.id, { itemsToShow: Number(e.target.value) || 1 })}
                  className="w-16 px-2 py-1 text-center border border-minsah-accent rounded focus:outline-none focus:border-minsah-primary"
                  min="1"
                  max="24"
                />
              </div>

              {/* Actions */}
              <div className="w-36 flex items-center justify-center gap-2">
                <Button
                  onClick={() => moveSection(section.id, 'up')}
                  aria-label={`Move ${section.title} up`}
                  disabled={index === 0}
                  className="p-2 rounded hover:bg-minsah-accent disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronUp size={18} />
                </Button>
                <Button
                  onClick={() => moveSection(section.id, 'down')}
                  aria-label={`Move ${section.title} down`}
                  disabled={index === sections.length - 1}
                  className="p-2 rounded hover:bg-minsah-accent disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronDown size={18} />
                </Button>
                <Button
                  onClick={() => setShowSettings(showSettings === section.id ? null : section.id)}
                  aria-label={`Edit advanced settings for ${section.title}`}
                  className="p-2 rounded hover:bg-blue-100 text-blue-600 transition"
                >
                  <Settings size={18} />
                </Button>
              </div>

              {/* Advanced Settings Panel */}
              {showSettings === section.id && (
                <div className="absolute right-6 mt-2 w-96 bg-[#1E1E24] border border-[#3E3E48] rounded-xl shadow-2xl p-4 z-20">
                  <h4 className="font-bold text-[#F5F3F0] mb-3">Advanced Settings</h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-[#9A9691] mb-1">
                        Background Color
                      </label>
                      <input
                        type="color"
                        value={section.settings.backgroundColor || DESIGN_TOKEN_VALUES.surface.panel}
                        onChange={(e) => updateSectionSettings(section.id, { backgroundColor: e.target.value })}
                        className="w-full h-10 rounded border border-minsah-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#9A9691] mb-1">
                        View All / CTA URL
                      </label>
                      <Input
                        type="text"
                        value={section.settings.viewAllHref || ''}
                        onChange={(e) => updateSectionSettings(section.id, { viewAllHref: e.target.value })}
                        className="w-full rounded border border-minsah-accent px-3 py-2 text-sm focus:border-minsah-primary focus:outline-none"
                        placeholder="/shop, /flash-sale, /categories..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#9A9691] mb-1">
                        CTA Text
                      </label>
                      <Input
                        type="text"
                        value={section.settings.ctaText || ''}
                        onChange={(e) => updateSectionSettings(section.id, { ctaText: e.target.value })}
                        className="w-full rounded border border-minsah-accent px-3 py-2 text-sm focus:border-minsah-primary focus:outline-none"
                        placeholder="View all / Shop Now"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#9A9691] mb-1">
                        {getSelectionLabel(section.type)}
                      </label>
                      <Textarea
                        rows={2}
                        value={
                          section.type === 'categories'
                            ? arrayToCsv(section.settings.selectedCategoryIds)
                            : section.type === 'brands'
                              ? arrayToCsv(section.settings.selectedBrandIds)
                              : arrayToCsv(section.settings.selectedProductIds)
                        }
                        onChange={(e) => {
                          const values = csvToArray(e.target.value);
                          if (section.type === 'categories') {
                            updateSectionSettings(section.id, { selectedCategoryIds: values });
                          } else if (section.type === 'brands') {
                            updateSectionSettings(section.id, { selectedBrandIds: values });
                          } else {
                            updateSectionSettings(section.id, { selectedProductIds: values });
                          }
                        }}
                        className="w-full rounded border border-minsah-accent px-3 py-2 text-sm focus:border-minsah-primary focus:outline-none"
                        placeholder="Comma separated IDs or slugs"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-[#9A9691]">
                        <Input
                          type="checkbox"
                          checked={section.settings.showViewAll !== false}
                          onChange={(e) => updateSectionSettings(section.id, { showViewAll: e.target.checked })}
                          className="w-4 h-4 text-minsah-primary rounded"
                        />
                        Show "View All" Link
                      </label>
                    </div>

                    <Button
                      onClick={() => setShowSettings(null)}
                      className="w-full px-4 py-2 bg-[#D07A60] text-white rounded-lg hover:bg-[#E08D70] font-medium transition"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Save Button (Bottom) */}
      <div className="mt-6 flex justify-end">
        <Button
          onClick={saveChanges}
          disabled={isSaving || isLoading || !hasUnsavedChanges}
          className="flex min-h-11 items-center gap-2 rounded-lg bg-[#D07A60] px-6 py-3 font-semibold text-white transition hover:bg-[#E08D70] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          {isSaving ? 'Saving…' : hasUnsavedChanges ? 'Save All Changes' : 'All Changes Saved'}
        </Button>
      </div>
    </div>
  );
}
