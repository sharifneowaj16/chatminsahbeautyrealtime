'use client';

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
} from 'lucide-react';
import { User } from '@/lib/auth';

const navigation = [
  {
    name: 'Dashboard',
    href: '/account',
    icon: Home,
    description: 'Account overview'
  },
  {
    name: 'Orders',
    href: '/account/orders',
    icon: ShoppingBag,
    description: 'Order history and tracking'
  },
  {
    name: 'Returns',
    href: '/account/returns',
    icon: RotateCcw,
    description: 'Return requests and refunds'
  },
  {
    name: 'Warranty & Claims',
    href: '/account/warranty',
    icon: ShieldCheck,
    description: 'Authenticity & doorstep replacements'
  },
  {
    name: 'Wishlist',
    href: '/account/wishlist',
    icon: Heart,
    description: 'Saved items'
  },
  {
    name: 'Addresses',
    href: '/account/addresses',
    icon: MapPin,
    description: 'Shipping and billing addresses'
  },
  {
    name: 'Profile Settings',
    href: '/account/settings',
    icon: Settings,
    description: 'Account information and preferences'
  },
  {
    name: 'Loyalty Points',
    href: '/account/loyalty',
    icon: Star,
    description: 'Rewards and benefits'
  },
  {
    name: 'Referrals',
    href: '/account/referrals',
    icon: Users,
    description: 'Refer friends and earn rewards'
  },
  {
    name: 'Reviews',
    href: '/account/reviews',
    icon: PenTool,
    description: 'Product reviews'
  }
];

interface AccountLayoutClientProps {
  user: User;
  children: React.ReactNode;
}

