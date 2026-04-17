'use client'

import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Link from 'next/link'
import { fixEncoding } from '@/lib/fixEncoding'
import { useInboxSocket, type InboxWsEvent } from '@/hooks/useInboxSocket'
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Clock3,
  FileAudio,
  FileText,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Video as VideoIcon,
  X,
} from 'lucide-react'

type Platform = 'facebook' | 'instagram' | 'whatsapp' | 'youtube'
type MessageType = 'comment' | 'message' | 'dm' | 'mention'
type ConnectionStatus = 'connecting' | 'live' | 'offline'
type MediaType = 'image' | 'video' | 'audio' | 'document' | 'file'
type OutgoingStatus =
  | 'unread'
  | 'read'
  | 'sending'
  | 'queued'
  | 'retrying'
  | 'sent'
  | 'delivered'
  | 'seen'
  | 'failed'

interface SocialMessage {
  id: string
  externalId?: string
  clientMessageId?: string
  platform: Platform
  type: MessageType
  conversationId: string
  sender: {
    id: string
    name: string
    avatar?: string
  }
  content: {
    text: string
    media?: Array<{
      type: MediaType
      url: string
      thumbnail?: string
      fileName?: string
      mimeType?: string
    }>
  }
  status: OutgoingStatus
  timestamp: string
  isIncoming: boolean
}

interface ApiRecord {
  id: string
  externalId?: string | null
  platform: Platform
  type: MessageType
  conversationId?: string | null
  senderId?: string | null
  senderName?: string | null
  senderAvatar?: string | null
  content: string
  isRead: boolean
  timestamp: string
  isIncoming: boolean
  attachments?: Array<{
    id: string
    type: string
    mimeType?: string | null
    fileName?: string | null
    storageUrl?: string | null
    externalUrl?: string | null
    thumbnailUrl?: string | null
  }>
}

interface ApiConversationRecord {
  conversationId: string
  platform: 'facebook'
  participant: {
    id: string
    name: string
    avatar?: string | null
  }
  latestMessage: ApiRecord
  unreadCount: number
  searchText: string
}

interface Conversation {
  conversationId: string
  platform: Platform
  participant: {
    id: string
    name: string
    avatar?: string
  }
  latestMessage: SocialMessage
  unreadCount: number
  searchText: string
}

interface DraftAttachment {
  id: string
  file: File
  previewUrl: string
  type: MediaType
}

interface UploadedDraftAttachment {
  type: 'image' | 'video' | 'audio' | 'file'
  url: string
  fileName?: string
  mimeType?: string
}

function normalizeType(type: string): MediaType {
  if (type === 'image' || type === 'video' || type === 'audio' || type === 'document') {
    return type
  }

  return 'file'
}

function mapRecord(record: ApiRecord): SocialMessage {
  return {
    id: record.id,
    externalId: record.externalId ?? undefined,
    platform: record.platform,
    type: record.type,
    conversationId:
      record.conversationId || (record.senderId ? `${record.platform}:${record.senderId}` : record.id),
    sender: {
      id: record.senderId || 'unknown',
      name: record.senderName || (record.isIncoming ? 'Unknown' : 'Minsah Beauty'),
      avatar: record.senderAvatar ?? undefined,
    },
    content: {
      text: record.content,
      media: (record.attachments ?? [])
        .map((attachment) => ({
          type: normalizeType(attachment.type),
          url: attachment.storageUrl || attachment.externalUrl || '',
          thumbnail: attachment.thumbnailUrl || undefined,
          fileName: attachment.fileName || undefined,
          mimeType: attachment.mimeType || undefined,
        }))
        .filter((attachment) => Boolean(attachment.url)),
    },
    status: record.isIncoming ? (record.isRead ? 'read' : 'unread') : 'sent',
    timestamp: record.timestamp,
    isIncoming: record.isIncoming,
  }
}

