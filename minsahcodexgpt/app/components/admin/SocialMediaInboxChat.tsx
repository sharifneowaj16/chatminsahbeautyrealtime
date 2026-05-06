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
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCheck,
  ChevronDown,
  FileAudio,
  FileText,
  MapPin,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  ShoppingCart,
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

async function parseApiResponse<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return null;
  }

  return response.json().catch(() => null);
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

type ToastState =
  | { type: 'success' | 'error'; message: string }
  | null;

type ClientProfile = {
  platform: 'facebook' | 'instagram' | 'whatsapp' | 'youtube';
  participantId: string;
  phoneNumber: string;
  realName: string;
  address: string;
  district: string;
  thana: string;
};

type ProductSearchItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  images: string[];
  stock: number;
  inStock: boolean;
  variants?: Array<{
    id: string;
    price: number;
    stock: number;
    attributes: Record<string, unknown>;
  }>;
};

type SelectedProductDraft = {
  product: ProductSearchItem;
  variantId: string | null;
  quantity: number;
  note: string;
};

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

function formatBdt(amount: number) {
  const safe = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(safe);
  } catch {
    return `৳${Math.round(safe)}`;
  }
}

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

const PRODUCT_CARD_PREFIX = '__MINSAH_PRODUCT_CARD__:' as const;
const STOREFRONT_BASE_URL = 'https://minsahbeauty.cloud' as const;

function buildProductViewPath(slug: string) {
  return `/products/${slug}`;
}

function buildProductOrderPath(slug: string, qty: number, variantId?: string | null) {
  return `/buy-now?product=${slug}&qty=${qty}${variantId ? `&variant=${variantId}` : ''}`;
}

function toAbsoluteStorefrontUrl(path: string) {
  return `${STOREFRONT_BASE_URL}${path}`;
}

function getVariantLabel(
  variant: NonNullable<ProductSearchItem['variants']>[number]
) {
  const attributeLabel = Object.entries(variant.attributes || {})
    .map(([key, value]) => {
      const normalized =
        typeof value === 'string' || typeof value === 'number'
          ? String(value).trim()
          : '';
      return normalized ? `${key}: ${normalized}` : '';
    })
    .filter(Boolean)
    .join(' • ');

  return attributeLabel || `Variant ${variant.id.slice(-6)}`;
}

