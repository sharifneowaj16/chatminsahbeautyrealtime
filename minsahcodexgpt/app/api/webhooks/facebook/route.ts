/**
 * Canonical Webhook Endpoint: /api/webhooks/facebook
 * Re-exports from /api/webhook/facebook for standard plural webhook routing parity.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export { GET, POST } from '@/app/api/webhook/facebook/route';
