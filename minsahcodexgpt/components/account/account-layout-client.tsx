'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingBag,
  Heart,
  MapPin,
  Settings,
  Star,
  PenTool,
  Home,
  ChevronRight,
  Users,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  LogOut,
  Layers,
} from 'lucide-react';
import { User } from '@/lib/auth';

const navigation = [
  {
    name: 'Dashboard',
    href: '/account',
    icon: Home,
    description: 'Account overview',
  },
  {
    name: 'Orders',
    href: '/account/orders',
    icon: ShoppingBag,
    description: 'Order history & tracking',
  },
  {
    name: 'Returns',
    href: '/account/returns',
    icon: RotateCcw,
    description: 'Return requests & refunds',
  },
  {
    name: 'Warranty & Claims',
    href: '/account/warranty',
    icon: ShieldCheck,
    description: 'Authenticity & doorstep claims',
  },
  {
    name: 'Wishlist',
    href: '/account/wishlist',
    icon: Heart,
    description: 'Saved luxury beauty',
  },
  {
    name: 'Addresses',
    href: '/account/addresses',
    icon: MapPin,
    description: 'Delivery hubs & billing',
  },
  {
    name: 'Profile Settings',
    href: '/account/settings',
    icon: Settings,
    description: 'Account security & details',
  },
  {
    name: 'Loyalty Points',
    href: '/account/loyalty',
    icon: Star,
    description: 'VIP tiers & rewards',
  },
  {
    name: 'Referrals',
    href: '/account/referrals',
    icon: Users,
    description: 'Invite friends & earn',
  },
  {
    name: 'Reviews',
    href: '/account/reviews',
    icon: PenTool,
    description: 'Verified beauty ratings',
  },
];

interface AccountLayoutClientProps {
  user: User;
  children: React.ReactNode;
}

