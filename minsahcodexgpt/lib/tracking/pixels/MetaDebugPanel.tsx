'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export interface MetaDebugEntry {
  id: string;
  time: string;
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

type MetaDebugWindow = Window & {
  __mbMetaDebugQueue?: MetaDebugEntry[];
  __mbMetaDebugEnabled?: boolean;
  __mbFbInitReady?: boolean;
  fbq?: ((...args: unknown[]) => void) & { disablePushState?: boolean };
};

const STORAGE_KEY = 'mb_meta_debug_enabled';
const LOGS_STORAGE_KEY = 'mb_meta_debug_logs';
const POS_STORAGE_KEY = 'mb_meta_debug_pos_v2';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

function readDebugFlag(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as MetaDebugWindow;
  try {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('mb_debug');
    if (flag === '1') {
      win.__mbMetaDebugEnabled = true;
      sessionStorage.setItem(STORAGE_KEY, '1');
      return true;
    }
    if (flag === '0') {
      win.__mbMetaDebugEnabled = false;
      sessionStorage.removeItem(STORAGE_KEY);
      return false;
    }
    if (win.__mbMetaDebugEnabled) return true;
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return Boolean(win.__mbMetaDebugEnabled);
  }
}

function detectPlatformLabel(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isInApp = /FBAN|FBAV|Instagram|Line|TikTok/i.test(ua);
  const browser = /CriOS|Chrome/i.test(ua)
    ? 'Chrome'
    : /Safari/i.test(ua)
      ? 'Safari'
      : 'Browser';
  const os = isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop';
  return os + ' / ' + browser + (isInApp ? ' (In-App)' : '');
}

async function copyTextReliable(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for iOS Safari / In-App browsers
    }
  }
  if (typeof document !== 'undefined') {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '0';
      ta.style.opacity = '0';
      ta.style.fontSize = '16px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) return true;
    } catch {
      return false;
    }
  }
  return false;
}

