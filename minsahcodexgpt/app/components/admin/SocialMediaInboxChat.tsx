'use client';

/**
 * SocialMediaInboxChat.tsx — Ultra-modern 2026 edition
 *
 * New in this version:
 *  - Full unlimited Facebook sync (ALL conversations, not just 25)
 *  - Instant real-time SSE with 500ms poll interval (speeds up on activity)
 *  - Browser Push Notifications (new messages + comments when tab not focused)
 *  - Notification badge on page title (unread count)
 *  - Notification sound on new incoming message
 *  - Auto-sync on first load if DB is empty
 *  - Infinite scroll / virtual list for large conversation counts
 *  - Online/offline indicator with auto-reconnect
 *  - Typing-style animated "connecting…" status
 *  - Modern glassmorphism sidebar with gradient accents
 *  - Smooth animated message bubbles
 */

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { fixEncoding } from '@/lib/fixEncoding';
import { useInboxSocket, type InboxWsEvent } from '@/hooks/useInboxSocket';
import {
  ArrowLeft,
  Bot,
  CheckCheck,
  ChevronDown,
  FileAudio,
  FileText,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Wifi,
  WifiOff,
  X,
  Zap,
  Video as VideoIcon,
  Bell,
  BellOff,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────── types ──

export interface SocialMessage {
  id: string;
  externalId?: string;
  clientMessageId?: string;
  platform: 'facebook' | 'instagram' | 'whatsapp' | 'youtube';
  type: 'comment' | 'message' | 'dm' | 'mention';
  conversationId: string;
  sender: { id: string; name: string; avatar?: string };
  content: {
    text: string;
    media?: Array<{
      type: 'image' | 'video' | 'audio' | 'document' | 'file';
      url: string;
      thumbnail?: string;
      fileName?: string;
      mimeType?: string;
    }>;
  };
  status: 'unread' | 'read' | 'sending' | 'queued' | 'retrying' | 'sent' | 'delivered' | 'seen' | 'failed';
  timestamp: string;
  isIncoming: boolean;
}

interface ApiRecord {
  id: string;
  externalId?: string | null;
  platform: SocialMessage['platform'];
  type: SocialMessage['type'];
  conversationId?: string | null;
  senderId?: string | null;
  senderName?: string | null;
  senderAvatar?: string | null;
  content: string;
  isRead: boolean;
  timestamp: string;
  isIncoming: boolean;
  attachments?: Array<{
    id: string;
    type: string;
    mimeType?: string | null;
    fileName?: string | null;
    storageUrl?: string | null;
    externalUrl?: string | null;
    thumbnailUrl?: string | null;
  }>;
}

interface ApiConversationRecord {
  conversationId: string;
  platform: 'facebook';
  participant: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  latestMessage: ApiRecord;
  unreadCount: number;
  searchText: string;
}

interface ApiPageInfo {
  nextConversationCursor: string | null;
  hasMoreConversations: boolean;
  nextMessageCursor?: string | null;
  hasMoreMessages?: boolean;
}

interface Conversation {
  conversationId: string;
  platform: SocialMessage['platform'];
  participant: SocialMessage['sender'];
  latestMessage: SocialMessage;
  unreadCount: number;
  searchText: string;
}

interface DraftAttachment {
  id: string;
  file: File;
  previewUrl: string;
  type: NonNullable<SocialMessage['content']['media']>[number]['type'];
}

interface UploadedDraftAttachment {
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  fileName?: string;
  mimeType?: string;
  thumbnail?: string;
}

function normalizeDraftUploadType(type: DraftAttachment['type']): UploadedDraftAttachment['type'] {
  return type === 'document' ? 'file' : type;
}

interface SyncProgress {
  stage: 'idle' | 'starting' | 'fetching' | 'processing_conversation' | 'processing_message' | 'completed' | 'error';
  processedConversations: number;
  totalConversations: number;
  processedMessages: number;
  processedAttachments: number;
  senderName?: string | null;
  error?: string;
}

type ConnectionStatus = 'connecting' | 'live' | 'polling' | 'offline';
const MOBILE_MEDIA_QUERY = '(max-width: 639px)';
const CONVERSATION_PAGE_SIZE = 40;
const THREAD_MESSAGE_LIMIT = 250;
const CONVERSATION_ITEM_HEIGHT = 77;
const CONVERSATION_OVERSCAN = 6;

// ─────────────────────────────────────────────────────── helpers ──

type MediaItem = NonNullable<SocialMessage['content']['media']>[number];

function normalizeType(t: string): MediaItem['type'] {
  if (t === 'image' || t === 'video' || t === 'audio' || t === 'document') return t;
  return 'file';
}

function mapRecord(m: ApiRecord): SocialMessage {
  return {
    id: m.id,
    externalId: m.externalId || undefined,
    platform: m.platform,
    type: m.type,
    conversationId: m.conversationId || (m.senderId ? `${m.platform}:${m.senderId}` : m.id),
    sender: {
      id: m.senderId || 'unknown',
      name: m.senderName || (m.isIncoming ? 'Unknown' : 'Minsah Beauty'),
      avatar: m.senderAvatar ?? undefined,
    },
    content: {
      text: m.content,
      media: (m.attachments ?? [])
        .map((a): MediaItem => ({
          type: normalizeType(a.type),
          url: a.storageUrl || a.externalUrl || '',
          thumbnail: a.thumbnailUrl || undefined,
          fileName: a.fileName || undefined,
          mimeType: a.mimeType || undefined,
        }))
        .filter((a) => Boolean(a.url)),
    },
    status: m.isIncoming ? (m.isRead ? 'read' : 'unread') : 'sent',
    timestamp: m.timestamp,
    isIncoming: m.isIncoming,
  };
}

function mapConversationRecord(record: ApiConversationRecord): Conversation {
  const latestMessage = mapRecord(record.latestMessage);
  return {
    conversationId: record.conversationId,
    platform: record.platform,
    participant: {
      id: record.participant.id,
      name: record.participant.name,
      avatar: record.participant.avatar ?? undefined,
    },
    latestMessage,
    unreadCount: record.unreadCount,
    searchText: record.searchText,
  };
}

function buildConversationSummary(items: SocialMessage[]): Conversation {
  const sorted = [...items].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const latestMessage = sorted[sorted.length - 1];
  const participant =
    [...sorted].reverse().find((message) => message.isIncoming)?.sender ?? sorted[0].sender;

  return {
    conversationId: latestMessage.conversationId,
    platform: latestMessage.platform,
    participant,
    latestMessage,
    unreadCount: sorted.filter((message) => message.isIncoming && message.status === 'unread').length,
    searchText: sorted
      .map((message) => [
        message.sender.name,
        fixEncoding(message.content.text),
        ...(message.content.media?.map((media) => media.fileName ?? media.mimeType ?? media.type) ?? []),
      ].join(' '))
      .join(' ')
      .toLowerCase(),
  };
}

function buildConversationsFromMessages(messages: SocialMessage[]): Conversation[] {
  const grouped = new Map<string, SocialMessage[]>();

  for (const message of messages) {
    const conversationId = message.conversationId || message.id;
    const bucket = grouped.get(conversationId);
    if (bucket) {
      bucket.push(message);
    } else {
      grouped.set(conversationId, [message]);
    }
  }

  return Array.from(grouped.values())
    .map((items) => buildConversationSummary(items))
    .sort(
      (left, right) =>
        new Date(right.latestMessage.timestamp).getTime() -
        new Date(left.latestMessage.timestamp).getTime()
    );
}

function upsertConversationFromMessage(
  conversations: Conversation[],
  message: SocialMessage
) {
  const existing = conversations.find(
    (conversation) => conversation.conversationId === message.conversationId
  );

  const participant = message.isIncoming
    ? message.sender
    : existing?.participant ?? {
        id: message.conversationId,
        name: 'Minsah Beauty',
      };

  const latestMessage =
    !existing ||
    new Date(message.timestamp).getTime() >=
      new Date(existing.latestMessage.timestamp).getTime()
      ? message
      : existing.latestMessage;

  const unreadCount = message.isIncoming && message.status === 'unread'
    ? (existing?.unreadCount ?? 0) + 1
    : existing?.unreadCount ?? 0;

  const nextConversation: Conversation = {
    conversationId: message.conversationId,
    platform: message.platform,
    participant,
    latestMessage,
    unreadCount,
    searchText: [
      existing?.searchText ?? '',
      participant.name,
      fixEncoding(message.content.text),
      ...(message.content.media?.map((media) => media.fileName ?? media.mimeType ?? media.type) ?? []),
    ]
      .join(' ')
      .toLowerCase(),
  };

  return [...conversations.filter(
    (conversation) => conversation.conversationId !== message.conversationId
  ), nextConversation].sort(
    (left, right) =>
      new Date(right.latestMessage.timestamp).getTime() -
      new Date(left.latestMessage.timestamp).getTime()
  );
}

function markConversationRead(
  conversations: Conversation[],
  conversationId: string
) {
  return conversations.map((conversation) =>
    conversation.conversationId === conversationId
      ? { ...conversation, unreadCount: 0 }
      : conversation
  );
}

function buildWsMedia(event: Extract<InboxWsEvent, { type: 'new_message' | 'outgoing_message' }>): MediaItem[] | undefined {
  if (!event.attachmentUrl) {
    return undefined;
  }

  return [{
    type: normalizeType(event.attachmentType || 'file'),
    url: event.attachmentUrl,
    thumbnail: event.attachmentType === 'image' ? event.attachmentUrl : undefined,
  }];
}

function sortMessagesChronologically(messages: SocialMessage[]) {
  return [...messages].sort(
    (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
  );
}

function fmtTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function fmtDivider(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function inferAttachType(file: File): MediaItem['type'] {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'file';
}

function getDraftPreviewIcon(type: DraftAttachment['type']) {
  if (type === 'video') return VideoIcon;
  if (type === 'audio') return FileAudio;
  return FileText;
}

function normalizeOutgoingStatus(
  status: SocialMessage['status']
): 'sending' | 'queued' | 'retrying' | 'sent' | 'delivered' | 'seen' | 'failed' {
  if (
    status === 'sending' ||
    status === 'queued' ||
    status === 'retrying' ||
    status === 'sent' ||
    status === 'delivered' ||
    status === 'seen' ||
    status === 'failed'
  ) {
    return status;
  }

  return 'sent';
}

function getOutgoingStatusLabel(status: SocialMessage['status']) {
  switch (normalizeOutgoingStatus(status)) {
    case 'sending':
      return 'Sending...';
    case 'queued':
      return 'Queued';
    case 'retrying':
      return 'Retrying...';
    case 'delivered':
      return 'Delivered';
    case 'seen':
      return 'Seen';
    case 'failed':
      return 'Failed';
    default:
      return 'Sent';
  }
}

// Play a soft notification sound using Web Audio API
function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch { /* ignore if audio not available */ }
}

// ─────────────────────────────────────── platform config ──

const PLATFORM_CFG: Record<string, { color: string; label: string; name: string }> = {
  facebook:  { color: '#1877f2', label: 'f',  name: 'Facebook' },
  instagram: { color: '#e1306c', label: '▲',  name: 'Instagram' },
  whatsapp:  { color: '#25d366', label: 'W',  name: 'WhatsApp' },
  youtube:   { color: '#ff0000', label: '▶',  name: 'YouTube' },
};

function PlatBadge({ platform, size = 18 }: { platform: string; size?: number }) {
  const cfg = PLATFORM_CFG[platform] ?? PLATFORM_CFG.facebook;
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      background: cfg.color, color: '#fff',
      fontSize: size * 0.52, fontWeight: 800,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, lineHeight: 1, fontFamily: 'sans-serif',
      boxShadow: '0 0 0 2px #fff',
    }}>
      {cfg.label}
    </span>
  );
}

