'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Gift, ShoppingBag, X, Check, AlertTriangle, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface Notification {
  id:           string;
  type:         string;
  title:        string;
  message:      string;
  isRead:       boolean;
  createdAt:    string;
  order?:       { orderNumber: string; total: number } | null;
  productId?:   string | null;
  productName?: string | null;
  sellingPrice?: number | null;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) === 1 ? '' : 's'} ago`;
}

export default function AdminNotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [open,          setOpen]          = useState(false);
  const [loading,       setLoading]       = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Quick Modal State for Missing Cost Price
  const [selectedMissingCostProduct, setSelectedMissingCostProduct] = useState<{
    id: string;
    name: string;
    sellingPrice: number;
    notificationId: string;
  } | null>(null);

  const [quickCostPrice, setQuickCostPrice] = useState<string>('');
  const [savingCost, setSavingCost] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications?limit=15', {
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch { /* silent */ }
  }, []);

  // Poll every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = async () => {
    setLoading(true);
    try {
      await fetch('/api/admin/notifications', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      // Unread count keeps missing cost alerts since they require fixing
      const missingAlerts = notifications.filter((n) => n.type === 'MISSING_COST_PRICE').length;
      setUnreadCount(missingAlerts);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id: string) => {
    await fetch('/api/admin/notifications', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ids: [id] }),
    });
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, isRead: true } : n)
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleNotificationClick = async (n: Notification) => {
    if (n.type === 'MISSING_COST_PRICE' && n.productId) {
      setSelectedMissingCostProduct({
        id: n.productId,
        name: n.productName || 'This Product',
        sellingPrice: n.sellingPrice || 0,
        notificationId: n.id,
      });
      setQuickCostPrice('');
      setSaveSuccess(null);
      setSaveError(null);
      setOpen(false);
      return;
    }

    if (!n.isRead) await markRead(n.id);
    if (n.order) {
      router.push(`/admin/orders?search=${n.order.orderNumber}`);
      setOpen(false);
    }
  };

  const handleSaveQuickCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMissingCostProduct) return;
    const cost = parseFloat(quickCostPrice);
    if (Number.isNaN(cost) || cost < 0) {
      setSaveError('Please enter a valid cost price (0 or higher).');
      return;
    }

    setSavingCost(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/products/${selectedMissingCostProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ costPrice: cost }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update cost price');
      }

      setSaveSuccess('Cost price saved successfully!');
      // Instantly remove alert from local state
      setNotifications((prev) =>
        prev.filter((n) => n.id !== selectedMissingCostProduct.notificationId)
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      setTimeout(() => {
        setSelectedMissingCostProduct(null);
      }, 700);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingCost(false);
    }
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Bell button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          aria-haspopup="true"
          aria-expanded={open}
          aria-controls="admin-notifications-panel"
          onClick={() => { setOpen((o) => !o); if (!open) fetchNotifications(); }}
          className="relative text-[#8a8f98] hover:bg-[#10121b] hover:text-[#d0d6e0]"
        >
          <Bell className="w-5 h-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-xs" aria-hidden="true">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>

        {/* Dropdown */}
        {open && (
          <div id="admin-notifications-panel" role="region" aria-label="Notifications" className="absolute right-0 top-full mt-2 w-84 bg-[#161824] rounded-2xl shadow-2xl border border-[#232636] overflow-hidden z-50">

            {/* Header */}
            <div className="px-4 py-3 border-b border-[#232636] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#f7f8f8]">Notifications & Alerts</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={markAllRead}
                    disabled={loading}
                    className="px-2 text-xs text-white hover:bg-transparent hover:text-white-hover"
                  >
                    <Check className="w-3 h-3 mr-1" aria-hidden="true" />
                    Mark read
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Close notifications"
                  onClick={() => setOpen(false)}
                  className="text-[#62666d] hover:text-[#8a8f98]"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-[#62666d]">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" aria-hidden="true" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <Button
                    key={n.id}
                    type="button"
                    variant="ghost"
                    fullWidth
                    onClick={() => handleNotificationClick(n)}
                    className={`min-h-0 justify-start rounded-none border-b border-[#232636]/60 px-4 py-3 text-left font-normal transition-colors ${
                      n.type === 'MISSING_COST_PRICE'
                        ? 'bg-amber-500/[0.04] hover:bg-amber-500/[0.09]'
                        : !n.isRead ? 'bg-white/[0.02] hover:bg-white/[0.05]' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      n.type === 'MISSING_COST_PRICE'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : n.type === 'GIFT_ORDER'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-[#1b1e2c] text-white'
                    }`}>
                      {n.type === 'MISSING_COST_PRICE' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400" aria-hidden="true" />
                      ) : n.type === 'GIFT_ORDER' ? (
                        <Gift className="w-4 h-4 text-white" aria-hidden="true" />
                      ) : (
                        <ShoppingBag className="w-4 h-4 text-white" aria-hidden="true" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 ml-3">
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-semibold truncate ${
                          n.type === 'MISSING_COST_PRICE' ? 'text-amber-300' : 'text-[#f7f8f8]'
                        }`}>
                          {n.title}
                        </p>
                        {n.type === 'MISSING_COST_PRICE' && (
                          <span className="flex-shrink-0 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-bold">
                            Click to Add
                          </span>
                        )}
                        {n.type === 'GIFT_ORDER' && (
                          <span className="flex-shrink-0 text-xs bg-admin-panel text-white px-1.5 py-0.5 rounded-full font-medium">
                            🎁 Gift
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8a8f98] mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[11px] text-[#62666d] mt-1">{timeAgo(n.createdAt)}</p>
                    </div>

                    {/* Unread dot */}
                    {!n.isRead && n.type !== 'MISSING_COST_PRICE' && (
                      <div className="w-2 h-2 bg-[#5e6ad2] rounded-full mt-1 ml-2 flex-shrink-0" />
                    )}
                  </Button>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-[#232636] flex items-center justify-between text-xs">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { router.push('/admin/products'); setOpen(false); }}
                  className="px-2 text-xs font-medium text-[#8a8f98] hover:text-white"
                >
                  Manage Products
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { router.push('/admin/orders'); setOpen(false); }}
                  className="px-2 text-xs font-medium text-white hover:text-white-hover"
                >
                  View Orders →
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 1-Click Quick Add Cost Price Modal ── */}
      {selectedMissingCostProduct && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[#161824] rounded-2xl border border-[#232636] shadow-2xl p-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F7F8F8]">Set Product Cost Price</h3>
                  <p className="text-xs text-[#8A8F98]">Protect profit margins for bundle calculations</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMissingCostProduct(null)}
                className="text-[#62666D] hover:text-[#D0D6E0] p-1 rounded-md transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Info Card */}
            <div className="p-3.5 rounded-xl bg-[#10121B] border border-[#232636] mb-4 space-y-1">
              <p className="text-xs text-[#8A8F98]">Product Name</p>
              <p className="text-sm font-semibold text-[#F7F8F8] line-clamp-1">{selectedMissingCostProduct.name}</p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-[#8A8F98]">Current Selling Price:</span>
                <span className="text-sm font-bold text-emerald-400">৳{selectedMissingCostProduct.sellingPrice}</span>
              </div>
            </div>

            {/* Cost Input Form */}
            <form onSubmit={handleSaveQuickCost} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#D0D6E0] mb-1.5">
                  Purchase / Cost Price (৳) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    autoFocus
                    value={quickCostPrice}
                    onChange={(e) => {
                      setQuickCostPrice(e.target.value);
                      setSaveError(null);
                    }}
                    placeholder={`e.g. ${Math.round(selectedMissingCostProduct.sellingPrice * 0.7)}`}
                    className="w-full px-3.5 py-2.5 bg-[#10121B] border border-[#232636] rounded-xl text-[#F7F8F8] font-bold text-sm focus:border-white focus:outline-none placeholder:text-[#62666D]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8A8F98]">
                    BDT
                  </span>
                </div>

                {/* Quick preset buttons */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-[#8A8F98]">Quick Fill:</span>
                  {[60, 70, 75].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setQuickCostPrice(String(Math.round(selectedMissingCostProduct.sellingPrice * (pct / 100))))}
                      className="px-2 py-0.5 rounded bg-[#10121B] border border-[#232636] text-[11px] text-[#D0D6E0] hover:text-white hover:border-white/40 transition"
                    >
                      {pct}% (৳{Math.round(selectedMissingCostProduct.sellingPrice * (pct / 100))})
                    </button>
                  ))}
                </div>

                {/* Live Margin Calculation */}
                {Number(quickCostPrice) > 0 && (
                  <div className="mt-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs flex items-center justify-between">
                    <span className="text-[#8A8F98]">Gross Margin:</span>
                    <span className={`font-bold ${
                      selectedMissingCostProduct.sellingPrice - Number(quickCostPrice) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      ৳{(selectedMissingCostProduct.sellingPrice - Number(quickCostPrice)).toFixed(2)} ({
                        selectedMissingCostProduct.sellingPrice > 0
                          ? `${(((selectedMissingCostProduct.sellingPrice - Number(quickCostPrice)) / selectedMissingCostProduct.sellingPrice) * 100).toFixed(1)}%`
                          : '0%'
                      })
                    </span>
                  </div>
                )}
              </div>

              {saveError && (
                <p className="text-xs text-rose-400 font-medium">{saveError}</p>
              )}
              {saveSuccess && (
                <p className="text-xs text-emerald-400 font-medium">{saveSuccess}</p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 gap-3">
                <Link
                  href={`/admin/products/${selectedMissingCostProduct.id}/edit`}
                  onClick={() => setSelectedMissingCostProduct(null)}
                  className="text-xs text-[#8A8F98] hover:text-white transition flex items-center gap-1"
                >
                  Full Product Editor <ExternalLink className="w-3 h-3" />
                </Link>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMissingCostProduct(null)}
                    className="text-xs text-[#8A8F98] hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={savingCost || !quickCostPrice}
                    className="bg-[#5e6ad2] hover:bg-[#6d78d5] text-white text-xs font-semibold px-4 py-2 rounded-lg"
                  >
                    {savingCost ? 'Saving...' : 'Save Cost Price'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
