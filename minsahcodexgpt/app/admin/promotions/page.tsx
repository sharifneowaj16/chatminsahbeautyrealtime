'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import {
  Tag,
  Truck,
  Gift,
  ShieldAlert,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Percent,
  DollarSign,
  Sparkles,
  Info,
  HelpCircle,
  Eye,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { formatPrice } from '@/utils/currency';
import type { AdminOfferPayload } from '@/app/api/admin/offer-engine/route';

type ActiveTab = 'coupons' | 'topbar' | 'bundles' | 'anticonflict';

export default function UniversalOfferEngineAdminPage() {
  const { pushToast } = useToast();
  const { hasPermission } = useAdminAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('coupons');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form State
  const [config, setConfig] = useState<AdminOfferPayload | null>(null);

  // New Coupon Modal/Inline State
  const [showAddCoupon, setShowAddCoupon] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'flat',
    value: 10,
    description: '',
    minSubtotal: 0,
    maxDiscount: 0,
    allowOnBundles: false,
    isActive: true,
  });

  // Fetch initial config
  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/offer-engine');
      if (!res.ok) throw new Error('Failed to load offer engine configuration.');
      const json = await res.json();
      if (json.success && json.data) {
        setConfig(json.data);
      }
    } catch (err: any) {
      pushToast({
        title: 'Error loading offer configuration',
        description: err.message || 'Please refresh the page.',
        tone: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const markDirty = () => {
    setHasChanges(true);
  };

  // Save changes to API
  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/offer-engine', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save offer configuration.');
      }

      setHasChanges(false);
      pushToast({
        title: 'Offer Engine Updated!',
        description: 'All storefront channels, delivery bars, and coupons synchronized.',
        tone: 'success',
      });
    } catch (err: any) {
      pushToast({
        title: 'Save Failed',
        description: err.message,
        tone: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  // Coupon Handlers
  const handleToggleCoupon = (index: number) => {
    if (!config) return;
    const updated = [...config.coupons];
    updated[index].isActive = !updated[index].isActive;
    setConfig({ ...config, coupons: updated });
    markDirty();
  };

  const handleDeleteCoupon = (index: number) => {
    if (!config) return;
    const code = config.coupons[index].code;
    const updated = config.coupons.filter((_, i) => i !== index);
    setConfig({ ...config, coupons: updated });
    markDirty();
    pushToast({ title: `Coupon "${code}" removed`, tone: 'info' });
  };

  const handleAddCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    const trimmedCode = newCoupon.code.trim().toUpperCase();
    if (!trimmedCode) {
      pushToast({ title: 'Coupon code is required', tone: 'danger' });
      return;
    }

    if (config.coupons.some((c) => c.code === trimmedCode)) {
      pushToast({ title: `Coupon "${trimmedCode}" already exists!`, tone: 'danger' });
      return;
    }

    const created = {
      ...newCoupon,
      code: trimmedCode,
      value: Number(newCoupon.value) || 0,
      minSubtotal: Number(newCoupon.minSubtotal) || 0,
      maxDiscount: Number(newCoupon.maxDiscount) || 0,
    };

    setConfig({
      ...config,
      coupons: [created, ...config.coupons],
    });

    setShowAddCoupon(false);
    setNewCoupon({
      code: '',
      type: 'percentage',
      value: 10,
      description: '',
      minSubtotal: 0,
      maxDiscount: 0,
      allowOnBundles: false,
      isActive: true,
    });
    markDirty();
    pushToast({ title: `Coupon "${trimmedCode}" created successfully!`, tone: 'success' });
  };

  if (loading || !config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
        <p className="text-sm font-medium text-[#8A8F98]">Loading Universal Offer Engine...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* ── Top Header & Global Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-100 text-white">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-[#F7F8F8] tracking-tight">
              Universal Offer & Promotion Center
            </h1>
          </div>
          <p className="text-sm text-[#8A8F98] mt-1">
            WordPress/WooCommerce-style all-in-one offer manager: live synchronization across Top Bar, Cart, Bundles & Checkout.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/70 text-amber-300 border border-amber-800/40 animate-pulse">
              <AlertCircle className="w-3.5 h-3.5" />
              Unsaved Changes
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-white/90 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All Changes
          </button>
        </div>
      </div>

      {/* ── WordPress-Style Navigation Tabs ── */}
      <div className="flex overflow-x-auto gap-2 border-b border-[#232636] pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('coupons')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'coupons'
              ? 'border-white text-white bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]/10'
              : 'border-transparent text-[#8A8F98] hover:text-[#F7F8F8] hover:border-white/[0.15]'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Coupons & Vouchers</span>
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-[#10121b] border border-[#232636] text-[#8A8F98] font-bold">
            {config.coupons.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('topbar')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'topbar'
              ? 'border-white text-white bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]/10'
              : 'border-transparent text-[#8A8F98] hover:text-[#F7F8F8] hover:border-white/[0.15]'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Top Bar Delivery Perks</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bundles')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'bundles'
              ? 'border-white text-white bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]/10'
              : 'border-transparent text-[#8A8F98] hover:text-[#F7F8F8] hover:border-white/[0.15]'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>Bundles & Combos Engine</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('anticonflict')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'anticonflict'
              ? 'border-white text-white bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]/10'
              : 'border-transparent text-[#8A8F98] hover:text-[#F7F8F8] hover:border-white/[0.15]'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-emerald-600" />
          <span>Anti-Conflict & Free Shipping Rules</span>
        </button>
      </div>

      {/* ── TAB 1: COUPONS & VOUCHERS ── */}
      {activeTab === 'coupons' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#F7F8F8]">Promo Coupons</h2>
              <p className="text-xs text-[#8A8F98]">
                Manage discounts applicable at Cart Drawer and Checkout.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddCoupon(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              Add New Coupon
            </button>
          </div>

          {/* New Coupon Modal / Form Drawer */}
          {showAddCoupon && (
            <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-700" /> Create New Coupon Voucher
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddCoupon(false)}
                  className="text-xs text-[#8A8F98] hover:text-[#F7F8F8] font-semibold"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleAddCouponSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-xs font-bold text-[#8A8F98] mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SUMMER15"
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg border border-[#232636] bg-[#10121b] text-[#F7F8F8] text-sm font-mono font-bold uppercase focus:ring-1 focus:ring-white/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8A8F98] mb-1">Discount Type</label>
                  <select
                    value={newCoupon.type}
                    onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-[#232636] bg-[#10121b] text-[#F7F8F8] text-sm focus:ring-1 focus:ring-white/20 outline-none"
                  >
                    <option value="percentage">% Percentage Discount</option>
                    <option value="flat">৳ Fixed Flat Amount</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8A8F98] mb-1">
                    Value {newCoupon.type === 'percentage' ? '(%)' : '(৳)'} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={newCoupon.type === 'percentage' ? '100' : '10000'}
                    required
                    value={newCoupon.value}
                    onChange={(e) => setNewCoupon({ ...newCoupon, value: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-[#232636] bg-[#10121b] text-[#F7F8F8] text-sm font-bold focus:ring-1 focus:ring-white/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8A8F98] mb-1">Min Subtotal (৳)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 = No minimum"
                    value={newCoupon.minSubtotal || ''}
                    onChange={(e) => setNewCoupon({ ...newCoupon, minSubtotal: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-[#232636] bg-[#10121b] text-[#F7F8F8] text-sm focus:ring-1 focus:ring-white/20 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#8A8F98] mb-1">Customer Description</label>
                  <input
                    type="text"
                    placeholder="e.g. 15% off on summer essentials"
                    value={newCoupon.description}
                    onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#232636] bg-[#10121b] text-[#F7F8F8] text-sm focus:ring-1 focus:ring-white/20 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="new-allowOnBundles"
                    checked={newCoupon.allowOnBundles}
                    onChange={(e) => setNewCoupon({ ...newCoupon, allowOnBundles: e.target.checked })}
                    className="rounded border-[#232636] text-white focus:ring-white/20"
                  />
                  <label htmlFor="new-allowOnBundles" className="text-xs font-semibold text-[#8A8F98]">
                    Allow Stacking on Bundles
                  </label>
                </div>

                <div className="flex items-end justify-end">
                  <button
                    type="submit"
                    className="w-full py-2 px-4 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                  >
                    Save & Activate
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Coupon Table */}
          <div className="overflow-hidden rounded-2xl border border-[#232636] bg-[#161824] shadow-xs">
            <table className="min-w-full divide-y divide-[#232636] text-left text-xs">
              <thead className="bg-[#10121b] text-[#8A8F98] font-bold uppercase tracking-wider text-[11px] border-b border-[#232636]">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Type & Value</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Anti-Stacking Rule</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232636]">
                {config.coupons.map((coupon, idx) => (
                  <tr key={coupon.code} className="hover:bg-[#1b1e2c]/70 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-[#F7F8F8] text-sm">
                      <span className="px-2 py-1 rounded-md bg-[#10121b] border border-[#232636] text-[#F7F8F8]">
                        {coupon.code}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-[#F7F8F8]">
                      {coupon.type === 'percentage' ? (
                        <span className="text-emerald-700 font-bold">{coupon.value}% Off</span>
                      ) : (
                        <span className="text-blue-700 font-bold">৳{coupon.value} Flat Off</span>
                      )}
                      {coupon.minSubtotal ? (
                        <span className="block text-[11px] text-[#8A8F98] font-normal">
                          Min: {formatPrice(coupon.minSubtotal)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 text-[#8A8F98] max-w-xs truncate">
                      {coupon.description || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {coupon.allowOnBundles ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          Stacks with Bundles
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Regular Items Only (Safe)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleCoupon(idx)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                          coupon.isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-[#10121b] text-[#8A8F98] hover:bg-white/[0.12]'
                        }`}
                      >
                        {coupon.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteCoupon(idx)}
                        className="p-1.5 text-[#62666d] hover:text-red-600 rounded-lg hover:bg-rose-500/10 transition-colors"
                        title="Delete coupon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: TOP BAR DELIVERY ANNOUNCEMENTS ── */}
      {activeTab === 'topbar' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#F7F8F8]">Seed Product Top Bar (Live Delivery Perks)</h2>
              <p className="text-xs text-[#8A8F98]">
                Configure the dynamic 3-tier canonical notification strip shown at the top of product pages.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-[#8A8F98]">Master Switch:</label>
              <input
                type="checkbox"
                checked={config.topBar.enabled}
                onChange={(e) => {
                  setConfig({ ...config, topBar: { ...config.topBar, enabled: e.target.checked } });
                  markDirty();
                }}
                className="w-4 h-4 rounded border-[#232636] text-white focus:ring-white/20"
              />
            </div>
          </div>

          {/* Tier 1: Product Free Delivery */}
          <div className="p-5 rounded-2xl border border-[#232636] bg-[#161824] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-sm text-[#F7F8F8] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Priority 1: Product Specific Free Delivery
              </span>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#8A8F98]">
                <span>Active:</span>
                <input
                  type="checkbox"
                  checked={config.topBar.message1.active}
                  onChange={(e) => {
                    setConfig({
                      ...config,
                      topBar: {
                        ...config.topBar,
                        message1: { ...config.topBar.message1, active: e.target.checked },
                      },
                    });
                    markDirty();
                  }}
                />
              </label>
            </div>

            {/* Live Interactive Preview */}
            <div
              className="p-3 rounded-xl text-center text-xs sm:text-sm font-semibold transition-all border"
              style={{
                backgroundColor: config.topBar.message1.backgroundColor,
                color: config.topBar.message1.textColor,
              }}
            >
              {config.topBar.message1.text}
            </div>

            <div className="grid sm:grid-cols-3 gap-3 pt-2">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-[#8A8F98] mb-1">Message Text</label>
                <input
                  type="text"
                  value={config.topBar.message1.text}
                  onChange={(e) => {
                    setConfig({
                      ...config,
                      topBar: {
                        ...config.topBar,
                        message1: { ...config.topBar.message1, text: e.target.value },
                      },
                    });
                    markDirty();
                  }}
                  className="w-full px-3 py-2 rounded-lg border text-xs focus:ring-1 focus:ring-white/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8A8F98] mb-1">Colors (Bg / Text)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.topBar.message1.backgroundColor}
                    onChange={(e) => {
                      setConfig({
                        ...config,
                        topBar: {
                          ...config.topBar,
                          message1: { ...config.topBar.message1, backgroundColor: e.target.value },
                        },
                      });
                      markDirty();
                    }}
                    className="h-8 w-10 p-0 border rounded cursor-pointer"
                  />
                  <input
                    type="color"
                    value={config.topBar.message1.textColor}
                    onChange={(e) => {
                      setConfig({
                        ...config,
                        topBar: {
                          ...config.topBar,
                          message1: { ...config.topBar.message1, textColor: e.target.value },
                        },
                      });
                      markDirty();
                    }}
                    className="h-8 w-10 p-0 border rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tier 2: New Customer Delivery Offer */}
          <div className="p-5 rounded-2xl border border-[#232636] bg-[#161824] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-sm text-[#F7F8F8] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Priority 3: New Customer Delivery Tier
              </span>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#8A8F98]">
                <span>Active:</span>
                <input
                  type="checkbox"
                  checked={config.topBar.message2.active}
                  onChange={(e) => {
                    setConfig({
                      ...config,
                      topBar: {
                        ...config.topBar,
                        message2: { ...config.topBar.message2, active: e.target.checked },
                      },
                    });
                    markDirty();
                  }}
                />
              </label>
            </div>

            <div
              className="p-3 rounded-xl text-center text-xs sm:text-sm font-semibold transition-all border"
              style={{
                backgroundColor: config.topBar.message2.backgroundColor,
                color: config.topBar.message2.textColor,
              }}
            >
              {config.topBar.message2.text}
            </div>

            <div className="grid sm:grid-cols-3 gap-3 pt-2">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-[#8A8F98] mb-1">Message Text</label>
                <input
                  type="text"
                  value={config.topBar.message2.text}
                  onChange={(e) => {
                    setConfig({
                      ...config,
                      topBar: {
                        ...config.topBar,
                        message2: { ...config.topBar.message2, text: e.target.value },
                      },
                    });
                    markDirty();
                  }}
                  className="w-full px-3 py-2 rounded-lg border text-xs focus:ring-1 focus:ring-white/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8A8F98] mb-1">Colors (Bg / Text)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.topBar.message2.backgroundColor}
                    onChange={(e) => {
                      setConfig({
                        ...config,
                        topBar: {
                          ...config.topBar,
                          message2: { ...config.topBar.message2, backgroundColor: e.target.value },
                        },
                      });
                      markDirty();
                    }}
                    className="h-8 w-10 p-0 border rounded cursor-pointer"
                  />
                  <input
                    type="color"
                    value={config.topBar.message2.textColor}
                    onChange={(e) => {
                      setConfig({
                        ...config,
                        topBar: {
                          ...config.topBar,
                          message2: { ...config.topBar.message2, textColor: e.target.value },
                        },
                      });
                      markDirty();
                    }}
                    className="h-8 w-10 p-0 border rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tier 3: Returning Customer Retention */}
          <div className="p-5 rounded-2xl border border-[#232636] bg-[#161824] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-sm text-[#F7F8F8] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                Priority 2: Returning Customer Loyalty Perk
              </span>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#8A8F98]">
                <span>Active:</span>
                <input
                  type="checkbox"
                  checked={config.topBar.message3.active}
                  onChange={(e) => {
                    setConfig({
                      ...config,
                      topBar: {
                        ...config.topBar,
                        message3: { ...config.topBar.message3, active: e.target.checked },
                      },
                    });
                    markDirty();
                  }}
                />
              </label>
            </div>

            <div
              className="p-3 rounded-xl text-center text-xs sm:text-sm font-semibold transition-all border"
              style={{
                backgroundColor: config.topBar.message3.backgroundColor,
                color: config.topBar.message3.textColor,
              }}
            >
              {config.topBar.message3.text}
            </div>

            <div className="grid sm:grid-cols-3 gap-3 pt-2">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-[#8A8F98] mb-1">Message Text</label>
                <input
                  type="text"
                  value={config.topBar.message3.text}
                  onChange={(e) => {
                    setConfig({
                      ...config,
                      topBar: {
                        ...config.topBar,
                        message3: { ...config.topBar.message3, text: e.target.value },
                      },
                    });
                    markDirty();
                  }}
                  className="w-full px-3 py-2 rounded-lg border text-xs focus:ring-1 focus:ring-white/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8A8F98] mb-1">Colors (Bg / Text)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.topBar.message3.backgroundColor}
                    onChange={(e) => {
                      setConfig({
                        ...config,
                        topBar: {
                          ...config.topBar,
                          message3: { ...config.topBar.message3, backgroundColor: e.target.value },
                        },
                      });
                      markDirty();
                    }}
                    className="h-8 w-10 p-0 border rounded cursor-pointer"
                  />
                  <input
                    type="color"
                    value={config.topBar.message3.textColor}
                    onChange={(e) => {
                      setConfig({
                        ...config,
                        topBar: {
                          ...config.topBar,
                          message3: { ...config.topBar.message3, textColor: e.target.value },
                        },
                      });
                      markDirty();
                    }}
                    className="h-8 w-10 p-0 border rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: BUNDLES & COMBOS ENGINE ── */}
      {activeTab === 'bundles' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-[#F7F8F8]">VIP Real Benefit Mathematical Engine</h2>
            <p className="text-xs text-[#8A8F98]">
              Configure profit-sharing percentages for Frequently Paired and Custom VIP Bundles.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-[#232636] bg-[#161824] shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="font-bold text-sm text-[#F7F8F8]">Enable Bundles Feature</h3>
                <p className="text-xs text-[#8A8F98]">Show SeedHeroBundleCard & SeedBundleDrawer on product pages</p>
              </div>
              <input
                type="checkbox"
                checked={config.bundles.enabled}
                onChange={(e) => {
                  setConfig({
                    ...config,
                    bundles: { ...config.bundles, enabled: e.target.checked },
                  });
                  markDirty();
                }}
                className="w-5 h-5 rounded border-[#232636] text-white focus:ring-white/20"
              />
            </div>

            {/* Tier sliders */}
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="p-4 rounded-xl bg-[#10121b] border border-[#232636]">
                <label className="block text-xs font-bold text-[#8A8F98] mb-1">
                  2-Step Bundle Profit Share (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={config.bundles.twoStepDiscountPercent}
                    onChange={(e) => {
                      setConfig({
                        ...config,
                        bundles: { ...config.bundles, twoStepDiscountPercent: Number(e.target.value) },
                      });
                      markDirty();
                    }}
                    className="w-20 px-3 py-2 rounded-lg border border-[#232636] bg-[#161824] text-[#F7F8F8] font-bold text-sm outline-none focus:border-white"
                  />
                  <span className="text-xs font-semibold text-[#8A8F98]">% of Real Profit</span>
                </div>
                <p className="text-[11px] text-[#8A8F98] mt-2">
                  Customer gets {config.bundles.twoStepDiscountPercent}% of net profit; store retains {100 - config.bundles.twoStepDiscountPercent}%.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#10121b] border border-[#232636]">
                <label className="block text-xs font-bold text-[#8A8F98] mb-1">
                  3-Step Bundle Profit Share (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="10"
                    max="60"
                    value={config.bundles.threeStepDiscountPercent}
                    onChange={(e) => {
                      setConfig({
                        ...config,
                        bundles: { ...config.bundles, threeStepDiscountPercent: Number(e.target.value) },
                      });
                      markDirty();
                    }}
                    className="w-20 px-3 py-2 rounded-lg border border-[#232636] bg-[#161824] text-[#F7F8F8] font-bold text-sm outline-none focus:border-white"
                  />
                  <span className="text-xs font-semibold text-[#8A8F98]">% of Real Profit</span>
                </div>
                <p className="text-[11px] text-[#8A8F98] mt-2">
                  Customer gets {config.bundles.threeStepDiscountPercent}% of net profit; store retains {100 - config.bundles.threeStepDiscountPercent}%.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#10121b] border border-[#232636]">
                <label className="block text-xs font-bold text-[#8A8F98] mb-1">
                  4+ Step VIP Profit Share (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="15"
                    max="70"
                    value={config.bundles.fourStepDiscountPercent}
                    onChange={(e) => {
                      setConfig({
                        ...config,
                        bundles: { ...config.bundles, fourStepDiscountPercent: Number(e.target.value) },
                      });
                      markDirty();
                    }}
                    className="w-20 px-3 py-2 rounded-lg border border-[#232636] bg-[#161824] text-[#F7F8F8] font-bold text-sm outline-none focus:border-white"
                  />
                  <span className="text-xs font-semibold text-[#8A8F98]">% of Real Profit</span>
                </div>
                <p className="text-[11px] text-[#8A8F98] mt-2">
                  VIP tier: customer gets {config.bundles.fourStepDiscountPercent}%; store retains {100 - config.bundles.fourStepDiscountPercent}%.
                </p>
              </div>
            </div>

            {/* Fallback Cost Ratio */}
            <div className="p-4 rounded-xl bg-[#10121b] border border-[#232636] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-[#F7F8F8]">Fallback Purchase Cost Benchmark (%)</h4>
                <p className="text-[11px] text-[#8A8F98]">
                  When admin does not provide product costPrice, this percentage of selling price is assumed as cost (protects zero-loss margin).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="20"
                  max="90"
                  value={config.bundles.estimatedCostRatio}
                  onChange={(e) => {
                    setConfig({
                      ...config,
                      bundles: { ...config.bundles, estimatedCostRatio: Number(e.target.value) },
                    });
                    markDirty();
                  }}
                  className="w-20 px-3 py-1.5 rounded-lg border font-bold text-xs bg-[#161824]"
                />
                <span className="text-xs font-bold text-[#8A8F98]">%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: ANTI-CONFLICT & FREE SHIPPING RULES ── */}
      {activeTab === 'anticonflict' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-[#F7F8F8]">Universal Free Shipping & Anti-Conflict Gate</h2>
            <p className="text-xs text-[#8A8F98]">
              Control the canonical thresholds applied across Top Bar, Cart Drawer progress bar, and checkout.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-[#232636] bg-[#161824] shadow-xs space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              
              {/* Nationwide Free Delivery Threshold */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-emerald-950">
                    Nationwide Free Delivery Threshold (৳)
                  </label>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                    Active Standard
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#8A8F98]">৳</span>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={config.freeDelivery.nationwideThreshold}
                    onChange={(e) => {
                      setConfig({
                        ...config,
                        freeDelivery: {
                          ...config.freeDelivery,
                          nationwideThreshold: Number(e.target.value),
                        },
                      });
                      markDirty();
                    }}
                    className="w-full px-3 py-2 rounded-lg border font-bold text-sm bg-[#161824] focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>
                <p className="text-[11px] text-[#8A8F98] mt-2">
                  Orders equal to or exceeding this subtotal qualify for 100% Free Nationwide Delivery across Bangladesh.
                </p>
              </div>

              {/* Dhaka Metro Free Delivery Threshold */}
              <div className="p-4 rounded-xl border border-[#5e6ad2]/20 bg-[#5e6ad2]/10/50">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-blue-950">
                    Dhaka Metro Free Delivery Threshold (৳)
                  </label>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-200 text-blue-900">
                    City Tier
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#8A8F98]">৳</span>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={config.freeDelivery.dhakaThreshold}
                    onChange={(e) => {
                      setConfig({
                        ...config,
                        freeDelivery: {
                          ...config.freeDelivery,
                          dhakaThreshold: Number(e.target.value),
                        },
                      });
                      markDirty();
                    }}
                    className="w-full px-3 py-2 rounded-lg border font-bold text-sm bg-[#161824] focus:ring-1 focus:ring-blue-600 outline-none"
                  />
                </div>
                <p className="text-[11px] text-[#8A8F98] mt-2">
                  Orders inside Dhaka metro area qualify for free delivery when reaching this threshold.
                </p>
              </div>
            </div>

            {/* Anti-Stacking Master Gate */}
            <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/10/50 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-950">
                      Strict Anti-Stacking Guard (Recommended)
                    </h4>
                    <p className="text-xs text-amber-900/80 mt-1 leading-relaxed">
                      When enabled, promotional coupon codes apply <strong>strictly to regular products</strong>. If a customer adds a promotional bundle (which already has a 15%–30% profit discount), coupon discounts will not be double-dipped on the bundle portion, completely protecting your business margin.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.antiConflict.strictAntiStacking}
                  onChange={(e) => {
                    setConfig({
                      ...config,
                      antiConflict: {
                        ...config.antiConflict,
                        strictAntiStacking: e.target.checked,
                      },
                    });
                    markDirty();
                  }}
                  className="w-5 h-5 rounded border-amber-300 text-white focus:ring-white/20 mt-1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky Bottom Save Bar ── */}
      {hasChanges && (
        <div className="sticky bottom-6 p-4 rounded-2xl bg-[#141210] text-white shadow-xl flex items-center justify-between gap-4 z-40 animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-semibold">You have unsaved changes in Universal Offer Engine.</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchConfig}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 transition-all"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-white/90 text-white transition-all shadow-sm"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Changes
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
