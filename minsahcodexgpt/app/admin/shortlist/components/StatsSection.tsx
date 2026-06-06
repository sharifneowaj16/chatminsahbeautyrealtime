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
  bgColor: string;
  textColor: string;
}

function StatCard({ icon, label, value, subtext, bgColor, textColor }: StatCardProps) {
  return (
    <div className={`${bgColor} rounded-xl p-4 border-l-4 ${textColor.replace('text-', 'border-')}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className={`${textColor} text-2xl font-bold mt-1`}>{value}</p>
          {subtext && <p className="text-gray-500 text-xs mt-1">{subtext}</p>}
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
    <div className="p-4 sm:p-6 bg-white">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          📊 Real-time Statistics
        </h2>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
        <StatCard
          icon="⏳"
          label="Pending Orders"
          value={stats.pendingOrders}
          bgColor="bg-orange-50"
          textColor="text-orange-600"
        />
        <StatCard
          icon="✅"
          label="Completed Orders"
          value={stats.completedOrders}
          bgColor="bg-green-50"
          textColor="text-green-600"
        />
        <StatCard
          icon="📦"
          label="Products to Buy"
          value={stats.productsRemaining}
          subtext={`of ${stats.productsRemaining + stats.productsPurchased} total`}
          bgColor="bg-red-50"
          textColor="text-red-600"
        />
        <StatCard
          icon="✔️"
          label="Products Purchased"
          value={stats.productsPurchased}
          bgColor="bg-blue-50"
          textColor="text-blue-600"
        />
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          icon="💰"
          label="Expected Profit"
          value={formatCurrency(stats.expectedProfit)}
          bgColor="bg-emerald-50"
          textColor="text-emerald-600"
        />
        <StatCard
          icon="💵"
          label="Total Revenue"
          value={formatCurrency(stats.totalPotentialRevenue)}
          bgColor="bg-purple-50"
          textColor="text-purple-600"
        />
      </div>

      {/* Completion Progress */}
      <div className="mt-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Overall Completion</p>
          <span className="text-lg font-bold text-blue-600">{stats.completionRate}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full transition-all duration-500 ease-out"
            style={{ width: `${stats.completionRate}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          {stats.productsPurchased} of {stats.productsPurchased + stats.productsRemaining} products purchased
        </p>
      </div>
    </div>
  );
}