export function AccountLayoutClient({ user, children }: AccountLayoutClientProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isVip = user.role === 'vip' || user.role === 'premium';
  const isPremium = user.role === 'premium';

  return (
    <div
      lang="en"
      className="min-h-screen bg-[#010102] text-[#f7f8f8] pb-28 md:pb-16 selection:bg-[#5e6ad2]/30 selection:text-[#ffffff] overflow-x-hidden antialiased"
    >
      {/* ── Native App Mobile Sticky Header ────────────────────────────────────── */}
      <div className="lg:hidden sticky top-0 z-30 bg-[#010102]/90 backdrop-blur-xl border-b border-[#23252a]">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-10 h-10 shrink-0 bg-gradient-to-br from-[#141516] to-[#0f1011] text-[#f7f8f8] rounded-xl flex items-center justify-center font-bold text-sm border border-[#23252a] shadow-inner">
              {user.firstName?.charAt(0) ?? ''}
              {user.lastName?.charAt(0) ?? ''}
              {isVip && (
                <span className="absolute -bottom-1 -right-1 text-[11px] filter drop-shadow" aria-hidden="true">
                  👑
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-semibold text-sm text-[#f7f8f8] truncate tracking-tight">
                  {user.firstName ?? 'Member'}
                </h1>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-medium bg-[#5e6ad2]/15 text-[#828fff] border border-[#5e6ad2]/30 shrink-0">
                  {user.role === 'premium' ? 'Premium' : isVip ? 'VIP' : 'Member'}
                </span>
              </div>
              <p className="text-[11px] text-[#8a8f98] truncate font-mono">
                {mounted ? user.loyaltyPoints.toLocaleString() : '---'} Glow Points
              </p>
            </div>
          </div>

          <Link
            href="/shop"
            className="shrink-0 inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-medium shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-white" />
            <span>Shop</span>
          </Link>
        </div>

        {/* Mobile Horizontal App Tabs with zero overflow glitch */}
        <div className="px-3 pb-2.5 overflow-x-auto no-scrollbar flex items-center gap-1.5">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? 'bg-[#5e6ad2] text-white shadow-[0_0_12px_rgba(94,106,210,0.35)]'
                    : 'bg-[#0f1011] text-[#8a8f98] border border-[#23252a] hover:text-[#f7f8f8] hover:bg-[#141516]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#8a8f98]'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Main Layout Container ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 items-start">
          {/* Desktop Linear Sidebar */}
          <aside aria-label="Account navigation sidebar" className="lg:col-span-1 hidden lg:block space-y-4 sticky top-24">
            {/* User Profile Card */}
            <div className="relative overflow-hidden bg-[#0f1011] rounded-2xl border border-[#23252a] p-5 shadow-2xl">
              {/* Subtle Linear radial glow */}
              <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-[#5e6ad2]/10 to-transparent pointer-events-none" />

              <div className="relative text-center">
                <div className="relative w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-[#18191a] to-[#0f1011] text-[#f7f8f8] rounded-2xl flex items-center justify-center text-xl font-bold border border-[#23252a] shadow-inner">
                  {user.firstName?.charAt(0) ?? ''}
                  {user.lastName?.charAt(0) ?? ''}
                  {isVip && (
                    <span className="absolute -top-1 -right-1 text-sm filter drop-shadow" aria-hidden="true">
                      👑
                    </span>
                  )}
                </div>

                <h2 className="text-sm font-semibold text-[#f7f8f8] tracking-tight">
                  {user.firstName ?? ''} {user.lastName ?? ''}
                </h2>
                <p className="text-xs text-[#8a8f98] truncate max-w-[200px] mx-auto mt-0.5 font-mono">{user.email}</p>

                {/* User Role Badge */}
                <div className="mt-2.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-medium tracking-wide uppercase ${
                      user.role === 'premium'
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                        : user.role === 'vip'
                        ? 'bg-[#5e6ad2]/15 text-[#828fff] border border-[#5e6ad2]/30'
                        : 'bg-[#18191a] text-[#8a8f98] border border-[#23252a]'
                    }`}
                  >
                    {user.role === 'premium' && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                    {user.role === 'vip' && <Sparkles className="w-3 h-3 text-[#828fff]" />}
                    {user.role === 'premium' ? 'Premium VIP' : user.role === 'vip' ? 'VIP Member' : 'Member'}
                  </span>
                </div>

                {/* Loyalty Points Linear Capsule */}
                <div className="mt-4 pt-4 border-t border-[#23252a]">
                  <Link
                    href="/account/loyalty"
                    className="group flex items-center justify-between p-3 rounded-xl bg-[#141516] border border-[#23252a] hover:border-[#5e6ad2]/60 hover:bg-[#18191a] transition-all"
                  >
                    <div className="text-left">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-[#8a8f98]">Minsah Glow Points</p>
                      <p className="text-sm font-bold text-[#f7f8f8] leading-none mt-1 font-mono">
                        {mounted ? user.loyaltyPoints.toLocaleString() : '---'}
                      </p>
                    </div>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#5e6ad2]/15 text-[#828fff] text-xs font-bold transition-transform group-hover:scale-110">
                      ★
                    </span>
                  </Link>
                </div>

                {/* Quick Action Buttons */}
                <div className="mt-3.5 grid grid-cols-2 gap-2">
                  <Link
                    href="/shop"
                    className="flex items-center justify-center gap-1.5 h-9 bg-[#5e6ad2] hover:bg-[#828fff] text-white rounded-xl text-xs font-medium transition-all active:scale-95 shadow-sm"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Shop</span>
                  </Link>
                  <Link
                    href="/logout"
                    className="flex items-center justify-center gap-1.5 h-9 bg-[#141516] text-[#8a8f98] border border-[#23252a] hover:border-rose-500/40 hover:text-rose-400 rounded-xl text-xs font-medium transition-all"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Sign Out</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav aria-label="Account pages" className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-2 space-y-1 shadow-xl">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#18191a] text-white border border-[#5e6ad2]/40 shadow-[0_0_15px_rgba(94,106,210,0.15)]'
                        : 'text-[#8a8f98] hover:bg-[#141516] hover:text-[#f7f8f8]'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mr-2.5 shrink-0 transition-colors ${
                        isActive ? 'text-[#828fff]' : 'text-[#8a8f98] group-hover:text-[#f7f8f8]'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{item.name}</div>
                    </div>
                    {isActive ? (
                      <ChevronRight className="w-3.5 h-3.5 text-[#828fff] shrink-0" />
                    ) : null}
                  </Link>
                );
              })}
            </nav>

            {/* VIP Privilege Card */}
            {(isVip || isPremium) && (
              <div className="relative overflow-hidden bg-gradient-to-br from-[#141516] via-[#0f1011] to-[#0a0a0c] text-white rounded-2xl p-4 border border-[#5e6ad2]/25 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">👑</span>
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-[#828fff]">
                    VIP Tier Privileges
                  </h3>
                </div>
                <ul className="text-xs text-[#8a8f98] space-y-1.5 leading-snug">
                  <li className="flex items-center gap-1.5">
                    <span className="text-[#27a644] text-xs">✓</span>
                    <span>100% Guaranteed Genuine Brands</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-[#27a644] text-xs">✓</span>
                    <span>Priority Express Fulfillment</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-[#27a644] text-xs">✓</span>
                    <span>VIP Secret Drop Access</span>
                  </li>
                </ul>
              </div>
            )}
          </aside>

          {/* Main Content Area */}
          <main role="main" id="account-main-content" className="lg:col-span-3 min-w-0">
            {/* Minimal Dark Breadcrumb */}
            <div className="mb-5 hidden sm:block">
              <nav className="flex items-center space-x-2 text-xs" aria-label="Breadcrumb">
                <Link href="/" className="text-[#8a8f98] hover:text-[#f7f8f8] transition-colors">
                  Home
                </Link>
                <ChevronRight className="w-3 h-3 text-[#34343a]" />
                <Link
                  href="/account"
                  className={pathname === '/account' ? 'font-semibold text-[#f7f8f8]' : 'text-[#8a8f98] hover:text-[#f7f8f8]'}
                >
                  Account
                </Link>
                {pathname !== '/account' && (
                  <>
                    <ChevronRight className="w-3 h-3 text-[#34343a]" />
                    <span className="font-semibold text-[#828fff]">
                      {navigation.find((item) => item.href === pathname)?.name || 'Section'}
                    </span>
                  </>
                )}
              </nav>
            </div>

            {/* Page Child View */}
            <div className="w-full overflow-x-hidden">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
