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
  indicator?: string;
}

function StatCard({ icon, label, value, subtext, indicator }: StatCardProps) {
  return (
    <div className="linear-card bg-[#10121b] border border-[#232636] rounded-xl p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] relative overflow-hidden group hover:border-white/20 transition-all duration-150">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            {indicator && <span className="w-1.5 h-1.5 rounded-full bg-white/60" />}
            <p className="text-[#8A8F98] text-xs font-medium tracking-tight uppercase">{label}</p>
          </div>
          <p className="text-[#F7F8F8] text-2xl font-semibold tracking-tight mt-1.5">{value}</p>
          {subtext && <p className="text-[#62666D] text-xs mt-1 font-normal">{subtext}</p>}
        </div>
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-[#232636] flex items-center justify-center text-sm">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function StatsSection({ stats }: { stats: Stats }) {
  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString('bn-BD')}`;
  };

  return (
    <div className="linear-card p-4 sm:p-6 bg-[#10121b] border border-[#232636] rounded-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] space-y-4">
      <div className="mb-2">
        <h2 className="text-sm font-semibold tracking-tight text-[#F7F8F8] flex items-center gap-2">
          <span>📊</span> Real-time Statistics
        </h2>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          icon="⏳"
          label="Pending Orders"
          value={stats.pendingOrders}
          indicator="pending"
        />
        <StatCard
          icon="✅"
          label="Completed Orders"
          value={stats.completedOrders}
          indicator="completed"
        />
        <StatCard
          icon="📦"
          label="Products to Buy"
          value={stats.productsRemaining}
          subtext={`of ${stats.productsRemaining + stats.productsPurchased} total`}
        />
        <StatCard
          icon="✔️"
          label="Products Purchased"
          value={stats.productsPurchased}
        />
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          icon="💰"
          label="Expected Profit"
          value={formatCurrency(stats.expectedProfit)}
        />
        <StatCard
          icon="💵"
          label="Total Revenue"
          value={formatCurrency(stats.totalPotentialRevenue)}
        />
      </div>

      {/* Completion Progress */}
      <div className="linear-card bg-[#10121b] rounded-xl p-4 border border-[#232636] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-[#8A8F98] uppercase tracking-tight">Overall Completion</p>
          <span className="text-sm font-bold text-white tracking-tight">{stats.completionRate}%</span>
        </div>
        <progress className="h-1.5 w-full accent-[#F7F8F8] bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden" max={100} value={stats.completionRate} aria-label="Overall shortlist completion" />
        <p className="text-xs text-[#62666D] mt-2">
          {stats.productsPurchased} of {stats.productsPurchased + stats.productsRemaining} products purchased
        </p>
      </div>
    </div>
  );
}
