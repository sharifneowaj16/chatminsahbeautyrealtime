/**
 * Canonical Webhook Endpoint: /api/webhooks/steadfast
 * Re-exports from /api/webhook/steadfast for standard plural webhook routing parity.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export { POST } from '@/app/api/webhook/steadfast/route';
