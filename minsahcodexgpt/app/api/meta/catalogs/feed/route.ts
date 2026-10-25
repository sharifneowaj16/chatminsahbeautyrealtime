/**
 * Compatibility alias for Meta Product Catalog Feed
 * Re-exports GET from /api/meta/catalog/feed to support both singular and plural paths.
 */
export const dynamic = 'force-dynamic';

export { GET } from '@/app/api/meta/catalog/feed/route';
