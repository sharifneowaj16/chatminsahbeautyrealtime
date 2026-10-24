'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Heart,
  MapPin,
  Star,
  Users,
  Truck,
  CheckCircle,
  ChevronRight,
  BarChart3,
  Sparkles,
  ArrowRight,
  Trophy,
  Package,
  Bell,
  ShieldCheck,
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
  CheckCircle,
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

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    delivered: 'bg-[#EAF7D8] text-[#1C3A13] border border-[#D4F6A2]/60',
    shipped: 'bg-sky-50 text-sky-800 border border-sky-200',
    processing: 'bg-amber-50 text-amber-800 border border-amber-200',
    cancelled: 'bg-rose-50 text-rose-800 border border-rose-200',
    pending: 'bg-stone-100 text-stone-700 border border-stone-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${map[status] ?? 'bg-stone-100 text-stone-700 border border-stone-200'}`}>
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

  if (!user) return null;

  const memberLabel    = isPremium ? 'Premium Member' : isVip ? 'VIP Member' : 'Member';
  const memberSubtitle = isPremium
    ? 'Exclusive access to all features'
    : isVip
    ? 'Enjoy your exclusive VIP benefits'
    : 'Your beauty journey continues here';

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── Luxury Member Hero Card ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#062402] via-[#153410] to-[#0A2207] p-6 sm:p-7 text-white shadow-xl border border-[#D4F6A2]/20">
        {/* Ambient Glows */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-[#D4F6A2]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 right-20 h-40 w-40 rounded-full bg-[#EAF7D8]/10 blur-2xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1C3A13] to-[#062402] text-2xl font-black text-[#D4F6A2] ring-2 ring-[#D4F6A2]/40 shadow-md">
              {user.firstName?.[0]}{user.lastName?.[0]}
              {isVip && (
                <span className="absolute -top-1 -right-1 text-sm filter drop-shadow-sm" aria-hidden="true">
                  👑
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Welcome back, {user.firstName}!
                </h1>
              </div>
              <p className="mt-0.5 text-xs sm:text-sm text-[#EAF7D8]/80">{memberSubtitle}</p>
              <button
                type="button"
                onClick={() => setIsBreakdownOpen(true)}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 px-3 py-1 text-xs font-semibold text-[#D4F6A2] border border-[#D4F6A2]/30 cursor-pointer transition-all"
              >
                <span>⭐ {memberLabel}</span>
                <span className="text-white/60">•</span>
                <span className="text-white underline decoration-[#D4F6A2]/40 underline-offset-2">View Tier Perks</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsBreakdownOpen(true)}
            aria-label="View VIP Loyalty Points breakdown"
            className="shrink-0 group rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 p-4 text-left sm:text-right backdrop-blur-md border border-white/15 transition-all cursor-pointer"
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#D4F6A2]">
              Beauty Club Balance
            </p>
            <p className="text-2xl sm:text-3xl font-black text-white leading-tight mt-0.5">
              {user.loyaltyPoints.toLocaleString()} <span className="text-xs font-semibold text-[#EAF7D8]/70">pts</span>
            </p>
            <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-[#062402] font-bold bg-[#D4F6A2] px-2.5 py-0.5 rounded-full shadow-xs group-hover:scale-105 transition-transform">
              <span>Redeem Vouchers</span>
              <span>✨</span>
            </span>
          </button>
        </div>
      </div>

      {/* ── Bento Grid Stats Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { icon: <Package size={20} />, label: 'Total Orders', value: initialData.recentOrders.length, href: '/account/orders' },
          { icon: <Heart size={20} />,   label: 'Saved Items',  value: initialData.wishlistItems,       href: '/account/wishlist' },
          { icon: <MapPin size={20} />,  label: 'Delivery Hubs', value: initialData.savedAddresses,     href: '/account/addresses' },
        ].map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group flex flex-col items-center sm:items-start rounded-[24px] bg-white border border-[#EFECE6] p-4 sm:p-5 shadow-[0_4px_24px_rgba(6,36,2,0.03)] hover:-translate-y-0.5 hover:shadow-md hover:border-[#D4F6A2]/80 transition-all text-center sm:text-left"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF7D8] text-[#062402] shadow-xs group-hover:scale-110 transition-transform mb-3">
              {s.icon}
            </span>
            <span className="text-2xl font-black text-[#121915] tracking-tight leading-none">
              {s.value}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A827B] mt-1.5">
              {s.label}
            </span>
          </Link>
        ))}
      </div>

      {/* ── Loyalty Points Instant Redeem Banner ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[24px] border border-[#EFECE6] bg-white p-5 shadow-[0_4px_24px_rgba(6,36,2,0.03)]">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF7D8] text-[#062402] shadow-xs shrink-0">
            <Trophy size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A827B]">Available Reward Points</p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-black leading-tight text-[#062402]">
                {user.loyaltyPoints.toLocaleString()} Points
              </p>
              <span className="text-xs text-[#5E6D64] hidden sm:inline">• Convert to checkout discount vouchers</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsRedeemOpen(true)}
          className="shrink-0 inline-flex items-center justify-center h-10 px-6 rounded-full bg-[#062402] hover:bg-[#153410] active:scale-95 text-[#EAF7D8] text-xs font-bold tracking-wide transition-all shadow-sm cursor-pointer"
        >
          Redeem Now
        </button>
      </div>

      {/* ── Notification Nudge ──────────────────────────────────────────────── */}
      {initialData.unreadNotifications > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#D4F6A2]/50 bg-[#EAF7D8]/60 px-4 py-3">
          <Bell size={16} className="shrink-0 text-[#062402]" />
          <p className="text-xs sm:text-sm font-semibold text-[#062402]">
            You have <strong>{initialData.unreadNotifications}</strong> exclusive beauty offers waiting for you.
          </p>
        </div>
      )}

      {/* ── Quick Actions Grid ──────────────────────────────────────────────── */}
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[#7A827B]">Quick Actions</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              href={action.href}
              className="group flex items-center gap-3.5 rounded-[22px] border border-[#EFECE6] bg-white p-4 transition-all hover:border-[#D4F6A2] hover:shadow-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EAF7D8] text-[#062402] transition-transform group-hover:scale-105 shadow-xs">
                <DynamicIcon name={action.icon} className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#121915] group-hover:text-[#062402] transition-colors">
                  {action.name}
                </p>
                <p className="truncate text-xs text-[#5E6D64] mt-0.5">{action.description}</p>
              </div>
              <ChevronRight size={16} className="text-[#B6AEA5] group-hover:text-[#062402] group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* ── Recent Orders ───────────────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#7A827B]">Recent Orders</p>
          <Link href="/account/orders" className="text-xs font-bold text-[#062402] hover:underline underline-offset-2">
            View All Orders →
          </Link>
        </div>

        {initialData.recentOrders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[24px] border border-dashed border-[#E0DBD3] bg-white py-10 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#EAF7D8] text-[#062402] flex items-center justify-center">
              <ShoppingBag size={22} />
            </div>
            <p className="text-sm font-semibold text-[#121915]">No orders placed yet</p>
            <p className="text-xs text-[#5E6D64] max-w-sm">Discover genuine luxury skincare and cosmetics with nationwide express doorstep delivery.</p>
            <Link
              href="/shop"
              className="mt-1 inline-flex items-center justify-center h-10 px-6 rounded-full bg-[#062402] hover:bg-[#153410] text-[#EAF7D8] text-xs font-bold tracking-wide transition-all shadow-xs"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {initialData.recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="group flex items-center justify-between rounded-[20px] border border-[#EFECE6] bg-white px-4 py-3.5 transition-all hover:border-[#D4F6A2] hover:shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[#121915] group-hover:text-[#062402] transition-colors">
                      {order.orderNumber}
                    </p>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-1 text-xs text-[#5E6D64]">
                    {new Date(order.createdAt).toLocaleDateString('en-BD', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                    {' · '}{order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-black text-[#121915]">
                    ৳{order.total.toLocaleString()}
                  </span>
                  <ChevronRight size={15} className="text-[#B6AEA5] group-hover:text-[#062402] group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Daily Skincare Tip ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#FAF8F5] to-[#F2EFE8] border border-[#EFECE6] p-6 shadow-xs">
        <h2 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-[#062402]">
          <Sparkles size={18} className="text-[#4b6723]" />
          <span>Beauty Tip of the Day</span>
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed text-[#5E6D64]">
          Did you know? Applying serum to slightly damp skin can increase absorption by up to 50%.
          Pat your face gently after cleansing, then apply your favorite hyaluronic or niacinamide serum while still slightly moist!
        </p>
        <Link href="/shop" className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#062402] hover:underline underline-offset-2">
          <span>Explore compatible serums</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Stitch Flow 9: Loyalty Modals */}
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