// ──────────────────────────────────────────────────── Avatar ──

function Avatar({ src, name, size = 44, online }: { src?: string; name: string; size?: number; online?: boolean }) {
  const [err, setErr] = useState(false);
  const colors = ['#1877f2', '#e1306c', '#25d366', '#8b5cf6', '#f59e0b'];
  const color = colors[name.charCodeAt(0) % colors.length];

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {src && !err ? (
        <img src={src} alt={name} onError={() => setErr(true)}
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: `linear-gradient(135deg, ${color}dd, ${color}88)`,
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.38, fontWeight: 700, letterSpacing: '-0.5px',
        }}>
          {initials(name)}
        </div>
      )}
      {online !== undefined && (
        <span style={{
          position: 'absolute', bottom: 1, right: 1,
          width: size * 0.28, height: size * 0.28, borderRadius: '50%',
          background: online ? '#22c55e' : '#94a3b8',
          border: '2px solid #fff',
        }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────── ConnectionDot ──

function ConnectionDot({ status }: { status: ConnectionStatus }) {
  const map = {
    connecting: { color: '#f59e0b', label: 'Connecting…' },
    live:       { color: '#22c55e', label: 'Live' },
    polling:    { color: '#3b82f6', label: 'Polling' },
    offline:    { color: '#ef4444', label: 'Offline' },
  };
  const { color, label } = map[status];
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', background: color,
        boxShadow: status === 'live' ? `0 0 0 3px ${color}33` : 'none',
        animation: status === 'live' ? 'pulse 2s infinite' : 'none',
        display: 'inline-block',
      }} />
      {label}
    </span>
  );
}

// ────────────────────────────────────────── main component ──

