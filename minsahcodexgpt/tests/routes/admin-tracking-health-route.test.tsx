import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  TikTokEventsApiHealth,
  type TrackingHealthMetrics,
} from '../../app/admin/tracking-health/TikTokEventsApiHealth';

const metrics: TrackingHealthMetrics = {
  ordersCreated: 1,
  codPhoneConfirmed: 1,
  onlinePaid: 0,
  expectedMetaPurchases: 1,
  expectedTikTokPurchases: 1,
  metaPurchaseSent: 1,
  gaPurchaseSent: 1,
  tiktokEventsApiEnabled: true,
  tiktokPurchaseLiveVerified: true,
  tiktokPurchaseSent: 1,
  pendingTiktokPurchaseOrders: 0,
  tiktokFailures: 0,
  tiktokFinalFailures: 0,
  tiktokTokenInvalidFailures: 0,
  tiktokMatchBaseOrders: 1,
  tiktokClickIdOrders: 1,
  tiktokTtpOrders: 1,
  tiktokIpUaOrders: 1,
  tiktokClickIdCoverage: 1,
  tiktokTtpCoverage: 1,
  tiktokIpUaCoverage: 1,
  capiFailures: 0,
  capiFinalFailures: 0,
  tokenInvalidFailures: 0,
  pendingMetaPurchaseOrders: 0,
  pendingGaPurchaseOrders: 0,
  gaFailures: 0,
  gaFinalFailures: 0,
  gaRefundEligible: 0,
  gaRefundSent: 0,
  pendingGaRefundOrders: 0,
  gaClientIdMissingOrders: 0,
  gaClientIdMissingRate: 0,
  referralExclusionsVerified: true,
  recentFailureCount: 0,
};

const html = renderToStaticMarkup(<TikTokEventsApiHealth metrics={metrics} />);

assert.match(html, /TikTok Events API Health/);
assert.match(html, /Events API live/);
assert.match(html, /TikTok Purchase Sent/);
assert.match(html, /lucide-target/);

console.log('✓ Tracking-health TikTok section rendered with the Target icon');
