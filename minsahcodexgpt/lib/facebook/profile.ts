import { buildLegacyMetaGraphRedirectUrl, createLegacyMetaGraphClient } from '@/lib/meta-platform/transports/graph-http';

const FACEBOOK_GRAPH_API_VERSION = process.env.FACEBOOK_GRAPH_API_VERSION || 'v21.0';

export interface FacebookProfile {
  id: string;
  name: string | null;
  avatar: string | null;
}

interface FacebookProfileResponse {
  id?: string;
  name?: string;
  profile_pic?: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
}

const profileCache = new Map<string, Promise<FacebookProfile>>();

function buildFacebookAvatarUrl(id: string, accessToken: string) {
  return buildLegacyMetaGraphRedirectUrl({
    path: `${id}/picture`,
    graphApiVersion: FACEBOOK_GRAPH_API_VERSION,
    accessToken,
    query: { width: 128, height: 128, redirect: true },
  });
}

export async function getFacebookProfile(
  id: string | null | undefined,
  accessToken: string | null | undefined,
  fallback?: Partial<FacebookProfile>
): Promise<FacebookProfile> {
  const safeId = id ?? fallback?.id ?? 'unknown';
  const fallbackProfile: FacebookProfile = {
    id: safeId,
    name: fallback?.name ?? null,
    avatar: id && accessToken ? fallback?.avatar ?? buildFacebookAvatarUrl(id, accessToken) : fallback?.avatar ?? null,
  };

  if (!id || !accessToken) return fallbackProfile;

  const cacheKey = `${id}:${accessToken.slice(-12)}`;
  const cached = profileCache.get(cacheKey);
  if (cached) {
    const profile = await cached;
    return {
      id: profile.id,
      name: profile.name ?? fallbackProfile.name,
      avatar: profile.avatar ?? fallbackProfile.avatar,
    };
  }

  const pending = (async (): Promise<FacebookProfile> => {
    try {
      const client = createLegacyMetaGraphClient({
        accessToken,
        graphApiVersion: FACEBOOK_GRAPH_API_VERSION,
      });
      const data = await client.get<FacebookProfileResponse>(id, {
        fields: 'id,name,profile_pic,picture.width(128).height(128)',
      });
      return {
        id: data.id ?? safeId,
        name: data.name ?? fallbackProfile.name,
        avatar: data.profile_pic ?? data.picture?.data?.url ?? fallbackProfile.avatar,
      };
    } catch {
      return fallbackProfile;
    }
  })();

  profileCache.set(cacheKey, pending);
  return pending;
}
