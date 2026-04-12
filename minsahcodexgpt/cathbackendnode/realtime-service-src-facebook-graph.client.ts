import { getConfig } from '../config'

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0'

export class GraphApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message)
    this.name = 'GraphApiError'
  }
}

export interface SendMessageResult {
  recipientId: string
  messageId: string
}

export interface MessengerProfile {
  id: string
  name: string | null
}

export async function sendMessengerReply(
  recipientPsid: string,
  text: string
): Promise<SendMessageResult> {
  const { FB_PAGE_ACCESS_TOKEN } = getConfig()

  const response = await fetch(`${GRAPH_API_BASE}/me/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FB_PAGE_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      recipient: { id: recipientPsid },
      message: { text },
      messaging_type: 'RESPONSE',
    }),
  })

  const body = (await response.json().catch(() => null)) as
    | { recipient_id?: string; message_id?: string; error?: { message?: string } }
    | null

  if (!response.ok || !body?.recipient_id || !body?.message_id) {
    throw new GraphApiError(
      body?.error?.message ?? 'Graph API send message failed',
      response.status
    )
  }

  return {
    recipientId: body.recipient_id,
    messageId: body.message_id,
  }
}

export async function replyToComment(commentId: string, text: string): Promise<{ id: string }> {
  const { FB_PAGE_ACCESS_TOKEN } = getConfig()

  const response = await fetch(`${GRAPH_API_BASE}/${commentId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FB_PAGE_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ message: text }),
  })

  const body = (await response.json().catch(() => null)) as
    | { id?: string; error?: { message?: string } }
    | null

  if (!response.ok || !body?.id) {
    throw new GraphApiError(
      body?.error?.message ?? 'Graph API comment reply failed',
      response.status
    )
  }

  return { id: body.id }
}

export async function getMessengerProfile(psid: string): Promise<MessengerProfile> {
  const { FB_PAGE_ACCESS_TOKEN } = getConfig()

  const response = await fetch(
    `${GRAPH_API_BASE}/${psid}?fields=name&access_token=${encodeURIComponent(FB_PAGE_ACCESS_TOKEN)}`
  )

  const body = (await response.json().catch(() => null)) as
    | { id?: string; name?: string; error?: { message?: string } }
    | null

  if (!response.ok) {
    throw new GraphApiError(
      body?.error?.message ?? 'Graph API profile lookup failed',
      response.status
    )
  }

  return {
    id: body?.id ?? psid,
    name: body?.name ?? null,
  }
}
