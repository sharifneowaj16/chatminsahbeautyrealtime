'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Heart,
  MapPin,
  Star,
  Users,
  Truck,
  CheckCircle2,
  ChevronRight,
  BarChart3,
  Sparkles,
  ArrowRight,
  Trophy,
  Package,
  Bell,
  ShieldCheck,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useAuth, useUserPermissions } from '@/contexts/AuthContext';
import { BentoLoyaltyRedeemModal } from '@/components/loyalty/BentoLoyaltyRedeemModal';
import { TierVoucherBreakdownModal } from '@/components/loyalty/TierVoucherBreakdownModal';

// ── Icon map ──────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  ShoppingBag,
  Heart,
  MapPin,
  Star,
  Users,
  Truck,
  CheckCircle: CheckCircle2,
  BarChart3,
  Sparkles,
  Package,
  ShieldCheck,
};

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon className={className} />;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface DashboardData {
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    createdAt: Date;
    itemCount: number;
  }>;
  wishlistItems: number;
  savedAddresses: number;
  unreadNotifications: number;
  upcomingOrderDate: Date;
  loyaltyPointsExpiring: number;
  expiryDate: Date;
}

interface QuickAction {
  name: string;
  description: string;
  href: string;
  icon: string;
  color: string;
}

interface UpcomingFeature {
  name: string;
  description: string;
  icon: string;
  progress: number;
}

interface DashboardClientProps {
  initialData: DashboardData;
  quickActions: QuickAction[];
  upcomingFeatures: UpcomingFeature[];
}

