'use client';

export interface MetaDebugEntry {
  id: string;
  time: string;
  ts?: number;
  path?: string;
  eventName: string;
  eventId: string;
  value?: number;
  currency?: string;
  pixelStatus: string;
  capiStatus: string;
  fbp: boolean;
  fbc: boolean;
  mbVid?: boolean;
  detail?: string;
}

type DebugWindow = Window & {
  __mbMetaDebugQueue?: MetaDebugEntry[];
  __mbMetaDebugEnabled?: boolean;
  __mbFbInitReady?: boolean;
  fbq?: ((...args: unknown[]) => void) & { disablePushState?: boolean };
};

export const META_DEBUG_EVENT = 'mb:meta-debug';
export const META_DEBUG_SYNC_EVENT = 'mb:meta-debug-sync';

const ENABLED_SESSION_KEY = 'mb_meta_debug_enabled';
const ENABLED_LOCAL_KEY = 'mb_meta_debug_enabled_until';
const LOGS_SESSION_KEY = 'mb_meta_debug_logs';
const LOGS_LOCAL_KEY = 'mb_meta_debug_logs_v2';
const DEBUG_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_ENTRIES = 60;

function readCookieBool(name: string): boolean {
  if (typeof document === 'undefined') return false;
  return new RegExp('(?:^|; )' + name + '=([^;]*)').test(document.cookie);
}

function safeParseEntries(raw: string | null): MetaDebugEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((x) => x && typeof x.id === 'string' && typeof x.eventName === 'string');
    }
    if (parsed && Array.isArray(parsed.entries)) {
      const expiresAt = typeof parsed.expiresAt === 'number' ? parsed.expiresAt : 0;
      if (expiresAt > 0 && Date.now() > expiresAt) return [];
      return parsed.entries.filter((x: unknown) => {
        const row = x as Partial<MetaDebugEntry>;
        return Boolean(row && typeof row.id === 'string' && typeof row.eventName === 'string');
      });
    }
  } catch {}
  return [];
}

function mergeEntries(lists: MetaDebugEntry[][]): MetaDebugEntry[] {
  const byId = new Map<string, MetaDebugEntry>();
  for (const list of lists) {
    for (const item of list) {
      if (!item || !item.id) continue;
      const existing = byId.get(item.id);
      if (!existing) {
        byId.set(item.id, item);
      } else {
        // Prefer finalized CAPI status over SENDING...
        const existingPending = existing.capiStatus === 'SENDING...';
        const incomingPending = item.capiStatus === 'SENDING...';
        byId.set(item.id, {
          ...existing,
          ...item,
          capiStatus: incomingPending && !existingPending ? existing.capiStatus : item.capiStatus,
        });
      }
    }
  }
  return Array.from(byId.values())
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
    .slice(0, MAX_ENTRIES);
}

export function isMetaDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as DebugWindow;
  try {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('mb_debug');
    if (flag === '1') {
      setMetaDebugEnabled(true);
      return true;
    }
    if (flag === '0') {
      setMetaDebugEnabled(false);
      return false;
    }
  } catch {}

  if (win.__mbMetaDebugEnabled === true) return true;
  if (win.__mbMetaDebugEnabled === false) return false;

  try {
    if (sessionStorage.getItem(ENABLED_SESSION_KEY) === '1') {
      win.__mbMetaDebugEnabled = true;
      return true;
    }
  } catch {}

  try {
    const until = Number(localStorage.getItem(ENABLED_LOCAL_KEY) || '0');
    if (until > Date.now()) {
      win.__mbMetaDebugEnabled = true;
      try { sessionStorage.setItem(ENABLED_SESSION_KEY, '1'); } catch {}
      return true;
    }
    if (until > 0) {
      localStorage.removeItem(ENABLED_LOCAL_KEY);
    }
  } catch {}

  return false;
}

export function setMetaDebugEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  const win = window as DebugWindow;
  win.__mbMetaDebugEnabled = enabled;
  if (enabled) {
    try { sessionStorage.setItem(ENABLED_SESSION_KEY, '1'); } catch {}
    try { localStorage.setItem(ENABLED_LOCAL_KEY, String(Date.now() + DEBUG_TTL_MS)); } catch {}
  } else {
    try { sessionStorage.removeItem(ENABLED_SESSION_KEY); } catch {}
    try { localStorage.removeItem(ENABLED_LOCAL_KEY); } catch {}
  }
}