export default function MetaDebugPanel({
  trackingBlocked = false,
  blockReason = 'STAFF_IPS / Traffic Filter blocked',
}: {
  trackingBlocked?: boolean;
  blockReason?: string;
}) {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [minimized, setMinimized] = useState(true);
  const [logs, setLogs] = useState<MetaDebugEntry[]>([]);
  const [cookies, setCookies] = useState({ fbp: false, fbc: false, mbVid: false });
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'fallback'>('idle');
  const [rawReportText, setRawReportText] = useState('');
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 8, y: 64 });

  const posRef = useRef<{ x: number; y: number }>({ x: 8, y: 64 });
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    origX: 8,
    origY: 64,
  });

  const clampPos = useCallback((x: number, y: number, isMin: boolean) => {
    if (typeof window === 'undefined') return { x, y };
    const vw = window.visualViewport?.width || window.innerWidth;
    const vh = window.visualViewport?.height || window.innerHeight;
    const elW = panelRef.current?.offsetWidth || (isMin ? 96 : Math.min(vw - 16, 320));
    const elH = panelRef.current?.offsetHeight || (isMin ? 32 : 240);
    const maxX = Math.max(6, vw - elW - 6);
    const maxY = Math.max(6, vh - elH - 6);
    return {
      x: Math.min(Math.max(6, Math.round(x)), maxX),
      y: Math.min(Math.max(6, Math.round(y)), maxY),
    };
  }, []);

  const updatePos = useCallback((next: { x: number; y: number }, persist = false) => {
    posRef.current = next;
    setPos(next);
    if (persist) {
      try {
        sessionStorage.setItem(POS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
    }
  }, []);

  const syncCookies = useCallback(() => {
    setCookies({
      fbp: Boolean(readCookie('_fbp')),
      fbc: Boolean(readCookie('_fbc')),
      mbVid: Boolean(readCookie('mb_vid')),
    });
  }, []);

  // Re-check debug flag, logs & cookies on initial mount AND every route change (/ -> PDP -> /checkout)
  useEffect(() => {
    const enabled = readDebugFlag();
    setActive(enabled);
    if (!enabled) return;

    const win = window as MetaDebugWindow;
    let currentLogs: MetaDebugEntry[] = [];
    if (Array.isArray(win.__mbMetaDebugQueue) && win.__mbMetaDebugQueue.length > 0) {
      currentLogs = [...win.__mbMetaDebugQueue];
    } else {
      try {
        const saved = sessionStorage.getItem(LOGS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            currentLogs = parsed;
            win.__mbMetaDebugQueue = parsed;
          }
        }
      } catch {}
    }
    setLogs(currentLogs);
    syncCookies();
  }, [pathname, syncCookies]);

  // Restore saved position once active
  useEffect(() => {
    if (!active) return;
    try {
      const savedPos = sessionStorage.getItem(POS_STORAGE_KEY);
      if (savedPos) {
        const p = JSON.parse(savedPos);
        if (typeof p?.x === 'number' && typeof p?.y === 'number') {
          updatePos(clampPos(p.x, p.y, minimized), false);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Auto-clamp whenever expanding, minimizing, or viewport changes so modal never goes off-screen
  useEffect(() => {
    if (!active) return;
    const raf = window.requestAnimationFrame(() => {
      updatePos(clampPos(posRef.current.x, posRef.current.y, minimized), false);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [active, minimized, copyState, clampPos, updatePos]);

  // Listen to live meta debug events and viewport resizes
  useEffect(() => {
    if (!active) return;
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<MetaDebugEntry>).detail;
      if (!detail) return;
      setLogs((prev) => {
        if (prev.some((item) => item.id === detail.id)) return prev;
        return [detail, ...prev].slice(0, 40);
      });
      syncCookies();
    };
    const onResize = () => {
      updatePos(clampPos(posRef.current.x, posRef.current.y, minimized), false);
    };
    window.addEventListener('mb:meta-debug', onEvent);
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('mb:meta-debug', onEvent);
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, [active, minimized, clampPos, updatePos, syncCookies]);

  // Global move/end listeners while dragging ? works reliably on iOS Safari, Android Chrome & Desktop
  const startDrag = (clientX: number, clientY: number) => {
    dragRef.current = {
      active: true,
      moved: false,
      startX: clientX,
      startY: clientY,
      origX: posRef.current.x,
      origY: posRef.current.y,
    };

    const handleMove = (cx: number, cy: number) => {
      if (!dragRef.current.active) return;
      const dx = cx - dragRef.current.startX;
      const dy = cy - dragRef.current.startY;
      if (Math.abs(dx) > 9 || Math.abs(dy) > 9) {
        dragRef.current.moved = true;
      }
      const next = clampPos(dragRef.current.origX + dx, dragRef.current.origY + dy, minimized);
      updatePos(next, false);
    };

    const onPointerMove = (ev: PointerEvent) => {
      ev.preventDefault();
      handleMove(ev.clientX, ev.clientY);
    };
    const onTouchMove = (ev: TouchEvent) => {
      if (ev.touches.length === 0) return;
      ev.preventDefault();
      handleMove(ev.touches[0].clientX, ev.touches[0].clientY);
    };
    const onEnd = () => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      updatePos(clampPos(posRef.current.x, posRef.current.y, minimized), true);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
  };

  const handleDragStart = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement)?.closest('button, textarea, input, a')) return;
    startDrag(e.clientX, e.clientY);
  };

  if (!active) return null;

  const buildReportText = () => {
    const win = window as MetaDebugWindow;
    const fbpVal = readCookie('_fbp');
    const fbcVal = readCookie('_fbc');
    const vidVal = readCookie('mb_vid');
    const report = {
      timestamp: new Date().toISOString(),
      platform: detectPlatformLabel(),
      path: pathname || (typeof window !== 'undefined' ? window.location.pathname : ''),
      url: typeof window !== 'undefined' ? window.location.href : '',
      trackingBlocked,
      blockReason: trackingBlocked ? blockReason : null,
      fbqLoaded: typeof win.fbq === 'function',
      fbInitReady: Boolean(win.__mbFbInitReady),
      disablePushState: Boolean(win.fbq && win.fbq.disablePushState === true),
      cookies: {
        _fbp: fbpVal || null,
        _fbc: fbcVal || null,
        mb_vid: vidVal || null,
      },
      totalEvents: logs.length,
      events: logs.map((l) => ({
        time: l.time,
        path: l.path || '',
        event: l.eventName,
        value: l.value ?? null,
        currency: l.currency ?? null,
        pixel: l.pixelStatus,
        capi: l.capiStatus,
        eventId: l.eventId,
        fbp: l.fbp,
        fbc: l.fbc,
        ...(l.detail ? { detail: l.detail } : {}),
      })),
    };
    return JSON.stringify(report, null, 2);
  };

  const handleCopyReport = async () => {
    const text = buildReportText();
    setRawReportText(text);
    const ok = await copyTextReliable(text);
    if (ok) {
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2200);
    } else {
      setCopyState('fallback');
    }
  };

  const clearLogs = () => {
    (window as MetaDebugWindow).__mbMetaDebugQueue = [];
    try { sessionStorage.removeItem(LOGS_STORAGE_KEY); } catch {}
    setLogs([]);
    setCopyState('idle');
    setRawReportText('');
  };

  const closePanel = () => {
    (window as MetaDebugWindow).__mbMetaDebugEnabled = false;
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    setActive(false);
  };

  const hasErr =
    trackingBlocked ||
    logs.some(
      (l) =>
        !l.pixelStatus.startsWith('OK') ||
        (l.capiStatus !== 'SKIPPED' && !l.capiStatus.startsWith('200'))
    );

  // =========================================================================
  // 1. ULTRA-COMPACT DRAGGABLE MINI PILL
  // =========================================================================
  if (minimized) {
    return (
      <div
        ref={panelRef}
        onPointerDown={handleDragStart}
        onClick={() => {
          if (dragRef.current.moved) {
            dragRef.current.moved = false;
            return;
          }
          setMinimized(false);
        }}
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          zIndex: 999999,
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          cursor: 'grab',
          background: hasErr ? 'rgba(127,29,29,0.95)' : 'rgba(17,24,39,0.94)',
          color: '#F9FAFB',
          border: '1.5px solid ' + (hasErr ? '#F87171' : '#34D399'),
          borderRadius: 999,
          padding: '5px 9px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
          fontFamily: 'monospace',
          fontSize: 10,
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          lineHeight: 1,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: hasErr ? '#F87171' : '#34D399',
            flexShrink: 0,
          }}
        />
        <span>MB {logs.length}</span>
        <span style={{ color: '#9CA3AF', fontSize: 9 }}>::</span>
      </div>
    );
  }

  // =========================================================================
  // 2. COMPACT MOVABLE FLOATING DEBUG MODAL (Drag header to move anywhere)
  // =========================================================================
  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 999999,
        width: 'min(calc(100vw - 16px), 320px)',
        background: 'rgba(17,24,39,0.97)',
        color: '#F9FAFB',
        borderRadius: 10,
        border: '1px solid ' + (hasErr ? '#F87171' : '#374151'),
        boxShadow: '0 10px 28px rgba(0,0,0,0.55)',
        fontFamily: 'monospace',
        fontSize: 10,
      }}
    >
      {/* Draggable Compact Header */}
      <div
        onPointerDown={handleDragStart}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 4,
          padding: '6px 8px',
          borderBottom: '1px solid #374151',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          cursor: 'grab',
          background: '#1F2937',
          borderTopLeftRadius: 9,
          borderTopRightRadius: 9,
        }}
      >
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', minWidth: 0 }}>
          <span style={{ color: '#9CA3AF', fontWeight: 700 }}>::</span>
          <span style={{ color: hasErr ? '#FCA5A5' : '#34D399', fontWeight: 700 }}>
            MB ({logs.length})
          </span>
          <span style={{ color: cookies.fbp ? '#34D399' : '#F87171' }}>
            p:{cookies.fbp ? '1' : '0'}
          </span>
          <span style={{ color: cookies.fbc ? '#34D399' : '#9CA3AF' }}>
            c:{cookies.fbc ? '1' : '0'}
          </span>
          <span style={{ color: cookies.mbVid ? '#34D399' : '#F87171' }}>
            v:{cookies.mbVid ? '1' : '0'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleCopyReport}
            style={{
              background: copyState === 'copied' ? '#059669' : '#2563EB',
              color: '#fff',
              border: 0,
              borderRadius: 4,
              padding: '3px 6px',
              fontSize: 9.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {copyState === 'copied' ? 'OK!' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={clearLogs}
            style={{
              background: '#374151',
              color: '#fff',
              border: 0,
              borderRadius: 4,
              padding: '3px 5px',
              fontSize: 9.5,
              cursor: 'pointer',
            }}
          >
            Clr
          </button>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            style={{
              background: '#4B5563',
              color: '#fff',
              border: 0,
              borderRadius: 4,
              padding: '3px 6px',
              fontSize: 9.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            -
          </button>
          <button
            type="button"
            onClick={closePanel}
            style={{
              background: '#991B1B',
              color: '#fff',
              border: 0,
              borderRadius: 4,
              padding: '3px 5px',
              fontSize: 9.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            X
          </button>
        </div>
      </div>

      {/* Fallback Selectable Textarea if iOS / In-App Browser blocks clipboard */}
      {copyState === 'fallback' && rawReportText && (
        <div style={{ padding: 6, borderBottom: '1px solid #374151', background: '#0F172A' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#FDE68A', fontSize: 9.5 }}>
            <span>Tap box &gt; Select All &gt; Copy:</span>
            <button
              type="button"
              onClick={() => setCopyState('idle')}
              style={{ background: 'transparent', color: '#9CA3AF', border: 0, cursor: 'pointer', fontSize: 9.5 }}
            >
              Hide
            </button>
          </div>
          <textarea
            readOnly
            value={rawReportText}
            onFocus={(e) => e.currentTarget.select()}
            rows={4}
            style={{
              width: '100%',
              background: '#1E293B',
              color: '#E2E8F0',
              border: '1px solid #475569',
              borderRadius: 5,
              padding: 5,
              fontSize: 9.5,
              fontFamily: 'monospace',
            }}
          />
        </div>
      )}

      {/* Compact Scrollable Event Feed */}
      <div style={{ maxHeight: 175, overflowY: 'auto', padding: 6, WebkitOverflowScrolling: 'touch' }}>
        <div style={{ color: '#9CA3AF', fontSize: 9, marginBottom: 4, display: 'flex', justifyContent: 'space-between', gap: 4 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pathname || '/'}
          </span>
          <span style={{ flexShrink: 0 }}>Drag :: to move</span>
        </div>

        {trackingBlocked && (
          <div style={{ background: '#7F1D1D', color: '#FECACA', padding: 5, borderRadius: 5, marginBottom: 5, fontSize: 9.5 }}>
            Blocked: {blockReason}
          </div>
        )}

        {logs.length === 0 ? (
          <div style={{ color: '#9CA3AF', padding: '4px 2px', fontSize: 9.5 }}>
            Waiting for events...
          </div>
        ) : (
          logs.map((item) => (
            <div
              key={item.id}
              style={{
                borderBottom: '1px solid #1F2937',
                padding: '4px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
                <strong style={{ color: '#60A5FA' }}>
                  {item.eventName}
                  {typeof item.value === 'number' ? ' (' + (item.currency || 'BDT') + ' ' + item.value + ')' : ''}
                </strong>
                <span style={{ color: '#9CA3AF', flexShrink: 0 }}>{item.time}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span>
                  Px:{' '}
                  <b style={{ color: item.pixelStatus.startsWith('OK') ? '#34D399' : '#F87171' }}>
                    {item.pixelStatus}
                  </b>
                </span>
                <span>
                  CA:{' '}
                  <b style={{ color: item.capiStatus.startsWith('200') ? '#34D399' : '#FBBF24' }}>
                    {item.capiStatus}
                  </b>
                </span>
                {item.path && <span style={{ color: '#9CA3AF' }}>{item.path}</span>}
              </div>
              {item.detail && (
                <div style={{ color: '#FCA5A5', fontSize: 9, wordBreak: 'break-word' }}>
                  Err: {item.detail}
                </div>
              )}
              <div style={{ color: '#9CA3AF', wordBreak: 'break-all', fontSize: 8.5 }}>
                {item.eventId}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
