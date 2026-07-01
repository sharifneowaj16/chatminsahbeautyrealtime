'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CheckCircle2,
  DollarSign,
  Loader2,
  PackageSearch,
  RefreshCw,
  ShieldAlert,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { clsx } from 'clsx';
import { PERMISSIONS, useAdminAuth } from '@/contexts/AdminAuthContext';
import { formatPrice } from '@/utils/currency';

type DateRange = '7d' | '30d' | '90d';

type GrowthMap = {
  confirmedRevenue: number | null;
  deliveredRevenue: number | null;
  ordersCreated: number | null;
  confirmedOrders: number | null;
  deliveredOrders: number | null;
};

type RevenueResponse = {
  ok: boolean;
  range: DateRange;
  summary: {
    ordersCreated: number;
    confirmedOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    returnedOrders: number;
    totalRevenue: number;
    confirmedRevenue: number;
    deliveredRevenue: number;
    cancelledRevenue: number;
    returnedRevenue: number;
    metaPurchaseSent: number;
    gaPurchaseSent: number;
    averageOrderValue: number;
    confirmationRate: number;
    deliveryRate: number;
    cancelRate: number;
    returnRate: number;
    refundRequests: number;
    refundRequestedAmount: number;
    reportedRoas: number | null;
    realRoas: number | null;
    adSpend: number | null;
    growth: GrowthMap;
  };
  series: Array<{
    date: string;
    orders: number;
    confirmedRevenue: number;
    deliveredRevenue: number;
  }>;
  formulas: Record<string, string>;
};

type ProductWinner = {
  id: string;
  productId: string | null;
  sku: string | null;
  name: string;
  grade: 'A' | 'B' | 'C' | 'D';
  views: number;
  uniqueViews: number;
  addToCarts: number;
  checkoutStarts: number;
  unitsSold: number;
  confirmedUnits: number;
  deliveredUnits: number;
  cancelledUnits: number;
  returnedUnits: number;
  orders: number;
  confirmedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  confirmedRevenue: number;
  deliveredRevenue: number;
  returnedRevenue: number;
  estimatedGrossProfit: number | null;
  stockLeft: number | null;
  addToCartRate: number;
  checkoutRate: number;
  purchaseRate: number;
  confirmationRate: number;
  deliveryRate: number;
  cancelRate: number;
  returnRate: number;
};

type ProductsResponse = {
  ok: boolean;
  range: DateRange;
  products: ProductWinner[];
  summary: {
    totalProducts: number;
    gradeA: number;
    gradeB: number;
    gradeC: number;
    gradeD: number;
    metricsNote: string;
  };
};

const dateRanges: Array<{ value: DateRange; label: string }> = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

function formatNumber(value: number) {
  return value.toLocaleString('en-BD');
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return 'N/A';
  return `${value.toFixed(2)}%`;
}

function formatRoas(value: number | null) {
  if (value === null) return 'Add ad spend';
  return `${value.toFixed(2)}x`;
}

function GrowthBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs font-medium text-gray-400">no previous baseline</span>;
  }

  const positive = value >= 0;
  return (
    <span className={clsx('inline-flex items-center gap-1 text-xs font-semibold', positive ? 'text-emerald-600' : 'text-red-600')}>
      {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {positive ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  growth,
  icon: Icon,
  tone = 'neutral',
}: {
  title: string;
  value: string;
  subtitle?: string;
  growth?: number | null;
  icon: React.ElementType;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
}) {
  const toneClass = {
    neutral: 'border-gray-200 bg-white',
    good: 'border-emerald-200 bg-emerald-50',
    warn: 'border-amber-200 bg-amber-50',
    bad: 'border-red-200 bg-red-50',
  }[tone];

  return (
    <div className={clsx('rounded-xl border p-5 shadow-sm', toneClass)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="rounded-lg bg-white/80 p-2 text-gray-700 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 flex min-h-5 items-center justify-between gap-3">
        {subtitle ? <p className="text-xs text-gray-500">{subtitle}</p> : <span />}
        {growth !== undefined ? <GrowthBadge value={growth} /> : null}
      </div>
    </div>
  );
}

function GradeBadge({ grade }: { grade: ProductWinner['grade'] }) {
  const className = {
    A: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    B: 'bg-blue-100 text-blue-700 border-blue-200',
    C: 'bg-amber-100 text-amber-700 border-amber-200',
    D: 'bg-red-100 text-red-700 border-red-200',
  }[grade];

  return <span className={clsx('rounded-full border px-2 py-1 text-xs font-bold', className)}>Grade {grade}</span>;
}

function TrendBars({ series }: { series: RevenueResponse['series'] }) {
  const maxDelivered = Math.max(...series.map((item) => item.deliveredRevenue), 1);
  const compactSeries = series.length > 45 ? series.filter((_, index) => index % 3 === 0) : series;

  return (
    <div className="flex h-48 items-end gap-1 rounded-xl border border-gray-200 bg-white p-4">
      {compactSeries.map((item) => {
        const height = Math.max(4, (item.deliveredRevenue / maxDelivered) * 100);
        return (
          <div key={item.date} className="group flex flex-1 flex-col items-center justify-end">
            <div
              className="w-full rounded-t bg-purple-500 transition-all group-hover:bg-purple-700"
              style={{ height: `${height}%` }}
              title={`${item.date}: ${formatPrice(item.deliveredRevenue)} delivered / ${item.orders} orders`}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const { hasPermission, isLoading: authLoading } = useAdminAuth();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [adSpendInput, setAdSpendInput] = useState('');
  const [revenueData, setRevenueData] = useState<RevenueResponse | null>(null);
  const [productsData, setProductsData] = useState<ProductsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canView = hasPermission(PERMISSIONS.ANALYTICS_VIEW);
  const adSpend = useMemo(() => {
    const parsed = Number(adSpendInput);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [adSpendInput]);

  const loadAnalytics = useCallback(async () => {
    if (!canView) return;

    setIsLoading(true);
    setError(null);

    try {
      const adSpendQuery = adSpend ? `&adSpend=${encodeURIComponent(String(adSpend))}` : '';
      const [revenueResponse, productsResponse] = await Promise.all([
        fetch(`/api/admin/analytics/revenue?range=${dateRange}${adSpendQuery}`, {
          cache: 'no-store',
          credentials: 'include',
        }),
        fetch(`/api/admin/analytics/products?range=${dateRange}&limit=50`, {
          cache: 'no-store',
          credentials: 'include',
        }),
      ]);

      if (!revenueResponse.ok) throw new Error(`Revenue analytics failed (${revenueResponse.status})`);
      if (!productsResponse.ok) throw new Error(`Product analytics failed (${productsResponse.status})`);

      const [revenueJson, productsJson] = await Promise.all([
        revenueResponse.json() as Promise<RevenueResponse>,
        productsResponse.json() as Promise<ProductsResponse>,
      ]);

      setRevenueData(revenueJson);
      setProductsData(productsJson);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, [adSpend, canView, dateRange]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking analytics permission...
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="m-6 rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6" />
          <div>
            <h1 className="text-lg font-semibold">Analytics access restricted</h1>
            <p className="mt-1 text-sm">Your admin role does not include analytics permission.</p>
          </div>
        </div>
      </div>
    );
  }

  const summary = revenueData?.summary;
  const products = productsData?.products ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue & Product Winner Analytics</h1>
          <p className="mt-1 text-sm text-gray-600">
            Backend-verified confirmed revenue, delivered revenue, real ROAS, and product scaling signals. No customer PII is shown.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={dateRange}
            onChange={(event) => setDateRange(event.target.value as DateRange)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
          >
            {dateRanges.map((range) => (
              <option key={range.value} value={range.value}>{range.label}</option>
            ))}
          </select>
          <input
            value={adSpendInput}
            onChange={(event) => setAdSpendInput(event.target.value)}
            inputMode="decimal"
            placeholder="Ad spend BDT optional"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
          />
          <button
            onClick={() => void loadAnalytics()}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={clsx('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {error}
          </div>
        </div>
      ) : null}

      {isLoading && !summary ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading real analytics...
        </div>
      ) : null}

      {summary ? (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Confirmed Revenue"
              value={formatPrice(summary.confirmedRevenue)}
              subtitle={`${formatNumber(summary.confirmedOrders)} confirmed orders`}
              growth={summary.growth.confirmedRevenue}
              icon={DollarSign}
              tone="good"
            />
            <MetricCard
              title="Delivered Revenue"
              value={formatPrice(summary.deliveredRevenue)}
              subtitle={`${formatNumber(summary.deliveredOrders)} delivered orders`}
              growth={summary.growth.deliveredRevenue}
              icon={Truck}
              tone="good"
            />
            <MetricCard
              title="Real ROAS"
              value={formatRoas(summary.realRoas)}
              subtitle="Delivered revenue / ad spend"
              icon={BarChart3}
              tone={summary.realRoas === null ? 'warn' : summary.realRoas >= 2 ? 'good' : 'warn'}
            />
            <MetricCard
              title="Product Winners"
              value={`${productsData?.summary.gradeA ?? 0} A-grade`}
              subtitle={`${products.length} products in period`}
              icon={PackageSearch}
              tone="neutral"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Delivered Revenue Trend</h2>
                  <p className="text-sm text-gray-500">Bar height is delivered revenue by order-created date.</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <TrendBars series={revenueData.series} />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-gray-900">Order Funnel</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between"><span>Created</span><strong>{formatNumber(summary.ordersCreated)}</strong></div>
                <div className="flex justify-between"><span>Confirmed</span><strong>{formatNumber(summary.confirmedOrders)} ({formatPercent(summary.confirmationRate)})</strong></div>
                <div className="flex justify-between"><span>Delivered</span><strong>{formatNumber(summary.deliveredOrders)} ({formatPercent(summary.deliveryRate)})</strong></div>
                <div className="flex justify-between"><span>Cancelled</span><strong>{formatNumber(summary.cancelledOrders)} ({formatPercent(summary.cancelRate)})</strong></div>
                <div className="flex justify-between"><span>Returned</span><strong>{formatNumber(summary.returnedOrders)} ({formatPercent(summary.returnRate)})</strong></div>
                <div className="border-t pt-3">
                  <div className="flex justify-between"><span>Meta purchases sent</span><strong>{formatNumber(summary.metaPurchaseSent)}</strong></div>
                  <div className="mt-2 flex justify-between"><span>GA4 purchases sent</span><strong>{formatNumber(summary.gaPurchaseSent)}</strong></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Reported ROAS" value={formatRoas(summary.reportedRoas)} subtitle="Confirmed revenue / ad spend" icon={TrendingUp} tone="neutral" />
            <MetricCard title="Cancelled Revenue" value={formatPrice(summary.cancelledRevenue)} subtitle={`${formatNumber(summary.cancelledOrders)} cancelled orders`} icon={TrendingDown} tone="bad" />
            <MetricCard title="Returned Revenue" value={formatPrice(summary.returnedRevenue)} subtitle={`${formatNumber(summary.returnedOrders)} returned orders`} icon={RefreshCw} tone="warn" />
            <MetricCard title="Average Order Value" value={formatPrice(summary.averageOrderValue)} subtitle="Created orders average" icon={ShoppingBag} tone="neutral" />
          </div>
        </>
      ) : null}

      {productsData ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Product Winner Dashboard</h2>
              <p className="mt-1 text-sm text-gray-500">{productsData.summary.metricsNote}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">A: {productsData.summary.gradeA}</span>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">B: {productsData.summary.gradeB}</span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">C: {productsData.summary.gradeC}</span>
              <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">D: {productsData.summary.gradeD}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Grade</th>
                  <th className="px-5 py-3 text-right">Delivered Revenue</th>
                  <th className="px-5 py-3 text-right">Gross Profit</th>
                  <th className="px-5 py-3 text-right">Confirmed</th>
                  <th className="px-5 py-3 text-right">Delivered</th>
                  <th className="px-5 py-3 text-right">Delivery Rate</th>
                  <th className="px-5 py-3 text-right">Return Rate</th>
                  <th className="px-5 py-3 text-right">ATC Rate</th>
                  <th className="px-5 py-3 text-right">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="max-w-xs px-5 py-4">
                      <div className="font-semibold text-gray-900">{product.name}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <Boxes className="h-3.5 w-3.5" />
                        {product.sku || 'No SKU'}
                      </div>
                    </td>
                    <td className="px-5 py-4"><GradeBadge grade={product.grade} /></td>
                    <td className="px-5 py-4 text-right font-semibold text-gray-900">{formatPrice(product.deliveredRevenue)}</td>
                    <td className="px-5 py-4 text-right">
                      {product.estimatedGrossProfit === null ? 'Cost missing' : formatPrice(product.estimatedGrossProfit)}
                    </td>
                    <td className="px-5 py-4 text-right">{formatNumber(product.confirmedOrders)}</td>
                    <td className="px-5 py-4 text-right">{formatNumber(product.deliveredOrders)}</td>
                    <td className="px-5 py-4 text-right">{formatPercent(product.deliveryRate)}</td>
                    <td className={clsx('px-5 py-4 text-right', product.returnRate >= 20 ? 'font-semibold text-red-600' : '')}>{formatPercent(product.returnRate)}</td>
                    <td className="px-5 py-4 text-right">{formatPercent(product.addToCartRate)}</td>
                    <td className="px-5 py-4 text-right">{product.stockLeft === null ? 'N/A' : formatNumber(product.stockLeft)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!products.length ? (
            <div className="p-8 text-center text-sm text-gray-500">No product order data found for this date range.</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
