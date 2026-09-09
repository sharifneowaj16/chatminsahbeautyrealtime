// app/admin/shortlist/components/StatsSection.tsx

'use client';

import React from 'react';

interface Stats {
  pendingOrders: number;
  completedOrders: number;
  productsRemaining: number;
  productsPurchased: number;
  totalPotentialRevenue: number;
  expectedProfit: number;
  completionRate: number;
}

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  subtext?: string;
  borderAccent: string;
}

function StatCard({ icon, label, value, subtext, borderAccent }: StatCardProps) {
  return (
    <div className={`bg-[#14141A] border border-[#2A2A32] rounded-xl p-4 border-l-4 ${borderAccent}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#9A9691] text-sm font-medium">{label}</p>
          <p className="text-[#F5F3F0] text-2xl font-bold mt-1">{value}</p>
          {subtext && <p className="text-[#6B6864] text-xs mt-1">{subtext}</p>}
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}

export default function StatsSection({ stats }: { stats: Stats }) {
  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString('bn-BD')}`;
  };

  return (
    <div className="p-4 sm:p-6 bg-[#1E1E24] border border-[#2A2A32] rounded-xl shadow-sm space-y-4">
      <div className="mb-2">
        <h2 className="text-lg font-bold text-[#F5F3F0] flex items-center gap-2">
          📊 Real-time Statistics
        </h2>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          icon="⏳"
          label="Pending Orders"
          value={stats.pendingOrders}
          borderAccent="border-l-amber-500"
        />
        <StatCard
          icon="✅"
          label="Completed Orders"
          value={stats.completedOrders}
          borderAccent="border-l-emerald-500"
        />
        <StatCard
          icon="📦"
          label="Products to Buy"
          value={stats.productsRemaining}
          subtext={`of ${stats.productsRemaining + stats.productsPurchased} total`}
          borderAccent="border-l-rose-500"
        />
        <StatCard
          icon="✔️"
          label="Products Purchased"
          value={stats.productsPurchased}
          borderAccent="border-l-blue-500"
        />
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          icon="💰"
          label="Expected Profit"
          value={formatCurrency(stats.expectedProfit)}
          borderAccent="border-l-emerald-400"
        />
        <StatCard
          icon="💵"
          label="Total Revenue"
          value={formatCurrency(stats.totalPotentialRevenue)}
          borderAccent="border-l-[#D07A60]"
        />
      </div>

      {/* Completion Progress */}
      <div className="bg-[#14141A] rounded-xl p-4 border border-[#2A2A32]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-[#9A9691]">Overall Completion</p>
          <span className="text-lg font-bold text-[#D07A60]">{stats.completionRate}%</span>
        </div>
        <progress className="h-2 w-full accent-[#D07A60] bg-[#2A2A32] rounded-full overflow-hidden" max={100} value={stats.completionRate} aria-label="Overall shortlist completion" />
        <p className="text-xs text-[#6B6864] mt-2">
          {stats.productsPurchased} of {stats.productsPurchased + stats.productsRemaining} products purchased
        </p>
      </div>
    </div>
  );
}
