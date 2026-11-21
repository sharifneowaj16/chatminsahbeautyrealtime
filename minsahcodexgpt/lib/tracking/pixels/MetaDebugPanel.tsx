'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  clearMetaDebugEntries,
  isMetaDebugEnabled,
  META_DEBUG_EVENT,
  META_DEBUG_SYNC_EVENT,
  readMetaDebugEntries,
  setMetaDebugEnabled,
  type MetaDebugEntry,
} from '@/lib/meta/browser/debug-store';

export type { MetaDebugEntry };

type MetaDebugWindow = Window & {
  __mbFbInitReady?: boolean;
  fbq?: ((...args: unknown[]) => void) & { disablePushState?: boolean };
};

const POS_STORAGE_KEY = 'mb_meta_debug_pos_v3';
const MIN_STORAGE_KEY = 'mb_meta_debug_min_v3';

const FUNNEL_STEPS: Array<{ key: string; label: string; events: string[] }> = [
  { key: 'pv', label: 'PV', events: ['PageView'] },
  { key: 'vc', label: 'VC', events: ['ViewContent'] },
  { key: 'atc', label: 'ATC', events: ['AddToCart'] },
  { key: 'cart', label: 'CART', events: ['ViewCart'] },
  { key: 'ic', label: 'IC', events: ['InitiateCheckout'] },
  { key: 'ship', label: 'SHIP', events: ['AddShippingInfo'] },
  { key: 'pay', label: 'PAY', events: ['AddPaymentInfo'] },
  { key: 'ord', label: 'ORD', events: ['Purchase', 'OrderConfirmed'] },
];

type StepStatus = 'idle' | 'ok' | 'warn' | 'err';

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

function evaluateEntryHealth(item: MetaDebugEntry): 'ok' | 'warn' | 'err' {
  const pxOk =
    item.pixelStatus.startsWith('OK') ||
    item.pixelStatus === 'COD_SERVER_CAPI' ||
    item.pixelStatus === 'ONLINE_VERIFIED';
  const caOk =
    /^2\d\d/.test(item.capiStatus) ||
    item.capiStatus === 'SKIPPED' ||
    item.capiStatus === 'SERVER_CAPI_ON_CONFIRM' ||
    item.capiStatus === 'SERVER_CAPI';

  if (
    item.pixelStatus === 'INVALID_EVENT' ||
    item.pixelStatus === 'CONSENT_BLOCKED' ||
    item.pixelStatus === 'BLOCKED'
  ) {
    return 'err';
  }
  if (pxOk && caOk) return 'ok';
  if (item.capiStatus === 'SENDING...' || /^2\d\d/.test(item.capiStatus) || pxOk) {
    return 'warn';
  }
  return 'err';
}