// ── Linear-Style Status badge ──────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    delivered: {
      bg: 'bg-[#27a644]/15',
      text: 'text-[#27a644]',
      border: 'border-[#27a644]/30',
    },
    shipped: {
      bg: 'bg-[#5e6ad2]/15',
      text: 'text-[#828fff]',
      border: 'border-[#5e6ad2]/30',
    },
    processing: {
      bg: 'bg-amber-500/15',
      text: 'text-amber-300',
      border: 'border-amber-500/30',
    },
    cancelled: {
      bg: 'bg-rose-500/15',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
    },
    pending: {
      bg: 'bg-[#18191a]',
      text: 'text-[#8a8f98]',
      border: 'border-[#23252a]',
    },
  };

  const style = map[status] ?? map.pending;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}
    >
      {status}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function DashboardClient({ initialData, quickActions }: DashboardClientProps) {
  const { user } = useAuth();
  const { isVip, isPremium } = useUserPermissions();
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!user) return null;

  const memberLabel = isPremium ? 'Premium VIP' : isVip ? 'VIP Member' : 'Member';
  const memberSubtitle = isPremium
    ? 'Exclusive access to VIP drops and concierge fulfillment'
    : isVip
    ? 'Enjoy your exclusive tier privileges and priority care'
    : 'Your curated luxury skincare journey continues here';

  // Check for the most recent active order (processing or shipped)
  const activeOrder = initialData.recentOrders.find(
    (o) => o.status === 'processing' || o.status === 'shipped' || o.status === 'pending'
  );

  return (
    <div className="w-full space-y-5 overflow-x-hidden">
      {/* ── Linear Member Hero Card ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0f1011] p-5 sm:p-6 text-white border border-[#23252a] shadow-2xl">
        {/* Subtle Linear radial glow accents */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#5e6ad2]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 right-28 h-40 w-40 rounded-full bg-[#27a644]/10 blur-2xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#18191a] to-[#0f1011] text-xl sm:text-2xl font-bold text-[#f7f8f8] border border-[#23252a] shadow-inner">
              {user.firstName?.[0]}
              {user.lastName?.[0]}
              {isVip && (
                <span className="absolute -top-1 -right-1 text-xs sm:text-sm filter drop-shadow" aria-hidden="true">
                  👑
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-[#f7f8f8] truncate">
                Welcome back, {user.firstName}!
              </h1>
              <p className="mt-0.5 text-xs text-[#8a8f98] truncate">{memberSubtitle}</p>
              <button
                type="button"
                onClick={() => setIsBreakdownOpen(true)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#141516] hover:bg-[#18191a] active:scale-95 px-2.5 py-1 text-xs font-medium text-[#828fff] border border-[#5e6ad2]/30 cursor-pointer transition-all"
              >
                <span>⭐ {memberLabel}</span>
                <span className="text-[#62666d]">•</span>
                <span className="underline decoration-[#5e6ad2]/50 underline-offset-2">Tier Privileges</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsBreakdownOpen(true)}
            aria-label="View VIP Loyalty Points breakdown"
            className="w-full sm:w-auto shrink-0 group rounded-xl bg-[#141516] hover:bg-[#18191a] active:scale-95 p-3.5 text-left sm:text-right border border-[#23252a] transition-all cursor-pointer shadow-sm"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8a8f98]">
              Beauty Club Balance
            </p>
            <p className="text-xl sm:text-2xl font-bold text-[#f7f8f8] leading-tight mt-0.5 font-mono">
              {mounted ? user.loyaltyPoints.toLocaleString() : '---'}{' '}
              <span className="text-xs font-medium text-[#828fff]">pts</span>
            </p>
            <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-[#828fff] font-medium bg-[#5e6ad2]/15 border border-[#5e6ad2]/30 px-2 py-0.5 rounded-md group-hover:scale-105 transition-transform">
              <span>Redeem Vouchers</span>
              <span>✨</span>
            </span>
          </button>
        </div>
      </div>

      {/* ── Active Delivery Glowing Stepper Card ────────────────────────────── */}
      {activeOrder && (
        <div className="relative overflow-hidden rounded-2xl bg-[#0f1011] border border-[#5e6ad2]/40 p-4 sm:p-5 shadow-xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-[#5e6ad2] animate-pulse" />
              <p className="text-xs font-semibold uppercase tracking-wider text-[#828fff]">
                Active Shipment #{activeOrder.orderNumber}
              </p>
            </div>
            <Link
              href={`/account/orders/${activeOrder.id}`}
              className="text-xs font-medium text-[#828fff] hover:underline flex items-center gap-1"
            >
              <span>Track Details</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          {/* Stepper Progress Bar */}
          <div className="relative pt-2 pb-1">
            <div className="h-1.5 w-full bg-[#18191a] rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r from-[#5e6ad2] to-[#27a644] rounded-full transition-all duration-700 ${
                  activeOrder.status === 'delivered'
                    ? 'w-full'
                    : activeOrder.status === 'shipped'
                    ? 'w-3/4'
                    : 'w-1/3'
                }`}
              />
            </div>
            <div className="grid grid-cols-4 gap-1 mt-2 text-center text-[10px] text-[#8a8f98] font-medium">
              <span className="text-[#828fff]">Confirmed</span>
              <span className={activeOrder.status !== 'pending' ? 'text-[#828fff]' : ''}>Processing</span>
              <span className={activeOrder.status === 'shipped' || activeOrder.status === 'delivered' ? 'text-[#828fff]' : ''}>Shipped</span>
              <span className={activeOrder.status === 'delivered' ? 'text-[#27a644]' : ''}>Delivered</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Bento Grid Stats Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {[
          { icon: <Package size={18} />, label: 'Total Orders', value: initialData.recentOrders.length, href: '/account/orders' },
          { icon: <Heart size={18} />, label: 'Saved Wishlist', value: initialData.wishlistItems, href: '/account/wishlist' },
          { icon: <MapPin size={18} />, label: 'Delivery Hubs', value: initialData.savedAddresses, href: '/account/addresses' },
        ].map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group flex flex-col items-center sm:items-start rounded-2xl bg-[#0f1011] border border-[#23252a] p-3.5 sm:p-4 hover:border-[#5e6ad2]/60 hover:bg-[#141516] transition-all text-center sm:text-left shadow-lg"
          >
            <span className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-[#141516] text-[#828fff] border border-[#23252a] group-hover:scale-105 transition-transform mb-2 sm:mb-2.5">
              {s.icon}
            </span>
            <span className="text-xl sm:text-2xl font-bold text-[#f7f8f8] tracking-tight leading-none font-mono">
              {s.value}
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-[#8a8f98] mt-1 truncate w-full">
              {s.label}
            </span>
          </Link>
        ))}
      </div>

      {/* ── Loyalty Points Instant Redeem Strip ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-2xl border border-[#23252a] bg-[#0f1011] p-4 sm:p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#141516] text-[#828fff] border border-[#23252a] shrink-0">
            <Trophy size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8a8f98]">Available Reward Balance</p>
            <div className="flex items-baseline gap-2">
              <p className="text-base sm:text-lg font-bold leading-tight text-[#f7f8f8] font-mono">
                {mounted ? user.loyaltyPoints.toLocaleString() : '---'} Points
              </p>
              <span className="text-xs text-[#8a8f98] hidden sm:inline">• Convert to checkout discount vouchers</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsRedeemOpen(true)}
          className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center h-11 px-6 rounded-xl bg-[#5e6ad2] hover:bg-[#828fff] active:scale-95 text-white text-xs font-semibold tracking-wide transition-all shadow-md cursor-pointer"
        >
          Redeem Vouchers
        </button>
      </div>

      {/* ── Notification Nudge ──────────────────────────────────────────────── */}
      {initialData.unreadNotifications > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-[#5e6ad2]/30 bg-[#5e6ad2]/10 px-4 py-3">
          <Bell size={16} className="shrink-0 text-[#828fff]" />
          <p className="text-xs sm:text-sm font-medium text-[#f7f8f8]">
            You have <strong className="text-[#828fff]">{initialData.unreadNotifications}</strong> exclusive luxury beauty vouchers waiting for you.
          </p>
        </div>
      )}

      {/* ── Quick Actions Grid ──────────────────────────────────────────────── */}
      <div>
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">Quick Access</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              href={action.href}
              className="group flex items-center gap-3.5 rounded-xl border border-[#23252a] bg-[#0f1011] p-3.5 transition-all hover:border-[#5e6ad2]/60 hover:bg-[#141516] shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#141516] text-[#828fff] border border-[#23252a] transition-transform group-hover:scale-105 shadow-inner">
                <DynamicIcon name={action.icon} className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs sm:text-sm font-semibold text-[#f7f8f8] group-hover:text-[#828fff] transition-colors">
                  {action.name}
                </p>
                <p className="truncate text-xs text-[#8a8f98] mt-0.5">{action.description}</p>
              </div>
              <ChevronRight size={15} className="text-[#62666d] group-hover:text-[#828fff] group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* ── Recent Orders ───────────────────────────────────────────────────── */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">Recent Orders</p>
          <Link href="/account/orders" className="text-xs font-medium text-[#828fff] hover:underline underline-offset-2 flex items-center gap-1">
            <span>View All</span>
            <ChevronRight size={13} />
          </Link>
        </div>

        {initialData.recentOrders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#23252a] bg-[#0f1011] py-10 px-4 text-center">
            <div className="w-11 h-11 rounded-xl bg-[#141516] text-[#828fff] border border-[#23252a] flex items-center justify-center">
              <ShoppingBag size={20} />
            </div>
            <p className="text-sm font-semibold text-[#f7f8f8]">No orders recorded</p>
            <p className="text-xs text-[#8a8f98] max-w-sm">
              Discover verified genuine luxury cosmetics with nationwide express doorstep delivery.
            </p>
            <Link
              href="/shop"
              className="w-full sm:w-auto mt-2 inline-flex items-center justify-center h-11 px-6 rounded-xl bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-semibold tracking-wide transition-all shadow-md active:scale-95"
            >
              Explore Shop
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {initialData.recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="group flex items-center justify-between rounded-xl border border-[#23252a] bg-[#0f1011] px-4 py-3 transition-all hover:border-[#5e6ad2]/60 hover:bg-[#141516] shadow-md"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs sm:text-sm font-semibold text-[#f7f8f8] group-hover:text-[#828fff] transition-colors font-mono">
                      #{order.orderNumber}
                    </p>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-1 text-xs text-[#8a8f98]">
                    {mounted
                      ? new Date(order.createdAt).toLocaleDateString('en-BD', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '---'}
                    {' · '}
                    {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
                  <span className="text-xs sm:text-sm font-bold text-[#f7f8f8] font-mono">
                    ৳{order.total.toLocaleString()}
                  </span>
                  <ChevronRight size={14} className="text-[#62666d] group-hover:text-[#828fff] group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Daily Skincare Tip ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0f1011] border border-[#23252a] p-5 shadow-lg">
        <h2 className="mb-2 flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#f7f8f8]">
          <Sparkles size={16} className="text-[#828fff]" />
          <span>Daily Skincare Routine Tip</span>
        </h2>
        <p className="text-xs leading-relaxed text-[#8a8f98]">
          Applying serum to slightly damp skin can increase absorption by up to 50%.
          Pat your face gently after cleansing, then apply your favorite hyaluronic or niacinamide serum while still slightly moist!
        </p>
        <Link
          href="/shop"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#828fff] hover:underline underline-offset-2"
        >
          <span>Explore compatible serums</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Loyalty Modals */}
      <BentoLoyaltyRedeemModal
        isOpen={isRedeemOpen}
        onClose={() => setIsRedeemOpen(false)}
        onOpenBreakdown={() => {
          setIsRedeemOpen(false);
          setIsBreakdownOpen(true);
        }}
      />
      <TierVoucherBreakdownModal
        isOpen={isBreakdownOpen}
        onClose={() => setIsBreakdownOpen(false)}
        onOpenRedeem={() => {
          setIsBreakdownOpen(false);
          setIsRedeemOpen(true);
        }}
      />
    </div>
  );
}
