export type ProductionQaPhase =
  | 'phase_1_payment_lock'
  | 'phase_2_purchase_contract'
  | 'phase_3_catalog_mapping'
  | 'phase_4_external_id'
  | 'phase_5_product_analytics'
  | 'phase_6_privacy_filters'
  | 'phase_7_ga4_attribution'
  | 'phase_8_regression_locks'
  | 'phase_10_telegram_bot';

export type FullProductionQaStep = {
  key: string;
  phase: ProductionQaPhase;
  title: string;
  expected: string;
  evidence: string;
  blocker: boolean;
  envKey: string;
  evidenceEnvKey: string;
};

export const FULL_PRODUCTION_QA_MATRIX: FullProductionQaStep[] = [
  {
    key: 'legacy_payment_lock',
    phase: 'phase_1_payment_lock',
    title: 'Legacy payment bypass lock',
    expected: 'Card/COD/bKash legacy API calls return 410 or 404, old card page redirects to /checkout, and no raw card field exists in production UI/server code.',
    evidence: 'Curl responses for disabled routes + security audit JSON showing ok=true.',
    blocker: true,
    envKey: 'QA_LEGACY_PAYMENT_LOCK_VERIFIED',
    evidenceEnvKey: 'QA_LEGACY_PAYMENT_LOCK_EVIDENCE_URL',
  },
  {
    key: 'canonical_online_purchase',
    phase: 'phase_2_purchase_contract',
    title: 'Online verified Purchase contract',
    expected: 'Online Purchase is sent only after signed verified payment flow marks paymentStatus COMPLETED; amount/currency/method mismatch is rejected.',
    evidence: 'Gateway sandbox/live test order, verified route response, order timeline, and Meta/GA4 event evidence.',
    blocker: true,
    envKey: 'QA_CANONICAL_ONLINE_PURCHASE_VERIFIED',
    evidenceEnvKey: 'QA_CANONICAL_ONLINE_PURCHASE_EVIDENCE_URL',
  },
  {
    key: 'cod_phone_confirmed_purchase',
    phase: 'phase_2_purchase_contract',
    title: 'COD Phone Confirmed Purchase',
    expected: 'COD order submit does not fire Purchase; only Phone Confirmed sends server-only Meta CAPI Purchase and GA4 MP purchase using checkout-time customer data.',
    evidence: 'COD test order before/after phone confirmation + Events Manager server-only Purchase + GA4 DebugView/Realtime.',
    blocker: true,
    envKey: 'QA_COD_PHONE_CONFIRMED_PURCHASE_VERIFIED',
    evidenceEnvKey: 'QA_COD_PHONE_CONFIRMED_PURCHASE_EVIDENCE_URL',
  },
  {
    key: 'purchase_dedup_refresh_retry',
    phase: 'phase_2_purchase_contract',
    title: 'Purchase dedup, refresh, and retry protection',
    expected: 'Success page refresh, webhook retry, and repeated admin save cannot create duplicate Meta/GA4 Purchase for the same order.',
    evidence: 'Repeated refresh/webhook/admin-save test logs showing one Purchase event_id/transaction_id.',
    blocker: true,
    envKey: 'QA_PURCHASE_DEDUP_REFRESH_RETRY_VERIFIED',
    evidenceEnvKey: 'QA_PURCHASE_DEDUP_REFRESH_RETRY_EVIDENCE_URL',
  },
  {
    key: 'meta_catalog_variant_mapping',
    phase: 'phase_3_catalog_mapping',
    title: 'Meta catalog variant/shade mapping',
    expected: 'Variant/shade ViewContent, AddToCart, InitiateCheckout, browser Purchase, and CAPI Purchase use parent product content_ids and product_group content_type with variant metadata preserved.',
    evidence: 'Meta Test Events payload screenshots/logs for simple + variant product and catalog diagnostics clean result.',
    blocker: true,
    envKey: 'QA_META_CATALOG_VARIANT_MAPPING_VERIFIED',
    evidenceEnvKey: 'QA_META_CATALOG_VARIANT_MAPPING_EVIDENCE_URL',
  },
  {
    key: 'external_id_parity',
    phase: 'phase_4_external_id',
    title: 'Browser Pixel + CAPI external_id parity',
    expected: 'Browser Pixel and Server CAPI hash the same normalized visitor external_id for the same journey; values are lowercase+trimmed before SHA-256.',
    evidence: 'Debug/test logs showing equal browser/server external_id hash for one checkout journey.',
    blocker: true,
    envKey: 'QA_EXTERNAL_ID_PARITY_VERIFIED',
    evidenceEnvKey: 'QA_EXTERNAL_ID_PARITY_EVIDENCE_URL',
  },
  {
    key: 'product_view_dedup',
    phase: 'phase_5_product_analytics',
    title: 'Product analytics 30-minute dedup',
    expected: 'Refreshing the same product page repeatedly within 30 minutes increments view counters once; AddToCart/Checkout/Order counters update once from backend flows.',
    evidence: 'Before/after DB/admin analytics screenshots or SQL output for one product/visitor test.',
    blocker: true,
    envKey: 'QA_PRODUCT_VIEW_DEDUP_VERIFIED',
    evidenceEnvKey: 'QA_PRODUCT_VIEW_DEDUP_EVIDENCE_URL',
  },
  {
    key: 'consent_denied_gate',
    phase: 'phase_6_privacy_filters',
    title: 'Consent denied blocks non-essential tags',
    expected: 'When user denies tracking consent, Meta Pixel, browser GA4 tag, Clarity, Hotjar, TikTok, and other non-essential tags do not load/fire; checkout still works.',
    evidence: 'DevTools Network screenshots/logs for denied consent checkout journey.',
    blocker: true,
    envKey: 'QA_CONSENT_DENIED_GATE_VERIFIED',
    evidenceEnvKey: 'QA_CONSENT_DENIED_GATE_EVIDENCE_URL',
  },
  {
    key: 'internal_bot_filter',
    phase: 'phase_6_privacy_filters',
    title: 'Internal/staff/bot traffic filters',
    expected: 'Staff cookies/internal IPs/headless bots/social preview agents are excluded from product analytics and public tracking endpoints.',
    evidence: 'Test requests with staff cookie/internal IP/bot UA showing skipped tracking response/log reason.',
    blocker: true,
    envKey: 'QA_INTERNAL_BOT_FILTER_VERIFIED',
    evidenceEnvKey: 'QA_INTERNAL_BOT_FILTER_EVIDENCE_URL',
  },
  {
    key: 'ga4_app_router_pageview',
    phase: 'phase_7_ga4_attribution',
    title: 'GA4 App Router page_view',
    expected: 'Homepage → product → cart → checkout navigation sends exactly one GA4 page_view per URL change and no auto+manual duplicate.',
    evidence: 'GA4 DebugView/Tag Assistant evidence for App Router navigation.',
    blocker: true,
    envKey: 'QA_GA4_APP_ROUTER_PAGEVIEW_VERIFIED',
    evidenceEnvKey: 'QA_GA4_APP_ROUTER_PAGEVIEW_EVIDENCE_URL',
  },
  {
    key: 'ga4_payment_referral',
    phase: 'phase_7_ga4_attribution',
    title: 'GA4 payment gateway referral preservation',
    expected: 'A UTM/ad click → payment gateway → return journey keeps original source/medium and never attributes Purchase to bKash/Nagad/SSLCommerz/aamarPay/ShurjoPay referral.',
    evidence: 'GA4 Realtime/DebugView evidence for payment journey source/medium.',
    blocker: true,
    envKey: 'QA_GA4_PAYMENT_REFERRAL_VERIFIED',
    evidenceEnvKey: 'QA_GA4_PAYMENT_REFERRAL_EVIDENCE_URL',
  },
  {
    key: 'sensitive_payment_url_sanitized',
    phase: 'phase_7_ga4_attribution',
    title: 'Sensitive payment URL sanitization',
    expected: 'GA4 page_view URLs never include bpt/token/access_token/signature/secret/auth/session/nonce parameters on payment-complete or order-confirmed pages.',
    evidence: 'GA4 DebugView page_location evidence after payment return.',
    blocker: true,
    envKey: 'QA_SENSITIVE_PAYMENT_URL_SANITIZED_VERIFIED',
    evidenceEnvKey: 'QA_SENSITIVE_PAYMENT_URL_SANITIZED_EVIDENCE_URL',
  },
  {
    key: 'ga4_refund',
    phase: 'phase_2_purchase_contract',
    title: 'GA4 refund event',
    expected: 'Full/partial refund sends GA4 refund once with transaction_id = order ID and refunded items/value.',
    evidence: 'GA4 DebugView/Realtime refund event + order gaRefundSent flag.',
    blocker: false,
    envKey: 'QA_GA4_REFUND_VERIFIED',
    evidenceEnvKey: 'QA_GA4_REFUND_EVIDENCE_URL',
  },
  {
    key: 'queue_retry_dead_letter',
    phase: 'phase_8_regression_locks',
    title: 'CAPI queue retry + dead-letter behavior',
    expected: 'Temporary CAPI failure retries with backoff, preserves original event_time, and final failure is visible in failure log/deploy gate.',
    evidence: 'Staging forced-failure log/queue screenshot or tracking health output.',
    blocker: true,
    envKey: 'QA_QUEUE_RETRY_DEAD_LETTER_VERIFIED',
    evidenceEnvKey: 'QA_QUEUE_RETRY_DEAD_LETTER_EVIDENCE_URL',
  },
  {
    key: 'tracking_health_cron_alert',
    phase: 'phase_8_regression_locks',
    title: 'Tracking health cron + alert',
    expected: 'Tracking health cron endpoint persists TrackingHealthCheck and alert webhook fires on WARN/CRITICAL.',
    evidence: 'Cron response, dashboard history, and alert message proof.',
    blocker: true,
    envKey: 'QA_TRACKING_HEALTH_CRON_ALERT_VERIFIED',
    evidenceEnvKey: 'QA_TRACKING_HEALTH_CRON_ALERT_EVIDENCE_URL',
  },
  {
    key: 'external_meta_setup',
    phase: 'phase_8_regression_locks',
    title: 'External Meta setup verified',
    expected: 'Domain verification, AEM priority, System User token expiry/access, Catalog diagnostics, and retargeting audiences are checked in Meta Business/Events Manager.',
    evidence: 'Meta Business/Events Manager screenshots or admin audit notes.',
    blocker: true,
    envKey: 'QA_EXTERNAL_META_SETUP_VERIFIED',
    evidenceEnvKey: 'QA_EXTERNAL_META_SETUP_EVIDENCE_URL',
  },
  {
    key: 'backend_vs_platform_audit',
    phase: 'phase_8_regression_locks',
    title: 'Backend vs Meta vs GA4 reconciliation',
    expected: 'Recent confirmed/paid backend purchases reconcile against Meta Purchase and GA4 purchase counts within expected tolerance, with test/internal/consent-denied orders excluded.',
    evidence: 'Admin tracking health snapshot and platform comparison notes.',
    blocker: true,
    envKey: 'QA_BACKEND_META_GA4_RECONCILIATION_VERIFIED',
    evidenceEnvKey: 'QA_BACKEND_META_GA4_RECONCILIATION_EVIDENCE_URL',
  },
  {
    key: 'telegram_bot_hardening',
    phase: 'phase_10_telegram_bot',
    title: 'Telegram bot hardened order actions',
    expected: 'Telegram order actions fail closed without webhook secret/admin allowlist, use tokenized callback_data, enforce order state guards, log every action, and cannot duplicate COD Purchase or Pathao dispatch.',
    evidence: 'Webhook negative tests, allowlisted admin callback test, action log rows, repeated tap proof, and COD Phone Confirmed Meta/GA4 evidence.',
    blocker: true,
    envKey: 'QA_TELEGRAM_BOT_HARDENING_VERIFIED',
    evidenceEnvKey: 'QA_TELEGRAM_BOT_HARDENING_EVIDENCE_URL',
  },
  {
    key: 'predeploy_scripts',
    phase: 'phase_8_regression_locks',
    title: 'Predeploy regression scripts',
    expected: 'npm run audit:security, npm run qa:phase8-static, npm run typecheck, npm run build, and npm run qa:production are run before release.',
    evidence: 'CI/build logs or local terminal output attached to release notes.',
    blocker: true,
    envKey: 'QA_PREDEPLOY_SCRIPTS_VERIFIED',
    evidenceEnvKey: 'QA_PREDEPLOY_SCRIPTS_EVIDENCE_URL',
  },
];

export function readQaFlag(envKey: string, env: NodeJS.ProcessEnv = process.env) {
  return env[envKey]?.trim().toLowerCase() === 'true';
}

export function readQaEvidence(envKey: string, env: NodeJS.ProcessEnv = process.env) {
  return env[envKey]?.trim() || null;
}

export function getQaStepVerification(step: FullProductionQaStep, env: NodeJS.ProcessEnv = process.env) {
  return {
    verified: readQaFlag(step.envKey, env),
    evidenceUrl: readQaEvidence(step.evidenceEnvKey, env),
  };
}

export function getFullQaMatrixSummary(env: NodeJS.ProcessEnv = process.env) {
  const rows = FULL_PRODUCTION_QA_MATRIX.map((step) => ({
    ...step,
    ...getQaStepVerification(step, env),
  }));

  return {
    total: rows.length,
    required: rows.filter((step) => step.blocker).length,
    recommended: rows.filter((step) => !step.blocker).length,
    verified: rows.filter((step) => step.verified).length,
    requiredVerified: rows.filter((step) => step.blocker && step.verified).length,
    missingRequired: rows.filter((step) => step.blocker && !step.verified).map((step) => step.envKey),
    rows,
  };
}
