#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();

function parseEnv(content) {
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

async function loadEnv() {
  const envFiles = ['.env', '.env.production', '.env.local'];
  const combined = { ...process.env };
  for (const file of envFiles) {
    try {
      const content = await readFile(path.join(projectRoot, file), 'utf8');
      const parsed = parseEnv(content);
      Object.assign(combined, parsed);
    } catch {
      // file not found
    }
  }
  return combined;
}

function normalizeRelayBase(rawBase) {
  let base = String(rawBase ?? '').trim();
  if (!base) return 'https://api.telegram.org/bot';
  base = base.replace(/\/+$/, '');
  if (base.endsWith('/bot')) return base;
  return `${base}/bot`;
}

function normalizeBotToken(rawToken) {
  const token = String(rawToken ?? '').trim();
  if (!token) return '';
  return token.replace(/^bot/i, '');
}

async function main() {
  const env = await loadEnv();
  const botToken = normalizeBotToken(env.TELEGRAM_ORDER_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN);
  const relayBase = normalizeRelayBase(env.TELEGRAM_RELAY_BASE);
  const webhookSecret = (env.TELEGRAM_WEBHOOK_SECRET || '').trim();
  const configuredWebhook = env.TELEGRAM_WEBHOOK_URL?.trim();
  const rawSite = (env.NEXT_PUBLIC_SITE_URL || env.NEXT_PUBLIC_APP_URL || '').trim();
  const siteUrl = (!rawSite || rawSite.includes('localhost') || rawSite.includes('127.0.0.1'))
    ? 'https://minsahbeauty.cloud'
    : rawSite.replace(/\/+$/, '');
  const targetWebhookUrl = configuredWebhook || `${siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`}/api/telegram/order-callback`;

  console.log('=== Telegram Webhook Status Check & Sync ===');
  console.log(`Relay Base: ${relayBase}`);
  console.log(`Bot Token: ${botToken ? `***${botToken.slice(-6)}` : '(not configured)'}`);
  console.log(`Target Webhook URL: ${targetWebhookUrl}`);
  console.log(`Webhook Secret Configured: ${Boolean(webhookSecret)}`);

  if (!botToken) {
    console.error('ERROR: TELEGRAM_ORDER_BOT_TOKEN or TELEGRAM_BOT_TOKEN is not set.');
    process.exit(1);
  }

  const apiUrl = `${relayBase}${botToken}`;

  // 1. Get current webhook info
  console.log('\n[1] Calling getWebhookInfo...');
  try {
    const infoRes = await fetch(`${apiUrl}/getWebhookInfo`);
    const infoData = await infoRes.json();
    console.log('Current Webhook Info:', JSON.stringify(infoData, null, 2));

    // 2. Register setWebhook
    console.log(`\n[2] Calling setWebhook to ${targetWebhookUrl}...`);
    const setRes = await fetch(`${apiUrl}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: targetWebhookUrl,
        ...(webhookSecret ? { secret_token: webhookSecret } : {}),
        allowed_updates: ['callback_query', 'message'],
        drop_pending_updates: false,
      }),
    });
    const setData = await setRes.json();
    console.log('setWebhook Result:', JSON.stringify(setData, null, 2));

    // 3. Verify getWebhookInfo
    console.log('\n[3] Verifying getWebhookInfo after update...');
    const verifyRes = await fetch(`${apiUrl}/getWebhookInfo`);
    const verifyData = await verifyRes.json();
    console.log('Updated Webhook Info:', JSON.stringify(verifyData, null, 2));

    if (verifyData.result?.url === targetWebhookUrl) {
      console.log('\nSUCCESS: Webhook is properly registered to ' + targetWebhookUrl);
    } else {
      console.warn('\nWARNING: Webhook URL does not match target. Result:', verifyData.result?.url);
    }
  } catch (error) {
    console.error('Network or Telegram API error:', error);
    process.exit(1);
  }
}

main();
