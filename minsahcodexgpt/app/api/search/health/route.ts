import { NextRequest, NextResponse } from 'next/server';
import { testConnection, indexExists, PRODUCT_INDEX, esClient } from '@/lib/elasticsearch';
import { requireSuperAdmin } from '@/app/api/admin/_utils';
import { getDatabaseFallbackHealth } from '@/lib/search/db-fallback';

const noStoreHeaders = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
};

function publicHealthResponse() {
  return NextResponse.json(
    {
      ok: true,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: noStoreHeaders,
    }
  );
}

/**
 * GET /api/search/health
 *
 * Public response intentionally stays minimal so Elasticsearch/index internals
 * are not exposed. Detailed health is only returned to SUPER_ADMIN users when
 * they request ?details=true.
 */
export async function GET(request: NextRequest) {
  const wantsDetailedHealth = request.nextUrl.searchParams.get('details') === 'true';

  if (!wantsDetailedHealth) {
    return publicHealthResponse();
  }

  const { response } = await requireSuperAdmin(
    request,
    'Detailed search health is restricted to SUPER_ADMIN users.'
  );
  if (response) return response;

  const startTime = Date.now();

  try {
    // Run health checks in parallel. Database fallback health is part of Phase 27
    // because search can stay available even when Elasticsearch is down.
    const [connected, exists, databaseFallback] = await Promise.all([
      testConnection(),
      indexExists(PRODUCT_INDEX),
      getDatabaseFallbackHealth(),
    ]);

    let documentCount = 0;
    let clusterHealth = 'unknown';
    let indexHealth: { sizeInBytes: number; documentsCount: number } | null = null;

    if (connected && exists) {
      try {
        const [countRes, healthRes] = await Promise.all([
          esClient.count({ index: PRODUCT_INDEX }),
          esClient.cluster.health()
        ]);
        
        documentCount = countRes.count;
        clusterHealth = healthRes.status;

        // Get index health
        const indexStats = await esClient.indices.stats({ index: PRODUCT_INDEX });
        indexHealth = {
          sizeInBytes: indexStats.indices?.[PRODUCT_INDEX]?.total?.store?.size_in_bytes || 0,
          documentsCount: documentCount,
        };
      } catch (error) {
        console.error('Error fetching Elasticsearch stats:', error);
      }
    }

    const responseTime = Date.now() - startTime;
    const elasticsearchReady = connected && exists && clusterHealth !== 'red';
    const fallbackReady = databaseFallback.ok;
    const status = elasticsearchReady ? 'healthy' : fallbackReady ? 'degraded' : 'unhealthy';
    const searchSource = elasticsearchReady ? 'elasticsearch' : fallbackReady ? 'database_fallback' : 'unavailable';

    return NextResponse.json({
      ok: status !== 'unhealthy',
      status,
      responseTime,
      search: {
        source: searchSource,
        degraded: status === 'degraded',
        fallbackActive: searchSource === 'database_fallback',
        message: status === 'degraded'
          ? 'Elasticsearch is unavailable or unhealthy. Search requests are using the Prisma database fallback.'
          : status === 'healthy'
            ? 'Elasticsearch search is healthy.'
            : 'Search is unavailable because Elasticsearch and the database fallback are both unhealthy.',
      },
      elasticsearch: {
        connected,
        clusterHealth,
        version: process.env.ELASTICSEARCH_VERSION || 'unknown',
      },
      index: {
        name: PRODUCT_INDEX,
        exists,
        documentCount,
        ...(indexHealth ?? {}),
      },
      databaseFallback,
      timestamp: new Date().toISOString(),
    }, {
      status: status === 'unhealthy' ? 503 : 200,
      headers: noStoreHeaders,
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Health check error:', error);

    return NextResponse.json({
      ok: false,
      status: 'error',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { 
      status: 500,
      headers: noStoreHeaders,
    });
  }
}