function mapConversationRecord(record: ApiConversationRecord): Conversation {
  return {
    conversationId: record.conversationId,
    platform: record.platform,
    participant: {
      id: record.participant.id,
      name: record.participant.name,
      avatar: record.participant.avatar ?? undefined,
    },
    latestMessage: mapRecord(record.latestMessage),
    unreadCount: record.unreadCount,
    searchText: record.searchText,
  }
}

function getAvatarColor(name: string): string {
  const palette = ['#0f766e', '#2563eb', '#db2777', '#ea580c', '#7c3aed', '#059669']
  let hash = 0

  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash)
  }

  return palette[Math.abs(hash) % palette.length]
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? '')
    .join('')
}

function formatConversationTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const dayDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (dayDiff <= 0) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  if (dayDiff === 1) {
    return 'Yesterday'
  }

  if (dayDiff < 7) {
    return date.toLocaleDateString([], { weekday: 'short' })
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function formatDayDivider(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  if (date.toDateString() === now.toDateString()) {
    return 'Today'
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }

  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

function isSameDay(left: string, right: string): boolean {
  return new Date(left).toDateString() === new Date(right).toDateString()
}

function inferDraftType(file: File): MediaType {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'file'
}

function normalizeUploadType(type: MediaType): UploadedDraftAttachment['type'] {
  return type === 'document' ? 'file' : type
}

function playNotificationSound() {
  try {
    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.frequency.setValueAtTime(880, context.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(660, context.currentTime + 0.1)
    gain.gain.setValueAtTime(0.2, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.25)
    oscillator.start(context.currentTime)
    oscillator.stop(context.currentTime + 0.3)
  } catch {
    // Ignore audio failures.
  }
}

function Avatar({
  name,
  avatar,
  size = 40,
}: {
  name: string
  avatar?: string
  size?: number
}) {
  const [failed, setFailed] = useState(false)

  if (avatar && !failed) {
    return (
      <img
        src={avatar}
        alt={name}
        onError={() => setFailed(true)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: getAvatarColor(name),
        color: '#ffffff',
        fontSize: size * 0.34,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {getInitials(name)}
    </div>
  )
}

function MessageStatus({ status }: { status: SocialMessage['status'] }) {
  if (status === 'sending' || status === 'queued' || status === 'retrying') {
    return <Clock3 size={12} style={{ color: 'rgba(255,255,255,0.72)' }} />
  }

  if (status === 'delivered' || status === 'seen') {
    return (
      <CheckCheck
        size={12}
        style={{ color: status === 'seen' ? '#7dd3fc' : 'rgba(255,255,255,0.72)' }}
      />
    )
  }

  return <Check size={12} style={{ color: 'rgba(255,255,255,0.72)' }} />
}

function MediaAttachment({
  media,
  isIncoming,
}: {
  media: NonNullable<SocialMessage['content']['media']>[number]
  isIncoming: boolean
}) {
  if (media.type === 'image') {
    return (
      <a href={media.url} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 8 }}>
        <img
          src={media.thumbnail || media.url}
          alt={media.fileName || 'Image'}
          style={{
            display: 'block',
            maxWidth: 240,
            maxHeight: 200,
            objectFit: 'cover',
            borderRadius: 14,
          }}
        />
      </a>
    )
  }

  if (media.type === 'video') {
    return (
      <div style={{ marginTop: 8 }}>
        <video
          controls
          preload="metadata"
          poster={media.thumbnail}
          src={media.url}
          style={{ maxWidth: 240, maxHeight: 200, borderRadius: 14 }}
        />
      </div>
    )
  }

  if (media.type === 'audio') {
    return (
      <div style={{ marginTop: 8 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 6,
            fontSize: 12,
            opacity: isIncoming ? 0.7 : 0.9,
          }}
        >
          <FileAudio size={14} />
          <span>{media.fileName || 'Audio'}</span>
        </div>
        <audio controls preload="metadata" src={media.url} style={{ maxWidth: 240 }} />
      </div>
    )
  }

  return (
    <a
      href={media.url}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
        padding: '10px 12px',
        borderRadius: 12,
        textDecoration: 'none',
        color: 'inherit',
        background: isIncoming ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.14)',
      }}
    >
      <FileText size={14} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {media.fileName || media.mimeType || 'File'}
      </span>
    </a>
  )
}

