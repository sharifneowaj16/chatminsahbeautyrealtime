import { permanentRedirect } from 'next/navigation';
import { buildCatalogPath, type CatalogSearchParamRecord } from '@/lib/catalog-navigation';

/**
 * `/shop` is the single catalog/search experience.
 * Keep this legacy route as a query-preserving permanent redirect so old links,
 * bookmarks and campaigns continue to work without maintaining a second UI.
 */
export default async function LegacySearchPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParamRecord>;
}) {
  permanentRedirect(buildCatalogPath(await searchParams));
}