export function AccountLayoutClient({ user, children }: AccountLayoutClientProps) {
  const pathname = usePathname();

  const isVip = user.role === 'vip' || user.role === 'premium';
  const isPremium = user.role === 'premium';

  return (
    <div lang="en" className="min-h-screen bg-[#FBF9F6] text-[#121915] pb-28 md:pb-16 selection:bg-[#D4F6A2] selection:text-[#062402]">
      {/* Mobile Luxury Header & Horizontal Tab Navigation */}
      <div className="lg:hidden sticky top-0 z-30 bg-[#FBF9F6]/95 backdrop-blur-md border-b border-[#EFECE6] shadow-xs">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-10 h-10 shrink-0 bg-gradient-to-br from-[#062402] to-[#1C3A13] text-[#D4F6A2] rounded-full flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-[#D4F6A2]/30">
              {user.firstName?.charAt(0) ?? ''}{user.lastName?.charAt(0) ?? ''}
              {isVip && (
                <span className="absolute -bottom-1 -right-1 text-xs" aria-hidden="true">
                  👑
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-sm text-[#121915] truncate">
                  {user.firstName ?? 'Member'}
                </h1>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF7D8] text-[#1C3A13] border border-[#D4F6A2]/40 shrink-0">
                  {user.role === 'premium' ? 'Premium' : isVip ? 'VIP' : 'Member'}
                </span>
              </div>
              <p className="text-[11px] text-[#5E6D64] truncate">
                {user.loyaltyPoints.toLocaleString()} Beauty Points
              </p>
            </div>
          </div>

          <Link
            href="/shop"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#062402] text-[#EAF7D8] text-xs font-semibold shadow-xs hover:bg-[#153410] transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#D4F6A2]" />
            <span>Shop</span>
          </Link>
        </div>

        {/* Mobile Horizontal Segmented Navigation Bar */}
        <div className="px-3 pb-2.5 overflow-x-auto no-scrollbar flex items-center gap-1.5">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? 'bg-[#062402] text-[#FFFFFF] shadow-sm'
                    : 'bg-white text-[#5E6D64] border border-[#EFECE6] hover:text-[#121915] hover:bg-[#F4F1EC]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#D4F6A2]' : 'text-[#7A827B]'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Desktop Luxury Sidebar */}
          <div className="lg:col-span-1 hidden lg:block space-y-5 sticky top-24">
            {/* User Profile Bento Card */}
            <div className="relative overflow-hidden bg-white rounded-[24px] border border-[#EFECE6] p-6 shadow-[0_4px_24px_rgba(6,36,2,0.03)]">
              {/* Subtle ambient luxury backdrop tint */}
              <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-[#EAF7D8]/40 to-transparent pointer-events-none" />

              <div className="relative text-center">
                <div className="relative w-20 h-20 mx-auto mb-3.5 bg-gradient-to-br from-[#062402] to-[#1C3A13] text-[#D4F6A2] rounded-full flex items-center justify-center text-2xl font-black shadow-md ring-4 ring-[#EAF7D8]">
                  {user.firstName?.charAt(0) ?? ''}{user.lastName?.charAt(0) ?? ''}
                  {isVip && (
                    <span className="absolute -top-1 -right-1 text-base filter drop-shadow-sm" aria-hidden="true">
                      👑
                    </span>
                  )}
                </div>

                <h2 className="text-base font-bold text-[#121915] tracking-tight">
                  {user.firstName ?? ''} {user.lastName ?? ''}
                </h2>
                <p className="text-xs text-[#5E6D64] truncate max-w-[200px] mx-auto mt-0.5">{user.email}</p>

                {/* User Role Badge */}
                <div className="mt-2.5">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
                    user.role === 'premium'
                      ? 'bg-amber-100/90 text-amber-900 border border-amber-200'
                      : user.role === 'vip'
                      ? 'bg-[#EAF7D8] text-[#1C3A13] border border-[#D4F6A2]/60'
                      : 'bg-stone-100 text-stone-700 border border-stone-200'
                  }`}>
                    {user.role === 'premium' && <Star className="w-3 h-3 text-amber-600 fill-amber-500" />}
                    {user.role === 'vip' && <Sparkles className="w-3 h-3 text-[#1C3A13]" />}
                    {user.role === 'premium' ? 'Premium VIP' : user.role === 'vip' ? 'VIP Club Member' : 'Member'}
                  </span>
                </div>

                {/* Loyalty Points Capsule */}
                <div className="mt-4 pt-4 border-t border-[#F2EFEA]">
                  <Link
                    href="/account/loyalty"
                    className="group flex items-center justify-between p-3 rounded-2xl bg-[#FAF9F6] border border-[#EFECE6] hover:border-[#D4F6A2] hover:bg-[#F2F8ED] transition-all"
                  >
                    <div className="text-left">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A827B]">Minsah Points</p>
                      <p className="text-base font-black text-[#062402] leading-none mt-0.5">
                        {user.loyaltyPoints.toLocaleString()}
                      </p>
                    </div>
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#EAF7D8] text-[#1C3A13] text-xs font-bold transition-transform group-hover:scale-110">
                      ★
                    </span>
                  </Link>
                </div>

                {/* Quick Actions */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href="/shop"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#062402] text-[#EAF7D8] rounded-xl text-xs font-bold hover:bg-[#153410] transition-colors shadow-xs"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-[#D4F6A2]" />
                    <span>Shop</span>
                  </Link>
                  <Link
                    href="/logout"
                    className="flex items-center justify-center px-3 py-2 bg-white text-[#5E6D64] border border-[#EFECE6] rounded-xl text-xs font-semibold hover:bg-stone-50 hover:text-red-600 transition-colors"
                  >
                    Sign Out
                  </Link>
                </div>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav aria-label="Account pages" className="bg-white rounded-[24px] border border-[#EFECE6] p-2 shadow-[0_4px_24px_rgba(6,36,2,0.03)] space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#062402] text-white shadow-sm'
                        : 'text-[#5E6D64] hover:bg-[#F7F5F0] hover:text-[#121915]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mr-3 shrink-0 ${
                      isActive ? 'text-[#D4F6A2]' : 'text-[#7A827B] group-hover:text-[#121915]'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{item.name}</div>
                    </div>
                    {isActive ? (
                      <ChevronRight className="w-3.5 h-3.5 text-[#D4F6A2] shrink-0" />
                    ) : null}
                  </Link>
                );
              })}
            </nav>

            {/* VIP / Premium Privilege Card */}
            {(isVip || isPremium) && (
              <div className="relative overflow-hidden bg-gradient-to-br from-[#062402] via-[#122810] to-[#0A1D08] text-white rounded-[24px] p-5 shadow-lg border border-[#D4F6A2]/20">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-base">👑</span>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#D4F6A2]">
                    Exclusive Perks
                  </h3>
                </div>
                <ul className="text-xs text-[#EAF7D8]/90 space-y-1.5 leading-snug">
                  <li className="flex items-center gap-1.5">
                    <span className="text-[#D4F6A2] text-xs">✓</span>
                    <span>100% Authentic Guaranteed</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-[#D4F6A2] text-xs">✓</span>
                    <span>Priority Express Logistics</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-[#D4F6A2] text-xs">✓</span>
                    <span>VIP Member Tier Vouchers</span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <main role="main" id="account-main-content" className="lg:col-span-3 min-w-0">
            {/* Elegant Minimal Breadcrumb */}
            <div className="mb-5 hidden sm:block">
              <nav className="flex items-center space-x-2 text-xs" aria-label="Breadcrumb">
                <Link href="/" className="text-[#7A827B] hover:text-[#121915] transition-colors">
                  Home
                </Link>
                <ChevronRight className="w-3.5 h-3.5 text-[#B6AEA5]" />
                <Link href="/account" className={pathname === '/account' ? 'font-bold text-[#062402]' : 'text-[#7A827B] hover:text-[#121915]'}>
                  My Account
                </Link>
                {pathname !== '/account' && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-[#B6AEA5]" />
                    <span className="font-bold text-[#062402]">
                      {navigation.find(item => item.href === pathname)?.name || 'Section'}
                    </span>
                  </>
                )}
              </nav>
            </div>

            {/* Page Child View */}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
