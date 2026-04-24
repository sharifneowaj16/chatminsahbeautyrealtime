export type MessengerAttachmentType = 'image' | 'video' | 'audio' | 'file'

interface AttachmentLike {
  type?: string
  mime_type?: string
  name?: string
  payload?: {
    url?: string
  }
  file_url?: string
  image_data?: {
    url?: string
  }
  video_data?: {
    url?: string
  }
  audio_data?: {
    url?: string
  }
}

export interface NormalizedAttachment {
  type: MessengerAttachmentType
  url?: string
  mimeType?: string
  name?: string
}

export interface IncomingMessagePart {
  messageId: string
  text: string
  attachmentUrl?: string
  attachmentType?: MessengerAttachmentType
  attachmentMimeType?: string
  attachmentName?: string
}

const ATTACHMENT_HINT_PREFIX = 'minsah-fb-type='

export function normalizeAttachmentType(type: string | undefined): MessengerAttachmentType {
  if (type === 'image' || type === 'video' || type === 'audio') {
    return type
  }

  return 'file'
}

export function addAttachmentTypeHint(
  url: string,
  type: MessengerAttachmentType
): string {
  try {
    const parsed = new URL(url)
    const existingHash = parsed.hash.replace(/^#/, '')
    const parts = existingHash
      ? existingHash
          .split('&')
          .filter((part) => part && !part.startsWith(ATTACHMENT_HINT_PREFIX))
      : []
    parts.unshift(`${ATTACHMENT_HINT_PREFIX}${type}`)
    parsed.hash = parts.join('&')
    return parsed.toString()
  } catch {
    const separator = url.includes('#') ? '&' : '#'
    return `${url}${separator}${ATTACHMENT_HINT_PREFIX}${type}`
  }
}

export function getAttachmentTypeHint(
  url: string | null | undefined
): MessengerAttachmentType | null {
  if (!url) {
    return null
  }

  const hash = url.split('#')[1] ?? ''
  const part = hash
    .split('&')
    .find((item) => item.startsWith(ATTACHMENT_HINT_PREFIX))

  if (!part) {
    return null
  }

  return normalizeAttachmentType(part.slice(ATTACHMENT_HINT_PREFIX.length))
}

export function pickPrimaryAttachment(
  attachments: AttachmentLike[] | undefined
): NormalizedAttachment | null {
  return normalizeAttachments(attachments)[0] ?? null
}

export function normalizeAttachments(
  attachments: AttachmentLike[] | undefined
): NormalizedAttachment[] {
  return (attachments ?? []).map((attachment) => {
    const type = normalizeAttachmentType(attachment.type)
    const rawUrl =
      attachment.payload?.url ??
      attachment.file_url ??
      attachment.image_data?.url ??
      attachment.video_data?.url ??
      attachment.audio_data?.url

    return {
      type,
      url: rawUrl ? addAttachmentTypeHint(rawUrl, type) : undefined,
      mimeType: attachment.mime_type,
      name: attachment.name,
    }
  })
}

export function buildIncomingMessageParts(
  messageId: string,
  text: string | undefined,
  attachments: AttachmentLike[] | undefined
): IncomingMessagePart[] {
  const trimmedText = text?.trim()
  const normalizedAttachments = normalizeAttachments(attachments)
  const parts: IncomingMessagePart[] = []

  if (trimmedText) {
    parts.push({
      messageId,
      text: trimmedText,
    })
  }

  for (const [index, attachment] of normalizedAttachments.entries()) {
    parts.push({
      messageId: !trimmedText && index === 0 ? messageId : `${messageId}::attachment:${index}`,
      text: `[${attachment.type} attachment]`,
      attachmentUrl: attachment.url,
      attachmentType: attachment.type,
      attachmentMimeType: attachment.mimeType,
      attachmentName: attachment.name,
    })
  }

  if (parts.length > 0) {
    return parts
  }

  const summary = buildAttachmentSummary(text, attachments)
  return summary
    ? [
        {
          messageId,
          text: summary,
        },
      ]
    : []
}

export function buildAttachmentSummary(
  text: string | undefined,
  attachments: AttachmentLike[] | undefined
): string | null {
  if (text?.trim()) {
    return text.trim()
  }

  const attachmentTypes = (attachments ?? []).map((attachment) =>
    normalizeAttachmentType(attachment.type)
  )

  if (attachmentTypes.length === 0) {
    return null
  }

  return `[${attachmentTypes.join(', ')} attachment${attachmentTypes.length > 1 ? 's' : ''}]`
}
