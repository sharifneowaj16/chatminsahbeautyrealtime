'use client';

import React from 'react';
import { ShoppingBag, Clock, Truck, CheckCircle2, DollarSign } from 'lucide-react';
import { CurrencyDisplay } from '../finance/CurrencyDisplay';

export interface OrderStatsHeaderProps {
  stats: {
    pending: number;
    processing: number;
    shipped: number;
    delivered?: number;
    totalRevenue: number;
  };
  activeFilter?: string;
  onFilterChange?: (status: string) => void;
  className?: string;
}

export const OrderStatsHeader: React.FC<OrderStatsHeaderProps> = ({
  stats,
  activeFilter = '',
  onFilterChange,
  className = '',
}) => {
  const statCards = [
    {
      id: '',
      label: 'All Orders',
      count: stats.pending + stats.processing + stats.shipped + (stats.delivered || 0),
      icon: ShoppingBag,
      color: 'text-slate-200',
      activeBorder: 'border-slate-500 bg-slate-800/80',
    },
    {
      id: 'pending',
      label: 'Pending Pickup',
      count: stats.pending,
      icon: Clock,
      color: 'text-amber-400',
      activeBorder: 'border-amber-500 bg-amber-950/30',
    },
    {
      id: 'processing',
      label: 'Processing',
      count: stats.processing,
      icon: Clock,
      color: 'text-blue-400',
      activeBorder: 'border-blue-500 bg-blue-950/30',
    },
    {
      id: 'shipped',
      label: 'Dispatched / In Transit',
      count: stats.shipped,
      icon: Truck,
      color: 'text-cyan-400',
      activeBorder: 'border-cyan-500 bg-cyan-950/30',
    },
  ];

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 ${className}`}>
      {statCards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.id;
        return (
          <div
            key={card.id}
            onClick={() => onFilterChange?.(card.id)}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              isActive
                ? `${card.activeBorder} shadow-lg ring-1 ring-white/10`
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{card.label}</span>
              <Icon className={`w-3.5 h-3.5 ${card.color}`} />
            </div>
            <div className="mt-2 text-xl font-extrabold text-white tabular-nums tracking-tight">
              {card.count}
            </div>
          </div>
        );
      })}

      {/* Revenue Card */}
      <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Total Settled Revenue</span>
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="mt-1">
          <CurrencyDisplay amount={stats.totalRevenue} size="lg" className="font-extrabold text-emerald-400" />
        </div>
      </div>
    </div>
  );
};

export default OrderStatsHeader;