export function readMetaDebugEntries(): MetaDebugEntry[] {
  if (typeof window === 'undefined') return [];
  const win = window as DebugWindow;
  const mem = Array.isArray(win.__mbMetaDebugQueue) ? win.__mbMetaDebugQueue : [];
  let sess: MetaDebugEntry[] = [];
  let loc: MetaDebugEntry[] = [];
  try { sess = safeParseEntries(sessionStorage.getItem(LOGS_SESSION_KEY)); } catch {}
  try { loc = safeParseEntries(localStorage.getItem(LOGS_LOCAL_KEY)); } catch {}
  const merged = mergeEntries([mem, sess, loc]);
  win.__mbMetaDebugQueue = merged;
  return merged;
}

function writeMetaDebugEntries(entries: MetaDebugEntry[]): void {
  if (typeof window === 'undefined') return;
  const win = window as DebugWindow;
  const trimmed = entries.slice(0, MAX_ENTRIES);
  win.__mbMetaDebugQueue = trimmed;
  try {
    sessionStorage.setItem(LOGS_SESSION_KEY, JSON.stringify(trimmed));
  } catch {}
  try {
    localStorage.setItem(
      LOGS_LOCAL_KEY,
      JSON.stringify({ expiresAt: Date.now() + DEBUG_TTL_MS, entries: trimmed })
    );
  } catch {}
}

export function upsertMetaDebugEntry(entry: MetaDebugEntry): MetaDebugEntry {
  const stamped: MetaDebugEntry = {
    ...entry,
    ts: entry.ts ?? Date.now(),
  };
  if (typeof window === 'undefined' || !isMetaDebugEnabled()) return stamped;
  try {
    const current = readMetaDebugEntries();
    const next = mergeEntries([[stamped], current]);
    writeMetaDebugEntries(next);
    window.dispatchEvent(new CustomEvent(META_DEBUG_EVENT, { detail: stamped }));
    window.dispatchEvent(new CustomEvent(META_DEBUG_SYNC_EVENT, { detail: next }));
  } catch {}
  return stamped;
}

export function updateMetaDebugEntry(
  id: string,
  patch: Partial<MetaDebugEntry>
): void {
  if (typeof window === 'undefined' || !isMetaDebugEnabled() || !id) return;
  try {
    const current = readMetaDebugEntries();
    let updated: MetaDebugEntry | null = null;
    const next = current.map((item) => {
      if (item.id !== id) return item;
      updated = {
        ...item,
        ...patch,
        fbp: readCookieBool('_fbp') || item.fbp,
        fbc: readCookieBool('_fbc') || item.fbc,
        mbVid: readCookieBool('mb_vid') || item.mbVid,
      };
      return updated;
    });
    if (!updated) return;
    writeMetaDebugEntries(next);
    window.dispatchEvent(new CustomEvent(META_DEBUG_EVENT, { detail: updated }));
    window.dispatchEvent(new CustomEvent(META_DEBUG_SYNC_EVENT, { detail: next }));
  } catch {}
}

export function recordMetaDebugDiagnostic(input: {
  eventName: string;
  eventId?: string;
  value?: number;
  currency?: string;
  pixelStatus: string;
  capiStatus: string;
  detail?: string;
}): string {
  const id = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  if (typeof window === 'undefined' || !isMetaDebugEnabled()) return id;
  upsertMetaDebugEntry({
    id,
    ts: Date.now(),
    time: new Date().toLocaleTimeString(),
    path: window.location.pathname || '/',
    eventName: input.eventName,
    eventId: input.eventId || id,
    value: input.value,
    currency: input.currency,
    pixelStatus: input.pixelStatus,
    capiStatus: input.capiStatus,
    fbp: readCookieBool('_fbp'),
    fbc: readCookieBool('_fbc'),
    mbVid: readCookieBool('mb_vid'),
    ...(input.detail ? { detail: input.detail } : {}),
  });
  return id;
}

export function clearMetaDebugEntries(): void {
  if (typeof window === 'undefined') return;
  const win = window as DebugWindow;
  win.__mbMetaDebugQueue = [];
  try { sessionStorage.removeItem(LOGS_SESSION_KEY); } catch {}
  try { localStorage.removeItem(LOGS_LOCAL_KEY); } catch {}
  window.dispatchEvent(new CustomEvent(META_DEBUG_SYNC_EVENT, { detail: [] }));
}
