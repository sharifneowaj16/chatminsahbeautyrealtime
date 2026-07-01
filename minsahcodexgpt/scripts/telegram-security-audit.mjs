import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const issues = [];

function read(relative) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    issues.push(`Missing required file: ${relative}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}

function requireTokens(relative, tokens) {
  const text = read(relative);
  if (!text) return;
  for (const token of tokens) {
    if (!text.includes(token)) {
      issues.push(`${relative} missing required Telegram security token: ${token}`);
    }
  }
}

requireTokens('lib/telegram/auth.ts', [
  'requireTelegramWebhookAuth',
  'TELEGRAM_WEBHOOK_SECRET',
  'TELEGRAM_ADMIN_USER_IDS',
  'telegramMisconfiguredResponse',
  'x-telegram-bot-api-secret-token',
  'isProductionRuntime',
]);

requireTokens('lib/telegram/action-tokens.ts', [
  'TelegramActionToken',
  'TELEGRAM_CALLBACK_PREFIX',
  'createTelegramActionToken',
  'parseTelegramCallbackToken',
  'resolveTelegramActionToken',
  'consumeTelegramActionToken',
  'tokenHash',
  'sha256',
]);

requireTokens('lib/telegram/order-state.ts', [
  'canTelegramPhoneConfirm',
  'canTelegramPhoneOff',
  'canTelegramCancel',
  'canTelegramPathaoSend',
  'Pathao-dispatched orders cannot be cancelled from Telegram',
  'Paid online orders cannot be cancelled from Telegram',
]);

requireTokens('app/api/telegram/order-callback/route.ts', [
  'requireTelegramWebhookAuth',
  'assertTelegramUserAllowed',
  'parseTelegramCallbackToken',
  'resolveTelegramActionToken',
  'consumeTelegramActionToken',
  'telegramActionLog.create',
  'canTelegramPhoneConfirm',
  'canTelegramPhoneOff',
  'canTelegramCancel',
  'canTelegramPathaoSend',
  'enqueueMetaCapiPurchase',
  'enqueueGa4Purchase',
]);

requireTokens('lib/telegram-notify.ts', [
  'createTelegramActionToken',
  'TELEGRAM_ORDER_ACTIONS.PHONE_CONFIRM',
  'TELEGRAM_ORDER_ACTIONS.PHONE_OFF',
  'TELEGRAM_ORDER_ACTIONS.CANCEL',
  'callback_data: phoneConfirm.callbackData',
]);

requireTokens('prisma/schema.prisma', [
  'model TelegramActionToken',
  'tokenHash      String    @unique',
  'consumedAt     DateTime?',
  'model TelegramActionLog',
  'callbackQueryId  String?  @unique',
]);

requireTokens('ENVIRONMENT_VARIABLES_PRODUCTION.md', [
  'TELEGRAM_ORDER_BOT_TOKEN',
  'TELEGRAM_ORDER_CHAT_ID',
  'TELEGRAM_WEBHOOK_SECRET',
  'TELEGRAM_ADMIN_USER_IDS',
  'QA_TELEGRAM_BOT_HARDENING_VERIFIED',
]);

requireTokens('PRODUCTION_QA.md', [
  'QA_TELEGRAM_BOT_HARDENING_VERIFIED',
  'Wrong Telegram webhook secret',
  'non-allowlisted Telegram user',
]);

const telegramRoute = read('app/api/telegram/order-callback/route.ts');
for (const forbidden of ['phone_confirm_', 'phone_off_', 'pathao_send_']) {
  if (telegramRoute.includes(forbidden)) {
    issues.push(`Telegram callback route still accepts raw legacy callback prefix: ${forbidden}`);
  }
}

const notify = read('lib/telegram-notify.ts');
for (const forbidden of ['phone_confirm_${', 'phone_off_${', 'cancel_${', 'pathao_send_${']) {
  if (notify.includes(forbidden)) {
    issues.push(`Telegram notification still emits raw orderId callback data: ${forbidden}`);
  }
}

const giftRoute = read('app/api/gift/[token]/order/route.ts');
if (giftRoute.includes('TELEGRAM_BOT_TOKEN') || giftRoute.includes('TELEGRAM_CHAT_ID')) {
  issues.push('Gift order route still uses ambiguous generic Telegram env names.');
}
if (!giftRoute.includes('escapeTelegramHtml')) {
  issues.push('Gift order Telegram notification must escape HTML.');
}

const packageJson = JSON.parse(read('package.json') || '{}');
const scripts = packageJson.scripts ?? {};
if (scripts['qa:telegram-security'] !== 'node scripts/telegram-security-audit.mjs') {
  issues.push('package.json script qa:telegram-security must run node scripts/telegram-security-audit.mjs');
}
if (!String(scripts['qa:predeploy'] || '').includes('npm run qa:telegram-security')) {
  issues.push('qa:predeploy must include npm run qa:telegram-security');
}

if (issues.length) {
  console.error(JSON.stringify({ ok: false, issueCount: issues.length, issues }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checks: 12 }, null, 2));
