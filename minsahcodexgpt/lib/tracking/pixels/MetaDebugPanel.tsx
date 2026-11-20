'use client';

import React, { useEffect, useRef, useState } from 'react';

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
}

type MetaDebugWindow = Window & {
  __mbMetaDebugQueue?: MetaDebugEntry[];
  __mbMetaDebugEnabled?: boolean;
  __mbFbInitReady?: boolean;
  fbq?: ((...args: unknown[]) => void) & { disablePushState?: boolean };
};

const STORAGE_KEY = 'mb_meta_debug_enabled';
const LOGS_STORAGE_KEY = 'mb_meta_debug_logs';
const POS_STORAGE_KEY = 'mb_meta_debug_pos';

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
  const params = new URLSearchParams(window.location.search);
  const flag = params.get('mb_debug');

  if (flag === '1') {
    win.__mbMetaDebugEnabled = true;
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch {}
    return true;
  }
  if (flag === '0') {
    win.__mbMetaDebugEnabled = false;
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    return false;
  }
  if (win.__mbMetaDebugEnabled) return true;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
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
  const [active, setActive] = useState(false);
  const [minimized, setMinimized] = useState(true);
  const [logs, setLogs] = useState<MetaDebugEntry[]>([]);
  const [cookies, setCookies] = useState({ fbp: false, fbc: false, mbVid: false });
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'fallback'>('idle');
  const [rawReportText, setRawReportText] = useState('');
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 10, y: 72 });
  const [dockTop, setDockTop] = useState(true);

  const dragRef = useRef<{
    dragging: boolean;
    moved: boolean;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
  }>({
    dragging: false,
    moved: false,
    startClientX: 0,
    startClientY: 0,
    origX: 10,
    origY: 72,
  });

  const panelRef = useRef<HTMLDivElement>(null);

  const clampPos = (x: number, y: number, isMin: boolean) => {
    if (typeof window === 'undefined') return { x, y };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const elW = panelRef.current?.offsetWidth || (isMin ? 132 : Math.min(vw - 16, 420));
    const elH = panelRef.current?.offsetHeight || (isMin ? 38 : 260);
    const maxX = Math.max(6, vw - elW - 6);
    const maxY = Math.max(6, vh - elH - 6);
    return {
      x: Math.min(Math.max(6, Math.round(x)), maxX),
      y: Math.min(Math.max(6, Math.round(y)), maxY),
    };
  };

  useEffect(() => {
    const enabled = readDebugFlag();
    setActive(enabled);
    if (!enabled) return;

    const win = window as MetaDebugWindow;
    let initialLogs: MetaDebugEntry[] = [];
    if (Array.isArray(win.__mbMetaDebugQueue) && win.__mbMetaDebugQueue.length > 0) {
      initialLogs = [...win.__mbMetaDebugQueue];
    } else {
      try {
        const saved = sessionStorage.getItem(LOGS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            initialLogs = parsed;
            win.__mbMetaDebugQueue = parsed;
          }
        }
      } catch {}
    }
    setLogs(initialLogs);
    setCookies({
      fbp: Boolean(readCookie('_fbp')),
      fbc: Boolean(readCookie('_fbc')),
      mbVid: Boolean(readCookie('mb_vid')),
    });

    try {
      const savedPos = sessionStorage.getItem(POS_STORAGE_KEY);
      if (savedPos) {
        const p = JSON.parse(savedPos);
        if (typeof p?.x === 'number' && typeof p?.y === 'number') {
          setPos(clampPos(p.x, p.y, true));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!active) return;
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<MetaDebugEntry>).detail;
      if (!detail) return;
      setLogs((prev) => [detail, ...prev].slice(0, 40));
      setCookies({
        fbp: Boolean(readCookie('_fbp')),
        fbc: Boolean(readCookie('_fbc')),
        mbVid: Boolean(readCookie('mb_vid')),
      });
    };
    const onResize = () => {
      setPos((prev) => clampPos(prev.x, prev.y, minimized));
    };
    window.addEventListener('mb:meta-debug', onEvent);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('mb:meta-debug', onEvent);
      window.removeEventListener('resize', onResize);
    };
  }, [active, minimized]);

  if (!active) return null;

  const persistPos = (next: { x: number; y: number }) => {
    try { sessionStorage.setItem(POS_STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const onDragStart = (clientX: number, clientY: number) => {
    dragRef.current = {
      dragging: true,
      moved: false,
      startClientX: clientX,
      startClientY: clientY,
      origX: pos.x,
      origY: pos.y,
    };
  };

  const onDragMove = (clientX: number, clientY: number) => {
    if (!dragRef.current.dragging) return;
    const dx = clientX - dragRef.current.startClientX;
    const dy = clientY - dragRef.current.startClientY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragRef.current.moved = true;
    }
    const next = clampPos(dragRef.current.origX + dx, dragRef.current.origY + dy, minimized);
    setPos(next);
  };

  const onDragEnd = () => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    persistPos(pos);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement)?.closest('button, textarea, input')) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    onDragStart(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return;
    e.preventDefault();
    onDragMove(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    onDragEnd();
  };

  const buildReportText = () => {
    const win = window as MetaDebugWindow;
    const fbpVal = readCookie('_fbp');
    const fbcVal = readCookie('_fbc');
    const vidVal = readCookie('mb_vid');
    const report = {
      timestamp: new Date().toISOString(),
      platform: detectPlatformLabel(),
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

  const toggleDockPosition = () => {
    if (typeof window === 'undefined') return;
    const nextTop = !dockTop;
    setDockTop(nextTop);
    const vh = window.innerHeight;
    const nextY = nextTop ? 10 : Math.max(10, vh - 320);
    const nextPos = clampPos(pos.x, nextY, false);
    setPos(nextPos);
    persistPos(nextPos);
  };

  // =========================================================================
  // MINIMIZED FLOATING DRAGGABLE PILL (Never blocks checkout buttons)
  // =========================================================================
  if (minimized) {
    const hasErr = trackingBlocked || logs.some(
      (l) => !l.pixelStatus.startsWith('OK') || (l.capiStatus !== 'SKIPPED' && !l.capiStatus.startsWith('200'))
    );
    return (
      <div
        ref={panelRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
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
          cursor: 'grab',
          background: hasErr ? '#7F1D1D' : '#111827',
          color: '#F9FAFB',
          border: '1.5px solid ' + (hasErr ? '#F87171' : '#34D399'),
          borderRadius: 999,
          padding: '6px 11px',
          boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
          fontFamily: 'monospace',
          fontSize: 11,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: hasErr ? '#F87171' : '#34D399',
            display: 'inline-block',
          }}
        />
        <span>MB ({logs.length})</span>
        <span style={{ color: '#9CA3AF', fontSize: 10 }}>::</span>
      </div>
    );
  }

  // =========================================================================
  // EXPANDED MOVABLE DEBUG MODAL + COPY REPORT + SAFARI FALLBACK BOX
  // =========================================================================
  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 999999,
        width: 'min(calc(100vw - 16px), 420px)',
        background: '#111827',
        color: '#F9FAFB',
        borderRadius: 12,
        border: '1px solid #374151',
        boxShadow: '0 12px 30px rgba(0,0,0,0.55)',
        fontFamily: 'monospace',
        fontSize: 11,
      }}
    >
      {/* Draggable Header Bar */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          padding: '8px 10px',
          borderBottom: '1px solid #374151',
          touchAction: 'none',
          userSelect: 'none',
          cursor: 'grab',
          background: '#1F2937',
          borderTopLeftRadius: 11,
          borderTopRightRadius: 11,
        }}
      >
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#9CA3AF', fontWeight: 700 }}>::</span>
          <span style={{ color: '#34D399', fontWeight: 700 }}>MB Meta</span>
          <span style={{ color: '#9CA3AF' }}>({logs.length})</span>
          <span style={{ color: cookies.fbp ? '#34D399' : '#F87171' }}>
            fbp:{cookies.fbp ? 'OK' : 'NO'}
          </span>
          <span style={{ color: cookies.fbc ? '#34D399' : '#9CA3AF' }}>
            fbc:{cookies.fbc ? 'OK' : '-'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleCopyReport}
            style={{
              background: copyState === 'copied' ? '#059669' : '#2563EB',
              color: '#fff',
              border: 0,
              borderRadius: 5,
              padding: '3px 7px',
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {copyState === 'copied' ? 'Copied!' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={toggleDockPosition}
            title="Move panel Top / Bottom"
            style={{
              background: '#374151',
              color: '#fff',
              border: 0,
              borderRadius: 5,
              padding: '3px 6px',
              fontSize: 10,
              cursor: 'pointer',
            }}
          >
            {dockTop ? 'Down' : 'Up'}
          </button>
          <button
            type="button"
            onClick={clearLogs}
            style={{
              background: '#374151',
              color: '#fff',
              border: 0,
              borderRadius: 5,
              padding: '3px 6px',
              fontSize: 10,
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
              borderRadius: 5,
              padding: '3px 6px',
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Min
          </button>
          <button
            type="button"
            onClick={closePanel}
            style={{
              background: '#991B1B',
              color: '#fff',
              border: 0,
              borderRadius: 5,
              padding: '3px 6px',
              fontSize: 10,
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
        <div style={{ padding: 8, borderBottom: '1px solid #374151', background: '#0F172A' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#FDE68A', fontSize: 10 }}>
            <span>Tap box, Select All &amp; Copy:</span>
            <button
              type="button"
              onClick={() => setCopyState('idle')}
              style={{ background: 'transparent', color: '#9CA3AF', border: 0, cursor: 'pointer', fontSize: 10 }}
            >
              Close
            </button>
          </div>
          <textarea
            readOnly
            value={rawReportText}
            onFocus={(e) => e.currentTarget.select()}
            rows={5}
            style={{
              width: '100%',
              background: '#1E293B',
              color: '#E2E8F0',
              border: '1px solid #475569',
              borderRadius: 6,
              padding: 6,
              fontSize: 10,
              fontFamily: 'monospace',
            }}
          />
        </div>
      )}

      {/* Scrollable Event List */}
      <div style={{ maxHeight: 210, overflowY: 'auto', padding: 8, WebkitOverflowScrolling: 'touch' }}>
        {trackingBlocked && (
          <div style={{ background: '#7F1D1D', color: '#FECACA', padding: 6, borderRadius: 6, marginBottom: 6 }}>
            Blocked: {blockReason}. Use mobile data (4G/5G) to test.
          </div>
        )}
        <div style={{ color: '#9CA3AF', fontSize: 10, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
          <span>Drag header or tap Min to move</span>
          <span>vid:{cookies.mbVid ? 'OK' : 'NO'}</span>
        </div>
        {logs.length === 0 ? (
          <div style={{ color: '#9CA3AF', padding: '6px 2px' }}>
            Waiting for events... Browse a product or tap Add to Cart.
          </div>
        ) : (
          logs.map((item) => (
            <div
              key={item.id}
              style={{
                borderBottom: '1px solid #1F2937',
                padding: '6px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                <strong style={{ color: '#60A5FA' }}>
                  {item.eventName}
                  {typeof item.value === 'number' ? ' (' + (item.currency || 'BDT') + ' ' + item.value + ')' : ''}
                </strong>
                <span style={{ color: '#9CA3AF', flexShrink: 0 }}>{item.time}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span>
                  Pixel:{' '}
                  <b style={{ color: item.pixelStatus.startsWith('OK') ? '#34D399' : '#F87171' }}>
                    {item.pixelStatus}
                  </b>
                </span>
                <span>
                  CAPI:{' '}
                  <b style={{ color: item.capiStatus.startsWith('200') ? '#34D399' : '#FBBF24' }}>
                    {item.capiStatus}
                  </b>
                </span>
                {item.path && <span style={{ color: '#9CA3AF' }}>{item.path}</span>}
              </div>
              <div style={{ color: '#D1D5DB', wordBreak: 'break-all', fontSize: 10 }}>
                ID: {item.eventId}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
