import 'server-only';

import { MetaPlatform, type MetaPlatformOptions } from './platform';
import type {
  MetaGraphBatchOperation,
  MetaGraphHttpRequest,
  MetaGraphPaginationOptions,
  MetaGraphRequester,
} from './transports/graph-http/types';

export { createLegacyMetaCapabilityAdapter } from './migration/legacy-facade';
export type {
  CreateLegacyMetaCapabilityAdapterOptions,
  LegacyMetaOperationHandler,
} from './migration/legacy-facade';

export function createServerMetaPlatform(options: MetaPlatformOptions = {}): MetaPlatform {
  return new MetaPlatform(options);
}

export type { MetaExternalReferenceRepository } from './references/repository';

export async function createPrismaMetaExternalReferenceRepository() {
  const repository = await import('./references/prisma-repository');
  return repository.createPrismaMetaExternalReferenceRepository();
}

export {
  META_CAPABILITY_PERMISSION_MATRIX,
  getMetaCapabilityPermissionRequirement,
  getRequiredMetaPermissions,
} from './capabilities/permission-matrix';
export { authorizeMetaCapability } from './capabilities/governance';
export type { MetaCapabilityAuthorization } from './capabilities/governance';
export { buildMetaAppSecretProof, isMetaAppSecretProof } from './credentials/appsecret-proof';
export { MetaCredentialClientRegistry } from './credentials/client-registry';
export { EnvironmentMetaCredentialProvider, createEnvironmentMetaCredentialProvider } from './credentials/environment-provider';
export type { MetaEnvironment } from './credentials/environment-provider';
export {
  InMemoryMetaCredentialProvider,
  MetaCredentialResolutionError,
  createMetaCredentialVersion,
} from './credentials/provider';
export type { InMemoryMetaCredentialInput } from './credentials/provider';
export type {
  MetaCredentialMaterial,
  MetaCredentialMetadataRepository,
  MetaCredentialProvider,
} from './credentials/types';

export async function createPrismaMetaCredentialMetadataRepository() {
  const repository = await import('./credentials/prisma-metadata-repository');
  return repository.createPrismaMetaCredentialMetadataRepository();
}

export type {
  MetaBusinessSdkClient,
  MetaBusinessSdkClientFactoryOptions,
  MetaBusinessSdkClientRequest,
  MetaBusinessSdkLogger,
  MetaBusinessSdkOperationContext,
  MetaBusinessSdkRequestLog,
} from './transports/business-sdk/types';

export async function createMetaBusinessSdkClientFactory(
  options: import('./transports/business-sdk/types').MetaBusinessSdkClientFactoryOptions,
) {
  const transport = await import('./transports/business-sdk/client-factory');
  return new transport.MetaBusinessSdkClientFactory(options);
}

export async function createMetaBusinessSdkExecutor(input: {
  readonly clientFactory: import('./transports/business-sdk/client-factory').MetaBusinessSdkClientFactory;
  readonly logger?: import('./transports/business-sdk/types').MetaBusinessSdkLogger;
}) {
  const transport = await import('./transports/business-sdk/executor');
  return new transport.MetaBusinessSdkExecutor(input);
}

export type {
  MetaGraphBatchItemResult,
  MetaGraphBatchOperation,
  MetaGraphHttpClientOptions,
  MetaGraphHttpRequest,
  MetaGraphHttpResponse,
  MetaGraphPage,
  MetaGraphPaginationOptions,
  MetaGraphPaginationResult,
} from './transports/graph-http/types';

export async function createMetaGraphHttpClient(
  options: import('./transports/graph-http/types').MetaGraphHttpClientOptions,
) {
  const transport = await import('./transports/graph-http/client');
  return new transport.MetaGraphHttpClient(options);
}

