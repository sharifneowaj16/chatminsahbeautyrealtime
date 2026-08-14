import 'server-only';

export {
  buildMetaConnectionBootstrapThroughPlatform as buildMetaConnectionBootstrapReadiness,
  checkMetaConnectionReadinessThroughPlatform as checkMetaConnectionReadiness,
  getMetaConnectionCutoverStatus,
} from '@/lib/meta-platform/migration/phase28-connection-facade';
