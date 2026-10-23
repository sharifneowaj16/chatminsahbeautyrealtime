'use client';

import React, { useState } from 'react';
import { Save, Plus, Clock, ShieldCheck, AlertCircle, RefreshCw, Eye, EyeOff, CheckCircle2, Sparkles } from 'lucide-react';
import type { FlashDealsConfig, FlashDealItem } from '@/components/home/flash-deals/types';
import { DEFAULT_FLASH_DEALS_CONFIG } from '@/components/home/flash-deals/types';
import FlashDealItemEditor from './FlashDealItemEditor';
import FlashDealsLiveSimulator from './FlashDealsLiveSimulator';
import FlashDealsProductSearch, { SearchedProduct } from './FlashDealsProductSearch';

interface FlashDealsAdminManagerProps {
  initialConfig?: FlashDealsConfig | null;
}

export default function FlashDealsAdminManager({ initialConfig }: FlashDealsAdminManagerProps) {
  const [config, setConfig] = useState<FlashDealsConfig>(
    initialConfig || DEFAULT_FLASH_DEALS_CONFIG
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Set quick timer preset
  const setTimerPreset = (hours: number) => {
    const newEndsAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    setConfig((prev) => ({
      ...prev,
      endsAt: newEndsAt,
    }));
    setSaveStatus(null);
  };

  // Add deal from searched store product
  const handleAddProductFromSearch = (product: SearchedProduct) => {
    const nextOrder = (config.items?.length || 0) + 1;
    const origPrice = Number(product.price) || 2000;
    const discountAmount = Math.max(100, Math.round(origPrice * 0.15));
    const salePrice = Math.max(1, origPrice - discountAmount);

    const newDeal: FlashDealItem = {
      id: `flash-deal-${product.id}-${Date.now()}`,
      productId: product.id,
      title: product.name,
      subtitle: 'Exclusive Flash Drop • Authentic Korean Skincare',
      imageUrl: product.images?.[0]?.url || '/images/hero-image.jpg',
      originalPrice: origPrice,
      salePrice: salePrice,
      discountBadge: `৳${discountAmount} OFF`,
      rating: 4.9,
      ratingCount: 120,
      stockUrgencyText: 'Only 3 units left!',
      claimedPercentage: 85,
      order: nextOrder,
      isActive: true,
      variants: Array.isArray(product.variants) && product.variants.length > 0 ? product.variants : undefined,
    };

    setConfig((prev) => ({
      ...prev,
      items: [...prev.items, newDeal],
    }));
    setSaveStatus(null);
  };

  // Add fallback empty deal
  const handleAddDealManual = () => {
    const nextOrder = (config.items?.length || 0) + 1;
    const newDeal: FlashDealItem = {
      id: `flash-deal-custom-${Date.now()}`,
      productId: 'custom-deal',
      title: 'New Featured Beauty Deal',
      subtitle: 'Exclusive Flash Sale Offer • Limited Quantity',
      imageUrl: '/images/hero-image.jpg',
      originalPrice: 2000,
      salePrice: 1650,
      discountBadge: '৳350 OFF',
      rating: 4.9,
      ratingCount: 150,
      stockUrgencyText: 'Only 5 units left!',
      claimedPercentage: 80,
      order: nextOrder,
      isActive: true,
    };

    setConfig((prev) => ({
      ...prev,
      items: [...prev.items, newDeal],
    }));
    setSaveStatus(null);
  };

  // Update item
  const handleUpdateItem = (updated: FlashDealItem) => {
    setConfig((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === updated.id ? updated : item)),
    }));
    setSaveStatus(null);
  };

  // Delete item
  const handleDeleteItem = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
    setSaveStatus(null);
  };

  // Move up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const items = [...config.items];
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
    items.forEach((item, idx) => {
      item.order = idx + 1;
    });
    setConfig((prev) => ({ ...prev, items }));
    setSaveStatus(null);
  };

  // Move down
  const handleMoveDown = (index: number) => {
    if (index === config.items.length - 1) return;
    const items = [...config.items];
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
    items.forEach((item, idx) => {
      item.order = idx + 1;
    });
    setConfig((prev) => ({ ...prev, items }));
    setSaveStatus(null);
  };

  // Save to /api/admin/site-config
  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const response = await fetch('/api/admin/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          key: 'flashDeals',
          value: config,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save Flash Deals config.');
      }

      setSaveStatus({
        type: 'success',
        message: 'Flash Deals configuration successfully saved & published to live storefront!',
      });

      // Auto clear success message after 5s
      setTimeout(() => {
        setSaveStatus((current) => (current?.type === 'success' ? null : current));
      }, 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error saving settings';
      setSaveStatus({ type: 'error', message: msg });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#161824] border border-[#232636] shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-lg font-bold text-[#f7f8f8]">
              Flash Deals Management Suite
            </h2>
          </div>
          <p className="text-xs text-[#8a8f98] mt-1">
            Configure countdown timer, custom offer pricing, stock urgency, and 5-column layout.
          </p>
        </div>

        {/* Global Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'Publishing...' : 'Save & Publish Live'}</span>
        </button>
      </div>

      {/* Save Notification Toast / Banner */}
      {saveStatus && (
        <div
          className={`flex items-center justify-between gap-3 p-4 rounded-xl text-xs font-medium border animate-in fade-in duration-200 ${
            saveStatus.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-950/40 text-rose-300 border-rose-500/40'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {saveStatus.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{saveStatus.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveStatus(null)}
            className="text-[11px] underline opacity-80 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Global Section Settings & Countdown Timer */}
      <div className="p-5 rounded-2xl bg-[#161824] border border-[#232636] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#232636]">
          <h3 className="text-xs font-bold text-[#8a8f98] uppercase tracking-wider">
            1. Global Section Settings & Countdown Timer
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Section Visibility Switch */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0b0c14] border border-[#232636]">
            <div>
              <span className="text-xs font-semibold text-[#f7f8f8] block">
                Section Visibility
              </span>
              <span className="text-[11px] text-[#8a8f98]">
                {config.isVisible ? 'Visible on Storefront Home Page' : 'Hidden from Storefront'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setConfig((prev) => ({ ...prev, isVisible: !prev.isVisible }));
                setSaveStatus(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                config.isVisible
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-[#161824] hover:bg-[#1c1f2e] text-[#8a8f98] border border-[#232636]'
              }`}
            >
              {config.isVisible ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Quick Timer Presets */}
          <div className="p-3.5 rounded-xl bg-[#0b0c14] border border-[#232636]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#f7f8f8] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Quick Timer Presets</span>
              </span>
              <span className="text-[10px] text-[#8a8f98] font-mono">
                Ends: {new Date(config.endsAt).toLocaleDateString()} {new Date(config.endsAt).toLocaleTimeString()}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '+6 Hours', hours: 6 },
                { label: '+12 Hours', hours: 12 },
                { label: '+24 Hours (1 Day)', hours: 24 },
                { label: '+48 Hours (2 Days)', hours: 48 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setTimerPreset(preset.hours)}
                  className="px-2 py-1.5 rounded-lg bg-[#161824] hover:bg-[#1c1f2e] border border-[#232636] hover:border-[#5e6ad2]/50 text-[10px] font-medium text-[#8a8f98] hover:text-[#f7f8f8] transition-all cursor-pointer text-center"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section Copy Configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-semibold text-[#8a8f98] mb-1">
              Top Badge Text
            </label>
            <input
              type="text"
              value={config.badgeText}
              onChange={(e) => {
                setConfig((prev) => ({ ...prev, badgeText: e.target.value }));
                setSaveStatus(null);
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#0b0c14] border border-[#232636] text-xs text-[#f7f8f8] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] outline-none"
              placeholder="e.g. HIGH DEMAND BATCH DROP"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#8a8f98] mb-1">
              Section Title
            </label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => {
                setConfig((prev) => ({ ...prev, title: e.target.value }));
                setSaveStatus(null);
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#0b0c14] border border-[#232636] text-xs text-[#f7f8f8] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] outline-none"
              placeholder="e.g. Flash Deals"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#8a8f98] mb-1">
              Subtitle
            </label>
            <input
              type="text"
              value={config.subtitle}
              onChange={(e) => {
                setConfig((prev) => ({ ...prev, subtitle: e.target.value }));
                setSaveStatus(null);
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#0b0c14] border border-[#232636] text-xs text-[#f7f8f8] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] outline-none"
              placeholder="e.g. Strict direct import cost subsidies. Strictly 1 unit per client."
            />
          </div>
        </div>
      </div>

      {/* 2. Flash Deal Items (5 Columns on Desktop) */}
      <div className="p-5 rounded-2xl bg-[#161824] border border-[#232636] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#232636]">
          <div>
            <h3 className="text-xs font-bold text-[#8a8f98] uppercase tracking-wider">
              2. Flash Deal Items (5 Columns on Desktop)
            </h3>
            <p className="text-[11px] text-[#8a8f98] mt-0.5">
              {config.items?.length || 0} active deals configured. Search below to add directly from products.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handleAddDealManual}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b0c14] hover:bg-[#1c1f2e] border border-[#232636] hover:border-[#5e6ad2]/50 text-xs font-semibold text-[#8a8f98] hover:text-[#f7f8f8] transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Blank Slot</span>
            </button>
          </div>
        </div>

        {/* Product Live Search Bar */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Search & Add Store Products to Flash Deals:</span>
          </label>
          <FlashDealsProductSearch onAddProduct={handleAddProductFromSearch} />
        </div>

        {/* Deal Items List */}
        <div className="space-y-3 pt-2">
          {config.items?.length === 0 ? (
            <div className="text-center py-12 rounded-xl bg-[#0b0c14] border border-dashed border-[#232636] text-[#8a8f98]">
              <p className="text-xs font-medium">No Flash Deal items added yet.</p>
              <p className="text-[11px] text-[#8a8f98]/60 mt-1">Use the search bar above to add products.</p>
            </div>
          ) : (
            config.items.map((deal, index) => (
              <FlashDealItemEditor
                key={deal.id}
                deal={deal}
                index={index}
                totalDeals={config.items.length}
                onUpdate={handleUpdateItem}
                onDelete={handleDeleteItem}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            ))
          )}
        </div>
      </div>

      {/* 3. Live Interactive Simulator */}
      <FlashDealsLiveSimulator config={config} />

      {/* Bottom Sticky Save Bar */}
      <div className="sticky bottom-4 z-40 flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#161824]/95 backdrop-blur-md border border-[#232636] shadow-2xl">
        <div className="text-xs text-[#8a8f98]">
          <span className="font-semibold text-[#f7f8f8]">{config.items?.length || 0} Deals</span> ready in Flash Deals suite.
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'Publishing...' : 'Save & Publish Live'}</span>
        </button>
      </div>
    </div>
  );
}