export default function SocialMediaInboxChat() {
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [conversationItems, setConversationItems] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('facebook');
  const [search, setSearch] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [syncingFb, setSyncingFb] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    stage: 'idle', processedConversations: 0, totalConversations: 0,
    processedMessages: 0, processedAttachments: 0,
  });
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftAttachment[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [newMessageBanner, setNewMessageBanner] = useState<string | null>(null);
  const [nextConversationCursor, setNextConversationCursor] = useState<string | null>(null);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);
  const [conversationScrollTop, setConversationScrollTop] = useState(0);
  const [conversationViewportHeight, setConversationViewportHeight] = useState(0);
  const [nextThreadCursor, setNextThreadCursor] = useState<string | null>(null);
  const [hasMoreThreadMessages, setHasMoreThreadMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const conversationListRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<SocialMessage[]>([]);
  const conversationsRef = useRef<Conversation[]>([]);
  const unreadCountRef = useRef(0);
  const lastMessageCountRef = useRef(0);
  const selectedRef = useRef<string | null>(null);
  const sendMarkReadRef = useRef<(threadId: string, conversationId: string) => boolean>(() => false);
  const pendingReadRef = useRef(new Set<string>());
  const pendingReadTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const prependingMessagesRef = useRef(false);
  const previousThreadScrollHeightRef = useRef(0);
  selectedRef.current = selected;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    conversationsRef.current = conversationItems;
  }, [conversationItems]);

  useEffect(() => {
    unreadCountRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const updateViewport = () => {
      setIsMobile(mediaQuery.matches);
      if (!mediaQuery.matches) {
        setShowChat(false);
      }
    };

    updateViewport();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateViewport);
      return () => mediaQuery.removeEventListener('change', updateViewport);
    }

    mediaQuery.addListener(updateViewport);
    return () => mediaQuery.removeListener(updateViewport);
  }, []);

  // ─────────────────────────── notifications ──

  const requestNotifications = useCallback(async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotificationsEnabled(perm === 'granted');
  }, []);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  const sendBrowserNotification = useCallback((title: string, body: string, icon?: string) => {
    if (!notificationsEnabled || document.visibilityState === 'visible') return;
    try {
      new Notification(title, { body, icon: icon || '/favicon.ico', badge: '/favicon.ico', tag: 'minsah-inbox' });
    } catch { /* ignore */ }
  }, [notificationsEnabled]);

  // ─────────────────────────── page title badge ──

  useEffect(() => {
    const base = 'Minsah Inbox';
    document.title = unreadCount > 0 ? `(${unreadCount}) ${base}` : base;
    return () => { document.title = base; };
  }, [unreadCount]);

  // ─────────────────────────────────────────── data fetching ──

  const fetchConversationThread = useCallback(async (
    conversationId: string,
    options?: {
      appendOlder?: boolean;
      cursor?: string | null;
    }
  ) => {
    if (!conversationId) {
      setMessages([]);
      setNextThreadCursor(null);
      setHasMoreThreadMessages(false);
      return;
    }

    try {
      const params = new URLSearchParams();
      params.set('platform', 'facebook');
      params.set('conversationId', conversationId);
      params.set('messageLimit', String(THREAD_MESSAGE_LIMIT));
      if (options?.cursor) {
        params.set('messageCursor', options.cursor);
      }

      const response = await fetch(`/api/social/messages?${params}`, {
        cache: 'no-store',
      });
      const data = (await response.json()) as {
        messages?: ApiRecord[];
        conversation?: ApiConversationRecord | null;
        pageInfo?: ApiPageInfo;
      };

      if (selectedRef.current !== conversationId) {
        return;
      }

      const incoming = (data.messages ?? []).map(mapRecord);
      setMessages((previous) => {
        if (options?.appendOlder) {
          const existingIds = new Set(previous.map((message) => message.id));
          const older = incoming.filter((message) => !existingIds.has(message.id));
          return sortMessagesChronologically([...older, ...previous]);
        }

        const incomingIds = new Set(incoming.map((message) => message.id));
        const optimistic = previous.filter(
          (message) =>
            message.conversationId === conversationId &&
            !message.isIncoming &&
            !incomingIds.has(message.id)
        );

        return sortMessagesChronologically([...incoming, ...optimistic]);
      });

      setNextThreadCursor(data.pageInfo?.nextMessageCursor ?? null);
      setHasMoreThreadMessages(Boolean(data.pageInfo?.hasMoreMessages));

      const conversation = data.conversation;
      if (conversation && !options?.appendOlder) {
        setConversationItems((previous) => {
          const mapped = mapConversationRecord(conversation);
          return [
            ...previous.filter(
              (conversation) => conversation.conversationId !== mapped.conversationId
            ),
            mapped,
          ].sort(
            (left, right) =>
              new Date(right.latestMessage.timestamp).getTime() -
              new Date(left.latestMessage.timestamp).getTime()
          );
        });
      }
    } catch {
      // ignore thread refresh failures; realtime/socket can still patch local state
    } finally {
      setLoadingOlderMessages(false);
    }
  }, []);

  const fetchMessages = useCallback(async (
    skeleton = false,
    options?: {
      append?: boolean;
      cursor?: string | null;
    }
  ) => {
    if (skeleton) setInitialLoading(true);
    try {
      if (filterPlatform === 'facebook') {
        const params = new URLSearchParams();
        params.set('platform', 'facebook');
        params.set('conversationLimit', String(CONVERSATION_PAGE_SIZE));
        if (options?.cursor) {
          params.set('conversationCursor', options.cursor);
        }

        const response = await fetch(`/api/social/messages?${params}`, {
          cache: 'no-store',
        });
        const data = (await response.json()) as {
          unreadCount?: number;
          conversations?: ApiConversationRecord[];
          pageInfo?: ApiPageInfo;
        };

        const incomingConversations = (data.conversations ?? []).map(mapConversationRecord);
        setConversationItems((previous) => {
          if (!options?.append) {
            return incomingConversations;
          }

          const merged = new Map(
            previous.map((conversation) => [conversation.conversationId, conversation])
          );

          for (const conversation of incomingConversations) {
            merged.set(conversation.conversationId, conversation);
          }

          return Array.from(merged.values()).sort(
            (left, right) =>
              new Date(right.latestMessage.timestamp).getTime() -
              new Date(left.latestMessage.timestamp).getTime()
          );
        });

        setUnreadCount(data.unreadCount ?? 0);
        setNextConversationCursor(data.pageInfo?.nextConversationCursor ?? null);
        setHasMoreConversations(Boolean(data.pageInfo?.hasMoreConversations));

        if (!options?.append && selectedRef.current) {
          void fetchConversationThread(selectedRef.current);
        }

        return;
      }

      const params = new URLSearchParams();
      if (filterPlatform !== 'all') params.set('platform', filterPlatform);
      params.set('limit', '300');
      const response = await fetch(
        `/api/social/messages${params.toString() ? `?${params}` : ''}`,
        { cache: 'no-store' }
      );
      const data = (await response.json()) as { messages: ApiRecord[]; unreadCount: number };
      const incoming = (data.messages || []).map(mapRecord);

      setMessages((previous) => {
        const ids = new Set(incoming.map((message) => message.id));
        const optimistic = previous.filter(
          (message) => !ids.has(message.id) && !message.isIncoming
        );
        return [...incoming, ...optimistic];
      });
      setConversationItems(buildConversationsFromMessages(incoming));
      setUnreadCount(data.unreadCount || 0);
      setNextConversationCursor(null);
      setHasMoreConversations(false);
    } catch {
      // silent
    } finally {
      setInitialLoading(false);
      setLoadingMoreConversations(false);
    }
  }, [fetchConversationThread, filterPlatform]);

  useEffect(() => {
    void fetchMessages(true);
  }, [fetchMessages]);

  const handleWsEvent = useCallback((event: InboxWsEvent) => {
    if (filterPlatform !== 'all' && filterPlatform !== 'facebook') return;
    if (event.type === 'pong' || event.type === 'connected' || event.type === 'subscribed') return;

    if (event.type === 'conversation_read') {
      pendingReadRef.current.delete(event.conversationId);
      const pendingTimer = pendingReadTimersRef.current.get(event.conversationId);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingReadTimersRef.current.delete(event.conversationId);
      }

      let clearedUnread = 0;
      const nextMessages = messagesRef.current.map((message) => {
        if (
          message.conversationId === event.conversationId &&
          message.isIncoming &&
          message.status === 'unread'
        ) {
          clearedUnread += 1;
          return { ...message, status: 'read' as const };
        }

        return message;
      });

      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      setConversationItems((previous) => markConversationRead(previous, event.conversationId));

      if (clearedUnread > 0) {
        const nextUnread = Math.max(0, unreadCountRef.current - clearedUnread);
        unreadCountRef.current = nextUnread;
        setUnreadCount(nextUnread);
      }

      return;
    }

    if (event.type === 'outgoing_status') {
      const nextMessages = messagesRef.current.map((message) => {
        const matchesByClient =
          event.clientMessageId &&
          message.clientMessageId === event.clientMessageId;
        const matchesByMessageId =
          event.messageId &&
          message.id === event.messageId;
        const matchesByExternalId =
          event.fbMessageId &&
          message.externalId === event.fbMessageId;

        if (!matchesByClient && !matchesByMessageId && !matchesByExternalId) {
          return message;
        }

        return {
          ...message,
          id: event.messageId || message.id,
          externalId: event.fbMessageId || message.externalId,
          conversationId: event.conversationId || message.conversationId,
          timestamp: event.timestamp || message.timestamp,
          status: event.state === 'read'
            ? 'seen'
            : normalizeOutgoingStatus(event.state),
        };
      });

      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      setConversationItems((previous) =>
        previous.map((conversation) => {
          const latestMessage = conversation.latestMessage;
          const matchesByClient =
            event.clientMessageId &&
            latestMessage.clientMessageId === event.clientMessageId;
          const matchesByMessageId =
            event.messageId &&
            latestMessage.id === event.messageId;
          const matchesByExternalId =
            event.fbMessageId &&
            latestMessage.externalId === event.fbMessageId;

          if (!matchesByClient && !matchesByMessageId && !matchesByExternalId) {
            return conversation;
          }

          return {
            ...conversation,
            latestMessage: {
              ...latestMessage,
              id: event.messageId || latestMessage.id,
              externalId: event.fbMessageId || latestMessage.externalId,
              conversationId: event.conversationId || latestMessage.conversationId,
              timestamp: event.timestamp || latestMessage.timestamp,
              status:
                event.state === 'read'
                  ? 'seen'
                  : normalizeOutgoingStatus(event.state),
            },
          };
        })
      );

      if (event.state === 'failed' && event.error) {
        setReplyError(event.error);
      }

      return;
    }

    if (event.type === 'post_comment') {
      void fetchMessages(false);
      return;
    }

    const isIncoming = event.type === 'new_message';
    const isActiveConversation = selectedRef.current === event.conversationId;
    const timestamp = event.timestamp;
    const media = buildWsMedia(event);
    const currentMessages = messagesRef.current;
    const currentConversations = conversationsRef.current;
    const activeConversationSummary = currentConversations.find(
      (conversation) => conversation.conversationId === event.conversationId
    );

    if (
      isActiveConversation &&
      currentMessages.some(
        (message) => message.id === event.messageId || message.externalId === event.messageId
      )
    ) {
      return;
    }

    const conversationMessage =
      currentMessages.find((message) => message.conversationId === event.conversationId) ??
      activeConversationSummary?.latestMessage;
    const senderName = isIncoming
      ? ('senderName' in event && event.senderName) || conversationMessage?.sender.name || event.threadId
      : 'Minsah Beauty';

    const appendedMessage: SocialMessage = {
      id: event.messageId,
      externalId: event.type === 'outgoing_message' ? event.messageId : undefined,
      platform: 'facebook',
      type: 'message',
      conversationId: event.conversationId,
      sender: {
        id: isIncoming ? event.threadId : 'page',
        name: senderName,
        avatar: conversationMessage?.sender.avatar,
      },
      content: {
        text: event.text,
        media,
      },
      status: isIncoming
        ? (isActiveConversation ? 'read' : 'unread')
        : 'sent',
      timestamp,
      isIncoming,
    };

    setConversationItems((previous) => upsertConversationFromMessage(previous, appendedMessage));

    if (isActiveConversation) {
      const nextMessages = sortMessagesChronologically(
        isIncoming
          ? [...currentMessages, appendedMessage]
          : [
              ...currentMessages.filter((message) => !(
                message.id.startsWith('optimistic-') &&
                !message.isIncoming &&
                message.conversationId === event.conversationId &&
                message.content.text === event.text
              )),
              appendedMessage,
            ]
      );

      messagesRef.current = nextMessages;
      setMessages(nextMessages);
    }

    if (!isIncoming) {
      return;
    }

    if (isActiveConversation) {
      sendMarkReadRef.current(event.threadId, event.conversationId);
      return;
    }

    const nextUnread = unreadCountRef.current + 1;
    unreadCountRef.current = nextUnread;
    setUnreadCount(nextUnread);

    if (currentConversations.length > 0) {
      playNotificationSound();
      sendBrowserNotification(
        `New message from ${appendedMessage.sender.name}`,
        fixEncoding(appendedMessage.content.text).slice(0, 100),
        appendedMessage.sender.avatar
      );

      setNewMessageBanner(`New message from ${appendedMessage.sender.name}`);
      setTimeout(() => setNewMessageBanner(null), 4000);
    }
  }, [fetchMessages, filterPlatform, sendBrowserNotification]);

  const { sendMarkRead, status: socketStatus } = useInboxSocket(handleWsEvent);
  sendMarkReadRef.current = sendMarkRead;

  useEffect(() => {
    setConnectionStatus(
      socketStatus === 'live'
        ? 'live'
        : socketStatus === 'connecting'
          ? 'connecting'
          : 'offline'
    );
  }, [socketStatus]);

  // Auto-sync on first load if no conversations
  useEffect(() => {
    if (
      !initialLoading &&
      conversationItems.length === 0 &&
      filterPlatform === 'facebook'
    ) {
      void syncFacebook(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationItems.length, filterPlatform, initialLoading]);

  // ─────────────────────────────────────────────── conversations ──

  const conversations = conversationItems;

  const visibleConversations = useMemo(() => {
    if (!search.trim()) {
      return conversations;
    }

    const query = search.trim().toLowerCase();
    return conversations.filter((conversation) => conversation.searchText.includes(query));
  }, [conversations, search]);

  useEffect(() => {
    setConversationScrollTop(0);
    if (conversationListRef.current) {
      conversationListRef.current.scrollTop = 0;
    }
  }, [filterPlatform, search]);

  // Auto-select first conversation
  useEffect(() => {
    if (!visibleConversations.length) { if (selected) setSelected(null); return; }
    if (!visibleConversations.some((c) => c.conversationId === selected)) {
      setSelected(visibleConversations[0].conversationId);
    }
  }, [visibleConversations, selected]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.conversationId === selected) ?? null,
    [conversations, selected]
  );

  const threadMessages = useMemo(
    () => selected
      ? messages
          .filter((m) => m.conversationId === selected)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      : [],
    [messages, selected]
  );

  useEffect(() => {
    if (filterPlatform !== 'facebook') {
      setNextThreadCursor(null);
      setHasMoreThreadMessages(false);
      setLoadingOlderMessages(false);
      return;
    }

    if (!selected) {
      setMessages([]);
      setNextThreadCursor(null);
      setHasMoreThreadMessages(false);
      setLoadingOlderMessages(false);
      return;
    }

    void fetchConversationThread(selected);
  }, [fetchConversationThread, filterPlatform, selected]);

  const loadOlderMessages = useCallback(async () => {
    if (
      filterPlatform !== 'facebook' ||
      !selected ||
      !nextThreadCursor ||
      !hasMoreThreadMessages ||
      loadingOlderMessages
    ) {
      return;
    }

    setLoadingOlderMessages(true);
    prependingMessagesRef.current = true;
    previousThreadScrollHeightRef.current = scrollRef.current?.scrollHeight ?? 0;
    await fetchConversationThread(selected, {
      appendOlder: true,
      cursor: nextThreadCursor,
    });
  }, [
    fetchConversationThread,
    filterPlatform,
    hasMoreThreadMessages,
    loadingOlderMessages,
    nextThreadCursor,
    selected,
  ]);

  // Auto-scroll on new messages (only if near bottom)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (prependingMessagesRef.current) {
      const heightDelta =
        el.scrollHeight - previousThreadScrollHeightRef.current;
      el.scrollTop += heightDelta;
      prependingMessagesRef.current = false;
      previousThreadScrollHeightRef.current = 0;
      lastMessageCountRef.current = threadMessages.length;
      return;
    }
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom || threadMessages.length !== lastMessageCountRef.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    lastMessageCountRef.current = threadMessages.length;
  }, [threadMessages.length, selected]);

  // Scroll-down button visibility
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 300);

    if (
      filterPlatform === 'facebook' &&
      hasMoreThreadMessages &&
      !loadingOlderMessages &&
      el.scrollTop < 120
    ) {
      void loadOlderMessages();
    }
  }, [
    filterPlatform,
    hasMoreThreadMessages,
    loadOlderMessages,
    loadingOlderMessages,
  ]);

  useEffect(() => {
    const element = conversationListRef.current;
    if (!element) {
      return;
    }

    const updateViewport = () => {
      setConversationViewportHeight(element.clientHeight);
    };

    updateViewport();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(updateViewport);
    observer.observe(element);
    return () => observer.disconnect();
  }, [visibleConversations.length]);

  const loadMoreConversations = useCallback(async () => {
    if (
      filterPlatform !== 'facebook' ||
      !hasMoreConversations ||
      !nextConversationCursor ||
      loadingMoreConversations
    ) {
      return;
    }

    setLoadingMoreConversations(true);
    await fetchMessages(false, {
      append: true,
      cursor: nextConversationCursor,
    });
  }, [
    fetchMessages,
    filterPlatform,
    hasMoreConversations,
    loadingMoreConversations,
    nextConversationCursor,
  ]);

  const onConversationListScroll = useCallback(() => {
    const element = conversationListRef.current;
    if (!element) {
      return;
    }

    setConversationScrollTop(element.scrollTop);

    if (
      filterPlatform === 'facebook' &&
      hasMoreConversations &&
      !loadingMoreConversations &&
      element.scrollHeight - element.scrollTop - element.clientHeight <
        CONVERSATION_ITEM_HEIGHT * 4
    ) {
      void loadMoreConversations();
    }
  }, [
    filterPlatform,
    hasMoreConversations,
    loadMoreConversations,
    loadingMoreConversations,
  ]);

  const virtualConversationWindow = useMemo(() => {
    const totalHeight = visibleConversations.length * CONVERSATION_ITEM_HEIGHT;
    const viewportHeight = conversationViewportHeight || 1;
    const startIndex = Math.max(
      0,
      Math.floor(conversationScrollTop / CONVERSATION_ITEM_HEIGHT) - CONVERSATION_OVERSCAN
    );
    const visibleCount =
      Math.ceil(viewportHeight / CONVERSATION_ITEM_HEIGHT) + CONVERSATION_OVERSCAN * 2;
    const endIndex = Math.min(
      visibleConversations.length,
      startIndex + visibleCount
    );

    return {
      items: visibleConversations.slice(startIndex, endIndex),
      offsetTop: startIndex * CONVERSATION_ITEM_HEIGHT,
      totalHeight,
    };
  }, [conversationScrollTop, conversationViewportHeight, visibleConversations]);

  // Auto-mark-as-read
  useEffect(() => {
    if (!selected) return;
    const unreadMessages = messages.filter(
      (m) => m.conversationId === selected && m.isIncoming && m.status === 'unread'
    );
    if (unreadMessages.length === 0 || !activeConversation) return;
    if (pendingReadRef.current.has(selected)) return;

    pendingReadRef.current.add(selected);

    if (activeConversation.platform === 'facebook') {
      const sent = sendMarkRead(activeConversation.participant.id, selected);
      if (!sent) {
        pendingReadRef.current.delete(selected);
        return;
      }

      const timer = setTimeout(() => {
        pendingReadRef.current.delete(selected);
        pendingReadTimersRef.current.delete(selected);
        void fetchMessages(false);
      }, 4000);

      pendingReadTimersRef.current.set(selected, timer);
      return;
    }
    void (async () => {
      try {
        const response = await fetch('/api/social/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: selected,
            platform: activeConversation.platform,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to mark conversation as read');
        }

        messagesRef.current = messagesRef.current.map((message) =>
          message.conversationId === selected && message.isIncoming
            ? { ...message, status: 'read' as const }
            : message
        );
        setMessages(messagesRef.current);

        const nextUnread = Math.max(0, unreadCountRef.current - unreadMessages.length);
        unreadCountRef.current = nextUnread;
        setUnreadCount(nextUnread);
      } catch {
        // Preserve unread state if the server update fails.
      } finally {
        pendingReadRef.current.delete(selected);
      }
    })();
  }, [activeConversation, fetchMessages, messages, selected, sendMarkRead]);

  useEffect(() => {
    if (activeConversation?.platform !== 'facebook' && drafts.length) clearDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation?.platform]);

  // ───────────────────────────────────────────── send reply ──

  const clearDrafts = useCallback(() => {
    setDrafts((prev) => { prev.forEach((d) => URL.revokeObjectURL(d.previewUrl)); return []; });
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const send = async () => {
    if ((!replyText.trim() && !drafts.length) || sending || !activeConversation) return;

    const thread = threadMessages;
    const target = [...thread].reverse().find((m) => m.isIncoming) ?? thread[thread.length - 1];
    if (!target) return;

    const savedText = replyText.trim();
    if (target.platform !== 'facebook') {
      setReplyError('Realtime inbox migration currently supports Facebook only.');
      return;
    }

    setSending(true);
    setReplyError(null);
    setAiSuggestion('');
    const savedDrafts = [...drafts];
    const clientMessageBase = `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticUnits: SocialMessage[] = [
      ...(savedText
        ? [{
            id: `optimistic-${clientMessageBase}:0`,
            clientMessageId: `${clientMessageBase}:0`,
            platform: target.platform,
            type: target.type,
            conversationId: selected!,
            sender: { id: 'page', name: 'Minsah Beauty' },
            content: {
              text: savedText,
            },
            status: 'sending' as const,
            timestamp: new Date().toISOString(),
            isIncoming: false,
          }]
        : []),
      ...savedDrafts.map((draft, index) => {
        const unitIndex = savedText ? index + 1 : index;
        return {
          id: `optimistic-${clientMessageBase}:${unitIndex}`,
          clientMessageId: `${clientMessageBase}:${unitIndex}`,
          platform: target.platform,
          type: target.type,
          conversationId: selected!,
          sender: { id: 'page', name: 'Minsah Beauty' },
          content: {
            text: `[${normalizeDraftUploadType(draft.type)} attachment]`,
            media: [{
              type: normalizeDraftUploadType(draft.type),
              url: draft.previewUrl,
              thumbnail: draft.type === 'image' ? draft.previewUrl : undefined,
              fileName: draft.file.name,
              mimeType: draft.file.type,
            }],
          },
          status: 'sending' as const,
          timestamp: new Date().toISOString(),
          isIncoming: false,
        };
      }),
    ];
    setMessages((prev) => sortMessagesChronologically([...prev, ...optimisticUnits]));
    if (optimisticUnits.length > 0) {
      setConversationItems((previous) =>
        optimisticUnits.reduce(
          (accumulator, message) => upsertConversationFromMessage(accumulator, message),
          previous
        )
      );
    }
    setReplyText('');
    if (taRef.current) taRef.current.style.height = 'auto';

    try {
      let attachments: UploadedDraftAttachment[] = [];

      if (savedDrafts.length > 0) {
        attachments = await Promise.all(
          savedDrafts.map(async (draft) => {
            const formData = new FormData();
            formData.append('file', draft.file);

            const uploadRes = await fetch('/api/admin/social/upload', {
              method: 'POST',
              body: formData,
            });

            const uploadData = (await uploadRes.json().catch(() => null)) as {
              error?: string;
              url?: string;
              fileName?: string;
              mimeType?: string;
            } | null;

            if (!uploadRes.ok || !uploadData?.url) {
              throw new Error(uploadData?.error || 'Attachment upload failed');
            }

            return {
              type: normalizeDraftUploadType(draft.type),
              url: uploadData.url,
              fileName: uploadData.fileName ?? draft.file.name,
              mimeType: uploadData.mimeType ?? draft.file.type,
              thumbnail: draft.type === 'image' ? uploadData.url : undefined,
            };
          })
        );
      }

      const res = await fetch('/api/admin/inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: target.type === 'comment' ? 'comment' : 'messenger',
          commentId: target.type === 'comment' ? target.externalId : undefined,
          recipientPsid: target.type === 'comment' ? undefined : activeConversation.participant.id,
          text: savedText,
          attachments,
          clientMessageId: clientMessageBase,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        deliveries?: Array<{
          queued: false;
          recipientId: string;
          messageId: string;
          conversationId: string;
          dbMessageId: string;
          clientMessageId?: string;
        }>;
        queuedDeliveries?: Array<{
          queued: true;
          jobId: string;
          text: string;
          attachmentType?: 'image' | 'video' | 'audio' | 'file';
          error: string;
          clientMessageId?: string;
        }>;
      };
      if (!res.ok) throw new Error(data.error || 'Reply failed');

      const deliveries = data.deliveries ?? [];
      const queuedDeliveries = data.queuedDeliveries ?? [];

      setMessages((prev) => prev.map((message) => {
        const delivered = deliveries.find(
          (delivery) => delivery.clientMessageId && delivery.clientMessageId === message.clientMessageId
        );
        if (delivered) {
          return {
            ...message,
            id: delivered.dbMessageId,
            externalId: delivered.messageId,
            conversationId: delivered.conversationId || message.conversationId,
            status: 'sent' as const,
          };
        }

        const queued = queuedDeliveries.find(
          (delivery) => delivery.clientMessageId && delivery.clientMessageId === message.clientMessageId
        );
        if (queued) {
          return {
            ...message,
            status: 'queued' as const,
          };
        }

        return message;
      }));
      setConversationItems((previous) =>
        previous.map((conversation) => {
          const queued = queuedDeliveries.find(
            (delivery) =>
              delivery.clientMessageId &&
              delivery.clientMessageId === conversation.latestMessage.clientMessageId
          );
          const delivered = deliveries.find(
            (delivery) =>
              delivery.clientMessageId &&
              delivery.clientMessageId === conversation.latestMessage.clientMessageId
          );

          if (delivered) {
            return {
              ...conversation,
              latestMessage: {
                ...conversation.latestMessage,
                id: delivered.dbMessageId,
                externalId: delivered.messageId,
                conversationId: delivered.conversationId || conversation.latestMessage.conversationId,
                status: 'sent',
              },
            };
          }

          if (queued) {
            return {
              ...conversation,
              latestMessage: {
                ...conversation.latestMessage,
                status: 'queued',
              },
            };
          }

          return conversation;
        })
      );

      clearDrafts();
    } catch (e) {
      setMessages((prev) =>
        prev.filter((m) => !(m.clientMessageId && m.clientMessageId.startsWith(clientMessageBase)))
      );
      void fetchMessages(false);
      setReplyText(savedText);
      setReplyError(e instanceof Error ? e.message : 'Reply failed');
    } finally {
      setSending(false);
    }
  };

  // ──────────────────────────────────── AI suggestion ──

  const getAiSuggestion = async () => {
    if (!activeConversation || aiLoading) return;
    setAiLoading(true);
    setAiSuggestion('');
    setReplyError(null);
    try {
      const history = threadMessages.slice(-10).map((m) => ({
        role: m.isIncoming ? 'user' : 'assistant' as const,
        content: fixEncoding(m.content.text),
      }));
      const res = await fetch('/api/admin/inbox/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are a friendly and helpful customer service representative for Minsah Beauty — 
a premium beauty product e-commerce brand based in Bangladesh.
Respond warmly, professionally, in the same language as the customer (Bangla, English, or mixed Banglish).
Keep replies concise (2–4 sentences). Address their question directly.
Never mention you are an AI. Sign off as "Minsah Beauty Team" if needed.`,
          messages: history,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { error?: string; suggestion?: string }
        | null;
      if (!res.ok) {
        throw new Error(json?.error || 'AI suggestion failed');
      }
      const text = json?.suggestion ?? '';
      if (!text) {
        throw new Error('AI suggestion was empty');
      }
      setAiSuggestion(text);
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : 'AI suggestion failed');
    }
    finally { setAiLoading(false); }
  };

  const acceptSuggestion = () => {
    setReplyText(aiSuggestion);
    setAiSuggestion('');
    taRef.current?.focus();
  };

  // ─────────────────────────────────────── Facebook sync ──

  const syncFacebook = async (auto = false) => {
    if (syncingFb) return;
    setSyncingFb(true);
    setSyncProgress({ stage: 'starting', processedConversations: 0, totalConversations: 0, processedMessages: 0, processedAttachments: 0 });
    try {
      const res = await fetch('/api/admin/inbox/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        synced?: number;
        conversations?: number;
      } | null;

      if (!res.ok) {
        throw new Error(data?.error || 'Facebook sync failed');
      }

      setSyncProgress({
        stage: 'completed',
        processedConversations: data?.conversations ?? 0,
        totalConversations: data?.conversations ?? 0,
        processedMessages: data?.synced ?? 0,
        processedAttachments: 0,
      });

      await fetchMessages(false);
    } catch (error) {
      setSyncProgress((prev) => ({
        ...prev,
        stage: 'error',
        error: error instanceof Error ? error.message : 'Refresh failed',
      }));
    } finally {
      setSyncingFb(false);
    }
  };

  const syncLabel = useMemo(() => {
    switch (syncProgress.stage) {
      case 'starting': return 'Starting sync…';
      case 'fetching': return `Fetching conversations… (${syncProgress.totalConversations} found)`;
      case 'processing_conversation': return syncProgress.senderName ? `Processing: ${syncProgress.senderName}` : 'Processing conversations…';
      case 'processing_message': return `Saving messages… (${syncProgress.processedMessages} saved)`;
      case 'completed': return `✓ Synced ${syncProgress.processedConversations} conversations, ${syncProgress.processedMessages} messages`;
      case 'error': return `✕ ${syncProgress.error || 'Sync failed'}`;
      default: return null;
    }
  }, [syncProgress]);

  const syncPercent = useMemo(() => {
    if (!syncProgress.totalConversations) return 0;
    return Math.round((syncProgress.processedConversations / syncProgress.totalConversations) * 100);
  }, [syncProgress]);

  // ─────────────────────────────────────── file input ──

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const next = files
      .filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/') || f.type.startsWith('audio/'))
      .map((f, i) => ({
        id: `${f.name}-${Date.now()}-${i}`,
        file: f, previewUrl: URL.createObjectURL(f),
        type: inferAttachType(f),
      }));
    setDrafts((p) => [...p, ...next]);
    e.target.value = '';
  };

  const canAttach = activeConversation?.platform === 'facebook';

  // ─────────────────────────────────────────────────── render ──

  const PLATFORM_TABS = [
    { id: 'facebook', label: 'FB' },
    { id: 'instagram', label: 'IG' },
    { id: 'whatsapp', label: 'WA' },
    { id: 'all', label: 'All' },
  ];

  if (initialLoading) {
    return (
      <div style={{
        display: 'flex', height: '100%', width: '100%',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #fdf8f5 0%, #f5ede6 100%)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '3px solid #f0dfd4',
            borderTopColor: '#64320D',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px',
          }} />
          <p style={{ fontSize: 13, color: '#8E6545', fontWeight: 500 }}>Loading inbox…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', height: '100%', width: '100%', overflow: 'hidden',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      background: '#f8f4f1',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.4)} 70%{box-shadow:0 0 0 6px rgba(34,197,94,0)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes progressBar { from{width:0} to{width:100%} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ddd4cc; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #c4b5a8; }
        .conv-item:hover { background: #f0e8e2 !important; }
        .conv-item-active { background: linear-gradient(90deg, #fdf0e8, #faf5f1) !important; border-left-color: #64320D !important; }
      `}</style>

      {/* ═══════════════════════════ SIDEBAR ═══════════════════════════ */}
      <aside style={{
        display: isMobile && showChat ? 'none' : 'flex',
        flexDirection: 'column',
        width: 320,
        flexShrink: 0,
        background: '#fff',
        borderRight: '1px solid #ede5de',
        height: '100%',
      }}
        className="sm:flex"
      >
        {/* Brand header */}
        <div style={{
          background: 'linear-gradient(135deg, #64320D 0%, #421C00 100%)',
          padding: '14px 16px',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <a href="/admin/marketing" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 30, height: 30, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)', color: '#fff',
                textDecoration: 'none',
              }}>
                <ArrowLeft size={15} />
              </a>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Minsah Inbox</div>
                {unreadCount > 0 && (
                  <div style={{ fontSize: 11, color: 'rgba(255,230,210,0.9)', marginTop: 1 }}>
                    {unreadCount} unread
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Notification toggle */}
              <button
                onClick={() => notificationsEnabled ? setNotificationsEnabled(false) : requestNotifications()}
                title={notificationsEnabled ? 'Notifications on' : 'Enable notifications'}
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: notificationsEnabled ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.15)',
                  border: 'none', cursor: 'pointer', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {notificationsEnabled ? <Bell size={14} /> : <BellOff size={14} />}
              </button>

              {/* Sync button */}
              {filterPlatform === 'facebook' && (
                <button
                  onClick={() => void syncFacebook()}
                  disabled={syncingFb}
                  title="Sync ALL Facebook conversations"
                  style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none', cursor: syncingFb ? 'not-allowed' : 'pointer',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: syncingFb ? 0.7 : 1,
                  }}
                >
                  <RefreshCw size={14} style={{ animation: syncingFb ? 'spin 1s linear infinite' : 'none' }} />
                </button>
              )}
            </div>
          </div>

          {/* Connection status */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 10px',
          }}>
            <ConnectionDot status={connectionStatus} />
            <span style={{ fontSize: 11, color: 'rgba(255,230,210,0.7)' }}>
              {visibleConversations.length} chats
            </span>
          </div>
        </div>

        {/* Sync progress */}
        {syncingFb && (
          <div style={{ padding: '10px 14px', background: '#fef9f5', borderBottom: '1px solid #ede5de', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Zap size={12} color="#64320D" />
              <span style={{ fontSize: 11, color: '#64320D', fontWeight: 600 }}>
                {syncLabel}
              </span>
            </div>
            <div style={{ height: 3, background: '#f0dfd4', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4,
                background: 'linear-gradient(90deg, #64320D, #a05a2c)',
                width: `${syncPercent || 5}%`,
                transition: 'width 0.3s ease',
              }} />
            </div>
            {syncProgress.totalConversations > 0 && (
              <div style={{ fontSize: 10, color: '#8E6545', marginTop: 4 }}>
                {syncProgress.processedConversations} / {syncProgress.totalConversations} conversations
              </div>
            )}
          </div>
        )}

        {/* Completed/error banner */}
        {!syncingFb && syncLabel && (
          <div style={{
            padding: '8px 14px', flexShrink: 0, fontSize: 11, fontWeight: 500,
            background: syncProgress.stage === 'error' ? '#fef2f2' : '#f0fdf4',
            color: syncProgress.stage === 'error' ? '#dc2626' : '#16a34a',
            borderBottom: '1px solid #ede5de',
          }}>
            {syncLabel}
          </div>
        )}

        {/* Search */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #ede5de', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#f8f4f1', borderRadius: 10, padding: '8px 12px',
          }}>
            <Search size={14} color="#8E6545" />
            <input
              type="text" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              style={{
                flex: 1, border: 'none', background: 'transparent',
                fontSize: 13, color: '#421C00', outline: 'none',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#8E6545', padding: 0 }}>
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Platform tabs */}
        <div style={{
          display: 'flex', gap: 4, padding: '8px 12px',
          borderBottom: '1px solid #ede5de', flexShrink: 0,
        }}>
          {PLATFORM_TABS.map((tab) => (
            <button key={tab.id} onClick={() => setFilterPlatform(tab.id)} style={{
              flex: 1, padding: '6px 4px', border: 'none', borderRadius: 8, cursor: 'pointer',
              fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
              background: filterPlatform === tab.id ? '#64320D' : 'transparent',
              color: filterPlatform === tab.id ? '#fff' : '#8E6545',
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <div
          ref={conversationListRef}
          onScroll={onConversationListScroll}
          style={{ flex: 1, overflowY: 'auto' }}
        >
          {visibleConversations.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 8, color: '#8E6545' }}>
              <MessageSquare size={36} strokeWidth={1.2} opacity={0.4} />
              <p style={{ fontSize: 13, margin: 0 }}>
                {search.trim()
                  ? 'No conversations match your search'
                  : filterPlatform === 'facebook'
                    ? 'Click sync to load conversations'
                    : 'No conversations'}
              </p>
            </div>
          ) : (
            <div style={{ height: virtualConversationWindow.totalHeight, position: 'relative' }}>
              <div style={{ transform: `translateY(${virtualConversationWindow.offsetTop}px)` }}>
                {virtualConversationWindow.items.map((conv) => (
              <button
                key={conv.conversationId}
                className={`conv-item ${selected === conv.conversationId ? 'conv-item-active' : ''}`}
                onClick={() => {
                  setSelected(conv.conversationId);
                  if (isMobile) {
                    setShowChat(true);
                  }
                }}
                style={{
                  display: 'flex', width: '100%', alignItems: 'center', gap: 10,
                  padding: '12px 14px', textAlign: 'left', background: 'transparent',
                  border: 'none', cursor: 'pointer',
                  borderBottom: '1px solid #f5ede8',
                  borderLeft: `3px solid ${selected === conv.conversationId ? '#64320D' : 'transparent'}`,
                  transition: 'all 0.12s',
                  minHeight: CONVERSATION_ITEM_HEIGHT,
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar src={conv.participant.avatar} name={conv.participant.name} size={44} />
                  <span style={{ position: 'absolute', bottom: -1, right: -1 }}>
                    <PlatBadge platform={conv.platform} size={15} />
                  </span>
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
                    <span style={{
                      fontSize: 13, fontWeight: conv.unreadCount > 0 ? 700 : 600,
                      color: '#1a0a00', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {conv.participant.name}
                    </span>
                    <span style={{ fontSize: 10, color: '#8E6545', flexShrink: 0 }}>
                      {fmtTime(conv.latestMessage.timestamp)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{
                      fontSize: 12, color: conv.unreadCount > 0 ? '#421C00' : '#8E6545',
                      fontWeight: conv.unreadCount > 0 ? 600 : 400,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {!conv.latestMessage.isIncoming && <span style={{ color: '#64320D' }}>You: </span>}
                      {fixEncoding(conv.latestMessage.content.text) || '📎 Attachment'}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span style={{
                        minWidth: 18, height: 18, borderRadius: 9,
                        background: '#64320D', color: '#fff',
                        fontSize: 10, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 5px', flexShrink: 0,
                      }}>
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
                ))}
              </div>
              {filterPlatform === 'facebook' && loadingMoreConversations && (
                <div style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 12,
                  right: 12,
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.88)',
                  border: '1px solid #ede5de',
                  fontSize: 11,
                  color: '#8E6545',
                  textAlign: 'center',
                }}>
                  Loading more conversations...
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ═══════════════════════════ CHAT PANEL ═══════════════════════════ */}
      <main style={{
        flex: 1, display: isMobile && !showChat ? 'none' : 'flex',
        flexDirection: 'column', minWidth: 0, height: '100%',
        background: '#f8f4f1',
      }}>
        {activeConversation ? (
          <>
            {/* Chat header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 16px', background: '#fff',
              borderBottom: '1px solid #ede5de', flexShrink: 0,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              {/* Mobile back */}
              <button onClick={() => setShowChat(false)} style={{
                width: 34, height: 34, borderRadius: '50%', border: 'none',
                background: '#f8f4f1', cursor: 'pointer', color: '#64320D',
                display: isMobile ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center',
              }}>
                <ArrowLeft size={16} />
              </button>

              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar src={activeConversation.participant.avatar} name={activeConversation.participant.name} size={40} />
                <span style={{ position: 'absolute', bottom: -1, right: -1 }}>
                  <PlatBadge platform={activeConversation.platform} size={14} />
                </span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a0a00', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeConversation.participant.name}
                </div>
                <div style={{ fontSize: 11, color: '#8E6545', textTransform: 'capitalize', marginTop: 1 }}>
                  {PLATFORM_CFG[activeConversation.platform]?.name} · {activeConversation.latestMessage.type}
                </div>
              </div>

              {/* AI suggest */}
              <button
                onClick={() => void getAiSuggestion()}
                disabled={aiLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 20,
                  background: aiLoading ? '#f0dfd4' : 'linear-gradient(135deg, #64320D, #a05a2c)',
                  color: '#fff', border: 'none', cursor: aiLoading ? 'not-allowed' : 'pointer',
                  fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                }}
              >
                {aiLoading ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />}
                <span>AI Reply</span>
              </button>
            </div>

            {/* AI suggestion */}
            {aiSuggestion && (
              <div style={{
                display: 'flex', gap: 10, padding: '10px 14px',
                background: '#fef9f5', borderBottom: '1px solid #ede5de', flexShrink: 0,
                animation: 'slideDown 0.2s ease',
              }}>
                <Bot size={15} color="#64320D" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ flex: 1, fontSize: 13, color: '#421C00', margin: 0, lineHeight: 1.5 }}>{aiSuggestion}</p>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={acceptSuggestion} style={{
                    padding: '4px 10px', borderRadius: 12,
                    background: '#64320D', color: '#fff', border: 'none',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}>Use</button>
                  <button onClick={() => setAiSuggestion('')} style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: '#f0dfd4', border: 'none', cursor: 'pointer', color: '#64320D',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><X size={12} /></button>
                </div>
              </div>
            )}

            {/* New message banner */}
            {newMessageBanner && (
              <div style={{
                padding: '8px 14px', background: '#1877f2', color: '#fff',
                fontSize: 12, fontWeight: 500, flexShrink: 0,
                animation: 'slideDown 0.2s ease',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Zap size={12} />
                {newMessageBanner}
              </div>
            )}

            {/* Messages area */}
            <div
              ref={scrollRef}
              onScroll={onScroll}
              style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}
            >
              <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {activeConversation?.platform === 'facebook' && hasMoreThreadMessages && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 14px' }}>
                    <button
                      onClick={() => void loadOlderMessages()}
                      disabled={loadingOlderMessages}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 999,
                        border: '1px solid #e5d6cb',
                        background: '#fff',
                        color: '#64320D',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: loadingOlderMessages ? 'not-allowed' : 'pointer',
                        opacity: loadingOlderMessages ? 0.7 : 1,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      }}
                    >
                      {loadingOlderMessages ? 'Loading older messages...' : 'Load older messages'}
                    </button>
                  </div>
                )}
                {threadMessages.map((msg, i) => {
                  const prev = threadMessages[i - 1];
                  const next = threadMessages[i + 1];
                  const showDivider = !prev || !sameDay(prev.timestamp, msg.timestamp);
                  const isOptimistic = msg.id.startsWith('optimistic-');
                  const sameSenderAsPrev = prev && prev.isIncoming === msg.isIncoming && prev.sender.id === msg.sender.id;
                  const sameSenderAsNext = next && next.isIncoming === msg.isIncoming && next.sender.id === msg.sender.id;
                  const showAvatar = msg.isIncoming && (!next || !next.isIncoming || next.sender.id !== msg.sender.id);

                  return (
                    <div key={msg.id} style={{ marginTop: sameSenderAsPrev ? 2 : 12, animation: 'fadeIn 0.2s ease' }}>
                      {showDivider && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '12px 0' }}>
                          <span style={{
                            padding: '3px 12px', borderRadius: 12,
                            background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)',
                            fontSize: 11, color: '#8E6545', fontWeight: 500,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                          }}>
                            {fmtDivider(msg.timestamp)}
                          </span>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, justifyContent: msg.isIncoming ? 'flex-start' : 'flex-end' }}>
                        {msg.isIncoming && (
                          <div style={{ width: 28, flexShrink: 0, alignSelf: 'flex-end' }}>
                            {showAvatar && <Avatar src={msg.sender.avatar} name={msg.sender.name} size={28} />}
                          </div>
                        )}

                        <div style={{ maxWidth: '70%', opacity: isOptimistic ? 0.6 : 1 }}>
                          {msg.isIncoming && !sameSenderAsPrev && (
                            <p style={{ fontSize: 10, color: '#8E6545', fontWeight: 600, marginBottom: 2, marginLeft: 2 }}>
                              {msg.sender.name}
                            </p>
                          )}

                          <div style={{
                            padding: '9px 13px', fontSize: 13, lineHeight: 1.5,
                            borderRadius: msg.isIncoming
                              ? `${sameSenderAsPrev ? 4 : 16}px 16px 16px ${sameSenderAsNext ? 4 : 16}px`
                              : `16px ${sameSenderAsPrev ? 4 : 16}px ${sameSenderAsNext ? 4 : 16}px 16px`,
                            background: msg.isIncoming
                              ? '#fff'
                              : 'linear-gradient(135deg, #64320D 0%, #421C00 100%)',
                            color: msg.isIncoming ? '#1a0a00' : '#fff',
                            boxShadow: msg.isIncoming
                              ? '0 1px 2px rgba(0,0,0,0.08)'
                              : '0 1px 4px rgba(100,50,13,0.3)',
                            border: msg.isIncoming ? '1px solid #f0e6df' : 'none',
                          }}>
                            {/* Type badge */}
                            {!sameSenderAsPrev && msg.type !== 'message' && (
                              <span style={{
                                display: 'inline-block', marginBottom: 4,
                                padding: '1px 7px', borderRadius: 8, fontSize: 10, fontWeight: 600,
                                background: msg.isIncoming ? '#f0e6df' : 'rgba(255,255,255,0.2)',
                                color: msg.isIncoming ? '#64320D' : 'rgba(255,255,255,0.9)',
                                textTransform: 'capitalize',
                              }}>
                                {msg.type}
                              </span>
                            )}

                            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{fixEncoding(msg.content.text)}</p>

                            {msg.content.media && msg.content.media.length > 0 && (
                              <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                                {msg.content.media.map((m, mi) => renderMedia(m, `${msg.id}-${mi}`, msg.isIncoming))}
                              </div>
                            )}

                            {isOptimistic && (
                              <p style={{ margin: '4px 0 0', textAlign: 'right', fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                                {getOutgoingStatusLabel(msg.status)}
                              </p>
                            )}
                          </div>

                          {!sameSenderAsNext && (
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 3, marginTop: 3,
                              justifyContent: msg.isIncoming ? 'flex-start' : 'flex-end',
                              paddingLeft: msg.isIncoming ? 4 : 0,
                            }}>
                              <span style={{ fontSize: 10, color: '#a8957f' }}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                              </span>
                              {!msg.isIncoming && (
                                <>
                                  <span style={{ fontSize: 10, color: '#a8957f' }}>
                                    {getOutgoingStatusLabel(msg.status)}
                                  </span>
                                  <CheckCheck
                                    size={12}
                                    color={
                                      normalizeOutgoingStatus(msg.status) === 'delivered' ||
                                      normalizeOutgoingStatus(msg.status) === 'seen'
                                        ? '#64320D'
                                        : '#a8957f'
                                    }
                                  />
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} style={{ height: 4 }} />
              </div>
            </div>

            {/* Scroll to bottom */}
            {showScrollDown && (
              <button
                onClick={() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })}
                style={{
                  position: 'absolute', bottom: 90, right: 20,
                  width: 36, height: 36, borderRadius: '50%',
                  background: '#64320D', color: '#fff', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(100,50,13,0.4)',
                  animation: 'slideUp 0.2s ease',
                }}
              >
                <ChevronDown size={16} />
              </button>
            )}

            {/* Compose area */}
            <div style={{
              padding: '10px 14px', background: '#fff',
              borderTop: '1px solid #ede5de', flexShrink: 0,
            }}>
              {replyError && (
                <div style={{
                  marginBottom: 8, padding: '7px 12px', borderRadius: 10,
                  background: '#fef2f2', color: '#dc2626', fontSize: 12,
                }}>
                  {replyError}
                </div>
              )}

              {/* Draft previews */}
              {drafts.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {drafts.map((d) => (
                    <div key={d.id} style={{
                      position: 'relative', width: 72, height: 72,
                      borderRadius: 10, overflow: 'hidden', border: '1px solid #ede5de',
                    }}>
                      <button
                        onClick={() => { URL.revokeObjectURL(d.previewUrl); setDrafts((p) => p.filter((x) => x.id !== d.id)); }}
                        style={{
                          position: 'absolute', top: 3, right: 3, zIndex: 1,
                          width: 18, height: 18, borderRadius: '50%',
                          background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer',
                          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <X size={10} />
                      </button>
                      {d.type === 'image' ? (
                        <img src={d.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : d.type === 'video' ? (
                        <video
                          src={d.previewUrl}
                          muted
                          playsInline
                          preload="metadata"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: '#f8f4f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {(() => {
                            const PreviewIcon = getDraftPreviewIcon(d.type);
                            return <PreviewIcon size={24} color="#8E6545" />;
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!canAttach && drafts.length === 0 && (
                <p style={{ fontSize: 11, color: '#a8957f', marginBottom: 8 }}>
                  Attachment replies are currently unavailable in the realtime inbox.
                </p>
              )}

              <div style={{
                display: 'flex', alignItems: 'flex-end', gap: 8,
                background: '#f8f4f1', borderRadius: 16,
                padding: '6px 8px', border: '1px solid #ede5de',
              }}>
                <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" multiple style={{ display: 'none' }} onChange={onFileChange} />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={!canAttach || sending}
                  style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: '#fff', border: '1px solid #ede5de',
                    cursor: canAttach && !sending ? 'pointer' : 'not-allowed',
                    color: '#8E6545', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, opacity: !canAttach ? 0.4 : 1,
                  }}
                >
                  <Paperclip size={15} />
                </button>

                <textarea
                  ref={taRef}
                  value={replyText}
                  onChange={(e) => {
                    setReplyText(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
                  }}
                  rows={1}
                  placeholder="Write a reply… (Enter to send)"
                  style={{
                    flex: 1, border: 'none', background: 'transparent',
                    resize: 'none', fontSize: 13, color: '#1a0a00',
                    outline: 'none', padding: '8px 0', minHeight: 36, maxHeight: 120,
                    fontFamily: 'inherit', lineHeight: 1.5,
                  }}
                />

                <button
                  onClick={() => void send()}
                  disabled={(!replyText.trim() && !drafts.length) || sending}
                  style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: (!replyText.trim() && !drafts.length) || sending
                      ? '#f0dfd4'
                      : 'linear-gradient(135deg, #64320D, #421C00)',
                    border: 'none', cursor: 'pointer',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 0.15s',
                    boxShadow: (!replyText.trim() && !drafts.length) ? 'none' : '0 2px 6px rgba(100,50,13,0.35)',
                  }}
                >
                  <Send size={15} />
                </button>
              </div>

              <p style={{ fontSize: 10, color: '#c4b5a8', textAlign: 'center', marginTop: 6 }}>
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </>
        ) : (
          /* Empty state */
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, #64320D, #a05a2c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={36} color="#fff" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a0a00', margin: '0 0 6px' }}>Minsah Beauty Inbox</h2>
              <p style={{ fontSize: 13, color: '#8E6545', margin: 0 }}>Select a conversation to start replying</p>
            </div>
            {filterPlatform === 'facebook' && !syncingFb && (
              <button
                onClick={() => void syncFacebook()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 20px', borderRadius: 20,
                  background: 'linear-gradient(135deg, #64320D, #421C00)',
                  color: '#fff', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, marginTop: 4,
                }}
              >
                <RefreshCw size={14} />
                Refresh Facebook Inbox
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────── media renderer ──

function renderMedia(
  media: NonNullable<SocialMessage['content']['media']>[number],
  key: string,
  isIncoming: boolean
) {
  if (media.type === 'image') {
    return (
      <a key={key} href={media.url} target="_blank" rel="noreferrer"
        style={{ display: 'block', borderRadius: 10, overflow: 'hidden', border: `1px solid ${isIncoming ? '#f0e6df' : 'rgba(255,255,255,0.2)'}` }}>
        <img src={media.thumbnail || media.url} alt={media.fileName || 'Image'}
          style={{ maxHeight: 220, width: '100%', objectFit: 'cover', display: 'block' }} />
      </a>
    );
  }
  if (media.type === 'video') {
    return (
      <div key={key} style={{ borderRadius: 10, overflow: 'hidden', background: '#000', border: `1px solid ${isIncoming ? '#f0e6df' : 'rgba(255,255,255,0.2)'}` }}>
        <video controls preload="metadata" poster={media.thumbnail} style={{ maxHeight: 220, width: '100%' }} src={media.url} />
        {media.fileName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', fontSize: 11, color: isIncoming ? '#8E6545' : 'rgba(255,255,255,0.7)' }}>
            <VideoIcon size={12} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{media.fileName}</span>
          </div>
        )}
      </div>
    );
  }
  if (media.type === 'audio') {
    return (
      <div key={key} style={{ borderRadius: 10, padding: '8px 10px', border: `1px solid ${isIncoming ? '#f0e6df' : 'rgba(255,255,255,0.2)'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: isIncoming ? '#8E6545' : 'rgba(255,255,255,0.8)', marginBottom: 6 }}>
          <FileAudio size={12} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{media.fileName || 'Audio'}</span>
        </div>
        <audio controls preload="metadata" style={{ width: '100%', height: 32 }} src={media.url} />
      </div>
    );
  }
  return (
    <a key={key} href={media.url} target="_blank" rel="noreferrer" style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10,
      border: `1px solid ${isIncoming ? '#f0e6df' : 'rgba(255,255,255,0.2)'}`,
      color: isIncoming ? '#8E6545' : 'rgba(255,255,255,0.8)',
      fontSize: 12, textDecoration: 'none',
    }}>
      <FileText size={14} style={{ flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{media.fileName || media.mimeType || 'File'}</span>
    </a>
  );
}
