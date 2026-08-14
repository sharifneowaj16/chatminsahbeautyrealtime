import 'server-only';
import { createMetaGraphClient } from '@/lib/meta/connection/client';
import { getMetaBusinessConfig } from '@/lib/meta-business/config';

export async function fetchInstagramParticipantProfile(participantId: string) {
  const config = getMetaBusinessConfig();
  const token = config.pageAccessToken ?? config.accessToken;
  if (!token) throw new Error('META_INSTAGRAM_ACCESS_TOKEN_REQUIRED');
  const client = createMetaGraphClient({ accessToken: token, appSecret: config.appSecret, graphApiVersion: config.graphApiVersion });
  const row = await client.get<{ id?: string; username?: string; name?: string; profile_pic?: string }>(`/${participantId}`, {
    fields: 'id,username,name,profile_pic',
  }, token);
  return {
    id: typeof row.id === 'string' ? row.id : participantId,
    username: typeof row.username === 'string' ? row.username.slice(0, 160) : null,
    name: typeof row.name === 'string' ? row.name.slice(0, 160) : null,
    avatarUrl: typeof row.profile_pic === 'string' ? row.profile_pic.slice(0, 2_000) : null,
  };
}
