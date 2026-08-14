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
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/ToastProvider';
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

interface ApiAdminFailure {
  code: string;
  classification?: string;
  summary?: string;
  retryable?: boolean;
  reconciliationRequired?: boolean;
  retryAt?: string;
}

interface ApiInboxProcessing {
  status: 'READY' | 'PROCESSING' | 'BLOCKED' | string;
  reasonCode: string;
  failure?: ApiAdminFailure | null;
}

interface ApiReplyEligibility {
  allowed: boolean;
  policy: string;
  reasonCode: string;
  evaluatedAt: string;
  expiresAt: string | null;
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
  processing?: ApiInboxProcessing;
  failure?: ApiAdminFailure | null;
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
  replyEligibility: ApiReplyEligibility | null;
  processing: ApiInboxProcessing | null;
  failure: ApiAdminFailure | null;
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
  replyEligibility: ApiReplyEligibility | null;
  processing: ApiInboxProcessing | null;
  failure: ApiAdminFailure | null;
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
const MOBILE_MEDIA_QUERY = '(max-width: 39.9375rem)';
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
    replyEligibility: record.replyEligibility ?? null,
    processing: record.processing ?? null,
    failure: record.failure ?? record.processing?.failure ?? null,
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
    replyEligibility: null,
    processing: null,
    failure: null,
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
    replyEligibility: message.platform === 'facebook' && message.isIncoming
      ? {
          allowed: true,
          policy: 'FACEBOOK_MESSENGER_24H',
          reasonCode: 'REPLY_WINDOW_OPEN',
          evaluatedAt: new Date().toISOString(),
          expiresAt: new Date(new Date(message.timestamp).getTime() + 24 * 60 * 60 * 1_000).toISOString(),
        }
      : existing?.replyEligibility ?? null,
    processing: existing?.processing ?? null,
    failure: existing?.failure ?? null,
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

function formatConvTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function dayLabel(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function timeOnly(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function preview(message: SocialMessage) {
  if (message.content.text) return fixEncoding(message.content.text);
  const media = message.content.media?.[0];
  if (!media) return '';
  if (media.type === 'image') return '📷 Photo';
  if (media.type === 'video') return '🎥 Video';
  if (media.type === 'audio') return '🎤 Voice message';
  return `📎 ${media.fileName ?? 'Attachment'}`;
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

function deliveryStatusLabel(status: SocialMessage['status']) {
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

const PLATFORM_CFG: Record<string, { label: string; name: string; tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral' }> = {
  facebook: { label: 'f', name: 'Facebook', tone: 'info' },
  instagram: { label: 'IG', name: 'Instagram', tone: 'warning' },
  whatsapp: { label: 'WA', name: 'WhatsApp', tone: 'success' },
  youtube: { label: 'YT', name: 'YouTube', tone: 'danger' },
};

function PlatBadge({ platform }: { platform: string; size?: number }) {
  const config = PLATFORM_CFG[platform] ?? PLATFORM_CFG.facebook;
  return (
    <Badge
      tone={config.tone}
      size="sm"
      className="min-w-7 justify-center px-1.5"
      aria-label={config.name}
      title={config.name}
    >
      {config.label}
    </Badge>
  );
}

// ──────────────────────────────────────────────────── Avatar ──

function Avatar({ src, name, online }: { src?: string; name: string; size?: number; online?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-visible rounded-full bg-minsah-surface-accent text-sm font-black text-minsah-text-link">
      {src && !imageFailed ? (
        <img
          src={src}
          alt={`${name} profile photo`}
          onError={() => setImageFailed(true)}
          className="h-11 w-11 rounded-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
      {online !== undefined ? (
        <span
          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-minsah-surface-panel ${
            online ? 'bg-minsah-status-success-text' : 'bg-minsah-text-subtle'
          }`}
          aria-label={online ? 'Online' : 'Offline'}
        />
      ) : null}
    </span>
  );
}

// ─────────────────────────────────────── ConnectionDot ──

function ConnectionDot({ status }: { status: ConnectionStatus }) {
  const config = {
    connecting: { tone: 'warning' as const, label: 'Connecting…', icon: RefreshCw },
    live: { tone: 'success' as const, label: 'Live', icon: Wifi },
    polling: { tone: 'info' as const, label: 'Polling', icon: RefreshCw },
    offline: { tone: 'danger' as const, label: 'Offline', icon: WifiOff },
  }[status];
  const Icon = config.icon;

  return (
    <Badge tone={config.tone} leadingVisual={<Icon className="h-3.5 w-3.5" />}>
      {config.label}
    </Badge>
  );
}

// ────────────────────────────────────────── main component ──

export interface SocialMediaInboxChatProps {
  className?: string;
  initialPlatform?: 'all' | SocialMessage['platform'];
  title?: string;
  description?: string;
}

export default function SocialMediaInboxChat({
  className = '',
  initialPlatform = 'facebook',
  title = 'Social inbox',
  description,
}: SocialMediaInboxChatProps = {}) {
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [conversationItems, setConversationItems] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>(initialPlatform);
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

  const { pushToast } = useToast();
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

      const response = await fetch(`/api/admin/inbox/messages?${params}`, {
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

        const response = await fetch(`/api/admin/inbox/messages?${params}`, {
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
        `/api/admin/inbox/messages${params.toString() ? `?${params}` : ''}`,
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
    if (event.type === 'pong' || event.type === 'connected' || event.type === 'subscribed' || event.type === 'connection_health_changed') return;

    if (event.type === 'refresh_required') {
      if (filterPlatform !== 'all' && filterPlatform !== event.platform) return;
      void fetchMessages(false);
      return;
    }

    if (filterPlatform !== 'all' && filterPlatform !== 'facebook') return;

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
  const replyAllowed = activeConversation?.platform === 'facebook'
    && activeConversation.replyEligibility?.allowed === true;
  const replyBlockReason = activeConversation?.replyEligibility?.reasonCode
    ?? 'REPLY_ELIGIBILITY_UNAVAILABLE';

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
      pushToast({ tone: 'danger', description: e instanceof Error ? e.message : 'Failed to load client details' });
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
        headers: { 'Content-Type': 'application/json', 'X-Admin-Request': '1' },
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
      pushToast({ tone: 'success', description: 'Client shipping details saved' });
      setShowClientDetails(false);
    } catch (e) {
      pushToast({ tone: 'danger', description: e instanceof Error ? e.message : 'Failed to save client details' });
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
      pushToast({ tone: 'danger', description: e instanceof Error ? e.message : 'Product search failed' });
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
      pushToast({ tone: 'danger', description: 'Product sending currently supports Facebook only.' });
      return;
    }
    if (activeConversation.replyEligibility?.allowed !== true) {
      pushToast({ tone: 'danger', description: `Reply blocked: ${activeConversation.replyEligibility?.reasonCode ?? 'REPLY_ELIGIBILITY_UNAVAILABLE'}` });
      return;
    }

    const variant = buildSelectedVariant(selectedProductDraft);
    const unitPrice = variant?.price ?? selectedProductDraft.product.price;
    const qty = Math.max(1, Math.min(99, selectedProductDraft.quantity || 1));
    const stock = variant?.stock ?? selectedProductDraft.product.stock;
    if (stock <= 0) {
      pushToast({ tone: 'danger', description: 'This product is out of stock.' });
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
        headers: { 'Content-Type': 'application/json', 'X-Admin-Request': '1' },
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

      pushToast({ tone: 'success', description: 'Product sent to client' });
      setShowProductDrawer(false);
      setSelectedProductDraft(null);
    } catch (e) {
      pushToast({ tone: 'danger', description: e instanceof Error ? e.message : 'Failed to send product' });
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
        const response = await fetch('/api/admin/inbox/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Request': '1' },
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
    if (activeConversation.replyEligibility?.allowed !== true) {
      setReplyError(`Reply blocked: ${activeConversation.replyEligibility?.reasonCode ?? 'REPLY_ELIGIBILITY_UNAVAILABLE'}`);
      return;
    }

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
              headers: { 'X-Admin-Request': '1' },
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
        headers: { 'Content-Type': 'application/json', 'X-Admin-Request': '1' },
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
        headers: { 'Content-Type': 'application/json', 'X-Admin-Request': '1' },
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
        headers: { 'Content-Type': 'application/json', 'X-Admin-Request': '1' },
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

  const platformTabs = [
    { id: 'facebook', label: 'Facebook' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'all', label: 'All' },
  ];

  const activePlatformName = activeConversation
    ? (PLATFORM_CFG[activeConversation.platform]?.name ?? activeConversation.platform)
    : null;

  if (initialLoading) {
    return (
      <LoadingState
        className="h-full rounded-none border-0"
        label="Loading inbox…"
        description="Fetching conversations and recent messages."
      />
    );
  }

  return (
    <section className={`flex h-full min-h-0 w-full overflow-hidden bg-minsah-surface-page text-minsah-text-primary ${className}`} aria-label="Social media inbox">
      <aside
        className={`${showChat && isMobile ? 'hidden' : 'flex'} min-h-0 w-full flex-col border-r border-minsah-border-subtle bg-minsah-surface-panel sm:flex sm:w-80 lg:w-96`}
        aria-label="Conversation list"
      >
        <header className="shrink-0 border-b border-minsah-border-subtle px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-minsah-text-link" aria-hidden="true" />
                <h1 className="truncate text-lg font-black">{title}</h1>
                {unreadCount > 0 ? <Badge tone="danger">{unreadCount} unread</Badge> : null}
              </div>
              {description ? <p className="mt-1 text-sm text-minsah-text-muted">{description}</p> : null}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ConnectionDot status={connectionStatus} />
                {deadLetterCount > 0 ? <Badge tone="warning">{deadLetterCount} delivery issues</Badge> : null}
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                size="icon"
                variant="ghost"
                aria-label={notificationsEnabled ? 'Disable browser notifications' : 'Enable browser notifications'}
                onClick={() => notificationsEnabled ? setNotificationsEnabled(false) : void requestNotifications()}
              >
                {notificationsEnabled ? <Bell className="h-5 w-5" aria-hidden="true" /> : <BellOff className="h-5 w-5" aria-hidden="true" />}
              </Button>
              <Button
                size="icon"
                variant="secondary"
                aria-label="Sync Facebook inbox"
                onClick={() => void syncFacebook()}
                disabled={syncingFb}
                aria-busy={syncingFb || undefined}
              >
                <RefreshCw className={`h-5 w-5 ${syncingFb ? 'animate-spin' : ''}`} aria-hidden="true" />
              </Button>
            </div>
          </div>

          {syncLabel ? (
            <div className="mt-3">
              <Alert
                tone={syncProgress.stage === 'error' ? 'danger' : syncProgress.stage === 'completed' ? 'success' : 'info'}
                announcement="polite"
                className="py-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <span>{syncLabel}</span>
                  {syncingFb ? <span className="font-bold">{syncPercent}%</span> : null}
                </div>
                {syncingFb ? (
                  <progress
                    className="mt-2 h-2 w-full overflow-hidden rounded-full accent-minsah-action-primary"
                    max={100}
                    value={syncPercent}
                    aria-label="Facebook sync progress"
                  />
                ) : null}
              </Alert>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-4 gap-2" role="tablist" aria-label="Filter conversations by platform">
            {platformTabs.map((tab) => (
              <Button
                key={tab.id}
                variant={filterPlatform === tab.id ? 'primary' : 'secondary'}
                size="sm"
                className="px-2"
                role="tab"
                aria-selected={filterPlatform === tab.id}
                onClick={() => setFilterPlatform(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          <Input
            label="Search conversations"
            hideLabel
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search conversations"
            leading={<Search className="h-4 w-4" />}
            containerClassName="mt-3"
          />
        </header>

        <div
          ref={conversationListRef}
          onScroll={onConversationListScroll}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {visibleConversations.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <MessageSquare className="mx-auto h-9 w-9 text-minsah-text-subtle" aria-hidden="true" />
              <p className="mt-3 font-bold">No conversations found</p>
              <p className="mt-1 text-sm text-minsah-text-muted">Try another platform or search term.</p>
            </div>
          ) : (
            <div>
                {visibleConversations.map((conversation) => {
                  const isActive = conversation.conversationId === selected;
                  return (
                    <Button
                      key={conversation.conversationId}
                      variant="ghost"
                      fullWidth
                      className={`h-[77px] justify-start rounded-none border-b border-minsah-border-subtle px-4 py-3 text-left ${
                        isActive ? 'bg-minsah-surface-accent text-minsah-text-primary' : ''
                      }`}
                      onClick={() => {
                        setSelected(conversation.conversationId);
                        if (isMobile) setShowChat(true);
                      }}
                      aria-current={isActive ? 'true' : undefined}
                    >
                      <span className="relative shrink-0">
                        <Avatar src={conversation.participant.avatar} name={conversation.participant.name} />
                        <span className="absolute -bottom-1 -right-2"><PlatBadge platform={conversation.platform} /></span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate font-black">{fixEncoding(conversation.participant.name)}</span>
                          <span className="shrink-0 text-xs font-medium text-minsah-text-subtle">{formatConvTime(conversation.latestMessage.timestamp)}</span>
                        </span>
                        <span className="mt-1 flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-minsah-text-muted">
                            {preview(conversation.latestMessage)}
                          </span>
                          {conversation.unreadCount > 0 ? <Badge tone="danger">{conversation.unreadCount}</Badge> : null}
                        </span>
                      </span>
                    </Button>
                  );
                })}
            </div>
          )}

          {hasMoreConversations ? (
            <div className="p-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => void loadMoreConversations()}
                disabled={loadingMoreConversations}
                aria-busy={loadingMoreConversations || undefined}
              >
                {loadingMoreConversations ? 'Loading…' : 'Load more conversations'}
              </Button>
            </div>
          ) : null}
        </div>
      </aside>

      <main className={`${!showChat && isMobile ? 'hidden' : 'flex'} min-w-0 flex-1 flex-col bg-minsah-surface-subtle sm:flex`}>
        {!activeConversation ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div>
              <MessageSquare className="mx-auto h-12 w-12 text-minsah-text-subtle" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-black">Select a conversation</h2>
              <p className="mt-2 text-sm text-minsah-text-muted">Choose a customer thread to read and reply.</p>
            </div>
          </div>
        ) : (
          <>
            <header className="flex shrink-0 items-center gap-3 border-b border-minsah-border-subtle bg-minsah-surface-panel px-3 py-3 sm:px-5">
              {isMobile ? (
                <Button size="icon" variant="ghost" aria-label="Back to conversations" onClick={() => setShowChat(false)}>
                  <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </Button>
              ) : null}
              <Avatar src={activeConversation.participant.avatar} name={activeConversation.participant.name} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-black">{fixEncoding(activeConversation.participant.name)}</h2>
                  <PlatBadge platform={activeConversation.platform} />
                </div>
                <p className="mt-0.5 text-xs font-semibold text-minsah-text-muted">{activePlatformName}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge tone={replyAllowed ? 'success' : 'warning'}>
                    {activeConversation.replyEligibility?.reasonCode ?? 'REPLY_ELIGIBILITY_UNAVAILABLE'}
                  </Badge>
                  {activeConversation.processing ? (
                    <Badge tone={activeConversation.processing.status === 'READY' ? 'success' : activeConversation.processing.status === 'BLOCKED' ? 'danger' : 'warning'}>
                      {activeConversation.processing.reasonCode}
                    </Badge>
                  ) : null}
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setShowClientDetails(true)}>
                Client details
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowProductDrawer(true)}
                disabled={activeConversation.platform !== 'facebook' || !replyAllowed}
              >
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                <span className="hidden lg:inline">Send product</span>
              </Button>
            </header>

            {newMessageBanner ? (
              <Alert tone="info" announcement="polite" className="m-3 py-2 sm:mx-5">
                <div className="flex items-center justify-between gap-3">
                  <span>{newMessageBanner}</span>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setNewMessageBanner(null);
                    endRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}>
                    View
                  </Button>
                </div>
              </Alert>
            ) : null}

            <div
              ref={scrollRef}
              onScroll={onScroll}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6"
              aria-live="polite"
            >
              {hasMoreThreadMessages ? (
                <div className="mb-4 text-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void loadOlderMessages()}
                    disabled={loadingOlderMessages}
                    aria-busy={loadingOlderMessages || undefined}
                  >
                    {loadingOlderMessages ? 'Loading…' : 'Load older messages'}
                  </Button>
                </div>
              ) : null}

              <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
                {threadMessages.map((message, index) => {
                  const previous = index > 0 ? threadMessages[index - 1] : null;
                  const showDay = !previous || !sameDay(previous.timestamp, message.timestamp);
                  return (
                    <div key={message.id}>
                      {showDay ? (
                        <div className="my-4 flex items-center gap-3" aria-label={dayLabel(message.timestamp)}>
                          <span className="h-px flex-1 bg-minsah-border-subtle" />
                          <Badge tone="neutral">{dayLabel(message.timestamp)}</Badge>
                          <span className="h-px flex-1 bg-minsah-border-subtle" />
                        </div>
                      ) : null}
                      <article className={`flex items-end gap-2 ${message.isIncoming ? 'justify-start' : 'justify-end'}`}>
                        {message.isIncoming ? <Avatar src={message.sender.avatar} name={message.sender.name} /> : null}
                        <div className={`max-w-[85%] sm:max-w-[72%] ${message.isIncoming ? '' : 'text-right'}`}>
                          <div className={`rounded-2xl border px-4 py-3 text-left shadow-[var(--shadow-small)] ${
                            message.isIncoming
                              ? 'border-minsah-border-subtle bg-minsah-surface-panel text-minsah-text-primary'
                              : 'border-minsah-action-primary bg-minsah-action-primary text-minsah-text-inverse'
                          }`}>
                            {renderProductCard(message.content.text, message.isIncoming) ?? (
                              message.content.text ? <p className="whitespace-pre-wrap break-words text-sm leading-6">{fixEncoding(message.content.text)}</p> : null
                            )}
                            {message.content.media?.length ? (
                              <div className="mt-2 grid gap-2">
                                {message.content.media.map((media, mediaIndex) => renderMedia(media, `${message.id}-${mediaIndex}`, message.isIncoming))}
                              </div>
                            ) : null}
                          </div>
                          <div className={`mt-1 flex items-center gap-2 text-xs text-minsah-text-subtle ${message.isIncoming ? '' : 'justify-end'}`}>
                            <span>{timeOnly(message.timestamp)}</span>
                            {!message.isIncoming ? (
                              <span className="inline-flex items-center gap-1">
                                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                {deliveryStatusLabel(message.status)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
            </div>

            {showScrollDown ? (
              <div className="pointer-events-none absolute bottom-32 right-6">
                <Button
                  size="icon"
                  variant="secondary"
                  className="pointer-events-auto shadow-[var(--shadow-panel)]"
                  aria-label="Scroll to latest message"
                  onClick={() => endRef.current?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <ChevronDown className="h-5 w-5" aria-hidden="true" />
                </Button>
              </div>
            ) : null}

            <footer className="shrink-0 border-t border-minsah-border-subtle bg-minsah-surface-panel p-3 sm:p-4">
              <div className="mx-auto max-w-4xl">
                {!replyAllowed ? (
                  <Alert tone="warning" className="mb-3" title="Reply unavailable" icon={<AlertTriangle className="h-5 w-5" />}>
                    {replyBlockReason}
                    {activeConversation.replyEligibility?.expiresAt ? ` · Window ended ${new Date(activeConversation.replyEligibility.expiresAt).toLocaleString()}` : ''}
                  </Alert>
                ) : null}
                {activeConversation.failure ? (
                  <Alert tone="danger" className="mb-3" title={activeConversation.failure.code} icon={<AlertTriangle className="h-5 w-5" />}>
                    {activeConversation.failure.summary ?? activeConversation.processing?.reasonCode ?? 'Message processing failed.'}
                  </Alert>
                ) : null}
                {replyError ? (
                  <Alert tone="danger" announcement="assertive" className="mb-3" icon={<AlertTriangle className="h-5 w-5" />}>
                    {replyError}
                  </Alert>
                ) : null}

                {aiSuggestion ? (
                  <Alert tone="info" className="mb-3" title="Suggested reply" icon={<Sparkles className="h-5 w-5" />}>
                    <p className="whitespace-pre-wrap">{aiSuggestion}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" onClick={acceptSuggestion}>Use suggestion</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAiSuggestion('')}>Dismiss</Button>
                    </div>
                  </Alert>
                ) : null}

                {drafts.length ? (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {drafts.map((draft) => (
                      <div key={draft.id} className="flex max-w-full items-center gap-2 rounded-xl border border-minsah-border-default bg-minsah-surface-subtle px-3 py-2 text-sm">
                        <Paperclip className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="max-w-48 truncate">{draft.file.name}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 min-h-8 w-8 min-w-8"
                          aria-label={`Remove ${draft.file.name}`}
                          onClick={() => setDrafts((current) => {
                            const removed = current.find((item) => item.id === draft.id);
                            if (removed) URL.revokeObjectURL(removed.previewUrl);
                            return current.filter((item) => item.id !== draft.id);
                          })}
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="flex items-end gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,video/*,audio/*"
                    multiple
                    onChange={onFileChange}
                    className="sr-only"
                    aria-label="Attach media"
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    aria-label="Attach media"
                    onClick={() => fileRef.current?.click()}
                    disabled={!canAttach || sending || !replyAllowed}
                  >
                    <Paperclip className="h-5 w-5" aria-hidden="true" />
                  </Button>
                  <Textarea
                    ref={taRef}
                    label="Reply"
                    hideLabel
                    rows={2}
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void send();
                      }
                    }}
                    placeholder={`Reply to ${fixEncoding(activeConversation.participant.name)}…`}
                    containerClassName="min-w-0 flex-1"
                    textareaClassName="min-h-11 max-h-40"
                    disabled={sending || !replyAllowed}
                  />
                  {aiSuggestionsAvailable ? (
                    <Button
                      size="icon"
                      variant="secondary"
                      aria-label="Generate reply suggestion"
                      onClick={() => void getAiSuggestion()}
                      disabled={aiLoading || sending || !replyAllowed}
                    >
                      <Sparkles className={`h-5 w-5 ${aiLoading ? 'animate-pulse' : ''}`} aria-hidden="true" />
                    </Button>
                  ) : null}
                  <Button
                    size="icon"
                    aria-label="Send reply"
                    onClick={() => void send()}
                    disabled={sending || !replyAllowed || (!replyText.trim() && drafts.length === 0)}
                    aria-busy={sending || undefined}
                  >
                    <Send className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </div>
                <p className="mt-2 text-xs text-minsah-text-subtle">Enter sends. Shift+Enter adds a new line.</p>
              </div>
            </footer>
          </>
        )}
      </main>

      <Drawer
        open={showClientDetails}
        onClose={() => setShowClientDetails(false)}
        title="Client details"
        description={activeConversation ? `Shipping details for ${fixEncoding(activeConversation.participant.name)}` : undefined}
        side="right"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowClientDetails(false)} disabled={clientProfileSaving}>Cancel</Button>
            <Button onClick={() => void saveClientProfile()} disabled={!clientProfileDraft || clientProfileSaving} aria-busy={clientProfileSaving || undefined}>
              {clientProfileSaving ? 'Saving…' : 'Save details'}
            </Button>
          </>
        }
      >
        {clientProfileLoading ? (
          <LoadingState compact label="Loading client details…" />
        ) : clientProfileDraft ? (
          <div className="grid gap-4">
            <Input label="Phone number" value={clientProfileDraft.phoneNumber} onChange={(event) => setClientProfileDraft({ ...clientProfileDraft, phoneNumber: event.target.value })} />
            <Input label="Customer name" value={clientProfileDraft.realName} onChange={(event) => setClientProfileDraft({ ...clientProfileDraft, realName: event.target.value })} />
            <Textarea label="Address" value={clientProfileDraft.address} onChange={(event) => setClientProfileDraft({ ...clientProfileDraft, address: event.target.value })} rows={3} />
            <Input label="District" value={clientProfileDraft.district} onChange={(event) => setClientProfileDraft({ ...clientProfileDraft, district: event.target.value })} />
            <Input label="Thana" value={clientProfileDraft.thana} onChange={(event) => setClientProfileDraft({ ...clientProfileDraft, thana: event.target.value })} />
          </div>
        ) : (
          <Alert tone="warning">Client profile is unavailable for this conversation.</Alert>
        )}
      </Drawer>

      <Drawer
        open={showProductDrawer}
        onClose={() => {
          setShowProductDrawer(false);
          setSelectedProductDraft(null);
        }}
        title="Send a product"
        description="Search the active catalogue and send a product card to this customer."
        side="right"
        size="lg"
        footer={
          selectedProductDraft ? (
            <Button fullWidth onClick={() => setConfirmSendProduct(true)} disabled={sendingProduct || !replyAllowed}>
              Review and send
            </Button>
          ) : undefined
        }
      >
        <Input
          label="Search products"
          value={productSearchTerm}
          onChange={(event) => setProductSearchTerm(event.target.value)}
          placeholder="Product name or keyword"
          leading={<Search className="h-4 w-4" />}
        />

        {productSearchLoading ? (
          <LoadingState compact className="mt-4" label="Searching products…" />
        ) : selectedProductDraft ? (
          <div className="mt-5 grid gap-4">
            <Button variant="ghost" size="sm" className="justify-start" onClick={() => setSelectedProductDraft(null)}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to results
            </Button>
            <div className="flex gap-4 rounded-2xl border border-minsah-border-subtle bg-minsah-surface-subtle p-4">
              {selectedProductDraft.product.image ? (
                <img src={selectedProductDraft.product.image} alt={selectedProductDraft.product.name} className="h-24 w-24 rounded-xl object-cover" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-minsah-surface-accent text-minsah-text-subtle">No image</div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-black">{selectedProductDraft.product.name}</h3>
                <p className="mt-1 font-bold text-minsah-text-link">{formatBdt(selectedProductDraft.product.price)}</p>
                <Badge tone={selectedProductDraft.product.inStock ? 'success' : 'danger'} className="mt-2">
                  {selectedProductDraft.product.inStock ? `${selectedProductDraft.product.stock} in stock` : 'Out of stock'}
                </Badge>
              </div>
            </div>

            {selectedProductDraft.product.variants?.length ? (
              <Select
                label="Variant"
                value={selectedProductDraft.variantId ?? ''}
                onChange={(event) => setSelectedProductDraft((current) => current ? { ...current, variantId: event.target.value || null } : current)}
              >
                {selectedProductDraft.product.variants.map((variant) => (
                  <option key={variant.id} value={variant.id} disabled={variant.stock <= 0}>
                    {getVariantLabel(variant)} — {formatBdt(variant.price)} — {variant.stock} available
                  </option>
                ))}
              </Select>
            ) : null}

            <Input
              label="Quantity"
              type="number"
              min={1}
              max={99}
              value={selectedProductDraft.quantity}
              onChange={(event) => setSelectedProductDraft((current) => current ? { ...current, quantity: Math.max(1, Math.min(99, Number(event.target.value) || 1)) } : current)}
            />
            <Textarea
              label="Optional note"
              value={selectedProductDraft.note}
              onChange={(event) => setSelectedProductDraft((current) => current ? { ...current, note: event.target.value } : current)}
              placeholder="Add a short note for the customer"
              rows={3}
            />
          </div>
        ) : productSearchResults.length ? (
          <div className="mt-5 grid gap-3">
            {productSearchResults.map((product) => (
              <Button
                key={product.id}
                variant="secondary"
                fullWidth
                className="h-auto justify-start p-3 text-left"
                onClick={() => setSelectedProductDraft({ product, variantId: getPreferredVariantId(product), quantity: 1, note: '' })}
              >
                {product.image ? <img src={product.image} alt={product.name} className="h-16 w-16 rounded-xl object-cover" /> : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-black">{product.name}</span>
                  <span className="mt-1 block text-sm text-minsah-text-muted">{formatBdt(product.price)} · {product.stock} in stock</span>
                </span>
              </Button>
            ))}
          </div>
        ) : (
          <div className="mt-8 text-center text-sm text-minsah-text-muted">No products matched your search.</div>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmSendProduct}
        onClose={() => setConfirmSendProduct(false)}
        onConfirm={() => void sendProductCard()}
        title="Send this product?"
        description={selectedProductDraft ? `${selectedProductDraft.product.name} will be sent to ${fixEncoding(activeConversation?.participant.name ?? 'the customer')}.` : undefined}
        confirmLabel="Send product"
        loading={sendingProduct}
        disabled={!selectedProductDraft}
      >
        {selectedProductDraft ? (
          <div className="rounded-2xl border border-minsah-border-subtle bg-minsah-surface-subtle p-4 text-sm">
            <p className="font-black">{selectedProductDraft.product.name}</p>
            <p className="mt-1 text-minsah-text-muted">Quantity: {selectedProductDraft.quantity}</p>
          </div>
        ) : null}
      </ConfirmDialog>
    </section>
  );
}

// ─────────────────────────────────── media renderer ──

function renderProductCard(text: string, isIncoming: boolean) {
  if (!text.startsWith(PRODUCT_CARD_PREFIX)) return null;
  const raw = (text.slice(PRODUCT_CARD_PREFIX.length).split('\n')[0] || '').trim();
  const product = safeJsonParse<{
    name: string;
    image?: string;
    price: number;
    quantity: number;
    variantLabel?: string | null;
    note?: string;
    viewUrl: string;
    orderUrl: string;
  }>(raw);
  if (!product) return null;

  return (
    <div className="grid gap-3">
      {product.image ? <img src={product.image} alt={product.name} className="max-h-56 w-full rounded-xl object-cover" /> : null}
      <div>
        <p className="font-black">{product.name}</p>
        <p className={`mt-1 text-sm ${isIncoming ? 'text-minsah-text-muted' : 'text-minsah-text-inverse'}`}>
          {formatBdt(product.price)} · Qty {product.quantity}
        </p>
        {product.variantLabel ? <p className="mt-1 text-xs">{product.variantLabel}</p> : null}
        {product.note ? <p className="mt-2 text-sm">{product.note}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href={toAbsoluteStorefrontUrl(product.viewUrl)}
          target="_blank"
          rel="noreferrer"
          className={`minsah-control inline-flex min-h-11 items-center justify-center rounded-xl border px-3 py-2 text-sm font-bold ${
            isIncoming
              ? 'border-minsah-border-default bg-minsah-surface-panel text-minsah-text-link'
              : 'border-minsah-text-inverse text-minsah-text-inverse'
          }`}
        >
          View product
        </a>
        <a
          href={toAbsoluteStorefrontUrl(product.orderUrl)}
          target="_blank"
          rel="noreferrer"
          className={`minsah-control inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-bold ${
            isIncoming
              ? 'bg-minsah-action-primary text-minsah-text-inverse'
              : 'bg-minsah-surface-panel text-minsah-text-link'
          }`}
        >
          Order now
        </a>
      </div>
    </div>
  );
}

function renderMedia(
  media: NonNullable<SocialMessage['content']['media']>[number],
  key: string,
  isIncoming: boolean,
) {
  const contrastClass = isIncoming ? 'text-minsah-text-muted' : 'text-minsah-text-inverse';

  if (media.type === 'image') {
    return (
      <a key={key} href={media.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-minsah-border-subtle">
        <img src={media.thumbnail || media.url} alt={media.fileName || 'Shared image'} className="max-h-72 w-full object-cover" />
      </a>
    );
  }
  if (media.type === 'video') {
    return (
      <div key={key} className="overflow-hidden rounded-xl border border-minsah-border-subtle bg-minsah-surface-inverse">
        <video controls preload="metadata" poster={media.thumbnail} className="max-h-72 w-full" src={media.url} />
        {media.fileName ? (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-minsah-text-inverse">
            <VideoIcon className="h-4 w-4" aria-hidden="true" />
            <span className="truncate">{media.fileName}</span>
          </div>
        ) : null}
      </div>
    );
  }
  if (media.type === 'audio') {
    return (
      <div key={key} className="rounded-xl border border-minsah-border-subtle p-3">
        <div className={`mb-2 flex items-center gap-2 text-xs ${contrastClass}`}>
          <FileAudio className="h-4 w-4" aria-hidden="true" />
          <span className="truncate">{media.fileName || 'Audio'}</span>
        </div>
        <audio controls preload="metadata" className="h-10 w-full" src={media.url} />
      </div>
    );
  }
  return (
    <a
      key={key}
      href={media.url}
      target="_blank"
      rel="noreferrer"
      className={`flex min-h-11 items-center gap-2 rounded-xl border border-minsah-border-subtle px-3 py-2 text-sm font-semibold ${contrastClass}`}
    >
      <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{media.fileName || media.mimeType || 'File'}</span>
    </a>
  );
}
