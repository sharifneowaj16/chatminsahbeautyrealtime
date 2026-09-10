'use client';

import { formatPrice } from '@/utils/currency';
import Link from 'next/link';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Package,
  ArrowUpRight,
  Sparkles,
  Plus,
  FileText,
  BarChart,
  MessageSquare,
  Smartphone,
  Globe,
  ChevronRight,
} from 'lucide-react';

// Mock data - currency formatted
const stats = {
  revenue: 250000,
  orders: 1250,
  customers: 4800,
  products: 156,
  lowStock: 8,
  pendingOrders: 23,
};

export default function AdminDashboard() {
  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
        <div>
          <h1 className="text-[18px] font-semibold text-white tracking-tight">Overview</h1>
          <p className="text-[12px] text-white/40 mt-0.5">Real-time performance and store operations</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/40 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>Live metrics</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Revenue */}
        <div className="bg-[#18191D] rounded-xl border border-white/[0.08] p-4 hover:border-white/[0.14] transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-white/50 tracking-tight">Revenue</span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded flex items-center gap-0.5">
              <TrendingUp className="w-2.5 h-2.5" /> +12%
            </span>
          </div>
          <p className="text-2xl font-semibold text-white tracking-tight mt-2.5">{formatPrice(stats.revenue)}</p>
          <p className="text-[11px] text-white/40 mt-1">vs last month</p>
        </div>

        {/* Orders */}
        <div className="bg-[#18191D] rounded-xl border border-white/[0.08] p-4 hover:border-white/[0.14] transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-white/50 tracking-tight">Orders</span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded flex items-center gap-0.5">
              <TrendingUp className="w-2.5 h-2.5" /> +8%
            </span>
          </div>
          <p className="text-2xl font-semibold text-white tracking-tight mt-2.5">{stats.orders.toLocaleString()}</p>
          <p className="text-[11px] text-white/40 mt-1">{stats.pendingOrders} pending fulfillment</p>
        </div>

        {/* Customers */}
        <div className="bg-[#18191D] rounded-xl border border-white/[0.08] p-4 hover:border-white/[0.14] transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-white/50 tracking-tight">Customers</span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded flex items-center gap-0.5">
              <TrendingUp className="w-2.5 h-2.5" /> +15%
            </span>
          </div>
          <p className="text-2xl font-semibold text-white tracking-tight mt-2.5">{stats.customers.toLocaleString()}</p>
          <p className="text-[11px] text-white/40 mt-1">Total active accounts</p>
        </div>

        {/* Products */}
        <div className="bg-[#18191D] rounded-xl border border-white/[0.08] p-4 hover:border-white/[0.14] transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-white/50 tracking-tight">Products</span>
            <span className="text-[11px] font-mono text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
              {stats.lowStock} low stock
            </span>
          </div>
          <p className="text-2xl font-semibold text-white tracking-tight mt-2.5">{stats.products}</p>
          <p className="text-[11px] text-white/40 mt-1">Catalog items live</p>
        </div>
      </div>

      {/* Marketing Hub Banner */}
      <div className="bg-[#18191D] border border-white/[0.08] rounded-xl p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white/70" />
            <h2 className="text-sm font-semibold text-white tracking-tight">Marketing Hub & Multi-Channel Sync</h2>
          </div>
          <p className="text-xs text-white/50 mt-1 max-w-xl">
            Coordinate Meta Pixel, WhatsApp Business, SMS messaging, and Google Ads campaigns from a unified command center.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/admin/marketing"
            className="h-8 px-3.5 bg-white text-black font-semibold text-xs rounded-md hover:bg-white/90 shadow-sm flex items-center gap-1.5 transition-all active:scale-[0.98]"
          >
            <span>Open Hub</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
          <Link
            href="/admin/inbox"
            className="h-8 px-3.5 bg-white/[0.06] border border-white/[0.08] text-white font-medium text-xs rounded-md hover:bg-white/[0.10] hover:border-white/[0.15] flex items-center gap-1.5 transition-all active:scale-[0.98]"
          >
            <MessageSquare className="w-3 h-3" />
            <span>Social Inbox (5)</span>
          </Link>
        </div>
      </div>

      {/* Quick Actions & Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick Actions */}
        <div className="bg-[#18191D] rounded-xl border border-white/[0.08] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/admin/products"
              className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all group flex flex-col gap-1.5"
            >
              <Plus className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
              <span className="text-[12px] font-medium text-white/80 group-hover:text-white">Add Product</span>
            </Link>
            <Link
              href="/admin/orders"
              className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all group flex flex-col gap-1.5"
            >
              <ShoppingBag className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
              <span className="text-[12px] font-medium text-white/80 group-hover:text-white">Manage Orders</span>
            </Link>
            <Link
              href="/admin/customers"
              className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all group flex flex-col gap-1.5"
            >
              <Users className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
              <span className="text-[12px] font-medium text-white/80 group-hover:text-white">Customers</span>
            </Link>
            <Link
              href="/admin/analytics"
              className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all group flex flex-col gap-1.5"
            >
              <BarChart className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
              <span className="text-[12px] font-medium text-white/80 group-hover:text-white">Reports & ROI</span>
            </Link>
          </div>
        </div>

        {/* Marketing Quick Channels */}
        <div className="bg-[#18191D] rounded-xl border border-white/[0.08] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">Channels & Operations</h3>
          <div className="space-y-2">
            <Link
              href="/admin/inbox"
              className="flex items-center justify-between p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/70 group-hover:text-white">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-white/90">Social Media Inbox</p>
                  <p className="text-[11px] text-white/40">5 pending customer inquiries</p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-white/60 bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.08]">
                5 unread
              </span>
            </Link>

            <Link
              href="/admin/marketing?tab=whatsapp"
              className="flex items-center justify-between p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/70 group-hover:text-white">
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-white/90">WhatsApp Business</p>
                  <p className="text-[11px] text-white/40">Cloud API active</p>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </Link>

            <Link
              href="/admin/marketing?tab=social"
              className="flex items-center justify-between p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/70 group-hover:text-white">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-white/90">Social Operations</p>
                  <p className="text-[11px] text-white/40">Facebook, Instagram, YouTube</p>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white/70 transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