export async function collectServerMetaGraphPages<T>(input: {
  readonly client: MetaGraphRequester;
  readonly request: Omit<MetaGraphHttpRequest, 'method' | 'query'> & {
    readonly query?: MetaGraphHttpRequest['query'];
  };
  readonly options?: MetaGraphPaginationOptions;
}) {
  const transport = await import('./transports/graph-http/pagination');
  return transport.collectMetaGraphPages<T>(input);
}

export async function executeServerMetaGraphBatch(input: {
  readonly client: MetaGraphRequester;
  readonly request: Omit<MetaGraphHttpRequest, 'method' | 'path' | 'body' | 'bodyEncoding'>;
  readonly operations: readonly MetaGraphBatchOperation[];
}) {
  const transport = await import('./transports/graph-http/batch');
  return transport.executeMetaGraphBatch(input);
}

export async function loadMetaWebhookTransport() {
  return import('./transports/webhook');
}

export async function loadMetaMediaTransport() {
  return import('./transports/media');
}

export async function createPrismaMetaOperationStore() {
  const repository = await import('./operations/prisma-store');
  return repository.createPrismaMetaOperationStore();
}

export async function loadMetaOperationRuntime() {
  const [operations, publisher] = await Promise.all([
    import('./operations/index'),
    import('./operations/bullmq-publisher'),
  ]);
  return Object.freeze({ ...operations, createMetaOperationBullMqPublisher: publisher.createMetaOperationBullMqPublisher });
}

export async function createRedisMetaReliabilityStateStore() {
  const runtime = await import('./reliability/redis-state');
  return new runtime.RedisMetaReliabilityStateStore();
}

export async function loadMetaReliabilityRuntime() {
  const [reliability, redis] = await Promise.all([
    import('./reliability/index'),
    import('./reliability/redis-state'),
  ]);
  return Object.freeze({ ...reliability, RedisMetaReliabilityStateStore: redis.RedisMetaReliabilityStateStore });
}

export async function createPrismaMetaWorkflowStore() {
  const runtime = await import('./workflows/prisma-store');
  return runtime.createPrismaMetaWorkflowStore();
}

export async function createPrismaMetaFencedLockManager() {
  const runtime = await import('./concurrency/prisma-fenced-lock');
  return runtime.createPrismaMetaFencedLockManager();
}

export async function loadMetaWorkflowRuntime() {
  const [workflows, concurrency, reconciliation, replay, projections] = await Promise.all([
    import('./workflows'),
    import('./concurrency'),
    import('./reconciliation'),
    import('./replay'),
    import('./projections'),
  ]);
  return Object.freeze({ ...workflows, ...concurrency, ...reconciliation, ...replay, ...projections });
}

export async function loadMetaConnectionHealthRuntime() {
  return import('./domains/connection');
}

export async function loadMetaCapiRuntime() {
  return import('./domains/capi');
}

export async function loadMetaPhase28CutoverRuntime() {
  const [connection, capi, policy] = await Promise.all([
    import('./migration/phase28-connection-facade'),
    import('./migration/phase28-capi-facade'),
    import('./migration/phase28-cutover'),
  ]);
  return Object.freeze({ ...connection, ...capi, ...policy });
}

export async function loadMetaAdsRuntime() {
  return import('./domains/ads');
}

export async function loadMetaInsightsRuntime() {
  return import('./domains/insights');
}

export async function loadMetaAudiencesRuntime() {
  return import('./domains/audiences');
}

export async function loadMetaPhase29CutoverRuntime() {
  const [ads, audiences, policy] = await Promise.all([
    import('./migration/phase29-ads-facade'),
    import('./migration/phase29-audiences-facade'),
    import('./migration/phase29-cutover'),
  ]);
  return Object.freeze({ ...ads, ...audiences, ...policy });
}

export async function createDefaultMetaSocialQueueAdapter() {
  const [adapter, queues] = await Promise.all([
    import('./queue/bullmq-social-adapter.ts'),
    import('../jobs/queues'),
  ]);
  return adapter.createBullMqSocialQueueAdapter({ enqueueMetaJob: queues.enqueueMetaJob });
}