export default function SocialMediaInboxChat() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [threadMessages, setThreadMessages] = useState<SocialMessage[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [replyText, setReplyText] = useState('')
  const [replyError, setReplyError] = useState<string | null>(null)
  const [sendingReply, setSendingReply] = useState(false)
  const [loadingShell, setLoadingShell] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [deadLetterCount, setDeadLetterCount] = useState(0)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [newMessageBanner, setNewMessageBanner] = useState<string | null>(null)
  const [showMobileThread, setShowMobileThread] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [draftAttachments, setDraftAttachments] = useState<DraftAttachment[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')

  const messageEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const selectedConversationRef = useRef<string | null>(null)
  selectedConversationRef.current = selectedConversationId

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(max-width: 639px)')
    const update = () => setIsMobile(mediaQuery.matches)
    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true)
    }
  }, [])

  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) Minsah Inbox` : 'Minsah Inbox'
    return () => {
      document.title = 'Minsah Admin'
    }
  }, [unreadCount])

  const loadDeadLetterCount = useCallback(async () => {
    try {
      const response = await fetch(
        '/api/admin/inbox/sync/dead-letter?status=OPEN&limit=1',
        { cache: 'no-store' }
      )

      if (!response.ok) {
        return
      }

      const data = (await response.json()) as { count?: number }
      setDeadLetterCount(data.count ?? 0)
    } catch {
      // Ignore.
    }
  }, [])

  const loadConversations = useCallback(
    async (showLoader = false) => {
      if (showLoader) {
        setLoadingShell(true)
      }

      try {
        const response = await fetch('/api/social/messages?mode=conversations', {
          cache: 'no-store',
        })

        if (!response.ok) {
          return
        }

        const data = (await response.json()) as {
          conversations?: ApiConversationRecord[]
          unreadCount?: number
        }

        const nextConversations = (data.conversations ?? []).map(mapConversationRecord)

        setConversations((previous) => {
          const previousIds = new Set(previous.map((conversation) => conversation.conversationId))
          const firstNewConversation = nextConversations.find(
            (conversation) => !previousIds.has(conversation.conversationId)
          )

          if (firstNewConversation && previous.length > 0) {
            playNotificationSound()
            setNewMessageBanner(`New message from ${firstNewConversation.participant.name}`)
            window.setTimeout(() => setNewMessageBanner(null), 4000)

            if (notificationsEnabled && document.visibilityState !== 'visible') {
              try {
                new Notification(`New message from ${firstNewConversation.participant.name}`, {
                  body: fixEncoding(firstNewConversation.latestMessage.content.text).slice(0, 100),
                  icon: firstNewConversation.participant.avatar || '/favicon.ico',
                  tag: 'minsah-inbox',
                })
              } catch {
                // Ignore browser notification failures.
              }
            }
          }

          return nextConversations
        })

        setUnreadCount(data.unreadCount ?? 0)
      } catch {
        // Ignore.
      } finally {
        setLoadingShell(false)
      }
    },
    [notificationsEnabled]
  )

  const loadThread = useCallback(async (conversationId: string) => {
    setLoadingThread(true)

    try {
      const response = await fetch(
        `/api/social/messages?conversationId=${encodeURIComponent(conversationId)}&limit=250`,
        {
          cache: 'no-store',
        }
      )

      if (!response.ok) {
        return
      }

      const data = (await response.json()) as { messages?: ApiRecord[] }
      const messages = (data.messages ?? [])
        .map(mapRecord)
        .sort(
          (left, right) =>
            new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
        )

      setThreadMessages(messages)
    } catch {
      // Ignore.
    } finally {
      setLoadingThread(false)
    }
  }, [])

  useEffect(() => {
    void loadConversations(true)
    void loadDeadLetterCount()

    const refreshTimer = window.setInterval(() => {
      void loadConversations(false)
      void loadDeadLetterCount()
    }, 15000)

    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        void loadConversations(false)
        void loadDeadLetterCount()
      }
    }

    document.addEventListener('visibilitychange', visibilityHandler)

    return () => {
      window.clearInterval(refreshTimer)
      document.removeEventListener('visibilitychange', visibilityHandler)
    }
  }, [loadConversations, loadDeadLetterCount])

  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].conversationId)
    }

    if (
      selectedConversationId &&
      !conversations.some((conversation) => conversation.conversationId === selectedConversationId)
    ) {
      setSelectedConversationId(conversations[0]?.conversationId ?? null)
    }
  }, [conversations, selectedConversationId])

  useEffect(() => {
    if (!selectedConversationId) {
      setThreadMessages([])
      return
    }

    void loadThread(selectedConversationId)
  }, [loadThread, selectedConversationId])

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [threadMessages.length, selectedConversationId])

  useEffect(() => {
    if (!selectedConversationId) {
      return
    }

    const selectedConversation = conversations.find(
      (conversation) => conversation.conversationId === selectedConversationId
    )

    if (!selectedConversation || selectedConversation.unreadCount === 0) {
      return
    }

    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.conversationId === selectedConversationId
          ? { ...conversation, unreadCount: 0 }
          : conversation
      )
    )
    setUnreadCount((previous) => Math.max(0, previous - selectedConversation.unreadCount))

    void fetch('/api/social/messages', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversationId: selectedConversationId }),
    })
  }, [conversations, selectedConversationId])

  const handleSocketEvent = useCallback(
    (event: InboxWsEvent) => {
      if (event.type === 'connected' || event.type === 'pong' || event.type === 'subscribed') {
        setConnectionStatus('live')
        return
      }

      void loadConversations(false)
      if (selectedConversationRef.current) {
        void loadThread(selectedConversationRef.current)
      }
    },
    [loadConversations, loadThread]
  )

  const { status: socketStatus } = useInboxSocket(handleSocketEvent)

  useEffect(() => {
    if (socketStatus === 'live') {
      setConnectionStatus('live')
      return
    }

    if (socketStatus === 'offline') {
      setConnectionStatus('offline')
      return
    }

    setConnectionStatus('connecting')
  }, [socketStatus])

  const clearDrafts = useCallback(() => {
    setDraftAttachments((previous) => {
      previous.forEach((attachment) => {
        URL.revokeObjectURL(attachment.previewUrl)
      })
      return []
    })
  }, [])

  useEffect(() => clearDrafts, [clearDrafts])

  const selectedConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.conversationId === selectedConversationId) ??
      null,
    [conversations, selectedConversationId]
  )

  const filteredConversations = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()

    if (!normalizedSearch) {
      return conversations
    }

    return conversations.filter((conversation) =>
      `${conversation.participant.name} ${conversation.searchText}`
        .toLowerCase()
        .includes(normalizedSearch)
    )
  }, [conversations, searchQuery])

  const autoResizeTextarea = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [])

  const handleSync = useCallback(async () => {
    if (syncing) {
      return
    }

    setSyncing(true)

    try {
      await fetch('/api/admin/inbox/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      await Promise.all([
        loadConversations(false),
        loadDeadLetterCount(),
        selectedConversationId ? loadThread(selectedConversationId) : Promise.resolve(),
      ])
    } finally {
      setSyncing(false)
    }
  }, [loadConversations, loadDeadLetterCount, loadThread, selectedConversationId, syncing])

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) {
      return
    }

    setDraftAttachments((previous) => [
      ...previous,
      ...files.map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        type: inferDraftType(file),
      })),
    ])

    event.target.value = ''
  }, [])

  const removeDraftAttachment = useCallback((draftId: string) => {
    setDraftAttachments((previous) => {
      const draft = previous.find((item) => item.id === draftId)
      if (draft) {
        URL.revokeObjectURL(draft.previewUrl)
      }

      return previous.filter((item) => item.id !== draftId)
    })
  }, [])

  const uploadDrafts = useCallback(async (): Promise<UploadedDraftAttachment[]> => {
    if (draftAttachments.length === 0) {
      return []
    }

    const uploads = await Promise.all(
      draftAttachments.map(async (draft) => {
        const formData = new FormData()
        formData.append('file', draft.file)

        const response = await fetch('/api/admin/social/upload', {
          method: 'POST',
          body: formData,
        })

        const payload = (await response.json().catch(() => null)) as
          | {
              url?: string
              fileName?: string
              mimeType?: string
              error?: string
            }
          | null

        if (!response.ok || !payload?.url) {
          throw new Error(payload?.error || 'Attachment upload failed')
        }

        return {
          type: normalizeUploadType(draft.type),
          url: payload.url,
          fileName: payload.fileName,
          mimeType: payload.mimeType,
        } satisfies UploadedDraftAttachment
      })
    )

    return uploads
  }, [draftAttachments])

  const handleReply = useCallback(async () => {
    if (!selectedConversation || sendingReply) {
      return
    }

    if (!replyText.trim() && draftAttachments.length === 0) {
      return
    }

    setSendingReply(true)
    setReplyError(null)

    try {
      const attachments = await uploadDrafts()
      const response = await fetch('/api/admin/inbox/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'messenger',
          recipientPsid: selectedConversation.participant.id,
          text: replyText.trim(),
          attachments,
          clientMessageId: `web-${Date.now()}`,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        throw new Error(payload?.error || 'Reply failed')
      }

      setReplyText('')
      clearDrafts()
      autoResizeTextarea()
      await Promise.all([
        loadConversations(false),
        loadThread(selectedConversation.conversationId),
      ])
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : 'Reply failed')
    } finally {
      setSendingReply(false)
    }
  }, [
    autoResizeTextarea,
    clearDrafts,
    draftAttachments.length,
    loadConversations,
    loadThread,
    replyText,
    selectedConversation,
    sendingReply,
    uploadDrafts,
  ])

  const handleReplyKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        void handleReply()
      }
    },
    [handleReply]
  )

  if (loadingShell) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 42,
              height: 42,
              margin: '0 auto 12px',
              borderRadius: '50%',
              border: '3px solid #e2e8f0',
              borderTopColor: '#0ea5e9',
              animation: 'minsah-spin 0.8s linear infinite',
            }}
          />
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Loading inbox...</p>
          <style>{'@keyframes minsah-spin { to { transform: rotate(360deg); } }'}</style>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 18px',
          background: 'rgba(255,255,255,0.92)',
          borderBottom: '1px solid rgba(148,163,184,0.24)',
          backdropFilter: 'blur(16px)',
          flexShrink: 0,
        }}
      >
        <Link
          href="/admin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            borderRadius: 12,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            color: '#334155',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={14} />
          Back to Admin
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background:
                connectionStatus === 'live'
                  ? '#22c55e'
                  : connectionStatus === 'offline'
                    ? '#ef4444'
                    : '#f59e0b',
            }}
          />
          <span style={{ fontSize: 13, color: '#64748b' }}>
            {connectionStatus === 'live'
              ? 'Live'
              : connectionStatus === 'offline'
                ? 'Offline'
                : 'Connecting'}
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {unreadCount > 0 && (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: '#ef4444',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {unreadCount} unread
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            if (typeof Notification === 'undefined') {
              return
            }

            if (notificationsEnabled) {
              setNotificationsEnabled(false)
              return
            }

            void Notification.requestPermission().then((permission) => {
              setNotificationsEnabled(permission === 'granted')
            })
          }}
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            border: `1px solid ${notificationsEnabled ? '#bbf7d0' : '#e2e8f0'}`,
            background: notificationsEnabled ? '#f0fdf4' : '#ffffff',
            color: notificationsEnabled ? '#15803d' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title={notificationsEnabled ? 'Notifications enabled' : 'Enable notifications'}
        >
          {notificationsEnabled ? <Bell size={15} /> : <BellOff size={15} />}
        </button>

        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={syncing}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 14px',
            borderRadius: 12,
            border: 'none',
            background: '#0ea5e9',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 700,
            cursor: syncing ? 'default' : 'pointer',
            opacity: syncing ? 0.75 : 1,
          }}
        >
          <RefreshCw
            size={14}
            style={{ animation: syncing ? 'minsah-spin 1s linear infinite' : 'none' }}
          />
          {syncing ? 'Syncing...' : 'Sync'}
          {deadLetterCount > 0 && (
            <span
              title={`${deadLetterCount} open dead-letter job${deadLetterCount === 1 ? '' : 's'}`}
              style={{
                position: 'absolute',
                top: -8,
                right: -8,
                minWidth: 20,
                height: 20,
                padding: '0 6px',
                borderRadius: 999,
                background: '#f97316',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(249,115,22,0.35)',
              }}
            >
              {deadLetterCount}
            </span>
          )}
        </button>
      </div>

      {newMessageBanner && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            background: '#0ea5e9',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          <MessageSquare size={14} />
          <span>{newMessageBanner}</span>
          <button
            type="button"
            onClick={() => setNewMessageBanner(null)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.85)',
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <aside
          style={{
            display: !isMobile || !showMobileThread ? 'flex' : 'none',
            flexDirection: 'column',
            width: isMobile ? '100%' : 360,
            minWidth: isMobile ? '100%' : 320,
            borderRight: '1px solid rgba(148,163,184,0.2)',
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ padding: 16, borderBottom: '1px solid rgba(148,163,184,0.16)' }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search conversations..."
                style={{
                  width: '100%',
                  borderRadius: 14,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  padding: '11px 12px 11px 38px',
                  fontSize: 13,
                  outline: 'none',
                  color: '#0f172a',
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px 8px',
              fontSize: 12,
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            <span>Conversations</span>
            <span style={{ fontWeight: 600 }}>{filteredConversations.length}</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
            {filteredConversations.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  height: 220,
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  color: '#94a3b8',
                }}
              >
                <MessageSquare size={34} />
                <p style={{ margin: 0, fontSize: 13 }}>
                  {conversations.length === 0 ? 'No conversations yet' : 'No matching conversations'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <button
                  key={conversation.conversationId}
                  type="button"
                  onClick={() => {
                    setSelectedConversationId(conversation.conversationId)
                    setShowMobileThread(true)
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    border: 'none',
                    borderLeft:
                      selectedConversationId === conversation.conversationId
                        ? '3px solid #0ea5e9'
                        : '3px solid transparent',
                    background:
                      selectedConversationId === conversation.conversationId
                        ? 'rgba(14,165,233,0.08)'
                        : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <Avatar
                      name={conversation.participant.name}
                      avatar={conversation.participant.avatar}
                      size={44}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        right: -2,
                        bottom: -2,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        border: '2px solid #ffffff',
                        background: '#1877f2',
                      }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 14,
                          fontWeight: conversation.unreadCount > 0 ? 700 : 600,
                          color: '#0f172a',
                        }}
                      >
                        {conversation.participant.name}
                      </span>
                      <span style={{ flexShrink: 0, fontSize: 11, color: '#94a3b8' }}>
                        {formatConversationTime(conversation.latestMessage.timestamp)}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 13,
                          color: conversation.unreadCount > 0 ? '#334155' : '#64748b',
                          fontWeight: conversation.unreadCount > 0 ? 600 : 400,
                        }}
                      >
                        {conversation.latestMessage.isIncoming ? '' : 'You: '}
                        {fixEncoding(conversation.latestMessage.content.text) || 'No message content'}
                      </span>

                      {conversation.unreadCount > 0 && (
                        <span
                          style={{
                            minWidth: 20,
                            height: 20,
                            borderRadius: 999,
                            background: '#0ea5e9',
                            color: '#ffffff',
                            fontSize: 11,
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 6px',
                            flexShrink: 0,
                          }}
                        >
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <main
          style={{
            display: !isMobile || showMobileThread ? 'flex' : 'none',
            flex: 1,
            minWidth: 0,
            flexDirection: 'column',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(248,250,252,0.92) 100%)',
          }}
        >
          {selectedConversation ? (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 18px',
                  borderBottom: '1px solid rgba(148,163,184,0.18)',
                  background: 'rgba(255,255,255,0.72)',
                  backdropFilter: 'blur(10px)',
                  flexShrink: 0,
                }}
              >
                {isMobile && (
                  <button
                    type="button"
                    onClick={() => setShowMobileThread(false)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}

                <Avatar
                  name={selectedConversation.participant.name}
                  avatar={selectedConversation.participant.avatar}
                  size={40}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#0f172a',
                    }}
                  >
                    {selectedConversation.participant.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', textTransform: 'capitalize' }}>
                    {selectedConversation.platform} Messenger
                  </div>
                </div>

                {deadLetterCount > 0 && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: '#fff7ed',
                      color: '#c2410c',
                      border: '1px solid #fdba74',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    <AlertTriangle size={13} />
                    {deadLetterCount} dead letter{deadLetterCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
                {loadingThread ? (
                  <div
                    style={{
                      display: 'flex',
                      height: '100%',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        border: '3px solid #e2e8f0',
                        borderTopColor: '#0ea5e9',
                        animation: 'minsah-spin 0.8s linear infinite',
                      }}
                    />
                  </div>
                ) : (
                  threadMessages.map((message, index) => {
                    const previous = threadMessages[index - 1]
                    const next = threadMessages[index + 1]
                    const showDayDivider = !previous || !isSameDay(previous.timestamp, message.timestamp)
                    const groupedWithNext =
                      Boolean(next) &&
                      next.isIncoming === message.isIncoming &&
                      isSameDay(next.timestamp, message.timestamp)
                    const groupedWithPrevious =
                      Boolean(previous) &&
                      previous.isIncoming === message.isIncoming &&
                      isSameDay(previous.timestamp, message.timestamp)
                    const showAvatar = message.isIncoming && !groupedWithNext

                    return (
                      <div key={message.id}>
                        {showDayDivider && (
                          <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 16px' }}>
                            <span
                              style={{
                                padding: '4px 12px',
                                borderRadius: 999,
                                border: '1px solid #e2e8f0',
                                background: '#ffffff',
                                color: '#94a3b8',
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              {formatDayDivider(message.timestamp)}
                            </span>
                          </div>
                        )}

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: message.isIncoming ? 'flex-start' : 'flex-end',
                            gap: 8,
                            marginBottom: groupedWithNext ? 4 : 14,
                            alignItems: 'flex-end',
                          }}
                        >
                          {message.isIncoming && (
                            <div style={{ width: 32, flexShrink: 0 }}>
                              {showAvatar && (
                                <Avatar
                                  name={message.sender.name}
                                  avatar={message.sender.avatar}
                                  size={28}
                                />
                              )}
                            </div>
                          )}

                          <div style={{ maxWidth: isMobile ? '88%' : '72%' }}>
                            <div
                              style={{
                                padding: '10px 14px',
                                borderRadius: message.isIncoming
                                  ? groupedWithPrevious
                                    ? '16px 16px 16px 8px'
                                    : '20px 20px 20px 8px'
                                  : groupedWithPrevious
                                    ? '16px 16px 8px 16px'
                                    : '20px 20px 8px 20px',
                                background: message.isIncoming ? '#ffffff' : '#0ea5e9',
                                color: message.isIncoming ? '#0f172a' : '#ffffff',
                                border: message.isIncoming ? '1px solid #e2e8f0' : 'none',
                                boxShadow: message.isIncoming
                                  ? '0 6px 18px rgba(15,23,42,0.05)'
                                  : '0 10px 22px rgba(14,165,233,0.18)',
                              }}
                            >
                              <p
                                style={{
                                  margin: 0,
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  lineHeight: 1.5,
                                  fontSize: 14,
                                }}
                              >
                                {fixEncoding(message.content.text)}
                              </p>

                              {message.content.media && message.content.media.length > 0 && (
                                <div>
                                  {message.content.media.map((media, mediaIndex) => (
                                    <MediaAttachment
                                      key={`${message.id}-${mediaIndex}`}
                                      media={media}
                                      isIncoming={message.isIncoming}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                justifyContent: message.isIncoming ? 'flex-start' : 'flex-end',
                                marginTop: 4,
                                padding: '0 4px',
                              }}
                            >
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                {new Date(message.timestamp).toLocaleTimeString([], {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </span>
                              {!message.isIncoming && <MessageStatus status={message.status} />}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messageEndRef} />
              </div>

              <div
                style={{
                  borderTop: '1px solid rgba(148,163,184,0.16)',
                  background: 'rgba(255,255,255,0.9)',
                  padding: '14px 16px 16px',
                  flexShrink: 0,
                }}
              >
                {replyError && (
                  <div
                    style={{
                      marginBottom: 10,
                      padding: '10px 12px',
                      borderRadius: 12,
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {replyError}
                  </div>
                )}

                {draftAttachments.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                    {draftAttachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        style={{
                          position: 'relative',
                          width: 84,
                          height: 84,
                          overflow: 'hidden',
                          borderRadius: 16,
                          border: '1px solid #e2e8f0',
                          background: '#f8fafc',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => removeDraftAttachment(attachment.id)}
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            zIndex: 1,
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            border: 'none',
                            background: 'rgba(15,23,42,0.72)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <X size={12} />
                        </button>

                        {attachment.type === 'image' ? (
                          <img
                            src={attachment.previewUrl}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : attachment.type === 'video' ? (
                          <video
                            src={attachment.previewUrl}
                            muted
                            playsInline
                            preload="metadata"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#64748b',
                            }}
                          >
                            {attachment.type === 'audio' ? (
                              <FileAudio size={22} />
                            ) : (
                              <VideoIcon size={22} />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 8,
                    padding: '8px 8px 8px 14px',
                    borderRadius: 22,
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sendingReply}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: sendingReply ? 'default' : 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <Paperclip size={16} />
                  </button>

                  <textarea
                    ref={textareaRef}
                    value={replyText}
                    rows={1}
                    onChange={(event) => {
                      setReplyText(event.target.value)
                      autoResizeTextarea()
                    }}
                    onKeyDown={handleReplyKeyDown}
                    placeholder="Type a message..."
                    style={{
                      flex: 1,
                      resize: 'none',
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      padding: '8px 0',
                      fontSize: 14,
                      lineHeight: 1.5,
                      maxHeight: 120,
                      minHeight: 24,
                      color: '#0f172a',
                      fontFamily: 'inherit',
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => void handleReply()}
                    disabled={sendingReply || (!replyText.trim() && draftAttachments.length === 0)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      border: 'none',
                      background:
                        sendingReply || (!replyText.trim() && draftAttachments.length === 0)
                          ? '#cbd5e1'
                          : '#0ea5e9',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor:
                        sendingReply || (!replyText.trim() && draftAttachments.length === 0)
                          ? 'default'
                          : 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <Send size={16} />
                  </button>
                </div>

                <p
                  style={{
                    margin: '8px 0 0',
                    textAlign: 'center',
                    fontSize: 11,
                    color: '#94a3b8',
                  }}
                >
                  Press Enter to send. Shift + Enter adds a new line.
                </p>
              </div>
            </>
          ) : (
            <div
              style={{
                display: 'flex',
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
              }}
            >
              <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                <MessageSquare size={44} style={{ margin: '0 auto 12px' }} />
                <p style={{ margin: 0, fontSize: 14 }}>
                  Select a conversation to start messaging
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      <style>{'@keyframes minsah-spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  )
}
