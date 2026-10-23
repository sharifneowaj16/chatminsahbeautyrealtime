'use client';

import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  DollarSign,
  ShieldAlert,
  Send,
  MessageSquare,
  Volume2,
  Sliders,
  Filter,
  Check,
  Trash2,
  ExternalLink,
  ChevronRight,
  Clock
} from 'lucide-react';

interface NotificationItem {
  id: string;
  category: 'Orders' | 'Stock' | 'Financials' | 'Security';
  title: string;
  description: string;
  timestamp: string;
  unread: boolean;
  severity: 'normal' | 'warning' | 'critical';
  actionLabel?: string;
  actionUrl?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  { id: 'NOTIF-01', category: 'Orders', title: 'High-Value Order Received: #ORD-2851', description: 'Fatima Rahman placed an order of ৳8,450 via bKash. Requires priority packing.', timestamp: '5 mins ago', unread: true, severity: 'normal', actionLabel: 'View Order', actionUrl: '/admin/orders' },
  { id: 'NOTIF-02', category: 'Stock', title: 'Low Stock Alert: Centella Calming Toner', description: 'Only 3 units left in Dhanmondi Hub. Recommended restock quantity: 50 units.', timestamp: '15 mins ago', unread: true, severity: 'warning', actionLabel: 'Restock SKU', actionUrl: '/admin/inventory' },
  { id: 'NOTIF-03', category: 'Financials', title: 'Steadfast Courier COD Payout Reconciled', description: 'Batch #ST-9912 payout of ৳1,45,200 transferred to City Bank account.', timestamp: '1 hour ago', unread: true, severity: 'normal', actionLabel: 'Check Ledger', actionUrl: '/admin/finance' },
  { id: 'NOTIF-04', category: 'Security', title: 'Multiple Failed Admin Login Attempts', description: 'IP 103.114.22.84 tried logging into admin panel 5 times. Temporarily rate-limited.', timestamp: '3 hours ago', unread: false, severity: 'critical', actionLabel: 'Inspect IP', actionUrl: '/admin/audit-logs' },
  { id: 'NOTIF-05', category: 'Orders', title: 'Courier Return Notice: #ORD-2839', description: 'Customer unreachable after 3 attempts in Chittagong. Parcel returning to warehouse.', timestamp: '5 hours ago', unread: false, severity: 'warning', actionLabel: 'Call Customer', actionUrl: '/admin/orders' },
  { id: 'NOTIF-06', category: 'Stock', title: 'Cosmetics Expiry Watch: Vitamin C Serum', description: 'Batch #LOT-442 expires in 60 days. Suggest running a promotional discount.', timestamp: 'Yesterday', unread: false, severity: 'warning', actionLabel: 'Create Promo', actionUrl: '/admin/promotions' },
  { id: 'NOTIF-07', category: 'Financials', title: 'Tax (VAT) Monthly Liability Snapshot Ready', description: 'NBR Form 9.1 calculation generated for October. Due date Nov 15.', timestamp: '2 days ago', unread: false, severity: 'normal', actionLabel: 'View VAT', actionUrl: '/admin/tax-settings' },
];