async function copyTextReliable(text: string): Promise<boolean> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
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
  const minRef = useRef<boolean>(true);
  const prevPathRef = useRef<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({
    active: false,
    moved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    origX: 8,
    origY: 64,
  });

  const clampPos = useCallback((x: number, y: number, isMin: boolean) => {
    if (typeof window === 'undefined') return { x, y };
    const vw = window.visualViewport?.width || window.innerWidth;
    const vh = window.visualViewport?.height || window.innerHeight;
    const elW = panelRef.current?.offsetWidth || (isMin ? 108 : Math.min(vw - 16, 330));
    const elH = panelRef.current?.offsetHeight || (isMin ? 30 : 250);
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
      try { localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(next)); } catch {}
      try { sessionStorage.setItem(POS_STORAGE_KEY, JSON.stringify(next)); } catch {}
    }
  }, []);

  const setMinWithPersist = useCallback((nextMin: boolean) => {
    minRef.current = nextMin;
    setMinimized(nextMin);
    try { sessionStorage.setItem(MIN_STORAGE_KEY, nextMin ? '1' : '0'); } catch {}
  }, []);

  const syncCookies = useCallback(() => {
    setCookies({
      fbp: Boolean(readCookie('_fbp')),
      fbc: Boolean(readCookie('_fbc')),
      mbVid: Boolean(readCookie('mb_vid')),
    });
  }, []);

  const syncFromStore = useCallback(() => {
    const enabled = isMetaDebugEnabled();
    setActive(enabled);
    if (!enabled) return;
    setLogs(readMetaDebugEntries());
    syncCookies();
  }, [syncCookies]);

  // Sync on mount and on every route change (Home -> PDP -> Cart -> Checkout -> Order Confirmed)
  useEffect(() => {
    syncFromStore();

    // Auto-minimize when landing on /checkout so Confirm Order button is never blocked
    const currentPath = pathname || '';
    if (
      prevPathRef.current !== currentPath &&
      currentPath === '/checkout' &&
      !minRef.current
    ) {
      setMinWithPersist(true);
    }
    prevPathRef.current = currentPath;
  }, [pathname, syncFromStore, setMinWithPersist]);

  // Restore persisted position & minimized state once activated
  useEffect(() => {
    if (!active) return;
    try {
      const savedMin = sessionStorage.getItem(MIN_STORAGE_KEY);
      if (savedMin === '0' && pathname !== '/checkout') {
        minRef.current = false;
        setMinimized(false);
      }
    } catch {}

    try {
      const savedPos = localStorage.getItem(POS_STORAGE_KEY) || sessionStorage.getItem(POS_STORAGE_KEY);
      if (savedPos) {
        const p = JSON.parse(savedPos);
        if (typeof p?.x === 'number' && typeof p?.y === 'number') {
          updatePos(clampPos(p.x, p.y, minRef.current), false);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Re-clamp whenever expanding, collapsing, toggling copy fallback, or changing route
  useEffect(() => {
    if (!active) return;
    const raf = window.requestAnimationFrame(() => {
      updatePos(clampPos(posRef.current.x, posRef.current.y, minimized), false);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [active, minimized, copyState, pathname, clampPos, updatePos]);

  // Listen to live debug events, cross-storage updates, bfcache pageshow & viewport resizes
  useEffect(() => {
    if (!active) return;

    const onSingleEvent = () => {
      setLogs(readMetaDebugEntries());
      syncCookies();
    };
    const onSyncEvent = (e: Event) => {
      const detail = (e as CustomEvent<MetaDebugEntry[]>).detail;
      if (Array.isArray(detail)) {
        setLogs(detail);
      } else {
        setLogs(readMetaDebugEntries());
      }
      syncCookies();
    };
    const onPageShow = () => {
      syncFromStore();
    };
    const onResize = () => {
      updatePos(clampPos(posRef.current.x, posRef.current.y, minRef.current), false);
    };

    window.addEventListener(META_DEBUG_EVENT, onSingleEvent);
    window.addEventListener(META_DEBUG_SYNC_EVENT, onSyncEvent);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('storage', onPageShow);
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener(META_DEBUG_EVENT, onSingleEvent);
      window.removeEventListener(META_DEBUG_SYNC_EVENT, onSyncEvent);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('storage', onPageShow);
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, [active, clampPos, updatePos, syncCookies, syncFromStore]);

  // Clean Pointer-Events-only drag (no dual touch+pointer conflict on iOS/Android)
  const beginDrag = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement)?.closest('button, textarea, input, a')) return;

    dragRef.current = {
      active: true,
      moved: false,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: posRef.current.x,
      origY: posRef.current.y,
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (!dragRef.current.active) return;
      if (dragRef.current.pointerId !== null && ev.pointerId !== dragRef.current.pointerId) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        dragRef.current.moved = true;
      }
      if (dragRef.current.moved) {
        ev.preventDefault();
        const next = clampPos(
          dragRef.current.origX + dx,
          dragRef.current.origY + dy,
          minRef.current
        );
        updatePos(next, false);
      }
    };

    const onPointerEnd = (ev: PointerEvent) => {
      if (!dragRef.current.active) return;
      if (dragRef.current.pointerId !== null && ev.pointerId !== dragRef.current.pointerId) return;
      dragRef.current.active = false;
      dragRef.current.pointerId = null;
      if (dragRef.current.moved) {
        updatePos(clampPos(posRef.current.x, posRef.current.y, minRef.current), true);
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerEnd);
      window.removeEventListener('pointercancel', onPointerEnd);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerEnd);
    window.addEventListener('pointercancel', onPointerEnd);
  };

  // Compute 8-step funnel status across the whole session
  const funnelStatus = useMemo(() => {
    return FUNNEL_STEPS.map((step) => {
      const matched = logs.filter((l) => step.events.includes(l.eventName));
      if (matched.length === 0) {
        return { ...step, status: 'idle' as StepStatus, count: 0 };
      }
      const healths = matched.map(evaluateEntryHealth);
      const status: StepStatus = healths.includes('ok')
        ? 'ok'
        : healths.includes('warn')
          ? 'warn'
          : 'err';
      return { ...step, status, count: matched.length };
    });
  }, [logs]);

  const completedFunnelSteps = funnelStatus.filter((s) => s.status === 'ok' || s.status === 'warn').length;

  if (!active) return null;

  const stopBtnDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
  };

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
      funnelProgress: completedFunnelSteps + '/' + FUNNEL_STEPS.length,
      funnel: funnelStatus.reduce<Record<string, { status: StepStatus; count: number }>>((acc, s) => {
        acc[s.label] = { status: s.status, count: s.count };
        return acc;
      }, {}),
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

  const handleClearLogs = () => {
    clearMetaDebugEntries();
    setLogs([]);
    setCopyState('idle');
    setRawReportText('');
  };

  const handleClosePanel = () => {
    setMetaDebugEnabled(false);
    setActive(false);
  };

  const hasErr =
    trackingBlocked ||
    logs.some((l) => evaluateEntryHealth(l) === 'err');

  // =========================================================================
  // 1. ULTRA-COMPACT DRAGGABLE MINI PILL (Never blocks Checkout or Add to Cart)
  // =========================================================================
  if (minimized) {
    return (
      <div
        ref={panelRef}
        onPointerDown={beginDrag}
        onClick={() => {
          if (dragRef.current.moved) {
            dragRef.current.moved = false;
            return;
          }
          setMinWithPersist(false);
        }}
        role="button"
        aria-label="Open Meta Debug Panel"
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          zIndex: 2147483000,
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          cursor: 'grab',
          background: hasErr ? 'rgba(127,29,29,0.95)' : 'rgba(15,23,42,0.94)',
          color: '#F9FAFB',
          border: '1.5px solid ' + (hasErr ? '#F87171' : '#34D399'),
          borderRadius: 999,
          padding: '6px 10px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 10.5,
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
        <span style={{ color: '#94A3B8', fontSize: 9.5 }}>
          ({completedFunnelSteps}/{FUNNEL_STEPS.length})
        </span>
      </div>
    );
  }

  // =========================================================================
  // 2. COMPACT MOVABLE PANEL + 8-STEP FUNNEL BAR + TOUCH-SAFE CONTROLS
  // =========================================================================
  const btnBase: React.CSSProperties = {
    border: 0,
    borderRadius: 6,
    minWidth: 28,
    minHeight: 26,
    padding: '0 7px',
    fontSize: 10.5,
    fontWeight: 700,
    color: '#fff',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    touchAction: 'manipulation',
  };

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 2147483000,
        width: 'min(calc(100vw - 16px), 336px)',
        background: 'rgba(15,23,42,0.97)',
        color: '#F8FAFC',
        borderRadius: 12,
        border: '1px solid ' + (hasErr ? '#F87171' : '#334155'),
        boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 10,
      }}
    >
      {/* Header: Left side = Dedicated Drag Grip | Right side = Touch-Safe Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          padding: '6px 8px',
          borderBottom: '1px solid #334155',
          background: '#1E293B',
          borderTopLeftRadius: 11,
          borderTopRightRadius: 11,
        }}
      >
        <div
          onPointerDown={beginDrag}
          style={{
            display: 'flex',
            gap: 5,
            alignItems: 'center',
            flex: 1,
            minWidth: 0,
            padding: '3px 2px',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            cursor: 'grab',
          }}
        >
          <span style={{ color: '#94A3B8', fontWeight: 700 }}>::</span>
          <span style={{ color: hasErr ? '#FCA5A5' : '#34D399', fontWeight: 700 }}>
            MB {logs.length}
          </span>
          <span style={{ color: cookies.fbp ? '#34D399' : '#F87171', fontSize: 9.5 }}>
            p:{cookies.fbp ? '1' : '0'}
          </span>
          <span style={{ color: cookies.fbc ? '#34D399' : '#94A3B8', fontSize: 9.5 }}>
            c:{cookies.fbc ? '1' : '0'}
          </span>
          <span style={{ color: cookies.mbVid ? '#34D399' : '#F87171', fontSize: 9.5 }}>
            v:{cookies.mbVid ? '1' : '0'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            type="button"
            onPointerDown={stopBtnDrag}
            onClick={handleCopyReport}
            style={{
              ...btnBase,
              background: copyState === 'copied' ? '#059669' : '#2563EB',
            }}
          >
            {copyState === 'copied' ? 'OK!' : 'Copy'}
          </button>
          <button
            type="button"
            onPointerDown={stopBtnDrag}
            onClick={handleClearLogs}
            style={{ ...btnBase, background: '#334155' }}
          >
            Clr
          </button>
          <button
            type="button"
            onPointerDown={stopBtnDrag}
            onClick={() => setMinWithPersist(true)}
            aria-label="Minimize Debug Panel"
            style={{ ...btnBase, background: '#475569', fontSize: 13 }}
          >
            -
          </button>
          <button
            type="button"
            onPointerDown={stopBtnDrag}
            onClick={handleClosePanel}
            aria-label="Close Debug Panel"
            style={{ ...btnBase, background: '#991B1B' }}
          >
            X
          </button>
        </div>
      </div>

      {/* 8-Step Funnel Checklist Strip: Home -> PDP -> ATC -> Cart -> Checkout -> Ship -> Pay -> Order */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
          gap: 3,
          padding: '5px 6px',
          borderBottom: '1px solid #1E293B',
          background: '#0F172A',
        }}
      >
        {funnelStatus.map((step) => {
          const bg =
            step.status === 'ok'
              ? '#064E3B'
              : step.status === 'warn'
                ? '#78350F'
                : step.status === 'err'
                  ? '#7F1D1D'
                  : '#1E293B';
          const fg =
            step.status === 'ok'
              ? '#6EE7B7'
              : step.status === 'warn'
                ? '#FDE68A'
                : step.status === 'err'
                  ? '#FCA5A5'
                  : '#64748B';
          return (
            <div
              key={step.key}
              title={step.events.join(' / ') + ': ' + step.status}
              style={{
                background: bg,
                color: fg,
                borderRadius: 4,
                padding: '3px 2px',
                textAlign: 'center',
                fontSize: 8.5,
                fontWeight: 700,
                lineHeight: 1.1,
              }}
            >
              {step.label}
              {step.count > 1 ? '*' : ''}
            </div>
          );
        })}
      </div>

      {/* Fallback Selectable Textarea if iOS / In-App Browser blocks clipboard */}
      {copyState === 'fallback' && rawReportText && (
        <div style={{ padding: 6, borderBottom: '1px solid #334155', background: '#0B1120' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#FDE68A', fontSize: 9.5 }}>
            <span>Tap box &gt; Select All &gt; Copy:</span>
            <button
              type="button"
              onClick={() => setCopyState('idle')}
              style={{ background: 'transparent', color: '#94A3B8', border: 0, cursor: 'pointer', fontSize: 10 }}
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
              fontSize: 10,
              fontFamily: 'monospace',
            }}
          />
        </div>
      )}

      {/* Compact Scrollable Event Feed */}
      <div style={{ maxHeight: 175, overflowY: 'auto', padding: 6, WebkitOverflowScrolling: 'touch' }}>
        <div style={{ color: '#94A3B8', fontSize: 9, marginBottom: 4, display: 'flex', justifyContent: 'space-between', gap: 4 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pathname || '/'}
          </span>
          <span style={{ flexShrink: 0 }}>Drag :: | Tap - to shrink</span>
        </div>

        {trackingBlocked && (
          <div style={{ background: '#7F1D1D', color: '#FECACA', padding: 5, borderRadius: 5, marginBottom: 5, fontSize: 9.5 }}>
            Blocked: {blockReason}
          </div>
        )}

        {logs.length === 0 ? (
          <div style={{ color: '#94A3B8', padding: '4px 2px', fontSize: 9.5 }}>
            Waiting for events...
          </div>
        ) : (
          logs.map((item) => {
            const health = evaluateEntryHealth(item);
            const pxColor =
              health === 'err' ? '#F87171' : item.pixelStatus.startsWith('OK') || item.pixelStatus === 'COD_SERVER_CAPI' || item.pixelStatus === 'ONLINE_VERIFIED' ? '#34D399' : '#FBBF24';
            const caColor =
              /^2\d\d/.test(item.capiStatus) || item.capiStatus === 'SERVER_CAPI_ON_CONFIRM' || item.capiStatus === 'SERVER_CAPI'
                ? '#34D399'
                : item.capiStatus === 'SKIPPED'
                  ? '#94A3B8'
                  : '#FBBF24';

            return (
              <div
                key={item.id}
                style={{
                  borderBottom: '1px solid #1E293B',
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
                  <span style={{ color: '#94A3B8', flexShrink: 0 }}>{item.time}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span>
                    Px: <b style={{ color: pxColor }}>{item.pixelStatus}</b>
                  </span>
                  <span>
                    CA: <b style={{ color: caColor }}>{item.capiStatus}</b>
                  </span>
                  {item.path && <span style={{ color: '#94A3B8' }}>{item.path}</span>}
                </div>
                {item.detail && (
                  <div style={{ color: '#FCA5A5', fontSize: 9, wordBreak: 'break-word' }}>
                    {item.detail}
                  </div>
                )}
                <div style={{ color: '#64748B', wordBreak: 'break-all', fontSize: 8.5 }}>
                  {item.eventId}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
