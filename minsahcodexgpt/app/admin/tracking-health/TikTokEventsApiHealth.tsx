import { Target } from 'lucide-react';
import { MetricCard } from './MetricCard';
import type { TrackingSnapshot } from './page';

export type TrackingHealthMetrics = TrackingSnapshot['metrics'];

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value * 100)}%`;
}

export function TikTokEventsApiHealth({ metrics }: { metrics: TrackingHealthMetrics }) {
  const purchaseGap = metrics.expectedTikTokPurchases - metrics.tiktokPurchaseSent;

  return (
    <div className="rounded-xl border border-[#232636] bg-[#161824] p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center text-lg font-bold text-[#F7F8F8]">
            <Target className="mr-2 h-5 w-5 text-white" />
            TikTok Events API Health
          </h2>
          <p className="mt-1 text-sm text-[#8A8F98]">Verified server-side Purchase status, failure count, and attribution match coverage. Browser Purchase remains blocked.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
          metrics.tiktokEventsApiEnabled && metrics.tiktokPurchaseLiveVerified
            ? 'bg-white/[0.12] text-white border border-white/[0.20]'
            : metrics.tiktokEventsApiEnabled
              ? 'bg-white/[0.06] text-white/80 border border-white/[0.10]'
              : 'bg-[#10121b] text-[#8A8F98] border border-[#232636]'
        }`}>
          {metrics.tiktokEventsApiEnabled ? (metrics.tiktokPurchaseLiveVerified ? 'Events API live' : 'Enabled, live gated') : 'Events API disabled'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="TikTok Purchase Sent" value={metrics.tiktokPurchaseSent} subtitle={`${metrics.expectedTikTokPurchases} expected in window`} tone={metrics.tiktokEventsApiEnabled && purchaseGap > 0 ? 'warn' : 'good'} />
        <MetricCard title="TikTok Pending Orders" value={metrics.pendingTiktokPurchaseOrders} subtitle="verified backend orders not sent" tone={metrics.pendingTiktokPurchaseOrders > 0 ? 'warn' : 'good'} />
        <MetricCard title="TikTok Failures" value={metrics.tiktokFailures} subtitle={`${metrics.tiktokFinalFailures} final failures`} tone={metrics.tiktokFinalFailures > 0 ? 'bad' : metrics.tiktokFailures > 0 ? 'warn' : 'good'} />
        <MetricCard title="Auth/Token Failures" value={metrics.tiktokTokenInvalidFailures} subtitle="access token / permission related" tone={metrics.tiktokTokenInvalidFailures > 0 ? 'bad' : 'good'} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <MetricCard title="ttclid Coverage" value={formatPercent(metrics.tiktokClickIdCoverage)} subtitle={`${metrics.tiktokClickIdOrders}/${metrics.tiktokMatchBaseOrders} purchase-ready orders`} tone={metrics.tiktokClickIdCoverage >= 0.3 || metrics.tiktokMatchBaseOrders === 0 ? 'good' : 'warn'} />
        <MetricCard title="_ttp Coverage" value={formatPercent(metrics.tiktokTtpCoverage)} subtitle={`${metrics.tiktokTtpOrders}/${metrics.tiktokMatchBaseOrders} purchase-ready orders`} tone={metrics.tiktokTtpCoverage >= 0.3 || metrics.tiktokMatchBaseOrders === 0 ? 'good' : 'warn'} />
        <MetricCard title="IP + UA Coverage" value={formatPercent(metrics.tiktokIpUaCoverage)} subtitle={`${metrics.tiktokIpUaOrders}/${metrics.tiktokMatchBaseOrders} purchase-ready orders`} tone={metrics.tiktokIpUaCoverage >= 0.8 || metrics.tiktokMatchBaseOrders === 0 ? 'good' : 'warn'} />
      </div>

      <div className="mt-4 rounded-lg border border-[#232636] bg-[#10121b] p-4 text-sm text-[#8A8F98]">
        TikTok ROAS is shown only from verified server-side Purchase counts. Fake/demo TikTok revenue is intentionally hidden until Events API production verification is complete.
      </div>
    </div>
  );
}
