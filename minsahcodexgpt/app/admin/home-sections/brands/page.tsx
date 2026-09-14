'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { defaultHomeSections, defaultBrands } from '@/lib/homeData';
import { HomeSection, HomeSectionBrand } from '@/types/admin';

export default function HomeSectionBrandsPage() {
  const { pushToast } = useToast();
  const [, startTransition] = useTransition();

  const [allSections, setAllSections] = useState<HomeSection[]>(defaultHomeSections);
  const [brandsSection, setBrandsSection] = useState<HomeSection>(() => {
    return defaultHomeSections.find((s) => s.type === 'brands') || {
      id: 'section-brands',
      type: 'brands',
      title: 'Popular Brands',
      subtitle: 'Shop by trusted beauty brands',
      isVisible: true,
      order: 9,
      settings: {
        showViewAll: true,
        itemsToShow: 4,
        layout: 'grid-4',
        viewAllHref: '/brands',
        ctaText: 'View all',
      },
    };
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load saved homepage configuration
  useEffect(() => {
    let cancelled = false;

    fetch('/api/admin/site-config?key=homeSections')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.value)) {
          setAllSections(data.value);
          const found = data.value.find((s: HomeSection) => s.type === 'brands');
          if (found) {
            setBrandsSection(found);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatusMessage('Could not load saved configuration. Showing default values.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Save changes to siteConfig
  const saveConfiguration = async (sectionToSave: HomeSection = brandsSection) => {
    setIsSaving(true);
    setSaveStatus('idle');
    setStatusMessage(null);

    const updatedSections = allSections.some((s) => s.type === 'brands')
      ? allSections.map((s) => (s.type === 'brands' ? sectionToSave : s))
      : [...allSections, sectionToSave];

    try {
      const response = await fetch('/api/admin/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: [{ key: 'homeSections', value: updatedSections }],
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save configuration.');
      }

      setAllSections(updatedSections);
      setBrandsSection(sectionToSave);
      setHasUnsavedChanges(false);
      setSaveStatus('success');
      setStatusMessage(
        sectionToSave.isVisible
          ? 'Popular Brands section is now visible on the homepage.'
          : 'Popular Brands section is now hidden from the homepage.'
      );
      pushToast({
        tone: 'success',
        description: sectionToSave.isVisible
          ? 'Popular Brands is now visible on the homepage.'
          : 'Popular Brands is now hidden from the homepage.',
      });
    } catch (error) {
      setSaveStatus('error');
      const msg = error instanceof Error ? error.message : 'Save failed. Please try again.';
      setStatusMessage(msg);
      pushToast({ tone: 'danger', description: msg });
    } finally {
      setIsSaving(false);
    }
  };

  // Instant toggle handler: updates state and persists immediately for rapid admin workflow
  const handleQuickToggle = (newVisibility: boolean) => {
    const updated: HomeSection = {
      ...brandsSection,
      isVisible: newVisibility,
    };
    startTransition(() => {
      setBrandsSection(updated);
      setHasUnsavedChanges(true);
    });
    saveConfiguration(updated);
  };

  const updateSetting = (key: string, value: unknown) => {
    setBrandsSection((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value,
      },
    }));
    setHasUnsavedChanges(true);
  };

  const sampleBrands: HomeSectionBrand[] = defaultBrands;
  const itemsLimit = Math.max(1, Math.min(24, brandsSection.settings.itemsToShow ?? 4));
  const previewBrands = sampleBrands.slice(0, itemsLimit);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Top Header & Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#232636] pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/home-sections"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#232636] bg-[#161824] text-[#8A8F98] transition hover:bg-[#1b1e2c] hover:text-[#F7F8F8]"
            aria-label="Back to Home Sections"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#F7F8F8] tracking-tight">
                Popular Brands Section
              </h1>
              <span className="rounded-md bg-[#5e6ad2]/15 px-2 py-0.5 text-xs font-semibold text-[#5e6ad2] border border-[#5e6ad2]/30">
                Homepage
              </span>
            </div>
            <p className="mt-0.5 text-xs sm:text-sm text-[#8A8F98]">
              Manage the &quot;Shop by trusted beauty brands&quot; section on the storefront homepage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#232636] bg-[#161824] px-3 py-2 text-xs font-medium text-[#8A8F98] transition hover:border-[#5e6ad2]/50 hover:text-[#F7F8F8]"
          >
            View Storefront <ExternalLink size={14} />
          </Link>
          <Button
            onClick={() => saveConfiguration(brandsSection)}
            disabled={isSaving || isLoading || !hasUnsavedChanges}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#5e6ad2] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:bg-[#6d78d5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Saving…' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 rounded-xl border border-[#5e6ad2]/30 bg-[#5e6ad2]/10 p-4 text-xs sm:text-sm text-[#f7f8f8]">
          <Loader2 className="h-4 w-4 animate-spin text-[#5e6ad2]" />
          Loading saved homepage brand configuration…
        </div>
      )}

      {statusMessage && (
        <div
          role={saveStatus === 'error' ? 'alert' : 'status'}
          className={`flex items-start gap-3 rounded-xl border p-4 text-xs sm:text-sm ${
            saveStatus === 'error'
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          }`}
        >
          {saveStatus === 'error' ? (
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-rose-400" />
          ) : (
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-400" />
          )}
          <p className="font-medium">{statusMessage}</p>
        </div>
      )}

      {/* ── Prominent Toggle Switch Card ── */}
      <div className="overflow-hidden rounded-2xl border border-[#232636] bg-[#161824] shadow-sm">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#5e6ad2]/20 text-xs font-bold text-[#5e6ad2]">
                  BRAND
                </span>
                <h2 className="text-base sm:text-lg font-bold text-[#F7F8F8]">
                  Show Popular Brands on Homepage
                </h2>
                {brandsSection.isVisible ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                    <Eye size={12} /> Visible on Homepage
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-stone-600/40 bg-stone-800/60 px-2.5 py-0.5 text-xs font-semibold text-[#8A8F98]">
                    <EyeOff size={12} /> Hidden from Homepage
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[#8A8F98] max-w-xl">
                Toggle this switch to immediately show or hide the &quot;Popular Brands / Shop by trusted beauty brands&quot;
                section on the storefront homepage. When hidden, the section is completely omitted with zero performance overhead.
              </p>
            </div>

            {/* Interactive Toggle Switch */}
            <div className="flex items-center gap-3 self-start sm:self-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8A8F98]">
                {brandsSection.isVisible ? 'Enabled' : 'Disabled'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={brandsSection.isVisible}
                aria-label="Toggle Popular Brands visibility on homepage"
                disabled={isSaving || isLoading}
                onClick={() => handleQuickToggle(!brandsSection.isVisible)}
                className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#5e6ad2] focus:ring-offset-2 focus:ring-offset-[#161824] disabled:opacity-50 ${
                  brandsSection.isVisible ? 'bg-emerald-500' : 'bg-[#232636]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    brandsSection.isVisible ? 'translate-x-8' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Performance Notice Strip */}
        <div className="flex items-center gap-2 border-t border-[#232636] bg-[#10121b] px-5 py-3 text-xs text-[#8A8F98]">
          <Sparkles size={14} className="text-[#5e6ad2] shrink-0" />
          <span>
            <strong>Performance Optimized:</strong> When disabled, Next.js completely skips rendering brand DOM elements and avoids all brand queries, keeping the homepage initial payload ultra-fast.
          </span>
        </div>
      </div>

      {/* ── Section Content & Layout Settings ── */}
      <div className="rounded-2xl border border-[#232636] bg-[#161824] p-5 sm:p-6 shadow-sm space-y-5">
        <div className="border-b border-[#232636] pb-3">
          <h2 className="text-base font-bold text-[#F7F8F8]">Section Copy & Display Settings</h2>
          <p className="text-xs text-[#8A8F98] mt-0.5">Customize the heading copy, brand item limits, and layout options.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#8A8F98]">
              Section Title
            </label>
            <Input
              type="text"
              value={brandsSection.title}
              onChange={(e) => {
                setBrandsSection({ ...brandsSection, title: e.target.value });
                setHasUnsavedChanges(true);
              }}
              placeholder="Popular Brands"
              className="w-full rounded-lg border border-[#232636] bg-[#10121b] px-3 py-2 text-sm text-[#F7F8F8] focus:border-[#5e6ad2] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#8A8F98]">
              Section Subtitle
            </label>
            <Input
              type="text"
              value={brandsSection.subtitle || ''}
              onChange={(e) => {
                setBrandsSection({ ...brandsSection, subtitle: e.target.value });
                setHasUnsavedChanges(true);
              }}
              placeholder="Shop by trusted beauty brands"
              className="w-full rounded-lg border border-[#232636] bg-[#10121b] px-3 py-2 text-sm text-[#F7F8F8] focus:border-[#5e6ad2] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#8A8F98]">
              Number of Brands to Display
            </label>
            <Input
              type="number"
              min={1}
              max={24}
              value={brandsSection.settings.itemsToShow ?? 4}
              onChange={(e) => updateSetting('itemsToShow', Math.max(1, Math.min(24, Number(e.target.value) || 4)))}
              className="w-full rounded-lg border border-[#232636] bg-[#10121b] px-3 py-2 text-sm text-[#F7F8F8] focus:border-[#5e6ad2] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#8A8F98]">
              Grid Layout
            </label>
            <Select
              value={brandsSection.settings.layout || 'grid-4'}
              onChange={(e) => updateSetting('layout', e.target.value)}
              className="w-full rounded-lg border border-[#232636] bg-[#10121b] px-3 py-2 text-sm text-[#F7F8F8] focus:border-[#5e6ad2] focus:outline-none"
            >
              <option value="grid-4">Grid 4 Columns (Standard)</option>
              <option value="grid-3">Grid 3 Columns</option>
              <option value="grid-2">Grid 2 Columns</option>
              <option value="horizontal-scroll">Horizontal Carousel / Scroll</option>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#8A8F98]">
              &quot;View All&quot; Link URL
            </label>
            <Input
              type="text"
              value={brandsSection.settings.viewAllHref || ''}
              onChange={(e) => updateSetting('viewAllHref', e.target.value)}
              placeholder="/brands"
              className="w-full rounded-lg border border-[#232636] bg-[#10121b] px-3 py-2 text-sm text-[#F7F8F8] focus:border-[#5e6ad2] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#8A8F98]">
              CTA Button Text
            </label>
            <Input
              type="text"
              value={brandsSection.settings.ctaText || ''}
              onChange={(e) => updateSetting('ctaText', e.target.value)}
              placeholder="View all"
              className="w-full rounded-lg border border-[#232636] bg-[#10121b] px-3 py-2 text-sm text-[#F7F8F8] focus:border-[#5e6ad2] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 pt-2">
            <label className="flex items-center gap-2.5 text-xs font-semibold text-[#F7F8F8] cursor-pointer">
              <input
                type="checkbox"
                checked={brandsSection.settings.showViewAll !== false}
                onChange={(e) => updateSetting('showViewAll', e.target.checked)}
                className="h-4 w-4 rounded border-[#232636] bg-[#10121b] text-[#5e6ad2] focus:ring-[#5e6ad2]"
              />
              Show &quot;View All&quot; button in the section header
            </label>
          </div>
        </div>
      </div>

      {/* ── Live Visual Preview Card ── */}
      <div className="rounded-2xl border border-[#232636] bg-[#161824] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#232636] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#F7F8F8]">Storefront Live Preview</h2>
            <p className="text-xs text-[#8A8F98] mt-0.5">
              Live representation of how this section looks to customers.
            </p>
          </div>
          {brandsSection.isVisible ? (
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Active on Homepage
            </span>
          ) : (
            <span className="text-xs font-medium text-rose-400 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-400" /> Hidden (Not rendered)
            </span>
          )}
        </div>

        <div className="relative rounded-xl border border-[#232636] bg-[#10121b] p-6 overflow-hidden">
          {!brandsSection.isVisible && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#10121b]/80 backdrop-blur-xs p-4 text-center">
              <EyeOff size={32} className="text-[#8A8F98] mb-2" />
              <p className="text-sm font-bold text-[#F7F8F8]">Section is Currently Hidden</p>
              <p className="text-xs text-[#8A8F98] mt-1 max-w-sm">
                Customers will not see this section on the storefront homepage. Turn on the toggle above to make it visible.
              </p>
              <Button
                onClick={() => handleQuickToggle(true)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#5e6ad2] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#6d78d5]"
              >
                <Eye size={14} /> Show on Homepage
              </Button>
            </div>
          )}

          {/* Rendered Mock Header */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-[#F7F8F8]">
                {brandsSection.title || 'Popular Brands'}
              </h3>
              {brandsSection.subtitle && (
                <p className="text-xs text-[#8A8F98] mt-0.5">{brandsSection.subtitle}</p>
              )}
            </div>
            {brandsSection.settings.showViewAll !== false && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#5e6ad2]">
                {brandsSection.settings.ctaText || 'View all'} <ChevronRight size={14} />
              </span>
            )}
          </div>

          {/* Rendered Mock Brand Cards */}
          <div
            className={
              brandsSection.settings.layout === 'grid-3'
                ? 'grid grid-cols-2 gap-3 sm:grid-cols-3'
                : brandsSection.settings.layout === 'grid-2'
                ? 'grid grid-cols-2 gap-3'
                : brandsSection.settings.layout === 'horizontal-scroll'
                ? 'flex gap-3 overflow-x-auto pb-2'
                : 'grid grid-cols-2 gap-3 sm:grid-cols-4'
            }
          >
            {previewBrands.map((brand) => (
              <div
                key={brand.id}
                className="flex aspect-square sm:aspect-[4/3] items-center justify-center rounded-xl border border-[#232636] bg-[#161824] p-4 text-center shadow-sm"
              >
                <span className="whitespace-pre-line text-xs sm:text-sm font-semibold text-[#F7F8F8]">
                  {brand.logo || brand.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
