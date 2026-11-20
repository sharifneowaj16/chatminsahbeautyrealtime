'use client';

import { useEffect, useState } from 'react';

export interface MetaDebugEntry {
  id: string;
  time: string;
  eventName: string;
  eventId: string;
  pixelStatus: string;
  capiStatus: string;
  fbp: boolean;
  fbc: boolean;
}

type MetaDebugWindow = Window & {
  __mbMetaDebugQueue?: MetaDebugEntry[];
  __mbMetaDebugEnabled?: boolean;
};

const STORAGE_KEY = 'mb_meta_debug_enabled';

function hasCookie(name: string): boolean {
  if (typeof document === 'undefined') return false;
  return new RegExp('(?:^|; )' + name + '=([^;]*)').test(document.cookie);
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

export default function MetaDebugPanel({
  trackingBlocked = false,
  blockReason = 'STAFF_IPS / Traffic Filter blocked',
}: {
  trackingBlocked?: boolean;
  blockReason?: string;
}) {
  const [active, setActive] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [logs, setLogs] = useState<MetaDebugEntry[]>([]);
  const [cookies, setCookies] = useState({ fbp: false, fbc: false });

  useEffect(() => {
    const enabled = readDebugFlag();
    setActive(enabled);
    if (!enabled) return;

    const win = window as MetaDebugWindow;
    if (Array.isArray(win.__mbMetaDebugQueue) && win.__mbMetaDebugQueue.length > 0) {
      setLogs([...win.__mbMetaDebugQueue]);
    }
    setCookies({ fbp: hasCookie('_fbp'), fbc: hasCookie('_fbc') });
  }, []);

  useEffect(() => {
    if (!active) return;
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<MetaDebugEntry>).detail;
      if (!detail) return;
      setLogs((prev) => [detail, ...prev].slice(0, 30));
      setCookies({ fbp: hasCookie('_fbp'), fbc: hasCookie('_fbc') });
    };
    window.addEventListener('mb:meta-debug', onEvent);
    return () => window.removeEventListener('mb:meta-debug', onEvent);
  }, [active]);

  if (!active) return null;

  const clearLogs = () => {
    (window as MetaDebugWindow).__mbMetaDebugQueue = [];
    setLogs([]);
  };

  const closePanel = () => {
    (window as MetaDebugWindow).__mbMetaDebugEnabled = false;
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    setActive(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 8,
        left: 8,
        right: 8,
        zIndex: 999999,
        background: '#111827',
        color: '#F9FAFB',
        borderRadius: 12,
        border: '1px solid #374151',
        boxShadow: '0 10px 25px rgba(0,0,0,0.45)',
        fontFamily: 'monospace',
        fontSize: 11,
        maxWidth: 460,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          borderBottom: minimized ? 'none' : '1px solid #374151',
        }}
      >
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#34D399', fontWeight: 700 }}>MB Meta Debug</span>
          <span style={{ color: '#9CA3AF' }}>({logs.length})</span>
          <span style={{ color: cookies.fbp ? '#34D399' : '#F87171' }}>
            _fbp:{cookies.fbp ? 'OK' : 'NO'}
          </span>
          <span style={{ color: cookies.fbc ? '#34D399' : '#9CA3AF' }}>
            _fbc:{cookies.fbc ? 'OK' : '-'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={clearLogs}
            style={{ background: '#374151', color: '#fff', border: 0, borderRadius: 4, padding: '2px 6px' }}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setMinimized((m) => !m)}
            style={{ background: '#374151', color: '#fff', border: 0, borderRadius: 4, padding: '2px 6px' }}
          >
            {minimized ? 'Show' : 'Hide'}
          </button>
          <button
            type="button"
            onClick={closePanel}
            style={{ background: '#991B1B', color: '#fff', border: 0, borderRadius: 4, padding: '2px 6px' }}
          >
            X
          </button>
        </div>
      </div>

      {!minimized && (
        <div style={{ maxHeight: 240, overflowY: 'auto', padding: 8 }}>
          {trackingBlocked && (
            <div style={{ background: '#7F1D1D', color: '#FECACA', padding: 6, borderRadius: 6, marginBottom: 6 }}>
              Blocked: {blockReason}. Use mobile data (4G/5G) to test.
            </div>
          )}
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
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ color: '#60A5FA' }}>{item.eventName}</strong>
                  <span style={{ color: '#9CA3AF' }}>{item.time}</span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
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
                </div>
                <div style={{ color: '#D1D5DB', wordBreak: 'break-all', fontSize: 10 }}>
                  ID: {item.eventId}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