function getPreferredVariantId(product: ProductSearchItem) {
  if (!Array.isArray(product.variants) || product.variants.length === 0) {
    return null;
  }

  return product.variants.find((variant) => variant.stock > 0)?.id ?? product.variants[0].id;
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
  const [deadLetterCount, setDeadLetterCount] = useState(0);
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
  const aiSuggestionsAvailable = false;

  const [toast, setToast] = useState<ToastState>(null);
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [clientProfileDraft, setClientProfileDraft] = useState<ClientProfile | null>(null);
  const [clientProfileLoading, setClientProfileLoading] = useState(false);
  const [clientProfileSaving, setClientProfileSaving] = useState(false);

  const [showProductDrawer, setShowProductDrawer] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [productSearchResults, setProductSearchResults] = useState<ProductSearchItem[]>([]);
  const [selectedProductDraft, setSelectedProductDraft] = useState<SelectedProductDraft | null>(null);
  const [confirmSendProduct, setConfirmSendProduct] = useState(false);
  const [sendingProduct, setSendingProduct] = useState(false);

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
  const productSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const productSearchAbortRef = useRef<AbortController | null>(null);
  selectedRef.current = selected;

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

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

  const loadDeadLetterCount = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/inbox/sync/dead-letter?status=OPEN&limit=1', {
        cache: 'no-store',
      });
      if (!response.ok) {
        return;
      }

      const data = (await response.json().catch(() => null)) as { count?: number } | null;
      setDeadLetterCount(data?.count ?? 0);
    } catch {
      // ignore dead-letter count failures
    }
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
      params.set('unreadSummary', 'false');
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

  useEffect(() => {
    void loadDeadLetterCount();

    const refreshTimer = window.setInterval(() => {
      void loadDeadLetterCount();
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadDeadLetterCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(refreshTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadDeadLetterCount]);

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

  const loadClientProfile = useCallback(async () => {
    if (!activeConversation) {
      setClientProfile(null);
      setClientProfileDraft(null);
      return;
    }
    if (activeConversation.platform !== 'facebook') {
      setClientProfile(null);
      setClientProfileDraft(null);
      return;
    }

    setClientProfileLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('platform', activeConversation.platform);
      params.set('participantId', activeConversation.participant.id);
      const res = await fetch(`/api/admin/inbox/client-profile?${params.toString()}`, {
        cache: 'no-store',
      });
      const data = (await parseApiResponse<{ profile?: ClientProfile; error?: string }>(res)) as
        | { profile?: ClientProfile; error?: string }
        | null;
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load client details');
      }
      const profile = data?.profile ?? null;
      setClientProfile(profile);
      setClientProfileDraft(profile ? { ...profile } : null);
    } catch (e) {
      setClientProfile(null);
      setClientProfileDraft(null);
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to load client details' });
    } finally {
      setClientProfileLoading(false);
    }
  }, [activeConversation]);

  useEffect(() => {
    void loadClientProfile();
  }, [loadClientProfile]);

  const saveClientProfile = useCallback(async () => {
    if (!clientProfileDraft || !activeConversation) return;
    setClientProfileSaving(true);
    try {
      const res = await fetch('/api/admin/inbox/client-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientProfileDraft),
      });
      const data = (await parseApiResponse<{ profile?: ClientProfile; error?: string }>(res)) as
        | { profile?: ClientProfile; error?: string }
        | null;
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to save client details');
      }
      const profile = data?.profile ?? null;
      setClientProfile(profile);
      setClientProfileDraft(profile ? { ...profile } : clientProfileDraft);
      setToast({ type: 'success', message: 'Client shipping details saved' });
      setShowClientDetails(false);
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to save client details' });
    } finally {
      setClientProfileSaving(false);
    }
  }, [activeConversation, clientProfileDraft]);

  const runProductSearch = useCallback(async (term: string) => {
    if (!showProductDrawer) return;
    if (productSearchAbortRef.current) {
      productSearchAbortRef.current.abort();
    }
    const ac = new AbortController();
    productSearchAbortRef.current = ac;

    setProductSearchLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '20');
      params.set('activeOnly', 'true');
      if (term.trim()) params.set('search', term.trim());
      const res = await fetch(`/api/products?${params.toString()}`, {
        cache: 'no-store',
        signal: ac.signal,
      });
      const data = (await parseApiResponse<{ products?: ProductSearchItem[]; error?: string }>(res)) as
        | { products?: ProductSearchItem[]; error?: string }
        | null;
      if (!res.ok) {
        throw new Error(data?.error || 'Product search failed');
      }
      setProductSearchResults(Array.isArray(data?.products) ? data!.products! : []);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return;
      }
      setProductSearchResults([]);
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Product search failed' });
    } finally {
      setProductSearchLoading(false);
    }
  }, [showProductDrawer]);

  useEffect(() => {
    if (!showProductDrawer) return;
    if (productSearchDebounceRef.current) {
      clearTimeout(productSearchDebounceRef.current);
    }
    productSearchDebounceRef.current = setTimeout(() => {
      void runProductSearch(productSearchTerm);
    }, 320);
    return () => {
      if (productSearchDebounceRef.current) {
        clearTimeout(productSearchDebounceRef.current);
        productSearchDebounceRef.current = null;
      }
    };
  }, [productSearchTerm, runProductSearch, showProductDrawer]);

  useEffect(() => {
    if (!showProductDrawer) return;
    void runProductSearch(productSearchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showProductDrawer]);

  const buildSelectedVariant = useCallback((draft: SelectedProductDraft) => {
    if (!draft.variantId) return null;
    return draft.product.variants?.find((v) => v.id === draft.variantId) ?? null;
  }, []);

  const sendProductCard = useCallback(async () => {
    if (!selectedProductDraft || sendingProduct || !activeConversation || !selected) return;
    if (activeConversation.platform !== 'facebook') {
      setToast({ type: 'error', message: 'Product sending currently supports Facebook only.' });
      return;
    }

    const variant = buildSelectedVariant(selectedProductDraft);
    const unitPrice = variant?.price ?? selectedProductDraft.product.price;
    const qty = Math.max(1, Math.min(99, selectedProductDraft.quantity || 1));
    const stock = variant?.stock ?? selectedProductDraft.product.stock;
    if (stock <= 0) {
      setToast({ type: 'error', message: 'This product is out of stock.' });
      return;
    }

    const payload = {
      kind: 'product_card' as const,
      productId: selectedProductDraft.product.id,
      slug: selectedProductDraft.product.slug,
      name: selectedProductDraft.product.name,
      image: selectedProductDraft.product.image,
      price: unitPrice,
      quantity: qty,
      variantId: variant?.id ?? null,
      variantLabel: variant ? getVariantLabel(variant) : null,
      note: selectedProductDraft.note?.trim() || '',
      viewUrl: buildProductViewPath(selectedProductDraft.product.slug),
      orderUrl: buildProductOrderPath(selectedProductDraft.product.slug, qty, variant?.id ?? null),
    };

    const messageText =
      `${PRODUCT_CARD_PREFIX}${JSON.stringify(payload)}\n` +
      `\n${selectedProductDraft.product.name}\nPrice: ${formatBdt(unitPrice)}\nQty: ${qty}\n` +
      `${payload.variantLabel ? `Variant: ${payload.variantLabel}\n` : ''}` +
      `View: ${toAbsoluteStorefrontUrl(payload.viewUrl)}\n` +
      `Order Now: ${toAbsoluteStorefrontUrl(payload.orderUrl)}`;

    setSendingProduct(true);
    setConfirmSendProduct(false);

    const clientMessageBase = `client-product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: SocialMessage = {
      id: `optimistic-${clientMessageBase}`,
      clientMessageId: `${clientMessageBase}:0`,
      platform: 'facebook',
      type: 'message',
      conversationId: selected,
      sender: { id: 'page', name: 'Minsah Beauty' },
      content: { text: messageText },
      status: 'sending',
      timestamp: new Date().toISOString(),
      isIncoming: false,
    };
    setMessages((prev) => sortMessagesChronologically([...prev, optimistic]));
    setConversationItems((previous) => upsertConversationFromMessage(previous, optimistic));

    try {
      const res = await fetch('/api/admin/inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'messenger',
          recipientPsid: activeConversation.participant.id,
          text: messageText,
          clientMessageId: clientMessageBase,
        }),
      });
      const data = (await parseApiResponse<{ error?: string }>(res)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(
          data?.error ||
          (res.status === 401
            ? 'Admin session expired. Please log in again.'
            : 'Failed to send product')
        );
      }

      setToast({ type: 'success', message: 'Product sent to client' });
      setShowProductDrawer(false);
      setSelectedProductDraft(null);
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to send product' });
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      void fetchMessages(false);
    } finally {
      setSendingProduct(false);
    }
  }, [
    activeConversation,
    buildSelectedVariant,
    fetchMessages,
    selected,
    selectedProductDraft,
    sendingProduct,
  ]);

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

            const uploadData = (await parseApiResponse<{
              error?: string;
              url?: string;
              fileName?: string;
              mimeType?: string;
            }>(uploadRes)) as {
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
      const data = (await parseApiResponse<{
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
      }>(res)) as {
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
      } | null;
      if (!res.ok) {
        throw new Error(
          data?.error ||
          (res.status === 401
            ? 'Admin session expired. Please log in again.'
            : 'Reply failed')
        );
      }

      const deliveries = data?.deliveries ?? [];
      const queuedDeliveries = data?.queuedDeliveries ?? [];

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
        await loadDeadLetterCount();
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
      fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
      background: 'radial-gradient(circle at top left, #e8f5e9 0%, #f1f8e9 35%, #f6fbf7 100%)',
      color: '#1f2937',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.4)} 70%{box-shadow:0 0 0 6px rgba(34,197,94,0)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 7px; height: 7px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(123, 84, 54, 0.22); border-radius: 999px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(123, 84, 54, 0.34); }
        .conv-item:hover { background: rgba(255,255,255,0.72) !important; border-color: rgba(117,74,37,0.16) !important; transform: translateY(-1px); }
        .conv-item-active { background: linear-gradient(180deg, #ffffff 0%, #fbf4ec 100%) !important; border-color: rgba(100,50,13,0.28) !important; box-shadow: 0 12px 26px rgba(72,43,18,0.08); }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 18,
          right: 18,
          zIndex: 1000,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '12px 14px',
            borderRadius: 16,
            border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: toast.type === 'success' ? '#166534' : '#991b1b',
            boxShadow: '0 18px 30px rgba(0,0,0,0.10)',
            maxWidth: 360,
            fontSize: 13,
            fontWeight: 800,
          }}>
            <span style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              marginTop: 4,
              background: toast.type === 'success' ? '#22c55e' : '#ef4444',
              flexShrink: 0,
            }} />
            <span style={{ lineHeight: 1.35 }}>{toast.message}</span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════ SIDEBAR ═══════════════════════════ */}
      <aside style={{
        display: isMobile && showChat ? 'none' : 'flex',
        flexDirection: 'column',
        width: isMobile ? '100%' : 372,
        flexShrink: 0,
        padding: isMobile ? 12 : 18,
        gap: 14,
        height: '100%',
      }}
      >
        {/* Brand header */}
        <div style={{
          background: 'linear-gradient(160deg, rgba(7,94,84,0.96) 0%, rgba(18,140,126,0.94) 62%, rgba(37,211,102,0.9) 100%)',
          padding: '18px 18px 16px',
          borderRadius: 28,
          boxShadow: '0 20px 45px rgba(47, 24, 10, 0.20)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <a href="/admin" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 38, height: 38, borderRadius: 14,
                background: 'rgba(255,255,255,0.09)', color: '#fff4ec',
                textDecoration: 'none',
                flexShrink: 0,
              }}>
                <ArrowLeft size={16} />
              </a>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,244,236,0.74)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>Customer Operations</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff4ec', lineHeight: 1.1, marginTop: 3 }}>Minsah Inbox</div>
                {unreadCount > 0 && (
                  <div style={{ fontSize: 11, color: 'rgba(255,230,210,0.9)', marginTop: 4 }}>
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
                  width: 38, height: 38, borderRadius: 14,
                  background: notificationsEnabled ? 'rgba(93,210,132,0.18)' : 'rgba(255,255,255,0.09)',
                  border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', color: '#fff4ec',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {notificationsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
              </button>

              {/* Sync button */}
              {filterPlatform === 'facebook' && (
                <button
                  onClick={() => void syncFacebook()}
                  disabled={syncingFb}
                  title="Sync ALL Facebook conversations"
                  style={{
                    width: 38, height: 38, borderRadius: 14,
                    background: 'rgba(255,255,255,0.09)',
                    border: '1px solid rgba(255,255,255,0.08)', cursor: syncingFb ? 'not-allowed' : 'pointer',
                    color: '#fff4ec', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: syncingFb ? 0.7 : 1,
                  }}
                >
                  <RefreshCw size={16} style={{ animation: syncingFb ? 'spin 1s linear infinite' : 'none' }} />
                </button>
              )}
            </div>
          </div>

          {/* Connection status */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.10)', borderRadius: 18, padding: '12px 14px',
          }}>
            <ConnectionDot status={connectionStatus} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {deadLetterCount > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 10px', borderRadius: 999,
                  background: 'rgba(251,146,60,0.18)', color: '#ffedd5',
                  border: '1px solid rgba(251,146,60,0.28)',
                  fontSize: 11, fontWeight: 800,
                }}>
                  <AlertTriangle size={12} />
                  {deadLetterCount} dead
                </span>
              )}
              <span style={{ fontSize: 11, color: 'rgba(255,230,210,0.75)', letterSpacing: '0.04em' }}>
                {visibleConversations.length} chats
              </span>
            </div>
          </div>
        </div>

        {/* Sync progress */}
        {syncingFb && (
          <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.10)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Zap size={12} color="#fff4ec" />
              <span style={{ fontSize: 12, color: '#fff4ec', fontWeight: 700 }}>
                {syncLabel}
              </span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 999,
                background: 'linear-gradient(90deg, #ffe0c2, #ffffff)',
                width: `${syncPercent || 5}%`,
                transition: 'width 0.3s ease',
              }} />
            </div>
            {syncProgress.totalConversations > 0 && (
              <div style={{ fontSize: 10, color: 'rgba(255,230,210,0.8)', marginTop: 6 }}>
                {syncProgress.processedConversations} / {syncProgress.totalConversations} conversations
              </div>
            )}
          </div>
        )}

        {/* Completed/error banner */}
        {!syncingFb && syncLabel && (
          <div style={{
            padding: '11px 14px', borderRadius: 16, flexShrink: 0, fontSize: 12, fontWeight: 600,
            background: syncProgress.stage === 'error' ? '#fef2f2' : '#f0fdf4',
            color: syncProgress.stage === 'error' ? '#dc2626' : '#16a34a',
            border: `1px solid ${syncProgress.stage === 'error' ? '#fecaca' : '#d6ead8'}`,
          }}>
            {syncLabel}
          </div>
        )}

        {/* Search */}
        <div style={{ padding: 14, borderRadius: 28, background: 'rgba(255,255,255,0.54)', border: '1px solid rgba(115,75,42,0.10)', boxShadow: '0 18px 40px rgba(78,53,36,0.08)', backdropFilter: 'blur(12px)', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ paddingBottom: 12, flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#fbf7f3', borderRadius: 18, padding: '13px 14px', border: '1px solid rgba(115,75,42,0.08)',
          }}>
            <Search size={15} color="#8d684e" />
            <input
              type="text" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations"
              style={{
                flex: 1, border: 'none', background: 'transparent',
                fontSize: 14, color: '#24140b', outline: 'none',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#8d684e', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Platform tabs */}
        <div style={{
          display: 'flex', gap: 8, paddingBottom: 12,
          flexShrink: 0,
        }}>
          {PLATFORM_TABS.map((tab) => (
            <button key={tab.id} onClick={() => setFilterPlatform(tab.id)} style={{
              flex: 1, padding: '10px 8px', border: '1px solid rgba(115,75,42,0.10)', borderRadius: 14, cursor: 'pointer',
              fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
              background: filterPlatform === tab.id ? '#128C7E' : '#fff',
              color: filterPlatform === tab.id ? '#ffffff' : '#4b5563',
              boxShadow: filterPlatform === tab.id ? '0 10px 20px rgba(77,38,15,0.18)' : 'none',
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <div
          ref={conversationListRef}
          onScroll={onConversationListScroll}
          style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}
        >
          {visibleConversations.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 260, gap: 10, color: '#8d684e', textAlign: 'center', padding: 24 }}>
              <MessageSquare size={42} strokeWidth={1.25} opacity={0.42} />
              <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#422617' }}>
                {search.trim()
                  ? 'No matching conversations'
                  : filterPlatform === 'facebook'
                    ? 'Inbox is waiting for conversations'
                    : 'No conversations yet'}
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
                  padding: '14px 14px 13px', textAlign: 'left', background: 'rgba(255,255,255,0.46)',
                  border: '1px solid rgba(115,75,42,0.08)', cursor: 'pointer',
                  borderBottom: '1px solid rgba(115,75,42,0.08)',
                  borderLeft: '1px solid rgba(115,75,42,0.08)',
                  borderRadius: 22,
                  transition: 'all 0.12s',
                  minHeight: CONVERSATION_ITEM_HEIGHT,
                  marginBottom: 10,
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar src={conv.participant.avatar} name={conv.participant.name} size={46} />
                  <span style={{ position: 'absolute', bottom: -3, right: -3 }}>
                    <PlatBadge platform={conv.platform} size={16} />
                  </span>
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
                    <span style={{
                      fontSize: 14, fontWeight: conv.unreadCount > 0 ? 800 : 700,
                      color: '#27160d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {conv.participant.name}
                    </span>
                    <span style={{ fontSize: 11, color: '#87644a', flexShrink: 0 }}>
                      {fmtTime(conv.latestMessage.timestamp)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 6 }}>
                    <span style={{
                      fontSize: 12, color: conv.unreadCount > 0 ? '#3d2517' : '#8d684e',
                      fontWeight: conv.unreadCount > 0 ? 600 : 400,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {!conv.latestMessage.isIncoming && <span style={{ color: '#64320D' }}>You: </span>}
                      {fixEncoding(conv.latestMessage.content.text) || 'Attachment'}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span style={{
                        minWidth: 22, height: 22, borderRadius: 999,
                        background: '#128C7E', color: '#ffffff',
                        fontSize: 11, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 7px', flexShrink: 0,
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
        </div>
      </aside>

      {/* ═══════════════════════════ CHAT PANEL ═══════════════════════════ */}
      <main style={{
        flex: 1, display: isMobile && !showChat ? 'none' : 'flex',
        flexDirection: 'column', minWidth: 0, height: '100%',
        background: 'transparent', padding: isMobile ? '12px 12px 12px 0' : 18, paddingLeft: 0,
        position: 'relative',
      }}>
        {activeConversation ? (
          <div style={{
            display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%',
            borderRadius: isMobile ? 0 : 34,
            background: 'rgba(255,255,255,0.56)',
            border: isMobile ? 'none' : '1px solid rgba(115,75,42,0.10)',
            boxShadow: isMobile ? 'none' : '0 24px 50px rgba(78,53,36,0.10)',
            backdropFilter: 'blur(10px)',
            overflow: 'hidden',
          }}>
            {/* Chat header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: isMobile ? '16px 16px 14px' : '20px 24px 18px',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(252,248,242,0.70) 100%)',
              borderBottom: '1px solid rgba(115,75,42,0.10)', flexShrink: 0,
            }}>
              {/* Mobile back */}
              <button onClick={() => setShowChat(false)} style={{
                width: 40, height: 40, borderRadius: 14, border: '1px solid rgba(115,75,42,0.08)',
                background: '#fffaf5', cursor: 'pointer', color: '#64320D',
                display: isMobile ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center',
              }}>
                <ArrowLeft size={17} />
              </button>

              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar src={activeConversation.participant.avatar} name={activeConversation.participant.name} size={48} />
                <span style={{ position: 'absolute', bottom: -2, right: -2 }}>
                  <PlatBadge platform={activeConversation.platform} size={16} />
                </span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: '#23120a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.1 }}>
                  {activeConversation.participant.name}
                </div>
                <div style={{ fontSize: 11, color: '#8E6545', textTransform: 'capitalize', marginTop: 1 }}>
                  {PLATFORM_CFG[activeConversation.platform]?.name} · {activeConversation.latestMessage.type}
                </div>
              </div>

              {/* Client details (shipping address) */}
              <button
                onClick={() => setShowClientDetails(true)}
                title="Client shipping details"
                style={{
                  width: 42, height: 42, borderRadius: 16,
                  background: '#fffaf5',
                  border: '1px solid rgba(115,75,42,0.10)',
                  cursor: 'pointer',
                  color: '#64320D',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <MapPin size={18} />
              </button>

              {/* Product search */}
              <button
                onClick={() => { setShowProductDrawer(true); }}
                title="Search products to send"
                style={{
                  width: 42, height: 42, borderRadius: 16,
                  background: '#fffaf5',
                  border: '1px solid rgba(115,75,42,0.10)',
                  cursor: 'pointer',
                  color: '#128C7E',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Search size={18} />
              </button>

              {/* AI suggest */}
                {aiSuggestionsAvailable && (
                  <button
                    onClick={() => void getAiSuggestion()}
                    disabled={aiLoading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: isMobile ? '10px 12px' : '10px 16px', borderRadius: 16,
                      background: aiLoading ? '#eadbcf' : '#4d260f',
                      color: '#fff4ec', border: 'none', cursor: aiLoading ? 'not-allowed' : 'pointer',
                      fontSize: 12, fontWeight: 800, boxShadow: aiLoading ? 'none' : '0 12px 22px rgba(77,38,15,0.16)',
                    }}
                  >
                    {aiLoading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
                    {!isMobile && <span>Draft Reply</span>}
                  </button>
                )}
              </div>

              {/* AI suggestion */}
              {aiSuggestionsAvailable && aiSuggestion && (
                <div style={{
                  display: 'flex', gap: 12, padding: '14px 15px',
                  margin: isMobile ? '12px 14px 0' : '16px 18px 0',
                background: '#fffaf4', border: '1px solid rgba(115,75,42,0.10)', borderRadius: 22, flexShrink: 0,
                animation: 'slideDown 0.2s ease',
              }}>
                <div style={{ width: 34, height: 34, borderRadius: 12, background: '#4d260f', color: '#fff4ec', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={16} />
                </div>
                <p style={{ flex: 1, fontSize: 14, color: '#321d11', margin: 0, lineHeight: 1.65 }}>{aiSuggestion}</p>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={acceptSuggestion} style={{
                    padding: '9px 13px', borderRadius: 14,
                    background: '#4d260f', color: '#fff4ec', border: 'none',
                    fontSize: 12, fontWeight: 800, cursor: 'pointer',
                  }}>Use</button>
                  <button onClick={() => setAiSuggestion('')} style={{
                    width: 34, height: 34, borderRadius: 14,
                    background: '#f3e4d7', border: 'none', cursor: 'pointer', color: '#64320D',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><X size={14} /></button>
                </div>
              </div>
            )}

            {/* New message banner */}
            {newMessageBanner && (
              <div style={{
                padding: '12px 14px', background: '#2f7bf6', color: '#fff',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
                margin: isMobile ? '12px 14px 0' : '16px 18px 0', borderRadius: 18,
                animation: 'slideDown 0.2s ease',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Zap size={14} />
                {newMessageBanner}
              </div>
            )}

            {/* Messages area */}
            <div
              ref={scrollRef}
              onScroll={onScroll}
              style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: isMobile ? '16px 14px 12px' : '20px 24px 16px' }}
            >
              <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
                {activeConversation?.platform === 'facebook' && hasMoreThreadMessages && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 18px' }}>
                    <button
                      onClick={() => void loadOlderMessages()}
                      disabled={loadingOlderMessages}
                      style={{
                        padding: '9px 16px',
                        borderRadius: 999,
                        border: '1px solid rgba(115,75,42,0.10)',
                        background: '#fffaf5',
                        color: '#64320D',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: loadingOlderMessages ? 'not-allowed' : 'pointer',
                        opacity: loadingOlderMessages ? 0.7 : 1,
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

                  const maybeProductCard =
                    typeof msg.content.text === 'string' && msg.content.text.startsWith(PRODUCT_CARD_PREFIX)
                      ? safeJsonParse<{
                          kind: 'product_card';
                          slug: string;
                          name: string;
                          image: string;
                          price: number;
                          quantity: number;
                          variantLabel?: string | null;
                          note?: string;
                          viewUrl: string;
                          orderUrl: string;
                        }>((msg.content.text.slice(PRODUCT_CARD_PREFIX.length).split('\n')[0] || '').trim())
                      : null;

                  return (
                    <div key={msg.id} style={{ marginTop: sameSenderAsPrev ? 6 : 18, animation: 'fadeIn 0.2s ease' }}>
                      {showDivider && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 0 14px' }}>
                          <span style={{
                            padding: '6px 12px', borderRadius: 999,
                            background: 'rgba(255,255,255,0.84)', border: '1px solid rgba(115,75,42,0.08)',
                            fontSize: 11, color: '#87644a', fontWeight: 700,
                          }}>
                            {fmtDivider(msg.timestamp)}
                          </span>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, justifyContent: msg.isIncoming ? 'flex-start' : 'flex-end' }}>
                        {msg.isIncoming && (
                          <div style={{ width: 34, flexShrink: 0, alignSelf: 'flex-end' }}>
                            {showAvatar && <Avatar src={msg.sender.avatar} name={msg.sender.name} size={34} />}
                          </div>
                        )}

                        <div style={{ maxWidth: isMobile ? '88%' : '72%', opacity: isOptimistic ? 0.7 : 1 }}>
                          {msg.isIncoming && !sameSenderAsPrev && (
                            <p style={{ fontSize: 11, color: '#7a573f', fontWeight: 800, marginBottom: 6, marginLeft: 2 }}>
                              {msg.sender.name}
                            </p>
                          )}

                          <div style={{
                            padding: msg.content.media?.length ? '12px 12px 10px' : '12px 14px', fontSize: 14, lineHeight: 1.65,
                            borderRadius: msg.isIncoming
                              ? `${sameSenderAsPrev ? 12 : 24}px 24px 24px ${sameSenderAsNext ? 12 : 24}px`
                              : `24px ${sameSenderAsPrev ? 12 : 24}px ${sameSenderAsNext ? 12 : 24}px 24px`,
                            background: msg.isIncoming
                              ? 'linear-gradient(180deg, #ffffff 0%, #f6f7f7 100%)'
                              : 'linear-gradient(180deg, #DCF8C6 0%, #d2f5b2 100%)',
                            color: '#111827',
                            boxShadow: msg.isIncoming
                              ? '0 10px 26px rgba(67,44,29,0.06)'
                              : '0 10px 24px rgba(18,140,126,0.12)',
                            border: `1px solid ${msg.isIncoming ? 'rgba(115,75,42,0.09)' : 'rgba(255,255,255,0.08)'}`,
                          }}>
                            {/* Type badge */}
                            {!sameSenderAsPrev && msg.type !== 'message' && (
                              <span style={{
                                display: 'inline-block', marginBottom: 8,
                                padding: '4px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800,
                                background: msg.isIncoming ? '#f4e6d8' : 'rgba(255,255,255,0.10)',
                                color: msg.isIncoming ? '#64320D' : 'rgba(255,244,236,0.92)',
                                textTransform: 'capitalize',
                                letterSpacing: '0.04em',
                              }}>
                                {msg.type}
                              </span>
                            )}

                            {maybeProductCard ? (
                              <div style={{
                                display: 'flex',
                                gap: 12,
                                alignItems: 'center',
                                background: 'rgba(255,255,255,0.70)',
                                border: '1px solid rgba(115,75,42,0.10)',
                                borderRadius: 18,
                                padding: 12,
                              }}>
                                <div style={{
                                  width: 64,
                                  height: 64,
                                  borderRadius: 16,
                                  overflow: 'hidden',
                                  background: '#fff',
                                  border: '1px solid rgba(115,75,42,0.10)',
                                  flexShrink: 0,
                                }}>
                                  {maybeProductCard.image ? (
                                    <img
                                      src={maybeProductCard.image}
                                      alt={maybeProductCard.name}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8E6545', fontWeight: 800 }}>
                                      MB
                                    </div>
                                  )}
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ fontSize: 14, fontWeight: 900, color: '#23120a', lineHeight: 1.25, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {maybeProductCard.name}
                                  </div>
                                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, color: '#6b7280', fontWeight: 700 }}>
                                    <span>{formatBdt(maybeProductCard.price)}</span>
                                    <span>Qty: {maybeProductCard.quantity}</span>
                                  </div>
                                  {maybeProductCard.variantLabel ? (
                                    <div style={{ marginTop: 6, fontSize: 12, color: '#4b5563', fontWeight: 600 }}>
                                      Variant: {maybeProductCard.variantLabel}
                                    </div>
                                  ) : null}
                                  {maybeProductCard.note ? (
                                    <div style={{ marginTop: 6, fontSize: 12, color: '#4b5563', fontWeight: 600 }}>
                                      Note: {maybeProductCard.note}
                                    </div>
                                  ) : null}
                                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                                    <a
                                      href={toAbsoluteStorefrontUrl(maybeProductCard.viewUrl)}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{
                                        padding: '8px 10px',
                                        borderRadius: 12,
                                        background: '#fff',
                                        border: '1px solid rgba(115,75,42,0.12)',
                                        color: '#64320D',
                                        fontSize: 12,
                                        fontWeight: 900,
                                        textDecoration: 'none',
                                      }}
                                    >
                                      View Product
                                    </a>
                                    <a
                                      href={toAbsoluteStorefrontUrl(maybeProductCard.orderUrl)}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{
                                        padding: '8px 10px',
                                        borderRadius: 12,
                                        background: '#128C7E',
                                        border: '1px solid rgba(18,140,126,0.18)',
                                        color: '#ffffff',
                                        fontSize: 12,
                                        fontWeight: 900,
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                      }}
                                    >
                                      <ShoppingCart size={14} />
                                      Add to Cart / Order Now
                                    </a>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{fixEncoding(msg.content.text)}</p>
                            )}

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
                              display: 'flex', alignItems: 'center', gap: 5, marginTop: 7,
                              justifyContent: msg.isIncoming ? 'flex-start' : 'flex-end',
                              paddingLeft: msg.isIncoming ? 4 : 0,
                              paddingRight: msg.isIncoming ? 0 : 4,
                            }}>
                              <span style={{ fontSize: 11, color: '#a08167' }}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                              </span>
                              {!msg.isIncoming && (
                                <>
                                  <span style={{ fontSize: 11, color: '#a08167' }}>
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
                  position: 'absolute', bottom: isMobile ? 112 : 126, right: isMobile ? 20 : 34,
                  width: 42, height: 42, borderRadius: 16,
                  background: '#128C7E', color: '#ffffff', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 14px 28px rgba(77,38,15,0.22)',
                  animation: 'slideUp 0.2s ease',
                }}
              >
                <ChevronDown size={18} />
              </button>
            )}

            {/* Compose area */}
            <div style={{
              padding: isMobile ? '14px 14px 16px' : '18px 22px 20px', background: 'rgba(255,255,255,0.84)',
              borderTop: '1px solid rgba(115,75,42,0.10)', flexShrink: 0,
            }}>
              {replyError && (
                <div style={{
                  marginBottom: 12, padding: '11px 14px', borderRadius: 16,
                  background: '#fff3f2', color: '#b42318', fontSize: 12, border: '1px solid #fecaca',
                }}>
                  {replyError}
                </div>
              )}

              {/* Draft previews */}
              {drafts.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                  {drafts.map((d) => (
                    <div key={d.id} style={{
                      position: 'relative', width: 88, height: 88,
                      borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(115,75,42,0.10)', background: '#fffaf5',
                    }}>
                      <button
                        onClick={() => { URL.revokeObjectURL(d.previewUrl); setDrafts((p) => p.filter((x) => x.id !== d.id)); }}
                        style={{
                          position: 'absolute', top: 6, right: 6, zIndex: 1,
                          width: 22, height: 22, borderRadius: 999,
                          background: 'rgba(35,20,11,0.72)', border: 'none', cursor: 'pointer',
                          color: '#fff4ec', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <X size={12} />
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
                        <div style={{ width: '100%', height: '100%', background: '#fffaf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {(() => {
                            const PreviewIcon = getDraftPreviewIcon(d.type);
                            return <PreviewIcon size={24} color="#64320D" />;
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!canAttach && drafts.length === 0 && (
                <p style={{ fontSize: 11, color: '#a8957f', marginBottom: 8 }}>
                  Attachment replies are unavailable for this platform in the realtime inbox.
                </p>
              )}

              <div style={{
                display: 'flex', alignItems: 'flex-end', gap: 8,
                background: '#fcf8f4', borderRadius: 24,
                padding: '10px 10px 10px 12px', border: '1px solid rgba(115,75,42,0.10)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
              }}>
                <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" multiple style={{ display: 'none' }} onChange={onFileChange} />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={!canAttach || sending}
                  style={{
                    width: 42, height: 42, borderRadius: 16,
                    background: '#fff', border: '1px solid rgba(115,75,42,0.10)',
                    cursor: canAttach && !sending ? 'pointer' : 'not-allowed',
                    color: '#8E6545', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, opacity: !canAttach ? 0.45 : 1,
                  }}
                >
                  <Paperclip size={17} />
                </button>

                <textarea
                  ref={taRef}
                  value={replyText}
                  onChange={(e) => {
                    setReplyText(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
                  }}
                  rows={1}
                  placeholder="Reply with text, image, video, or audio"
                  style={{
                    flex: 1, border: 'none', background: 'transparent',
                    resize: 'none', fontSize: 14, color: '#24140b',
                    outline: 'none', padding: '9px 0', minHeight: 42, maxHeight: 140,
                    fontFamily: 'inherit', lineHeight: 1.6,
                  }}
                />

                <button
                  onClick={() => void send()}
                  disabled={(!replyText.trim() && !drafts.length) || sending}
                  style={{
                    width: 46, height: 46, borderRadius: 18,
                    background: (!replyText.trim() && !drafts.length) || sending
                      ? '#e8ddd4'
                      : '#128C7E',
                    border: 'none', cursor: 'pointer',
                    color: '#fff4ec', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 0.15s',
                    boxShadow: (!replyText.trim() && !drafts.length) ? 'none' : '0 14px 24px rgba(77,38,15,0.18)',
                  }}
                >
                  <Send size={17} />
                </button>
              </div>

              <p style={{ fontSize: 11, color: '#b09780', textAlign: 'center', marginTop: 8 }}>
                Press Enter to send. Shift + Enter adds a new line.
              </p>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
            <div style={{
              width: 84, height: 84, borderRadius: 28,
              background: 'linear-gradient(180deg, #5a2d12 0%, #3d1f0d 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 16px 30px rgba(61,31,13,0.18)',
            }}>
              <MessageSquare size={34} color="#fff4ec" />
            </div>
            <div style={{ textAlign: 'center', maxWidth: 420 }}>
              <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#9a7c63', fontWeight: 800, marginBottom: 10 }}>Realtime Customer Inbox</div>
              <h2 style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1, color: '#23120a', margin: '0 0 10px' }}>Select a conversation and start working the thread.</h2>
              <p style={{ fontSize: 15, color: '#7a573f', margin: 0, lineHeight: 1.7 }}>Open a chat from the left rail or run a Facebook sync to pull fresh conversations into the inbox.</p>
            </div>
            {filterPlatform === 'facebook' && !syncingFb && (
              <button
                onClick={() => void syncFacebook()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '12px 18px', borderRadius: 16,
                  background: '#128C7E',
                  color: '#ffffff', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 800, marginTop: 10,
                  boxShadow: '0 14px 26px rgba(77,38,15,0.18)',
                }}
              >
                <RefreshCw size={15} />
                Refresh Facebook Inbox
              </button>
            )}
          </div>
        )}
      </main>

      {/* Client Details Modal */}
      {showClientDetails && activeConversation && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 900,
          background: 'rgba(0,0,0,0.38)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}>
          <div style={{
            width: '100%',
            maxWidth: 640,
            borderRadius: 24,
            background: '#ffffff',
            boxShadow: '0 40px 80px rgba(0,0,0,0.22)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 18px',
              borderBottom: '1px solid #ede5de',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#23120a' }}>Client Details (Shipping Address)</div>
                <div style={{ fontSize: 12, color: '#8E6545', marginTop: 3 }}>
                  Phone number, real name, Address, District, Thana
                </div>
              </div>
              <button
                onClick={() => setShowClientDetails(false)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  background: '#fffaf5',
                  border: '1px solid rgba(115,75,42,0.10)',
                  cursor: 'pointer',
                  color: '#64320D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 18 }}>
              {clientProfileLoading ? (
                <div style={{ fontSize: 13, fontWeight: 700, color: '#8E6545' }}>Loading client details…</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {(() => {
                    const draft = clientProfileDraft ?? {
                      platform: activeConversation.platform,
                      participantId: activeConversation.participant.id,
                      phoneNumber: '',
                      realName: '',
                      address: '',
                      district: '',
                      thana: '',
                    };

                    const set = (patch: Partial<ClientProfile>) =>
                      setClientProfileDraft({ ...draft, ...patch });

                    return (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <Field label="Phone Number" value={draft.phoneNumber} onChange={(v) => set({ phoneNumber: v })} />
                          <Field label="Real Name" value={draft.realName} onChange={(v) => set({ realName: v })} />
                        </div>
                        <Field label="Address" value={draft.address} onChange={(v) => set({ address: v })} multiline />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <Field label="District" value={draft.district} onChange={(v) => set({ district: v })} />
                          <Field label="Thana" value={draft.thana} onChange={(v) => set({ thana: v })} />
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                          <button
                            onClick={() => setShowClientDetails(false)}
                            style={{
                              padding: '10px 14px',
                              borderRadius: 14,
                              background: '#fffaf5',
                              border: '1px solid rgba(115,75,42,0.12)',
                              cursor: 'pointer',
                              fontWeight: 900,
                              color: '#64320D',
                            }}
                          >
                            Close
                          </button>
                          <button
                            onClick={() => void saveClientProfile()}
                            disabled={clientProfileSaving}
                            style={{
                              padding: '10px 14px',
                              borderRadius: 14,
                              background: clientProfileSaving ? '#d1fae5' : '#128C7E',
                              border: '1px solid rgba(18,140,126,0.18)',
                              cursor: clientProfileSaving ? 'not-allowed' : 'pointer',
                              fontWeight: 900,
                              color: clientProfileSaving ? '#065f46' : '#ffffff',
                              opacity: clientProfileSaving ? 0.85 : 1,
                            }}
                          >
                            {clientProfileSaving ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product Search Drawer */}
      {showProductDrawer && activeConversation && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 950,
          background: 'rgba(0,0,0,0.38)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <div style={{
            width: isMobile ? '100%' : 560,
            height: '100%',
            background: '#fff',
            boxShadow: '-20px 0 60px rgba(0,0,0,0.20)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              padding: '16px 18px',
              borderBottom: '1px solid #ede5de',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#23120a' }}>Product Search</div>
                <div style={{ fontSize: 12, color: '#8E6545', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Select a product → preview → send to {activeConversation.participant.name}
                </div>
              </div>
              <button
                onClick={() => { setShowProductDrawer(false); setSelectedProductDraft(null); }}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  background: '#fffaf5',
                  border: '1px solid rgba(115,75,42,0.10)',
                  cursor: 'pointer',
                  color: '#64320D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 14, borderBottom: '1px solid #f2ebe4' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#fbf7f3',
                borderRadius: 18,
                padding: '12px 12px',
                border: '1px solid rgba(115,75,42,0.10)',
              }}>
                <Search size={16} color="#8d684e" />
                <input
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  placeholder="Search products…"
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 14,
                    color: '#23120a',
                  }}
                />
                {productSearchLoading && (
                  <RefreshCw size={16} color="#8d684e" style={{ animation: 'spin 1s linear infinite' }} />
                )}
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 14 }}>
              <div style={{ display: 'grid', gap: 10 }}>
                {(productSearchResults.length === 0 && !productSearchLoading) ? (
                  <div style={{
                    padding: 14,
                    borderRadius: 18,
                    background: '#fffaf4',
                    border: '1px solid rgba(115,75,42,0.10)',
                    color: '#8E6545',
                    fontSize: 13,
                    fontWeight: 700,
                  }}>
                    No products found. Try a different search.
                  </div>
                ) : (
                  productSearchResults.map((p) => (
                    <button
                      key={p.id}
                      disabled={!p.inStock}
                      onClick={() => {
                        const defaultVariantId = getPreferredVariantId(p);
                        setSelectedProductDraft({
                          product: p,
                          variantId: defaultVariantId,
                          quantity: 1,
                          note: '',
                        });
                      }}
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        padding: 12,
                        borderRadius: 18,
                        border: '1px solid rgba(115,75,42,0.10)',
                        background: '#ffffff',
                        cursor: p.inStock ? 'pointer' : 'not-allowed',
                        opacity: p.inStock ? 1 : 0.56,
                        textAlign: 'left',
                      }}
                    >
                      <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: 16,
                        overflow: 'hidden',
                        background: '#fffaf5',
                        border: '1px solid rgba(115,75,42,0.10)',
                        flexShrink: 0,
                      }}>
                        {p.image ? (
                          <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8E6545', fontWeight: 900 }}>
                            MB
                          </div>
                        )}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: '#23120a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </div>
                        <div style={{ marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, fontWeight: 800, color: '#6b7280' }}>
                          <span>{formatBdt(p.price)}</span>
                          <span style={{ color: p.inStock ? '#16a34a' : '#dc2626' }}>{p.inStock ? 'In stock' : 'Out of stock'}</span>
                          <span>Stock: {p.stock}</span>
                        </div>
                      </div>
                      <div style={{
                        padding: '6px 10px',
                        borderRadius: 999,
                        background: p.inStock ? 'rgba(18,140,126,0.10)' : 'rgba(220,38,38,0.08)',
                        border: p.inStock ? '1px solid rgba(18,140,126,0.18)' : '1px solid rgba(220,38,38,0.14)',
                        color: p.inStock ? '#065f46' : '#b91c1c',
                        fontSize: 12,
                        fontWeight: 900,
                        flexShrink: 0,
                      }}>
                        {p.inStock ? 'Select' : 'Sold Out'}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Selected Product Preview */}
              <div style={{ marginTop: 14 }}>
                <div style={{
                  padding: 14,
                  borderRadius: 22,
                  background: '#f8fafc',
                  border: '1px solid rgba(15,23,42,0.08)',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#475569', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                    Selected Product Preview
                  </div>

                  {!selectedProductDraft ? (
                    <div style={{
                      marginTop: 10,
                      padding: 12,
                      borderRadius: 18,
                      background: '#ffffff',
                      border: '1px dashed rgba(100,50,13,0.20)',
                      color: '#8E6545',
                      fontSize: 13,
                      fontWeight: 800,
                    }}>
                      No product selected yet. Select a product to send.
                    </div>
                  ) : (
                    <div style={{ marginTop: 10, display: 'grid', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{
                          width: 72,
                          height: 72,
                          borderRadius: 18,
                          overflow: 'hidden',
                          background: '#fff',
                          border: '1px solid rgba(15,23,42,0.10)',
                          flexShrink: 0,
                        }}>
                          {selectedProductDraft.product.image ? (
                            <img src={selectedProductDraft.product.image} alt={selectedProductDraft.product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : null}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', lineHeight: 1.25 }}>
                            {selectedProductDraft.product.name}
                          </div>
                          <div style={{ marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, fontWeight: 800, color: '#475569' }}>
                            <span>{formatBdt(buildSelectedVariant(selectedProductDraft)?.price ?? selectedProductDraft.product.price)}</span>
                            <span style={{ color: (buildSelectedVariant(selectedProductDraft)?.stock ?? selectedProductDraft.product.stock) > 0 ? '#16a34a' : '#dc2626' }}>
                              {(buildSelectedVariant(selectedProductDraft)?.stock ?? selectedProductDraft.product.stock) > 0 ? 'In stock' : 'Out of stock'}
                            </span>
                            <span>Stock: {buildSelectedVariant(selectedProductDraft)?.stock ?? selectedProductDraft.product.stock}</span>
                          </div>
                        </div>
                      </div>

                      {Array.isArray(selectedProductDraft.product.variants) && selectedProductDraft.product.variants.length > 0 && (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 900, color: '#475569', marginBottom: 6 }}>Variant</div>
                          <select
                            value={selectedProductDraft.variantId ?? ''}
                            onChange={(e) => setSelectedProductDraft((prev) => prev ? ({ ...prev, variantId: e.target.value || null }) : prev)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: 14,
                              border: '1px solid rgba(15,23,42,0.10)',
                              background: '#ffffff',
                              fontSize: 13,
                              fontWeight: 800,
                              color: '#0f172a',
                              outline: 'none',
                            }}
                          >
                            <option value="" disabled>
                              Select variant
                            </option>
                            {selectedProductDraft.product.variants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {getVariantLabel(v)} • {formatBdt(v.price)} • Stock {v.stock}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 900, color: '#475569' }}>Quantity</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <button
                            onClick={() => setSelectedProductDraft((prev) => prev ? ({ ...prev, quantity: Math.max(1, (prev.quantity || 1) - 1) }) : prev)}
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 14,
                              background: '#ffffff',
                              border: '1px solid rgba(15,23,42,0.10)',
                              cursor: 'pointer',
                              fontWeight: 900,
                              color: '#0f172a',
                            }}
                          >
                            -
                          </button>
                          <div style={{ minWidth: 42, textAlign: 'center', fontSize: 14, fontWeight: 900, color: '#0f172a' }}>
                            {selectedProductDraft.quantity}
                          </div>
                          <button
                            onClick={() => setSelectedProductDraft((prev) => prev ? ({ ...prev, quantity: Math.min(99, (prev.quantity || 1) + 1) }) : prev)}
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 14,
                              background: '#ffffff',
                              border: '1px solid rgba(15,23,42,0.10)',
                              cursor: 'pointer',
                              fontWeight: 900,
                              color: '#0f172a',
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: 12, fontWeight: 900, color: '#475569', marginBottom: 6 }}>Optional note/message</div>
                        <textarea
                          value={selectedProductDraft.note}
                          onChange={(e) => setSelectedProductDraft((prev) => prev ? ({ ...prev, note: e.target.value }) : prev)}
                          placeholder="Write a short note to the client (optional)"
                          rows={3}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: 14,
                            border: '1px solid rgba(15,23,42,0.10)',
                            background: '#ffffff',
                            fontSize: 13,
                            fontWeight: 700,
                            color: '#0f172a',
                            outline: 'none',
                            resize: 'none',
                          }}
                        />
                      </div>

                      <button
                        onClick={() => setConfirmSendProduct(true)}
                        disabled={!selectedProductDraft || sendingProduct}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: 16,
                          background: (!selectedProductDraft || sendingProduct) ? '#e2e8f0' : '#128C7E',
                          border: '1px solid rgba(18,140,126,0.18)',
                          cursor: (!selectedProductDraft || sendingProduct) ? 'not-allowed' : 'pointer',
                          fontWeight: 900,
                          color: (!selectedProductDraft || sendingProduct) ? '#64748b' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                        }}
                      >
                        {sendingProduct ? 'Sending…' : 'Send Product to Client'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmSendProduct && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 980,
          background: 'rgba(0,0,0,0.42)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}>
          <div style={{
            width: '100%',
            maxWidth: 520,
            borderRadius: 24,
            background: '#ffffff',
            boxShadow: '0 40px 80px rgba(0,0,0,0.22)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 18px',
              borderBottom: '1px solid #ede5de',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#23120a' }}>Confirm Send</div>
                <div style={{ fontSize: 12, color: '#8E6545', marginTop: 3 }}>
                  Are you sure you want to send this product to this client?
                </div>
              </div>
              <button
                onClick={() => setConfirmSendProduct(false)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  background: '#fffaf5',
                  border: '1px solid rgba(115,75,42,0.10)',
                  cursor: 'pointer',
                  color: '#64320D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: 18, display: 'grid', gap: 12 }}>
              <div style={{
                padding: 12,
                borderRadius: 18,
                background: '#fffaf4',
                border: '1px solid rgba(115,75,42,0.10)',
                fontSize: 13,
                fontWeight: 800,
                color: '#64320D',
              }}>
                This will send a product card into the current conversation and save it in history.
                {selectedProductDraft ? (
                  <span style={{ display: 'block', marginTop: 8, color: '#8E6545' }}>
                    {selectedProductDraft.product.name}
                    {buildSelectedVariant(selectedProductDraft) ? ` • ${getVariantLabel(buildSelectedVariant(selectedProductDraft)!)}` : ''}
                    {` • Qty ${Math.max(1, Math.min(99, selectedProductDraft.quantity || 1))}`}
                  </span>
                ) : null}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setConfirmSendProduct(false)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 14,
                    background: '#fffaf5',
                    border: '1px solid rgba(115,75,42,0.12)',
                    cursor: 'pointer',
                    fontWeight: 900,
                    color: '#64320D',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => void sendProductCard()}
                  disabled={sendingProduct || !selectedProductDraft}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 14,
                    background: (sendingProduct || !selectedProductDraft) ? '#e2e8f0' : '#128C7E',
                    border: '1px solid rgba(18,140,126,0.18)',
                    cursor: (sendingProduct || !selectedProductDraft) ? 'not-allowed' : 'pointer',
                    fontWeight: 900,
                    color: (sendingProduct || !selectedProductDraft) ? '#64748b' : '#ffffff',
                  }}
                >
                  {sendingProduct ? 'Sending…' : 'Confirm & Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
        style={{ display: 'block', borderRadius: 18, overflow: 'hidden', border: `1px solid ${isIncoming ? 'rgba(115,75,42,0.10)' : 'rgba(255,255,255,0.12)'}`, boxShadow: isIncoming ? '0 8px 20px rgba(67,44,29,0.05)' : 'none' }}>
        <img src={media.thumbnail || media.url} alt={media.fileName || 'Image'}
          style={{ maxHeight: 260, width: '100%', objectFit: 'cover', display: 'block' }} />
      </a>
    );
  }
  if (media.type === 'video') {
    return (
      <div key={key} style={{ borderRadius: 18, overflow: 'hidden', background: '#000', border: `1px solid ${isIncoming ? 'rgba(115,75,42,0.10)' : 'rgba(255,255,255,0.12)'}` }}>
        <video controls preload="metadata" poster={media.thumbnail} style={{ maxHeight: 260, width: '100%' }} src={media.url} />
        {media.fileName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', fontSize: 11, color: isIncoming ? '#8E6545' : 'rgba(255,255,255,0.7)' }}>
            <VideoIcon size={12} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{media.fileName}</span>
          </div>
        )}
      </div>
    );
  }
  if (media.type === 'audio') {
    return (
      <div key={key} style={{ borderRadius: 18, padding: '12px 12px', border: `1px solid ${isIncoming ? 'rgba(115,75,42,0.10)' : 'rgba(255,255,255,0.12)'}`, background: isIncoming ? 'rgba(255,255,255,0.52)' : 'rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: isIncoming ? '#8E6545' : 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
          <FileAudio size={12} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{media.fileName || 'Audio'}</span>
        </div>
        <audio controls preload="metadata" style={{ width: '100%', height: 36 }} src={media.url} />
      </div>
    );
  }
  return (
    <a key={key} href={media.url} target="_blank" rel="noreferrer" style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '12px 12px', borderRadius: 18,
      border: `1px solid ${isIncoming ? 'rgba(115,75,42,0.10)' : 'rgba(255,255,255,0.12)'}`,
      color: isIncoming ? '#8E6545' : 'rgba(255,255,255,0.8)',
      fontSize: 12, textDecoration: 'none',
    }}>
      <FileText size={14} style={{ flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{media.fileName || media.mimeType || 'File'}</span>
    </a>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 900, color: '#475569' }}>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 14,
            border: '1px solid rgba(15,23,42,0.10)',
            background: '#ffffff',
            fontSize: 13,
            fontWeight: 700,
            color: '#0f172a',
            outline: 'none',
            resize: 'none',
          }}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 14,
            border: '1px solid rgba(15,23,42,0.10)',
            background: '#ffffff',
            fontSize: 13,
            fontWeight: 800,
            color: '#0f172a',
            outline: 'none',
          }}
        />
      )}
    </label>
  );
}