export default function NotificationCenterPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<'All' | 'Orders' | 'Stock' | 'Financials' | 'Security'>('All');
  const [telegramActive, setTelegramActive] = useState(true);
  const [whatsappActive, setWhatsappActive] = useState(true);
  const [soundActive, setSoundActive] = useState(true);
  const [stockThreshold, setStockThreshold] = useState(5);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/notifications?limit=50');
      if (res.ok) {
        const data = await res.json();
        if (data.notifications && data.notifications.length > 0) {
          const mapped: NotificationItem[] = data.notifications.map((n: any) => {
            let category: 'Orders' | 'Stock' | 'Financials' | 'Security' = 'Orders';
            let severity: 'normal' | 'warning' | 'critical' = 'normal';
            let actionLabel = 'View Details';
            let actionUrl = '/admin/orders';

            if (n.type === 'MISSING_COST_PRICE' || n.type?.includes('STOCK')) {
              category = 'Stock';
              severity = 'warning';
              actionLabel = 'Update SKU';
              actionUrl = '/admin/inventory';
            } else if (n.type?.includes('SECURITY') || n.type?.includes('AUTH')) {
              category = 'Security';
              severity = 'critical';
              actionLabel = 'Inspect';
              actionUrl = '/admin/audit-logs';
            } else if (n.type?.includes('PAYMENT') || n.type?.includes('COD') || n.type?.includes('FINANCE')) {
              category = 'Financials';
              severity = 'normal';
              actionLabel = 'Check Ledger';
              actionUrl = '/admin/finance';
            }

            return {
              id: n.id,
              category,
              title: n.title,
              description: n.message,
              timestamp: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              unread: !n.isRead,
              severity,
              actionLabel,
              actionUrl,
            };
          });
          setNotifications(mapped);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch notifications from DB, retaining cache', err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadNotifications();
  }, []);

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    try {
      await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      showToast('All notifications marked as read in database');
    } catch {
      showToast('All notifications marked as read');
    }
  };

  const toggleRead = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    const newStatus = target ? !target.unread : false;

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: newStatus } : n))
    );

    if (newStatus === false) {
      try {
        await fetch('/api/admin/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [id] }),
        });
      } catch (e) {
        console.warn('Failed to update notification status on backend', e);
      }
    }
  };

  const filteredNotifications = notifications.filter(
    (n) => activeTab === 'All' || n.category === activeTab
  );

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="min-h-screen bg-[#051424] text-[#d4e4fa] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#00a572] text-[#002113] font-semibold px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#273647]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#c0c1ff] uppercase tracking-wider mb-1">
            <Bell className="w-4 h-4" />
            <span>Minsah Operations // Real-time Alert Dispatcher</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#ffffff] tracking-tight">
              Notification & Alert Center
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#c0c1ff] text-[#07006c]">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#908fa0] mt-0.5">
            Omnichannel alert routing for order spikes, stockouts, courier deliveries, and security.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={markAllRead}
            className="px-3.5 py-2 bg-[#1c2b3c] hover:bg-[#273647] border border-[#464554] text-[#d4e4fa] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Check className="w-4 h-4 text-[#4edea3]" />
            <span>Mark All as Read</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left 65% Feed, Right 35% Channel Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Notification Feed */}
        <div className="lg:col-span-8 space-y-4">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 bg-[#122131] p-1.5 rounded-xl border border-[#273647] text-xs">
            {(['All', 'Orders', 'Stock', 'Financials', 'Security'] as const).map((tab) => {
              const count =
                tab === 'All'
                  ? notifications.length
                  : notifications.filter((n) => n.category === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                    activeTab === tab
                      ? 'bg-[#c0c1ff] text-[#07006c] font-bold shadow-xs'
                      : 'text-[#908fa0] hover:text-[#ffffff] hover:bg-[#1c2b3c]'
                  }`}
                >
                  <span>{tab}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeTab === tab
                        ? 'bg-[#07006c]/20 text-[#07006c]'
                        : 'bg-[#051424] text-[#908fa0]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Feed List */}
          <div className="space-y-2.5">
            {filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => toggleRead(notif.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  notif.unread
                    ? 'bg-[#122131] border-[#c0c1ff]/40 shadow-sm'
                    : 'bg-[#051424]/80 border-[#273647] opacity-80 hover:opacity-100'
                }`}
              >
                {/* Category Icon */}
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    notif.category === 'Orders'
                      ? 'bg-[#00a572]/20 text-[#4edea3]'
                      : notif.category === 'Stock'
                      ? 'bg-[#ec6a06]/20 text-[#ffb690]'
                      : notif.category === 'Financials'
                      ? 'bg-[#494bd6]/20 text-[#c0c1ff]'
                      : 'bg-[#93000a]/20 text-[#ffb4ab]'
                  }`}
                >
                  {notif.category === 'Orders' && <ShoppingBag className="w-5 h-5" />}
                  {notif.category === 'Stock' && <AlertTriangle className="w-5 h-5" />}
                  {notif.category === 'Financials' && <DollarSign className="w-5 h-5" />}
                  {notif.category === 'Security' && <ShieldAlert className="w-5 h-5" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3
                      className={`text-xs sm:text-sm font-bold truncate ${
                        notif.unread ? 'text-[#ffffff]' : 'text-[#d4e4fa]'
                      }`}
                    >
                      {notif.title}
                    </h3>
                    <span className="text-[10px] font-mono text-[#908fa0] shrink-0">
                      {notif.timestamp}
                    </span>
                  </div>

                  <p className="text-xs text-[#908fa0] line-clamp-2 leading-relaxed">
                    {notif.description}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          notif.severity === 'critical'
                            ? 'bg-[#93000a]/30 text-[#ffb4ab]'
                            : notif.severity === 'warning'
                            ? 'bg-[#ec6a06]/30 text-[#ffb690]'
                            : 'bg-[#00a572]/30 text-[#4edea3]'
                        }`}
                      >
                        {notif.category}
                      </span>
                      {notif.unread && (
                        <span className="w-2 h-2 rounded-full bg-[#c0c1ff] animate-ping" />
                      )}
                    </div>

                    {notif.actionLabel && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          showToast(`Navigating to ${notif.actionLabel}...`);
                        }}
                        className="text-xs text-[#c0c1ff] hover:text-[#ffffff] font-semibold flex items-center gap-1 group-hover:underline"
                      >
                        <span>{notif.actionLabel}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (4 cols): Multichannel Settings */}
        <div className="lg:col-span-4 space-y-6">
          {/* Dispatch Channels */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2">
              <Send className="w-4 h-4 text-[#4edea3]" />
              <span>Instant Alert Routing</span>
            </h3>

            {/* Telegram Bot */}
            <div className="p-3 rounded-lg bg-[#051424] border border-[#273647] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#229ED9]/20 text-[#229ED9] flex items-center justify-center font-bold text-xs">
                  TG
                </div>
                <div>
                  <div className="text-xs font-bold text-[#ffffff]">Telegram Admin Bot</div>
                  <div className="text-[10px] text-[#4edea3]">@MinsahBeautyOpsBot (Active)</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={telegramActive}
                onChange={() => setTelegramActive(!telegramActive)}
                className="w-4 h-4 accent-[#4edea3] rounded cursor-pointer"
              />
            </div>

            {/* WhatsApp Business */}
            <div className="p-3 rounded-lg bg-[#051424] border border-[#273647] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#25D366]/20 text-[#25D366] flex items-center justify-center font-bold text-xs">
                  WA
                </div>
                <div>
                  <div className="text-xs font-bold text-[#ffffff]">WhatsApp Manager API</div>
                  <div className="text-[10px] text-[#908fa0]">Priority Order Escalation</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={whatsappActive}
                onChange={() => setWhatsappActive(!whatsappActive)}
                className="w-4 h-4 accent-[#4edea3] rounded cursor-pointer"
              />
            </div>

            {/* Sound Toggle */}
            <div className="p-3 rounded-lg bg-[#051424] border border-[#273647] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-5 h-5 text-[#c0c1ff]" />
                <div>
                  <div className="text-xs font-bold text-[#ffffff]">Live Audio Chime</div>
                  <div className="text-[10px] text-[#908fa0]">Play chime on new order</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={soundActive}
                onChange={() => setSoundActive(!soundActive)}
                className="w-4 h-4 accent-[#4edea3] rounded cursor-pointer"
              />
            </div>

            <button
              onClick={() => showToast('Test ping sent to Telegram and WhatsApp!')}
              className="w-full py-2 bg-[#1c2b3c] hover:bg-[#273647] border border-[#4edea3]/40 text-[#4edea3] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Test Ping</span>
            </button>
          </div>

          {/* Threshold Sliders */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#c0c1ff]" />
              <span>Threshold Triggers</span>
            </h3>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#908fa0]">Low Stock Warning Trigger</span>
                <span className="font-mono font-bold text-[#ffffff]">{stockThreshold} Units</span>
              </div>
              <input
                type="range"
                min={1}
                max={25}
                value={stockThreshold}
                onChange={(e) => setStockThreshold(Number(e.target.value))}
                className="w-full accent-[#4edea3] cursor-pointer"
              />
              <p className="text-[10px] text-[#908fa0] mt-1">
                Triggers yellow alert when inventory falls below {stockThreshold} pieces.
              </p>
            </div>

            <div className="pt-3 border-t border-[#273647]">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#908fa0]">High-Value Order Alert</span>
                <span className="font-mono font-bold text-[#4edea3]">৳ 5,000+</span>
              </div>
              <p className="text-[10px] text-[#908fa0]">
                Sends push alert directly to finance & fulfillment manager.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
