'use client';

import React, { useState, useEffect } from 'react';
import {
  DEFAULT_MOBILE_NAV_CONFIG,
  ALL_AVAILABLE_BUTTONS,
  MobileNavigationConfig,
  NavBarStyleId,
  SearchBarStyleId,
  NavButtonItem,
  NavButtonKey,
} from '@/types/navigation-config';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  MoveUp,
  MoveDown,
  Eye,
  EyeOff,
  Upload,
  Code,
  RotateCcw,
  Sparkles,
  Smartphone,
  Search,
} from 'lucide-react';
import SafeSvgRenderer from '@/components/navigation/SafeSvgRenderer';

export default function MobileNavigationAdminPage() {
  const [config, setConfig] = useState<MobileNavigationConfig>(DEFAULT_MOBILE_NAV_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load active config on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/navigation-config');
        if (res.ok) {
          const data = await res.json();
          if (data?.config) {
            // Ensure all available buttons are present in the list even if new ones were added
            const existingKeys = new Set(data.config.buttons.map((b: NavButtonItem) => b.key));
            const missingButtons: NavButtonItem[] = ALL_AVAILABLE_BUTTONS
              .filter((item) => !existingKeys.has(item.key))
              .map((item, idx) => ({
                key: item.key,
                label: item.defaultLabel,
                iconType: 'system',
                isVisible: false,
                order: data.config.buttons.length + idx + 1,
              }));

            setConfig({
              ...data.config,
              buttons: [...data.config.buttons, ...missingButtons].sort((a, b) => a.order - b.order),
            });
          }
        }
      } catch (err) {
        console.error('Failed to load navigation config:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setStatusMessage(null);

      const res = await fetch('/api/admin/navigation-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();

      if (res.ok && data?.success) {
        setConfig(data.config);
        setStatusMessage({ type: 'success', text: 'মোবাইল নেভিগেশন ও সার্চ কনফিগারেশন সফলভাবে সংরক্ষিত হয়েছে!' });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('minsah:navigation-config-updated', {
              detail: data.config,
            })
          );
        }
      } else {
        setStatusMessage({ type: 'error', text: data?.error || 'কনফিগারেশন সংরক্ষণ ব্যর্থ হয়েছে।' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'সার্ভার যোগাযোগে সমস্যা হয়েছে।' });
    } finally {
      setSaving(false);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= config.buttons.length) return;

    const newButtons = [...config.buttons];
    const temp = newButtons[index];
    newButtons[index] = newButtons[targetIndex];
    newButtons[targetIndex] = temp;

    // Update orders sequentially
    const updated = newButtons.map((btn, idx) => ({ ...btn, order: idx + 1 }));
    setConfig((prev) => ({ ...prev, buttons: updated }));
  };

  const handleToggleVisible = (index: number) => {
    const updated = [...config.buttons];
    updated[index].isVisible = !updated[index].isVisible;
    setConfig((prev) => ({ ...prev, buttons: updated }));
  };

  const handleLabelChange = (index: number, val: string) => {
    const updated = [...config.buttons];
    updated[index].label = val;
    setConfig((prev) => ({ ...prev, buttons: updated }));
  };

  const handleIconTypeChange = (index: number, iconType: 'system' | 'custom_svg') => {
    const updated = [...config.buttons];
    updated[index].iconType = iconType;
    setConfig((prev) => ({ ...prev, buttons: updated }));
  };

  const handleSvgPaste = (index: number, rawSvg: string) => {
    const updated = [...config.buttons];
    updated[index].customSvg = rawSvg;
    setConfig((prev) => ({ ...prev, buttons: updated }));
  };

  const handleFileUpload = (index: number, file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        handleSvgPaste(index, text);
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="w-8 h-8 mx-auto border-2 border-minsah-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-mono">নেভিগেশন কনফিগারেশন লোড হচ্ছে...</p>
      </div>
    );
  }

  const visibleCount = config.buttons.filter((b) => b.isVisible).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-minsah-primary" />
            <h1 className="text-xl font-black text-white tracking-wide">
              মোবাইল নেভিগেশন ও সার্চ কন্ট্রোল হাব
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            মোবাইল ভিউর জন্য ৩টি প্রিমিয়াম নেভিগেশন ডিজাইন, ৫টি স্মার্ট বাটন ও কাস্টম SVG আইকন নির্বাচন করুন।
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="h-11 px-6 rounded-xl bg-minsah-primary hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>পরিবর্তন সেভ করুন</span>
        </button>
      </div>

      {/* Status Notice */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 1. Mobile Navigation Bar Design Selector */}
      <section className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>১. মোবাইল নেভিগেশন বার ডিজাইন</span>
            <span className="text-[10px] text-minsah-primary bg-minsah-primary/10 px-2 py-0.5 rounded-full font-mono">
              সক্রিয়: {config.navBarStyle}
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              id: 'style-05' as NavBarStyleId,
              title: '#05 Revolut Sliding Capsule',
              desc: 'সিলেক্টেড ট্যাবের পেছনে মসৃণ স্লাইডিং পিল ইন্ডিকেটর ও সফট গ্লো।',
            },
            {
              id: 'style-09' as NavBarStyleId,
              title: '#09 Segmented Control Dock',
              desc: 'ম্যাকওএস স্টাইল ট্যাকটাইল বর্ডার ডক ও ইনসেট হাইলাইট।',
            },
            {
              id: 'style-10' as NavBarStyleId,
              title: '#10 Compact Micro Dynamic',
              desc: 'স্লিম লো-হাইট বার, রেজর-শার্প টপ গ্লো লাইন ও লাইভ ব্যাজ।',
            },
          ].map((theme) => {
            const isSelected = config.navBarStyle === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, navBarStyle: theme.id }))}
                className={`p-4 rounded-xl text-left border transition-all ${
                  isSelected
                    ? 'border-minsah-primary bg-minsah-primary/10 ring-2 ring-minsah-primary/20 shadow-md'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {theme.title}
                  </span>
                  {isSelected && <Sparkles className="w-4 h-4 text-minsah-primary" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  {theme.desc}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Search Bar Design Selector */}
      <section className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Search className="w-4 h-4 text-amber-400" />
            <span>২. সার্চ বার ভিজ্যুয়াল স্কিন</span>
            <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full font-mono">
              সক্রিয়: {config.searchBarStyle}
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              id: 'style-01' as SearchBarStyleId,
              title: '#01 Linear Dark Capsule',
              desc: 'পিচ-ব্ল্যাক ক্যানভাস, হেয়ারলাইন বর্ডার ও ল্যাভেন্ডার রিং।',
            },
            {
              id: 'style-03' as SearchBarStyleId,
              title: '#03 Royal Forest & Gold',
              desc: 'মিনসাহ সিগনেচার #1c3a13 ফরেস্ট গ্রিন ও শ্যাম্পেন গোল্ড ডট।',
            },
            {
              id: 'style-07' as SearchBarStyleId,
              title: '#07 Dual-Segmented Category',
              desc: 'বামে ইন্টিগ্রেটেড ক্যাটাগরি ড্রপডাউন সিলেক্টর সহ সার্চ ফিল্ড।',
            },
          ].map((theme) => {
            const isSelected = config.searchBarStyle === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, searchBarStyle: theme.id }))}
                className={`p-4 rounded-xl text-left border transition-all ${
                  isSelected
                    ? 'border-amber-400 bg-amber-400/10 ring-2 ring-amber-400/20 shadow-md'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {theme.title}
                  </span>
                  {isSelected && <Sparkles className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  {theme.desc}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Button Sequencer & SVG Manager */}
      <section className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              ৩. বাটন সিকোয়েন্স ও কাস্টম SVG আপলোড
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              মোট ৫টি বাটন স্ক্রিনের নিচে প্রদর্শিত হবে (স্লট ৩-এ সর্বদা কার্ট ড্রয়ার ফিক্সড থাকবে)।
            </p>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 self-start sm:self-auto">
            দৃশ্যমান বাটন: {visibleCount} টি
          </span>
        </div>

        {/* Buttons Sequencer Table */}
        <div className="space-y-3">
          {config.buttons.map((btn, index) => {
            const availableMeta = ALL_AVAILABLE_BUTTONS.find((a) => a.key === btn.key);
            const isCustom = btn.iconType === 'custom_svg';

            return (
              <div
                key={btn.key}
                className={`p-4 rounded-xl border transition-colors ${
                  btn.isVisible
                    ? 'bg-slate-950/60 border-slate-800'
                    : 'bg-slate-950/20 border-slate-900 opacity-60'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                  {/* Left: Reorder & Status */}
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                        title="Move Up"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === config.buttons.length - 1}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                        title="Move Down"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Icon Live Preview Box */}
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-minsah-primary shrink-0 shadow-inner">
                      <SafeSvgRenderer
                        buttonKey={btn.key}
                        iconType={btn.iconType}
                        customSvg={btn.customSvg}
                        className="w-5 h-5 text-minsah-primary"
                        active={true}
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">
                          #{index + 1} {availableMeta?.defaultLabel || btn.key}
                        </span>
                        {btn.key === 'cart_drawer' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono font-bold border border-amber-500/20">
                            মিডল ফিক্সড
                          </span>
                        )}
                        {btn.key === 'home_shop' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-mono font-bold border border-indigo-500/20">
                            স্মার্ট টগল
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {availableMeta?.description}
                      </p>
                    </div>
                  </div>

                  {/* Right: Label, Show/Hide & SVG Toggles */}
                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    {/* Custom Label Input */}
                    <input
                      type="text"
                      value={btn.label}
                      onChange={(e) => handleLabelChange(index, e.target.value)}
                      placeholder="বাটন নাম"
                      className="h-9 px-3 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-minsah-primary w-28"
                    />

                    {/* Icon Type Dropdown */}
                    <select
                      value={btn.iconType}
                      onChange={(e) => handleIconTypeChange(index, e.target.value as 'system' | 'custom_svg')}
                      className="h-9 px-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="system">সিস্টেম আইকন</option>
                      <option value="custom_svg">কাস্টম SVG</option>
                    </select>

                    {/* Show/Hide Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleVisible(index)}
                      className={`h-9 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                        btn.isVisible
                          ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {btn.isVisible ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Visible</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Hidden</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Custom SVG Uploader & Paste Area */}
                {isCustom && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col md:flex-row gap-3 bg-slate-900/40 p-3 rounded-lg">
                    {/* File Upload Option */}
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        SVG ফাইল আপলোড (.svg)
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="h-9 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-colors">
                          <Upload className="w-3.5 h-3.5 text-minsah-primary" />
                          <span>ফাইল বেছে নিন</span>
                          <input
                            type="file"
                            accept=".svg"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(index, file);
                            }}
                            className="hidden"
                          />
                        </label>
                        {btn.customSvg && (
                          <button
                            type="button"
                            onClick={() => handleSvgPaste(index, '')}
                            className="h-9 px-2.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs flex items-center gap-1"
                            title="Reset to default icon"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>মুছুন</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Raw SVG Code Paste Area */}
                    <div className="flex-2 w-full">
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        বা সরাসরি SVG কোড পেস্ট করুন
                      </label>
                      <textarea
                        value={btn.customSvg || ''}
                        onChange={(e) => handleSvgPaste(index, e.target.value)}
                        placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>'
                        rows={2}
                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-minsah-primary resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

