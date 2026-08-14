export type InstagramInboundRuntimeMode = 'DOMAIN' | 'LEGACY_ROLLBACK';
export function getInstagramInboundRuntimeMode(env: Readonly<Record<string, string | undefined>> = {}): InstagramInboundRuntimeMode {
  return env.META_PHASE31_INSTAGRAM_INBOUND_RUNTIME === 'LEGACY_ROLLBACK' ? 'LEGACY_ROLLBACK' : 'DOMAIN';
}

export type InstagramOutboundRuntimeMode = 'DOMAIN' | 'LEGACY_ROLLBACK';
export function getInstagramOutboundRuntimeMode(env: Readonly<Record<string, string | undefined>> = {}): InstagramOutboundRuntimeMode {
  return env.META_PHASE31_INSTAGRAM_OUTBOUND_RUNTIME === 'LEGACY_ROLLBACK' ? 'LEGACY_ROLLBACK' : 'DOMAIN';
}

export type InstagramMediaRuntimeMode = 'DOMAIN' | 'LEGACY_ROLLBACK';
export function getInstagramMediaRuntimeMode(env: Readonly<Record<string, string | undefined>> = {}): InstagramMediaRuntimeMode {
  return env.META_PHASE31_INSTAGRAM_MEDIA_RUNTIME === 'LEGACY_ROLLBACK' ? 'LEGACY_ROLLBACK' : 'DOMAIN';
}
