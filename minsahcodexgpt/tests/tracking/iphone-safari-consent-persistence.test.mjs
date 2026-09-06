import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  TRACKING_CONSENT_COOKIE,
  TRACKING_CONSENT_VERSION_COOKIE,
  CURRENT_TRACKING_CONSENT_VERSION,
  TRACKING_CONSENT_MAX_AGE_SECONDS,
  TRACKING_CONSENT_STORAGE_KEY,
  TRACKING_CONSENT_VERSION_STORAGE_KEY,
  NON_ESSENTIAL_TRACKING_COOKIES,
  normalizeTrackingConsent,
  getClientTrackingConsent,
  getClientTrackingConsentVersion,
  setClientTrackingConsent,
} from '../../lib/tracking/tracking-consent.ts';

test('app/api/privacy/consent/route.ts issues authoritative first-party Set-Cookie headers', () => {
  const routePath = path.resolve('app/api/privacy/consent/route.ts');
  assert.ok(fs.existsSync(routePath), 'Consent route must exist');
  const src = fs.readFileSync(routePath, 'utf8');

  // Verify server-side cookie emission
  assert.ok(src.includes('response.cookies.set(TRACKING_CONSENT_COOKIE'), 'Must issue Set-Cookie for TRACKING_CONSENT_COOKIE');
  assert.ok(src.includes('response.cookies.set(TRACKING_CONSENT_VERSION_COOKIE'), 'Must issue Set-Cookie for TRACKING_CONSENT_VERSION_COOKIE');
  assert.ok(src.includes('TRACKING_CONSENT_MAX_AGE_SECONDS'), 'Must use TRACKING_CONSENT_MAX_AGE_SECONDS');
  assert.ok(src.includes("sameSite: 'lax'"), 'Must specify sameSite: lax');
  assert.ok(src.includes('httpOnly: false'), 'Must allow client-side tag managers to read');

  // Verify denial flow clears non-essential tracking cookies
  assert.ok(src.includes('NON_ESSENTIAL_TRACKING_COOKIES'), 'Denial must clear non-essential tracking cookies');
  assert.ok(src.includes('maxAge: 0'), 'Cleared cookies must have maxAge: 0');
});

test('lib/tracking/pixels/TrackingConsentManager.tsx implements resilient localStorage fallback', () => {
  const managerPath = path.resolve('lib/tracking/pixels/TrackingConsentManager.tsx');
  assert.ok(fs.existsSync(managerPath), 'TrackingConsentManager must exist');
  const src = fs.readFileSync(managerPath, 'utf8');

  assert.ok(src.includes('window.localStorage.getItem'), 'TrackingConsentModeScript must check localStorage');
  assert.ok(src.includes('try {'), 'localStorage reads must be protected in try-catch for Safari private mode');
});

test('Client tracking consent falls back to localStorage when cookie is stripped', () => {
  const storageMap = new Map();
  const mockStorage = {
    getItem: (k) => storageMap.get(k) ?? null,
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k),
  };

  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  try {
    globalThis.window = {
      localStorage: mockStorage,
      location: { protocol: 'https:', hostname: 'minsahbeauty.cloud' },
      dispatchEvent: () => true,
    };
    let cookieJar = '';
    globalThis.document = {
      get cookie() { return cookieJar; },
      set cookie(val) {
        if (!val) { cookieJar = ''; return; }
        const pair = val.split(';')[0];
        cookieJar = cookieJar ? `${cookieJar}; ${pair}` : pair;
      }
    };

    // Initially unknown
    assert.equal(getClientTrackingConsent(), 'unknown');
    assert.equal(getClientTrackingConsentVersion(), null);

    // Set consent via helper (dual-sync)
    setClientTrackingConsent('granted');

    // Both document.cookie and localStorage should have it
    assert.ok(document.cookie.includes('mb_tracking_consent=granted'));
    assert.equal(mockStorage.getItem(TRACKING_CONSENT_STORAGE_KEY), 'granted');
    assert.equal(mockStorage.getItem(TRACKING_CONSENT_VERSION_STORAGE_KEY), CURRENT_TRACKING_CONSENT_VERSION);

    // Simulate Safari ITP stripping document.cookie completely
    document.cookie = '';

    // getClientTrackingConsent should resiliently fall back to localStorage
    assert.equal(getClientTrackingConsent(), 'granted');
    assert.equal(getClientTrackingConsentVersion(), CURRENT_TRACKING_CONSENT_VERSION);
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});

test('Protected from Safari private browsing localStorage throws', () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  try {
    globalThis.window = {
      localStorage: {
        getItem: () => { throw new Error('QuotaExceededError: DOM Exception 22'); },
        setItem: () => { throw new Error('QuotaExceededError: DOM Exception 22'); },
        removeItem: () => { throw new Error('QuotaExceededError: DOM Exception 22'); },
      },
      location: { protocol: 'https:', hostname: 'minsahbeauty.cloud' },
      dispatchEvent: () => true,
    };
    globalThis.document = { cookie: '' };

    // Should not throw and return fallback safely
    assert.doesNotThrow(() => {
      const state = getClientTrackingConsent();
      assert.equal(state, 'unknown');
    });

    assert.doesNotThrow(() => {
      setClientTrackingConsent('granted');
    });
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});
