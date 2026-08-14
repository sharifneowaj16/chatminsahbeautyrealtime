import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import {
  isMetaNormalizedWebhookEvent,
  META_NORMALIZED_WEBHOOK_SCHEMA_VERSION,
} from '../../lib/meta-platform/contracts/webhook.ts';



async function loadProviderIdentityContracts() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase31-provider-identity-'));
  const contractDir = path.join(root, 'lib/meta-platform/contracts');
  const contextDir = path.join(root, 'lib/meta-platform/context');
  fs.mkdirSync(contractDir, { recursive: true });
  fs.mkdirSync(contextDir, { recursive: true });

  fs.copyFileSync('lib/meta-platform/context/asset-context.ts', path.join(contextDir, 'asset-context.ts'));
  const social = fs.readFileSync('lib/meta-platform/contracts/social.ts', 'utf8')
    .replace("from '../context/asset-context'", "from '../context/asset-context.ts'");
  fs.writeFileSync(path.join(contractDir, 'social.ts'), social);
  const pages = fs.readFileSync('lib/meta-platform/contracts/pages.ts', 'utf8')
    .replace("from './social'", "from './social.ts'");
  const pagesPath = path.join(contractDir, 'pages.ts');
  fs.writeFileSync(pagesPath, pages);

  const run = Date.now();
  const socialModule = await import(`${pathToFileURL(path.join(contractDir, 'social.ts')).href}?run=${run}`);
  const pagesModule = await import(`${pathToFileURL(pagesPath).href}?run=${run}`);
  return { ...socialModule, ...pagesModule };
}


async function loadInstagramContracts() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase31-instagram-contract-'));
  const contractDir = path.join(root, 'lib/meta-platform/contracts');
  const contextDir = path.join(root, 'lib/meta-platform/context');
  fs.mkdirSync(contractDir, { recursive: true });
  fs.mkdirSync(contextDir, { recursive: true });

  fs.copyFileSync('lib/meta-platform/context/asset-context.ts', path.join(contextDir, 'asset-context.ts'));
  const social = fs.readFileSync('lib/meta-platform/contracts/social.ts', 'utf8')
    .replace("from '../context/asset-context'", "from '../context/asset-context.ts'");
  fs.writeFileSync(path.join(contractDir, 'social.ts'), social);
  const pages = fs.readFileSync('lib/meta-platform/contracts/pages.ts', 'utf8')
    .replace("from './social'", "from './social.ts'");
  fs.writeFileSync(path.join(contractDir, 'pages.ts'), pages);
  const instagram = fs.readFileSync('lib/meta-platform/contracts/instagram.ts', 'utf8')
    .replace("from './pages'", "from './pages.ts'");
  const instagramPath = path.join(contractDir, 'instagram.ts');
  fs.writeFileSync(instagramPath, instagram);

  return import(`${pathToFileURL(instagramPath).href}?run=${Date.now()}`);
}

async function loadInstagramSendContract() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase31-instagram-send-contract-'));
  const contractDir = path.join(root, 'lib/meta-platform/contracts');
  const contextDir = path.join(root, 'lib/meta-platform/context');
  fs.mkdirSync(contractDir, { recursive: true });
  fs.mkdirSync(contextDir, { recursive: true });

  fs.copyFileSync('lib/meta-platform/context/asset-context.ts', path.join(contextDir, 'asset-context.ts'));
  const social = fs.readFileSync('lib/meta-platform/contracts/social.ts', 'utf8')
    .replace("from '../context/asset-context'", "from '../context/asset-context.ts'");
  fs.writeFileSync(path.join(contractDir, 'social.ts'), social);
  const pages = fs.readFileSync('lib/meta-platform/contracts/pages.ts', 'utf8')
    .replace("from './social'", "from './social.ts'");
  fs.writeFileSync(path.join(contractDir, 'pages.ts'), pages);
  const instagram = fs.readFileSync('lib/meta-platform/contracts/instagram.ts', 'utf8')
    .replace("from './pages'", "from './pages.ts'");
  fs.writeFileSync(path.join(contractDir, 'instagram.ts'), instagram);
  const send = fs.readFileSync('lib/meta-platform/contracts/instagram-send.ts', 'utf8')
    .replace("from './instagram'", "from './instagram.ts'")
    .replace("from './pages'", "from './pages.ts'");
  const sendPath = path.join(contractDir, 'instagram-send.ts');
  fs.writeFileSync(sendPath, send);

  return import(`${pathToFileURL(sendPath).href}?run=${Date.now()}`);
}

async function loadLeadContract() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase31-lead-contract-'));
  const contractDir = path.join(root, 'lib/meta-platform/contracts');
  const contextDir = path.join(root, 'lib/meta-platform/context');
  fs.mkdirSync(contractDir, { recursive: true });
  fs.mkdirSync(contextDir, { recursive: true });

  fs.copyFileSync('lib/meta-platform/context/asset-context.ts', path.join(contextDir, 'asset-context.ts'));
  const social = fs.readFileSync('lib/meta-platform/contracts/social.ts', 'utf8')
    .replace("from '../context/asset-context'", "from '../context/asset-context.ts'");
  fs.writeFileSync(path.join(contractDir, 'social.ts'), social);
  const pages = fs.readFileSync('lib/meta-platform/contracts/pages.ts', 'utf8')
    .replace("from './social'", "from './social.ts'");
  fs.writeFileSync(path.join(contractDir, 'pages.ts'), pages);
  const leads = fs.readFileSync('lib/meta-platform/contracts/leads.ts', 'utf8')
    .replace("from './social'", "from './social.ts'")
    .replace("from './pages'", "from './pages.ts'");
  const leadsPath = path.join(contractDir, 'leads.ts');
  fs.writeFileSync(leadsPath, leads);

  return import(`${pathToFileURL(leadsPath).href}?run=${Date.now()}`);
}

async function loadSocialErrorTaxonomy() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase31-social-errors-'));
  const coreDir = path.join(root, 'lib/meta-platform/core');
  const errorDir = path.join(root, 'lib/meta-platform/errors');
  fs.mkdirSync(coreDir, { recursive: true });
  fs.mkdirSync(errorDir, { recursive: true });

  fs.copyFileSync('lib/meta-platform/core/errors.ts', path.join(coreDir, 'errors.ts'));
  const socialErrors = fs.readFileSync('lib/meta-platform/errors/social-errors.ts', 'utf8')
    .replace("from '../core/errors'", "from '../core/errors.ts'");
  const socialErrorsPath = path.join(errorDir, 'social-errors.ts');
  fs.writeFileSync(socialErrorsPath, socialErrors);

  return import(`${pathToFileURL(socialErrorsPath).href}?run=${Date.now()}`);
}


async function loadSocialResultContract() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase31-social-result-'));
  const coreDir = path.join(root, 'lib/meta-platform/core');
  const errorDir = path.join(root, 'lib/meta-platform/errors');
  const contractDir = path.join(root, 'lib/meta-platform/contracts');
  fs.mkdirSync(coreDir, { recursive: true });
  fs.mkdirSync(errorDir, { recursive: true });
  fs.mkdirSync(contractDir, { recursive: true });

  fs.copyFileSync('lib/meta-platform/core/errors.ts', path.join(coreDir, 'errors.ts'));
  const socialErrors = fs.readFileSync('lib/meta-platform/errors/social-errors.ts', 'utf8')
    .replace("from '../core/errors'", "from '../core/errors.ts'");
  fs.writeFileSync(path.join(errorDir, 'social-errors.ts'), socialErrors);
  const socialResult = fs.readFileSync('lib/meta-platform/contracts/social-result.ts', 'utf8')
    .replace("from '../errors/social-errors'", "from '../errors/social-errors.ts'");
  const socialResultPath = path.join(contractDir, 'social-result.ts');
  fs.writeFileSync(socialResultPath, socialResult);

  const run = Date.now();
  const errorModule = await import(`${pathToFileURL(path.join(errorDir, 'social-errors.ts')).href}?run=${run}`);
  const resultModule = await import(`${pathToFileURL(socialResultPath).href}?run=${run}`);
  return { ...errorModule, ...resultModule };
}

async function loadReplyWindowPolicy() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase31-reply-window-policy-'));
  const contractDir = path.join(root, 'lib/meta-platform/contracts');
  const contextDir = path.join(root, 'lib/meta-platform/context');
  const policyDir = path.join(root, 'lib/meta-platform/policies');
  fs.mkdirSync(contractDir, { recursive: true });
  fs.mkdirSync(contextDir, { recursive: true });
  fs.mkdirSync(policyDir, { recursive: true });

  fs.copyFileSync('lib/meta-platform/context/asset-context.ts', path.join(contextDir, 'asset-context.ts'));
  const social = fs.readFileSync('lib/meta-platform/contracts/social.ts', 'utf8')
    .replace("from '../context/asset-context'", "from '../context/asset-context.ts'");
  fs.writeFileSync(path.join(contractDir, 'social.ts'), social);
  const pages = fs.readFileSync('lib/meta-platform/contracts/pages.ts', 'utf8')
    .replace("from './social'", "from './social.ts'");
  fs.writeFileSync(path.join(contractDir, 'pages.ts'), pages);
  const instagram = fs.readFileSync('lib/meta-platform/contracts/instagram.ts', 'utf8')
    .replace("from './pages'", "from './pages.ts'");
  fs.writeFileSync(path.join(contractDir, 'instagram.ts'), instagram);
  const send = fs.readFileSync('lib/meta-platform/contracts/instagram-send.ts', 'utf8')
    .replace("from './instagram'", "from './instagram.ts'")
    .replace("from './pages'", "from './pages.ts'");
  fs.writeFileSync(path.join(contractDir, 'instagram-send.ts'), send);
  const policy = fs.readFileSync('lib/meta-platform/policies/reply-window.ts', 'utf8')
    .replace("from '../contracts/instagram'", "from '../contracts/instagram.ts'")
    .replace("from '../contracts/instagram-send'", "from '../contracts/instagram-send.ts'");
  const policyPath = path.join(policyDir, 'reply-window.ts');
  fs.writeFileSync(policyPath, policy);

  const run = Date.now();
  const instagramModule = await import(`${pathToFileURL(path.join(contractDir, 'instagram.ts')).href}?run=${run}`);
  const sendModule = await import(`${pathToFileURL(path.join(contractDir, 'instagram-send.ts')).href}?run=${run}`);
  const policyModule = await import(`${pathToFileURL(policyPath).href}?run=${run}`);
  return { ...instagramModule, ...sendModule, ...policyModule };
}


async function loadAttachmentPolicy() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase31-attachment-policy-'));
  const contractDir = path.join(root, 'lib/meta-platform/contracts');
  const contextDir = path.join(root, 'lib/meta-platform/context');
  const policyDir = path.join(root, 'lib/meta-platform/policies');
  const mediaDir = path.join(root, 'lib/meta-platform/transports/media');
  fs.mkdirSync(contractDir, { recursive: true });
  fs.mkdirSync(contextDir, { recursive: true });
  fs.mkdirSync(policyDir, { recursive: true });
  fs.mkdirSync(mediaDir, { recursive: true });

  fs.copyFileSync('lib/meta-platform/context/asset-context.ts', path.join(contextDir, 'asset-context.ts'));
  const social = fs.readFileSync('lib/meta-platform/contracts/social.ts', 'utf8')
    .replace("from '../context/asset-context'", "from '../context/asset-context.ts'");
  fs.writeFileSync(path.join(contractDir, 'social.ts'), social);
  const pages = fs.readFileSync('lib/meta-platform/contracts/pages.ts', 'utf8')
    .replace("from './social'", "from './social.ts'");
  fs.writeFileSync(path.join(contractDir, 'pages.ts'), pages);
  const instagram = fs.readFileSync('lib/meta-platform/contracts/instagram.ts', 'utf8')
    .replace("from './pages'", "from './pages.ts'");
  fs.writeFileSync(path.join(contractDir, 'instagram.ts'), instagram);
  fs.copyFileSync('lib/meta-platform/transports/media/mime.ts', path.join(mediaDir, 'mime.ts'));
  const urlPolicy = fs.readFileSync('lib/meta-platform/transports/media/url-policy.ts', 'utf8')
    .replace("from './types'", "from './types.ts'");
  fs.writeFileSync(path.join(mediaDir, 'url-policy.ts'), urlPolicy);
  fs.copyFileSync('lib/meta-platform/transports/media/types.ts', path.join(mediaDir, 'types.ts'));
  const policy = fs.readFileSync('lib/meta-platform/policies/attachments.ts', 'utf8')
    .replace("from '../contracts/instagram'", "from '../contracts/instagram.ts'")
    .replace("from '../transports/media/mime'", "from '../transports/media/mime.ts'")
    .replace("from '../transports/media/url-policy'", "from '../transports/media/url-policy.ts'");
  const policyPath = path.join(policyDir, 'attachments.ts');
  fs.writeFileSync(policyPath, policy);

  const run = Date.now();
  const instagramModule = await import(`${pathToFileURL(path.join(contractDir, 'instagram.ts')).href}?run=${run}`);
  const policyModule = await import(`${pathToFileURL(policyPath).href}?run=${run}`);
  return { ...instagramModule, ...policyModule };
}

async function loadWebhookParser() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase31-webhook-contract-'));
  const contractDir = path.join(root, 'lib/meta-platform/contracts');
  const transportDir = path.join(root, 'lib/meta-platform/transports/webhook');
  fs.mkdirSync(contractDir, { recursive: true });
  fs.mkdirSync(transportDir, { recursive: true });

  fs.copyFileSync('lib/meta-platform/contracts/webhook.ts', path.join(contractDir, 'webhook.ts'));
  fs.copyFileSync('lib/meta-platform/transports/webhook/signature.ts', path.join(transportDir, 'signature.ts'));
  const routing = fs.readFileSync('lib/meta-platform/transports/webhook/routing.ts', 'utf8')
    .replace("from '../../contracts/webhook'", "from '../../contracts/webhook.ts'");
  fs.writeFileSync(path.join(transportDir, 'routing.ts'), routing);

  const parser = fs.readFileSync('lib/meta-platform/transports/webhook/parser.ts', 'utf8')
    .replace("from '../../contracts/webhook'", "from '../../contracts/webhook.ts'")
    .replace("from './routing'", "from './routing.ts'")
    .replace("from './signature'", "from './signature.ts'");
  const parserPath = path.join(transportDir, 'parser.ts');
  fs.writeFileSync(parserPath, parser);

  return import(`${pathToFileURL(parserPath).href}?run=${Date.now()}`);
}

test('shared transport emits the normalized Meta webhook contract for lead and messaging events', async () => {
  const { normalizeMetaWebhookNotifications, parseMetaWebhookEnvelope } = await loadWebhookParser();
  const rawBody = JSON.stringify({
    object: 'page',
    entry: [
      {
        id: 'page-1',
        time: 200,
        changes: [
          { field: 'leadgen', value: { form_id: 'form-1', leadgen_id: 'lead-1' } },
        ],
      },
      {
        id: 'page-1',
        time: 100,
        messaging: [
          {
            sender: { id: 'ig-user-1' },
            recipient: { id: 'page-1' },
            timestamp: 100,
            message: { mid: 'mid-1', text: 'Hello' },
          },
        ],
      },
    ],
  });

  const notifications = normalizeMetaWebhookNotifications(parseMetaWebhookEnvelope({ rawBody }));

  assert.equal(notifications.length, 2);
  assert.equal(notifications[0].schemaVersion, META_NORMALIZED_WEBHOOK_SCHEMA_VERSION);
  assert.equal(notifications[0].provider, 'META');
  assert.equal(notifications[0].transport, 'WEBHOOK');
  assert.equal(notifications[0].eventGroup, 'messaging');
  assert.equal(notifications[0].eventKind, 'MESSAGE');
  assert.equal(notifications[0].routingTarget, 'FACEBOOK_PAGE');
  assert.equal(notifications[0].providerEventId, 'mid-1');
  assert.equal(notifications[0].objectType, 'page');
  assert.equal(notifications[0].objectId, 'page-1');
  assert.equal(notifications[0].orderingKey, 'page-1');
  assert.equal(notifications[0].occurredAt, new Date(100_000).toISOString());
  assert.equal(isMetaNormalizedWebhookEvent(notifications[0]), true);

  assert.equal(notifications[1].eventGroup, 'changes');
  assert.equal(notifications[1].field, 'leadgen');
  assert.equal(notifications[1].eventKind, 'LEADGEN');
  assert.equal(notifications[1].routingTarget, 'LEAD_ADS');
  assert.equal(notifications[1].providerEventId, 'lead-1');
  assert.equal(isMetaNormalizedWebhookEvent(notifications[1]), true);
  assert.equal(Object.isFrozen(notifications), true);
  assert.equal(Object.isFrozen(notifications[0]), true);
  assert.equal(Object.isFrozen(notifications[0].payload), true);
});

test('event identity remains stable when provider object key order changes', async () => {
  const { normalizeMetaWebhookNotifications, parseMetaWebhookEnvelope } = await loadWebhookParser();
  const first = normalizeMetaWebhookNotifications(parseMetaWebhookEnvelope({
    rawBody: JSON.stringify({
      object: 'page',
      entry: [{
        id: 'page-1',
        time: 100,
        changes: [{ field: 'leadgen', value: { leadgen_id: 'lead-1', form_id: 'form-1' } }],
      }],
    }),
  }));
  const second = normalizeMetaWebhookNotifications(parseMetaWebhookEnvelope({
    rawBody: JSON.stringify({
      entry: [{
        changes: [{ value: { form_id: 'form-1', leadgen_id: 'lead-1' }, field: 'leadgen' }],
        time: 100,
        id: 'page-1',
      }],
      object: 'page',
    }),
  }));

  assert.equal(first[0].eventKey, second[0].eventKey);
  assert.notEqual(first[0].payloadDigest, second[0].payloadDigest);
});

test('runtime contract guard fails closed for malformed normalized events', () => {
  assert.equal(isMetaNormalizedWebhookEvent(null), false);
  assert.equal(isMetaNormalizedWebhookEvent({}), false);
  assert.equal(isMetaNormalizedWebhookEvent({
    schemaVersion: 1,
    provider: 'META',
    transport: 'WEBHOOK',
    eventKey: 'event-1',
    providerEventId: null,
    payloadDigest: 'digest',
    objectType: 'page',
    objectId: 'page-1',
    field: 'leadgen',
    eventGroup: 'unknown',
    occurredAt: null,
    orderingKey: 'page-1',
    entryIndex: 0,
    eventIndex: 0,
    payload: {},
  }), false);
});


test('provider identities normalize all Phase 31 social asset classes and stable keys', async () => {
  const {
    createMetaProviderIdentity,
    isMetaProviderIdentity,
    isSameMetaProviderIdentity,
    META_PROVIDER_IDENTITY_TYPES,
  } = await loadProviderIdentityContracts();

  const identities = META_PROVIDER_IDENTITY_TYPES.map((assetType) => createMetaProviderIdentity({
    environment: 'PRODUCTION',
    connectionKey: 'primary',
    assetType,
    providerId: assetType === 'AD_ACCOUNT' ? 'act_12345' : `${assetType.toLowerCase()}-1`,
  }));

  assert.deepEqual(identities.map((identity) => identity.assetType), [
    'APP', 'BUSINESS', 'AD_ACCOUNT', 'PAGE', 'INSTAGRAM_ACCOUNT',
  ]);
  assert.equal(identities[0].appId, 'app-1');
  assert.equal(identities[1].businessId, 'business-1');
  assert.equal(identities[2].providerId, '12345');
  assert.equal(identities[2].graphId, 'act_12345');
  assert.equal(identities[3].pageId, 'page-1');
  assert.equal(identities[4].pageId, null);
  assert.equal(identities.every(isMetaProviderIdentity), true);
  assert.equal(isSameMetaProviderIdentity(identities[2], createMetaProviderIdentity({
    environment: 'PRODUCTION',
    connectionKey: 'primary',
    assetType: 'AD_ACCOUNT',
    providerId: '12345',
  })), true);
  assert.equal(Object.isFrozen(identities[0]), true);
});

test('provider identity guard rejects mismatched self and Graph identity', async () => {
  const { createMetaProviderIdentity, isMetaProviderIdentity } = await loadProviderIdentityContracts();

  assert.throws(() => createMetaProviderIdentity({
    environment: 'PRODUCTION',
    connectionKey: 'primary',
    assetType: 'PAGE',
    providerId: 'page-1',
    pageId: 'page-2',
  }), /META_PROVIDER_PAGE_IDENTITY_MISMATCH/);

  const account = createMetaProviderIdentity({
    environment: 'PRODUCTION',
    connectionKey: 'primary',
    assetType: 'AD_ACCOUNT',
    providerId: 'act_12345',
  });
  assert.equal(isMetaProviderIdentity({ ...account, graphId: '12345' }), false);
  assert.equal(isMetaProviderIdentity({ ...account, identityKey: 'forged' }), false);
});

test('Page and Instagram binding enforces one environment, connection and parent Page', async () => {
  const { createMetaPageAccountBinding, isMetaPageAccountBinding } = await loadProviderIdentityContracts();
  const binding = createMetaPageAccountBinding({
    page: {
      environment: 'PRODUCTION',
      connectionKey: 'primary',
      assetType: 'PAGE',
      providerId: 'page-1',
      appId: 'app-1',
      businessId: 'business-1',
      displayName: 'Minsah Beauty',
    },
    instagramAccount: {
      environment: 'PRODUCTION',
      connectionKey: 'primary',
      assetType: 'INSTAGRAM_ACCOUNT',
      providerId: 'ig-1',
      appId: 'app-1',
      businessId: 'business-1',
      username: 'minsahbeauty',
    },
  });

  assert.equal(binding.page.pageId, 'page-1');
  assert.equal(binding.instagramAccount?.pageId, 'page-1');
  assert.equal(binding.bindingKey, 'PRODUCTION:primary:PAGE:page-1:INSTAGRAM:ig-1');
  assert.equal(isMetaPageAccountBinding(binding), true);
  assert.equal(Object.isFrozen(binding), true);

  assert.throws(() => createMetaPageAccountBinding({
    page: {
      environment: 'PRODUCTION',
      connectionKey: 'primary',
      assetType: 'PAGE',
      providerId: 'page-1',
    },
    instagramAccount: {
      environment: 'STAGING',
      connectionKey: 'primary',
      assetType: 'INSTAGRAM_ACCOUNT',
      providerId: 'ig-1',
    },
  }), /META_PAGE_INSTAGRAM_ENVIRONMENT_MISMATCH/);

  assert.throws(() => createMetaPageAccountBinding({
    page: {
      environment: 'PRODUCTION',
      connectionKey: 'primary',
      assetType: 'PAGE',
      providerId: 'page-1',
    },
    instagramAccount: {
      environment: 'PRODUCTION',
      connectionKey: 'secondary',
      assetType: 'INSTAGRAM_ACCOUNT',
      providerId: 'ig-1',
    },
  }), /META_PAGE_INSTAGRAM_CONNECTION_MISMATCH/);

  assert.throws(() => createMetaPageAccountBinding({
    page: {
      environment: 'PRODUCTION',
      connectionKey: 'primary',
      assetType: 'PAGE',
      providerId: 'page-1',
    },
    instagramAccount: {
      environment: 'PRODUCTION',
      connectionKey: 'primary',
      assetType: 'INSTAGRAM_ACCOUNT',
      providerId: 'ig-1',
      pageId: 'page-2',
    },
  }), /META_PAGE_INSTAGRAM_PAGE_MISMATCH/);

  assert.throws(() => createMetaPageAccountBinding({
    page: {
      environment: 'PRODUCTION',
      connectionKey: 'primary',
      assetType: 'PAGE',
      providerId: 'page-1',
      businessId: 'business-1',
    },
    instagramAccount: {
      environment: 'PRODUCTION',
      connectionKey: 'primary',
      assetType: 'INSTAGRAM_ACCOUNT',
      providerId: 'ig-1',
      businessId: 'business-2',
    },
  }), /META_PAGE_INSTAGRAM_BUSINESS_MISMATCH/);

  assert.throws(() => createMetaPageAccountBinding({
    page: {
      environment: 'PRODUCTION',
      connectionKey: 'primary',
      assetType: 'PAGE',
      providerId: 'page-1',
      appId: 'app-1',
    },
    instagramAccount: {
      environment: 'PRODUCTION',
      connectionKey: 'primary',
      assetType: 'INSTAGRAM_ACCOUNT',
      providerId: 'ig-1',
      appId: 'app-2',
    },
  }), /META_PAGE_INSTAGRAM_APP_MISMATCH/);

  assert.equal(isMetaPageAccountBinding({ ...binding, bindingKey: 'forged' }), false);
});


test('Lead Ads payload contract normalizes provider fields, identity and safe contact projections', async () => {
  const { createMetaLeadPayload, isMetaNormalizedLeadPayload } = await loadLeadContract();
  const lead = createMetaLeadPayload({
    page: {
      environment: 'PRODUCTION',
      connectionKey: 'primary',
      assetType: 'PAGE',
      providerId: 'page-1',
      appId: 'app-1',
      businessId: 'business-1',
      displayName: 'Minsah Beauty',
    },
    providerPayload: {
      id: 'lead-1',
      created_time: '2026-07-23T18:30:00+00:00',
      form_id: 'form-1',
      ad_id: 'ad-1',
      ad_name: 'Summer Lead Ad',
      adset_id: 'adset-1',
      adset_name: 'Dhaka Beauty',
      campaign_id: 'campaign-1',
      campaign_name: 'Lead Campaign',
      platform: 'fb',
      is_organic: false,
      field_data: [
        { name: 'First Name', values: ['  Ayesha '] },
        { name: 'Last Name', values: ['Rahman'] },
        { name: 'Phone Number', values: ['01712-345678'] },
        { name: 'Email', values: [' AYESHA@example.com '] },
        { name: 'City', values: ['Dhaka'] },
        { name: 'Which product are you interested in?', values: ['Serum'] },
        { name: 'Skin Type', values: ['Dry'] },
        { name: 'Skin Type', values: ['Dry', 'Sensitive'] },
      ],
    },
  });

  assert.equal(lead.schemaVersion, 1);
  assert.equal(lead.provider, 'META');
  assert.equal(lead.leadKey, 'PRODUCTION:primary:PAGE:page-1:LEAD:lead-1');
  assert.equal(lead.page.pageId, 'page-1');
  assert.equal(lead.createdAt, '2026-07-23T18:30:00.000Z');
  assert.equal(lead.attribution.formId, 'form-1');
  assert.equal(lead.attribution.sourceChannel, 'FACEBOOK');
  assert.equal(lead.contact.phoneCountryCode, '880');
  assert.equal(lead.contact.fullName, 'Ayesha Rahman');
  assert.equal(lead.contact.phone, '+8801712345678');
  assert.equal(lead.contact.phoneHash?.length, 64);
  assert.equal(lead.contact.phoneMasked?.endsWith('5678'), true);
  assert.equal(lead.contact.email, 'ayesha@example.com');
  assert.equal(lead.contact.emailHash?.length, 64);
  assert.equal(lead.contact.emailMasked, 'ay****@example.com');
  assert.equal(lead.productInterest, 'Serum');
  assert.deepEqual(lead.customFields.skin_type, ['Dry', 'Sensitive']);
  assert.equal(lead.fields.filter((field) => field.name === 'skin_type').length, 1);
  assert.equal(isMetaNormalizedLeadPayload(lead), true);
  assert.equal(Object.isFrozen(lead), true);
  assert.equal(Object.isFrozen(lead.page), true);
  assert.equal(Object.isFrozen(lead.fields), true);
  assert.equal(Object.isFrozen(lead.fields[0].values), true);
  assert.equal(Object.isFrozen(lead.contact), true);
  assert.equal(Object.isFrozen(lead.attribution), true);
  assert.equal(Object.isFrozen(lead.customFields), true);
});

test('Lead Ads payload contract supports fallback form identity and provider time/channel variants', async () => {
  const { createMetaLeadPayload } = await loadLeadContract();
  const lead = createMetaLeadPayload({
    page: {
      environment: 'STAGING',
      connectionKey: 'shadow',
      assetType: 'PAGE',
      providerId: 'page-2',
    },
    fallbackFormId: 'form-fallback',
    providerPayload: {
      id: 'lead-2',
      created_time: 1_721_758_400,
      platform: 'Instagram',
      is_organic: true,
      field_data: [
        { name: 'Phone', values: ['not-a-phone'] },
        { name: 'Email', values: ['not-an-email'] },
      ],
    },
  });

  assert.equal(lead.attribution.formId, 'form-fallback');
  assert.equal(lead.attribution.sourceChannel, 'INSTAGRAM');
  assert.equal(lead.attribution.isOrganic, true);
  assert.equal(lead.createdAt, '2024-07-23T18:13:20.000Z');
  assert.equal(lead.contact.phone, null);
  assert.equal(lead.contact.email, null);

  const internationalLead = createMetaLeadPayload({
    page: {
      environment: 'STAGING',
      connectionKey: 'shadow',
      assetType: 'PAGE',
      providerId: 'page-2',
    },
    fallbackFormId: 'form-fallback',
    defaultCountryCode: '44',
    providerPayload: {
      id: 'lead-3',
      field_data: [{ name: 'Phone', values: ['07123 456789'] }],
    },
  });
  assert.equal(internationalLead.contact.phoneCountryCode, '44');
  assert.equal(internationalLead.contact.phone, '+447123456789');
  assert.equal((await loadLeadContract()).isMetaNormalizedLeadPayload(internationalLead), true);
});

test('Lead Ads payload guard and limits fail closed for forged or unsafe provider values', async () => {
  const {
    createMetaLeadPayload,
    isMetaNormalizedLeadPayload,
    META_LEAD_FIELD_LIMIT,
    META_LEAD_FIELD_VALUE_LIMIT,
  } = await loadLeadContract();
  const base = {
    page: {
      environment: 'PRODUCTION',
      connectionKey: 'primary',
      assetType: 'PAGE',
      providerId: 'page-1',
    },
    providerPayload: {
      id: 'lead-1',
      form_id: 'form-1',
      field_data: [],
    },
  };
  const lead = createMetaLeadPayload(base);

  assert.equal(isMetaNormalizedLeadPayload({ ...lead, leadKey: 'forged' }), false);
  assert.equal(isMetaNormalizedLeadPayload({ ...lead, leadId: 'lead-2' }), false);
  assert.equal(isMetaNormalizedLeadPayload({ ...lead, extra: true }), false);
  assert.throws(() => createMetaLeadPayload({
    ...base,
    providerPayload: { ...base.providerPayload, form_id: undefined },
  }), /META_LEAD_FORM_ID_REQUIRED/);
  assert.throws(() => createMetaLeadPayload({
    ...base,
    providerPayload: { ...base.providerPayload, is_organic: 'yes' },
  }), /META_LEAD_ORGANIC_FLAG_INVALID/);
  assert.throws(() => createMetaLeadPayload({
    ...base,
    providerPayload: {
      ...base.providerPayload,
      field_data: Array.from({ length: META_LEAD_FIELD_LIMIT + 1 }, (_, index) => ({ name: `field-${index}`, values: ['x'] })),
    },
  }), /META_LEAD_FIELD_LIMIT_EXCEEDED/);
  assert.throws(() => createMetaLeadPayload({
    ...base,
    providerPayload: {
      ...base.providerPayload,
      field_data: [{ name: 'field', values: Array.from({ length: META_LEAD_FIELD_VALUE_LIMIT + 1 }, () => 'x') }],
    },
  }), /META_LEAD_FIELD_VALUE_LIMIT_EXCEEDED/);
});

test('Instagram conversation contract derives stable account-scoped identity and policy timestamps', async () => {
  const {
    createMetaInstagramConversation,
    isMetaNormalizedInstagramConversation,
  } = await loadInstagramContracts();
  const conversation = createMetaInstagramConversation({
    binding: {
      page: {
        environment: 'PRODUCTION',
        connectionKey: 'primary',
        assetType: 'PAGE',
        providerId: 'page-1',
        appId: 'app-1',
        businessId: 'business-1',
      },
      instagramAccount: {
        environment: 'PRODUCTION',
        connectionKey: 'primary',
        assetType: 'INSTAGRAM_ACCOUNT',
        providerId: 'ig-account-1',
        pageId: 'page-1',
        appId: 'app-1',
        businessId: 'business-1',
      },
    },
    participant: {
      providerId: 'ig-user-1',
      username: '  ayesha.beauty  ',
      displayName: '  Ayesha   Rahman ',
    },
    providerConversationId: 'thread-1',
    status: 'PENDING',
    lastMessageAt: 1_721_758_000,
    lastInboundAt: '2024-07-23T18:30:00.000Z',
    replyWindowExpiresAt: '2024-07-24T18:30:00.000Z',
  });

  assert.equal(conversation.schemaVersion, 1);
  assert.equal(conversation.provider, 'META');
  assert.equal(conversation.channel, 'INSTAGRAM');
  assert.equal(conversation.conversationKey, 'PRODUCTION:primary:INSTAGRAM_ACCOUNT:ig-account-1:CONVERSATION:ig-user-1');
  assert.equal(conversation.participant.participantKey, 'PRODUCTION:primary:INSTAGRAM_ACCOUNT:ig-account-1:PARTICIPANT:ig-user-1');
  assert.equal(conversation.participant.username, 'ayesha.beauty');
  assert.equal(conversation.participant.displayName, 'Ayesha Rahman');
  assert.equal(conversation.lastMessageAt, '2024-07-23T18:06:40.000Z');
  assert.equal(conversation.status, 'PENDING');
  assert.equal(isMetaNormalizedInstagramConversation(conversation), true);
  assert.equal(Object.isFrozen(conversation), true);
  assert.equal(Object.isFrozen(conversation.page), true);
  assert.equal(Object.isFrozen(conversation.account), true);
  assert.equal(Object.isFrozen(conversation.participant), true);
});

test('Instagram message contract normalizes inbound message, attachment and receipt trace metadata', async () => {
  const {
    createMetaInstagramMessage,
    isMetaNormalizedInstagramMessage,
  } = await loadInstagramContracts();
  const binding = {
    page: {
      environment: 'PRODUCTION',
      connectionKey: 'primary',
      assetType: 'PAGE',
      providerId: 'page-1',
    },
    instagramAccount: {
      environment: 'PRODUCTION',
      connectionKey: 'primary',
      assetType: 'INSTAGRAM_ACCOUNT',
      providerId: 'ig-account-1',
      pageId: 'page-1',
    },
  };
  const message = createMetaInstagramMessage({
    binding,
    participant: { providerId: 'ig-user-1', username: 'ayesha' },
    providerMessageId: 'mid-1',
    sourceEventKey: 'webhook-event-1',
    sourcePayloadDigest: 'A'.repeat(64),
    eventType: 'MESSAGE',
    senderId: 'ig-user-1',
    recipientId: 'ig-account-1',
    direction: 'INBOUND',
    messageType: 'IMAGE',
    text: '  Serum   price? ',
    sentAt: 1_721_758_000_000,
    replyToProviderMessageId: 'mid-0',
    attachments: [{
      externalId: 'attachment-1',
      type: 'IMAGE',
      url: 'https://lookaside.fbsbx.com/ig_messaging_cdn/?asset=1',
      mimeType: 'IMAGE/JPEG',
      fileName: ' serum-photo.jpg ',
      fileSize: 2048,
      thumbnailUrl: 'https://lookaside.fbsbx.com/thumbnail/1',
    }],
  });

  assert.equal(message.messageKey, 'PRODUCTION:primary:INSTAGRAM_ACCOUNT:ig-account-1:CONVERSATION:ig-user-1:MESSAGE:mid-1');
  assert.equal(message.conversationKey, 'PRODUCTION:primary:INSTAGRAM_ACCOUNT:ig-account-1:CONVERSATION:ig-user-1');
  assert.equal(message.sourcePayloadDigest, 'a'.repeat(64));
  assert.equal(message.text, 'Serum price?');
  assert.equal(message.sentAt, '2024-07-23T18:06:40.000Z');
  assert.equal(message.attachments[0].attachmentKey, `${message.messageKey}:ATTACHMENT:attachment-1`);
  assert.equal(message.attachments[0].mimeType, 'image/jpeg');
  assert.equal(message.attachments[0].fileName, 'serum-photo.jpg');
  assert.equal(isMetaNormalizedInstagramMessage(message), true);
  assert.equal(Object.isFrozen(message), true);
  assert.equal(Object.isFrozen(message.attachments), true);
  assert.equal(Object.isFrozen(message.attachments[0]), true);
});

test('Instagram comment and outbound directions are explicit and account-consistent', async () => {
  const { createMetaInstagramMessage } = await loadInstagramContracts();
  const binding = {
    page: {
      environment: 'STAGING', connectionKey: 'social', assetType: 'PAGE', providerId: 'page-9',
    },
    instagramAccount: {
      environment: 'STAGING', connectionKey: 'social', assetType: 'INSTAGRAM_ACCOUNT', providerId: 'ig-9', pageId: 'page-9',
    },
  };
  const comment = createMetaInstagramMessage({
    binding,
    participant: { providerId: 'user-9' },
    providerMessageId: 'comment:comment-9',
    eventType: 'COMMENT',
    senderId: 'user-9',
    recipientId: 'ig-9',
    direction: 'INBOUND',
    messageType: 'COMMENT_PRIVATE_REPLY',
    text: 'Price please',
    sentAt: '2026-07-23T20:00:00.000Z',
    commentId: 'comment-9',
    postId: 'post-9',
  });
  const outbound = createMetaInstagramMessage({
    binding,
    participant: { providerId: 'user-9' },
    providerMessageId: 'mid-out-9',
    eventType: 'MESSAGE',
    senderId: 'ig-9',
    recipientId: 'user-9',
    direction: 'OUTBOUND',
    messageType: 'TEXT',
    text: 'Sent in DM',
    sentAt: '2026-07-23T20:01:00.000Z',
    commentId: 'comment-9',
  });

  assert.equal(comment.eventType, 'COMMENT');
  assert.equal(comment.commentId, 'comment-9');
  assert.equal(outbound.direction, 'OUTBOUND');
  assert.equal(outbound.senderId, outbound.account.providerId);
  assert.equal(outbound.recipientId, outbound.participant.providerId);
});

test('Instagram runtime contracts fail closed for forged identity, direction and attachment limits', async () => {
  const {
    createMetaInstagramConversation,
    createMetaInstagramMessage,
    isMetaNormalizedInstagramConversation,
    isMetaNormalizedInstagramMessage,
    META_INSTAGRAM_ATTACHMENT_LIMIT,
  } = await loadInstagramContracts();
  const binding = {
    page: {
      environment: 'PRODUCTION', connectionKey: 'primary', assetType: 'PAGE', providerId: 'page-1',
    },
    instagramAccount: {
      environment: 'PRODUCTION', connectionKey: 'primary', assetType: 'INSTAGRAM_ACCOUNT', providerId: 'ig-account-1', pageId: 'page-1',
    },
  };
  const conversation = createMetaInstagramConversation({
    binding,
    participant: { providerId: 'ig-user-1' },
  });
  const message = createMetaInstagramMessage({
    binding,
    participant: { providerId: 'ig-user-1' },
    providerMessageId: 'mid-1',
    eventType: 'MESSAGE',
    senderId: 'ig-user-1',
    recipientId: 'ig-account-1',
    direction: 'INBOUND',
    messageType: 'TEXT',
    text: 'Hello',
    sentAt: '2026-07-23T20:00:00.000Z',
  });

  assert.equal(isMetaNormalizedInstagramConversation({ ...conversation, conversationKey: 'forged' }), false);
  assert.equal(isMetaNormalizedInstagramConversation({ ...conversation, extra: true }), false);
  assert.equal(isMetaNormalizedInstagramMessage({ ...message, messageKey: 'forged' }), false);
  assert.equal(isMetaNormalizedInstagramMessage({ ...message, senderId: 'ig-account-1' }), false);
  assert.equal(isMetaNormalizedInstagramMessage({ ...message, extra: true }), false);
  assert.throws(() => createMetaInstagramConversation({
    binding,
    participant: { providerId: 'ig-account-1' },
  }), /META_INSTAGRAM_PARTICIPANT_ACCOUNT_COLLISION/);
  assert.throws(() => createMetaInstagramMessage({
    binding,
    participant: { providerId: 'ig-user-1' },
    providerMessageId: 'mid-2',
    eventType: 'MESSAGE',
    senderId: 'ig-account-1',
    recipientId: 'ig-user-1',
    direction: 'INBOUND',
    messageType: 'TEXT',
    text: 'Wrong direction',
    sentAt: '2026-07-23T20:00:00.000Z',
  }), /META_INSTAGRAM_DIRECTION_IDENTITY_MISMATCH/);
  assert.throws(() => createMetaInstagramMessage({
    binding,
    participant: { providerId: 'ig-user-1' },
    providerMessageId: 'mid-3',
    eventType: 'MESSAGE',
    senderId: 'ig-user-1',
    recipientId: 'ig-account-1',
    direction: 'INBOUND',
    messageType: 'IMAGE',
    sentAt: '2026-07-23T20:00:00.000Z',
    attachments: Array.from({ length: META_INSTAGRAM_ATTACHMENT_LIMIT + 1 }, (_, index) => ({ type: 'IMAGE', externalId: `a-${index}` })),
  }), /META_INSTAGRAM_ATTACHMENT_LIMIT_EXCEEDED/);
});

test('Instagram send request contract normalizes idempotent account-scoped message replies', async () => {
  const {
    createMetaInstagramSendRequest,
    isMetaNormalizedInstagramSendRequest,
  } = await loadInstagramSendContract();
  const conversationKey = 'PRODUCTION:primary:INSTAGRAM_ACCOUNT:ig-account-1:CONVERSATION:ig-user-1';
  const request = createMetaInstagramSendRequest({
    binding: {
      page: {
        environment: 'PRODUCTION', connectionKey: 'primary', assetType: 'PAGE', providerId: 'page-1',
      },
      instagramAccount: {
        environment: 'PRODUCTION', connectionKey: 'primary', assetType: 'INSTAGRAM_ACCOUNT', providerId: 'ig-account-1', pageId: 'page-1',
      },
    },
    participant: { providerId: 'ig-user-1', username: ' ayesha ' },
    idempotencyKey: 'ig-reply:request-1',
    mode: 'MESSAGE',
    text: '  Your serum is available.  ',
    sourceMessageKey: `${conversationKey}:MESSAGE:mid-in-1`,
    sourceProviderMessageId: 'mid-in-1',
    requestedAt: 1_721_758_000,
    correlationId: ' ig-reply:correlation-1 ',
    actorType: 'ADMIN',
    actorId: 'admin-1',
  });

  assert.equal(request.schemaVersion, 1);
  assert.equal(request.provider, 'META');
  assert.equal(request.channel, 'INSTAGRAM');
  assert.equal(request.sendKey, 'PRODUCTION:primary:INSTAGRAM_ACCOUNT:ig-account-1:SEND:ig-reply:request-1');
  assert.equal(request.conversationKey, conversationKey);
  assert.equal(request.mode, 'MESSAGE');
  assert.equal(request.text, 'Your serum is available.');
  assert.equal(request.textHash.length, 64);
  assert.equal(request.sourceProviderMessageId, 'mid-in-1');
  assert.equal(request.requestedAt, '2024-07-23T18:06:40.000Z');
  assert.equal(request.correlationId, 'ig-reply:correlation-1');
  assert.equal(request.actorType, 'ADMIN');
  assert.equal(request.actorId, 'admin-1');
  assert.equal(isMetaNormalizedInstagramSendRequest(request), true);
  assert.equal(Object.isFrozen(request), true);
  assert.equal(Object.isFrozen(request.page), true);
  assert.equal(Object.isFrozen(request.account), true);
  assert.equal(Object.isFrozen(request.participant), true);
});

test('Instagram private reply request requires explicit comment identity and supports system actors', async () => {
  const { createMetaInstagramSendRequest } = await loadInstagramSendContract();
  const request = createMetaInstagramSendRequest({
    binding: {
      page: {
        environment: 'STAGING', connectionKey: 'social', assetType: 'PAGE', providerId: 'page-9',
      },
      instagramAccount: {
        environment: 'STAGING', connectionKey: 'social', assetType: 'INSTAGRAM_ACCOUNT', providerId: 'ig-9', pageId: 'page-9',
      },
    },
    participant: { providerId: 'user-9' },
    idempotencyKey: 'ig-private:comment-9',
    mode: 'PRIVATE_REPLY',
    text: 'Sent details in DM.',
    sourceProviderMessageId: 'comment:comment-9',
    sourceCommentId: 'comment-9',
    sourcePostId: 'post-9',
    requestedAt: '2026-07-23T20:01:00.000Z',
    correlationId: 'ig-private:correlation-9',
    actorType: 'SYSTEM',
  });

  assert.equal(request.mode, 'PRIVATE_REPLY');
  assert.equal(request.sourceCommentId, 'comment-9');
  assert.equal(request.sourcePostId, 'post-9');
  assert.equal(request.actorType, 'SYSTEM');
  assert.equal(request.actorId, null);
});

test('Instagram send request guard fails closed for ambiguous, forged or cross-conversation replies', async () => {
  const {
    createMetaInstagramSendRequest,
    isMetaNormalizedInstagramSendRequest,
    META_INSTAGRAM_SEND_TEXT_MAX_LENGTH,
  } = await loadInstagramSendContract();
  const binding = {
    page: {
      environment: 'PRODUCTION', connectionKey: 'primary', assetType: 'PAGE', providerId: 'page-1',
    },
    instagramAccount: {
      environment: 'PRODUCTION', connectionKey: 'primary', assetType: 'INSTAGRAM_ACCOUNT', providerId: 'ig-account-1', pageId: 'page-1',
    },
  };
  const base = {
    binding,
    participant: { providerId: 'ig-user-1' },
    idempotencyKey: 'ig-reply:request-1',
    mode: 'MESSAGE',
    text: 'Hello',
    requestedAt: '2026-07-23T20:00:00.000Z',
    correlationId: 'ig-reply:correlation-1',
    actorType: 'ADMIN',
    actorId: 'admin-1',
  };
  const request = createMetaInstagramSendRequest(base);

  assert.equal(isMetaNormalizedInstagramSendRequest({ ...request, sendKey: 'forged' }), false);
  assert.equal(isMetaNormalizedInstagramSendRequest({ ...request, textHash: '0'.repeat(64) }), false);
  assert.equal(isMetaNormalizedInstagramSendRequest({ ...request, extra: true }), false);
  assert.throws(() => createMetaInstagramSendRequest({
    ...base,
    idempotencyKey: 'short',
  }), /META_INSTAGRAM_SEND_IDEMPOTENCY_KEY_INVALID/);
  assert.throws(() => createMetaInstagramSendRequest({
    ...base,
    mode: 'PRIVATE_REPLY',
  }), /META_INSTAGRAM_SEND_PRIVATE_REPLY_COMMENT_REQUIRED/);
  assert.throws(() => createMetaInstagramSendRequest({
    ...base,
    sourceMessageKey: 'PRODUCTION:primary:INSTAGRAM_ACCOUNT:other:CONVERSATION:user:MESSAGE:mid-1',
  }), /META_INSTAGRAM_SEND_SOURCE_CONVERSATION_MISMATCH/);
  assert.throws(() => createMetaInstagramSendRequest({
    ...base,
    sourceMessageKey: 'PRODUCTION:primary:INSTAGRAM_ACCOUNT:ig-account-1:CONVERSATION:ig-user-1:MESSAGE:mid-1',
    sourceProviderMessageId: 'mid-2',
  }), /META_INSTAGRAM_SEND_SOURCE_PROVIDER_MESSAGE_MISMATCH/);
  assert.throws(() => createMetaInstagramSendRequest({
    ...base,
    text: 'x'.repeat(META_INSTAGRAM_SEND_TEXT_MAX_LENGTH + 1),
  }), /META_INSTAGRAM_SEND_TEXT_INVALID/);
  assert.throws(() => createMetaInstagramSendRequest({
    ...base,
    actorId: undefined,
  }), /META_INSTAGRAM_SEND_ADMIN_ACTOR_REQUIRED/);
});

test('social provider taxonomy normalizes Graph authentication and rate-limit failures without leaking provider messages', async () => {
  const {
    normalizeMetaSocialProviderError,
    isMetaSocialProviderError,
  } = await loadSocialErrorTaxonomy();
  const authentication = normalizeMetaSocialProviderError({
    error: {
      error: {
        message: 'Invalid OAuth access token EAABSECRET access_token=secret-value',
        type: 'OAuthException',
        code: 190,
        error_subcode: 463,
        fbtrace_id: 'trace-auth-1',
      },
    },
    domain: 'LEADS',
    operation: 'LEADS_RETRIEVE',
    requestKind: 'READ',
    correlationId: 'lead:correlation-1',
  });

  assert.equal(authentication.code, 'META_SOCIAL_AUTHENTICATION_FAILED');
  assert.equal(authentication.category, 'AUTHENTICATION');
  assert.equal(authentication.kind, 'AUTHENTICATION');
  assert.equal(authentication.disposition, 'BLOCKED');
  assert.equal(authentication.retryable, false);
  assert.equal(authentication.safeDetails?.providerCode, 190);
  assert.equal(authentication.safeDetails?.providerSubcode, 463);
  assert.equal(authentication.safeDetails?.traceId, 'trace-auth-1');
  assert.equal(JSON.stringify(authentication).includes('EAABSECRET'), false);
  assert.equal(JSON.stringify(authentication).includes('secret-value'), false);
  assert.equal(isMetaSocialProviderError(authentication), true);

  const rateLimit = normalizeMetaSocialProviderError({
    error: { error: { message: 'Application request limit reached', code: 613, is_transient: true } },
    domain: 'INSTAGRAM',
    operation: 'INSTAGRAM_SEND_REPLY',
    requestKind: 'WRITE',
    headers: { 'Retry-After': '12' },
  });
  assert.equal(rateLimit.kind, 'RATE_LIMIT');
  assert.equal(rateLimit.disposition, 'RETRYABLE_FAILURE');
  assert.equal(rateLimit.retryable, true);
  assert.equal(rateLimit.safeDetails?.retryAfterMs, 12_000);

  const invalidRequest = normalizeMetaSocialProviderError({
    error: { error: { message: 'Invalid parameter.', code: 100 } },
    domain: 'FACEBOOK_PAGE',
    operation: 'FACEBOOK_PROFILE_LOOKUP',
    requestKind: 'READ',
  });
  assert.equal(invalidRequest.kind, 'INVALID_REQUEST');
  assert.equal(invalidRequest.category, 'VALIDATION');
  assert.equal(invalidRequest.retryable, false);
});

test('social provider taxonomy maps legacy Lead Ads, Instagram policy and media errors to shared kinds', async () => {
  const { normalizeMetaSocialProviderError } = await loadSocialErrorTaxonomy();
  const lead = normalizeMetaSocialProviderError({
    error: Object.assign(new Error('Meta lead is unavailable.'), {
      name: 'MetaLeadFetchError',
      code: 'META_LEAD_NOT_FOUND',
      retrievalStatus: 'NOT_FOUND',
      permanent: true,
      httpStatus: 404,
      traceId: 'trace-lead-1',
    }),
    domain: 'LEADS',
    operation: 'LEADS_RETRIEVE',
    requestKind: 'READ',
  });
  assert.equal(lead.kind, 'RESOURCE_NOT_FOUND');
  assert.equal(lead.disposition, 'PERMANENT_FAILURE');
  assert.equal(lead.safeDetails?.sourceCode, 'META_LEAD_NOT_FOUND');

  const replyWindow = normalizeMetaSocialProviderError({
    error: Object.assign(new Error('INSTAGRAM_REPLY_BLOCKED:WINDOW_EXPIRED'), { code: 'WINDOW_EXPIRED' }),
    domain: 'INSTAGRAM',
    operation: 'INSTAGRAM_SEND_REPLY',
    requestKind: 'WRITE',
  });
  assert.equal(replyWindow.kind, 'REPLY_WINDOW_EXPIRED');
  assert.equal(replyWindow.disposition, 'BLOCKED');

  const attachment = normalizeMetaSocialProviderError({
    error: Object.assign(new Error('Unsafe media rejected.'), { code: 'META_ATTACHMENT_MIME_INVALID' }),
    domain: 'REALTIME',
    operation: 'REALTIME_VALIDATE_ATTACHMENT',
    requestKind: 'READ',
  });
  assert.equal(attachment.kind, 'ATTACHMENT_REJECTED');
  assert.equal(attachment.disposition, 'BLOCKED');
});

test('social provider taxonomy requires reconciliation instead of blind retry for unknown write outcomes', async () => {
  const { normalizeMetaSocialProviderError } = await loadSocialErrorTaxonomy();
  const error = normalizeMetaSocialProviderError({
    error: Object.assign(new Error('request timed out'), { name: 'AbortError', code: 'ETIMEDOUT' }),
    domain: 'FACEBOOK_PAGE',
    operation: 'FACEBOOK_SEND_MESSAGE',
    requestKind: 'WRITE',
    requestMayHaveSucceeded: true,
    correlationId: 'facebook-send:1',
  });

  assert.equal(error.code, 'META_SOCIAL_UNKNOWN_OUTCOME');
  assert.equal(error.category, 'RECONCILIATION_REQUIRED');
  assert.equal(error.kind, 'UNKNOWN_OUTCOME');
  assert.equal(error.disposition, 'RECONCILIATION_REQUIRED');
  assert.equal(error.retryable, false);
  assert.equal(error.requestMayHaveSucceeded, true);
});

test('social provider taxonomy preserves safe MetaPlatform metadata and network retryability', async () => {
  const {
    normalizeMetaSocialProviderError,
  } = await loadSocialErrorTaxonomy();
  const graphError = {
    code: 'META_GRAPH_AUTHORIZATION_FAILED',
    category: 'AUTHORIZATION',
    message: 'Permission denied.',
    retryable: false,
    safeDetails: Object.freeze({
      httpStatus: 403,
      providerCode: 200,
      providerSubcode: 2018065,
      providerType: 'OAuthException',
      traceId: 'trace-permission-1',
    }),
  };
  const permission = normalizeMetaSocialProviderError({
    error: graphError,
    domain: 'INSTAGRAM',
    operation: 'INSTAGRAM_SEND_REPLY',
    requestKind: 'WRITE',
  });
  assert.equal(permission.kind, 'AUTHORIZATION');
  assert.equal(permission.safeDetails?.sourceCode, 'META_GRAPH_AUTHORIZATION_FAILED');
  assert.equal(permission.safeDetails?.providerCode, 200);
  assert.equal(permission.safeDetails?.providerSubcode, 2018065);

  const wrappedInstagram = normalizeMetaSocialProviderError({
    error: Object.assign(new Error('INSTAGRAM_PROVIDER_REPLY_FAILED'), {
      safeProvider: { code: 'META_GRAPH_AUTHENTICATION_FAILED', httpStatus: 401, traceId: 'trace-ig-wrapped-1' },
    }),
    domain: 'INSTAGRAM',
    operation: 'INSTAGRAM_SEND_REPLY',
    requestKind: 'WRITE',
  });
  assert.equal(wrappedInstagram.kind, 'AUTHENTICATION');
  assert.equal(wrappedInstagram.safeDetails?.sourceCode, 'META_GRAPH_AUTHENTICATION_FAILED');
  assert.equal(wrappedInstagram.safeDetails?.traceId, 'trace-ig-wrapped-1');

  const network = normalizeMetaSocialProviderError({
    error: Object.assign(new Error('fetch failed'), { code: 'ECONNRESET' }),
    domain: 'REALTIME',
    operation: 'REALTIME_INBOX_SYNC',
    requestKind: 'READ',
  });
  assert.equal(network.kind, 'PROVIDER_UNAVAILABLE');
  assert.equal(network.disposition, 'RETRYABLE_FAILURE');
  assert.equal(network.retryable, true);
});

test('social provider taxonomy creation and runtime guard fail closed for invalid or forged values', async () => {
  const {
    createMetaSocialProviderError,
    isMetaSocialProviderError,
  } = await loadSocialErrorTaxonomy();
  const error = createMetaSocialProviderError({
    domain: 'WEBHOOK',
    operation: 'WEBHOOK_RECEIVE',
    requestKind: 'WEBHOOK',
    kind: 'INVALID_REQUEST',
    sourceCode: 'META_WEBHOOK_INVALID_JSON',
  });
  assert.equal(error.operation, 'WEBHOOK_RECEIVE');
  assert.equal(Object.isFrozen(error), true);
  assert.equal(Object.isFrozen(error.safeDetails), true);
  assert.equal(isMetaSocialProviderError(error), true);
  assert.equal(isMetaSocialProviderError({ ...error, kind: 'RATE_LIMIT' }), false);
  assert.equal(isMetaSocialProviderError({ ...error, code: 'META_SOCIAL_RATE_LIMITED' }), false);
  assert.equal(isMetaSocialProviderError({
    ...error,
    safeDetails: { ...error.safeDetails, accessToken: 'EAABSECRET' },
  }), false);
  assert.equal(isMetaSocialProviderError({
    ...error,
    safeDetails: { ...error.safeDetails, disposition: 'RETRYABLE_FAILURE' },
  }), false);
  assert.throws(() => createMetaSocialProviderError({
    domain: 'WEBHOOK',
    operation: 'bad operation',
    requestKind: 'WEBHOOK',
    kind: 'INVALID_REQUEST',
  }), /META_SOCIAL_ERROR_OPERATION_INVALID/);
});

test('social platform success result is versioned, scoped and fail-closed', async () => {
  const {
    createMetaSocialSuccessResult,
    isMetaSocialPlatformResult,
    META_SOCIAL_PLATFORM_RESULT_SCHEMA_VERSION,
  } = await loadSocialResultContract();
  const result = createMetaSocialSuccessResult({
    domain: 'LEADS',
    operation: 'leads_process',
    correlationId: 'lead:correlation-31',
    value: Object.freeze({ leadKey: 'lead:1', processed: true }),
  });

  assert.equal(result.schemaVersion, META_SOCIAL_PLATFORM_RESULT_SCHEMA_VERSION);
  assert.equal(result.provider, 'META');
  assert.equal(result.domain, 'LEADS');
  assert.equal(result.operation, 'LEADS_PROCESS');
  assert.equal(result.correlationId, 'lead:correlation-31');
  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.ok, true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(isMetaSocialPlatformResult(result), true);
  assert.equal(isMetaSocialPlatformResult({ ...result, status: 'BLOCKED' }), false);
  assert.equal(isMetaSocialPlatformResult({ ...result, extra: true }), false);
  assert.throws(() => createMetaSocialSuccessResult({
    domain: 'LEADS',
    operation: 'bad operation',
    value: null,
  }), /META_SOCIAL_RESULT_OPERATION_INVALID/);
  assert.throws(() => createMetaSocialSuccessResult({
    domain: 'LEADS',
    operation: 'LEADS_PROCESS',
    correlationId: 'contains a space',
    value: null,
  }), /META_SOCIAL_RESULT_CORRELATION_ID_INVALID/);
});

test('social platform failure result mirrors retry and blocked provider dispositions', async () => {
  const {
    createMetaSocialFailureResult,
    createMetaSocialProviderError,
    isMetaSocialPlatformResult,
  } = await loadSocialResultContract();
  const retryableError = createMetaSocialProviderError({
    domain: 'INSTAGRAM',
    operation: 'INSTAGRAM_SEND_REPLY',
    requestKind: 'WRITE',
    kind: 'RATE_LIMIT',
    retryAfterMs: 15_000,
    correlationId: 'instagram:reply:31',
  });
  const retryable = createMetaSocialFailureResult(retryableError);

  assert.equal(retryable.ok, false);
  assert.equal(retryable.status, 'RETRYABLE_FAILURE');
  assert.equal(retryable.retryable, true);
  assert.equal(retryable.requestMayHaveSucceeded, false);
  assert.equal(retryable.retryAfterMs, 15_000);
  assert.equal(retryable.correlationId, 'instagram:reply:31');
  assert.notEqual(retryable.error, retryableError);
  assert.equal(Object.isFrozen(retryable), true);
  assert.equal(Object.isFrozen(retryable.error), true);
  assert.equal(isMetaSocialPlatformResult(retryable), true);

  const blocked = createMetaSocialFailureResult(createMetaSocialProviderError({
    domain: 'INSTAGRAM',
    operation: 'INSTAGRAM_SEND_REPLY',
    requestKind: 'WRITE',
    kind: 'REPLY_WINDOW_EXPIRED',
  }));
  assert.equal(blocked.status, 'BLOCKED');
  assert.equal(blocked.retryable, false);
  assert.equal(blocked.retryAfterMs, null);
  assert.equal(isMetaSocialPlatformResult(blocked), true);
});

test('social platform result distinguishes permanent and reconciliation-required failures', async () => {
  const {
    createMetaSocialFailureResult,
    createMetaSocialProviderError,
    isMetaSocialPlatformResult,
  } = await loadSocialResultContract();
  const permanent = createMetaSocialFailureResult(createMetaSocialProviderError({
    domain: 'LEADS',
    operation: 'LEADS_RETRIEVE',
    requestKind: 'READ',
    kind: 'RESOURCE_NOT_FOUND',
  }));
  assert.equal(permanent.status, 'PERMANENT_FAILURE');
  assert.equal(permanent.requestMayHaveSucceeded, false);

  const reconciliation = createMetaSocialFailureResult(createMetaSocialProviderError({
    domain: 'FACEBOOK_PAGE',
    operation: 'FACEBOOK_SEND_MESSAGE',
    requestKind: 'WRITE',
    kind: 'TIMEOUT',
    requestMayHaveSucceeded: true,
    correlationId: 'facebook:send:31',
  }));
  assert.equal(reconciliation.status, 'RECONCILIATION_REQUIRED');
  assert.equal(reconciliation.retryable, false);
  assert.equal(reconciliation.requestMayHaveSucceeded, true);
  assert.equal(isMetaSocialPlatformResult(reconciliation), true);
  assert.equal(isMetaSocialPlatformResult({ ...reconciliation, retryable: true }), false);
  assert.equal(isMetaSocialPlatformResult({ ...reconciliation, status: 'RETRYABLE_FAILURE' }), false);
  assert.equal(isMetaSocialPlatformResult({ ...reconciliation, domain: 'REALTIME' }), false);
});

test('social result strips forged provider-error fields and rejects invalid failure envelopes', async () => {
  const {
    createMetaSocialFailureResult,
    createMetaSocialProviderError,
    isMetaSocialPlatformResult,
    isMetaSocialProviderError,
  } = await loadSocialResultContract();
  const error = createMetaSocialProviderError({
    domain: 'WEBHOOK',
    operation: 'WEBHOOK_RECEIVE',
    requestKind: 'WEBHOOK',
    kind: 'INVALID_REQUEST',
    sourceCode: 'META_WEBHOOK_INVALID_JSON',
  });
  const forgedError = { ...error, accessToken: 'EAABSECRET' };

  assert.equal(isMetaSocialProviderError(forgedError), false);
  assert.throws(() => createMetaSocialFailureResult(forgedError), /META_SOCIAL_RESULT_ERROR_INVALID/);

  const result = createMetaSocialFailureResult(error);
  assert.equal(JSON.stringify(result).includes('EAABSECRET'), false);
  assert.equal(isMetaSocialPlatformResult({ ...result, error: forgedError }), false);
  assert.equal(isMetaSocialPlatformResult({ ...result, retryAfterMs: -1 }), false);
  assert.equal(isMetaSocialPlatformResult({ ...result, correlationId: 'bad correlation' }), false);
});

test('reply-window policy allows standard Instagram replies only inside the canonical 24-hour window', async () => {
  const {
    createMetaInstagramConversation,
    createMetaInstagramSendRequest,
    evaluateMetaInstagramReplyWindow,
    isMetaSocialReplyWindowDecision,
    META_INSTAGRAM_STANDARD_REPLY_WINDOW_MS,
  } = await loadReplyWindowPolicy();
  const binding = {
    page: {
      environment: 'PRODUCTION', connectionKey: 'primary', assetType: 'PAGE', providerId: 'page-1',
    },
    instagramAccount: {
      environment: 'PRODUCTION', connectionKey: 'primary', assetType: 'INSTAGRAM_ACCOUNT', providerId: 'ig-account-1', pageId: 'page-1',
    },
  };
  const participant = { providerId: 'ig-user-1' };
  const conversation = createMetaInstagramConversation({
    binding,
    participant,
    lastInboundAt: '2026-07-23T20:00:00.000Z',
    replyWindowExpiresAt: '2026-07-24T20:00:00.000Z',
  });
  const request = createMetaInstagramSendRequest({
    binding,
    participant,
    idempotencyKey: 'reply-window:message-1',
    mode: 'MESSAGE',
    text: 'We can help with that.',
    requestedAt: '2026-07-24T19:00:00.000Z',
    correlationId: 'reply-window:message-1',
    actorType: 'ADMIN',
    actorId: 'admin-1',
  });
  const decision = evaluateMetaInstagramReplyWindow({
    request,
    conversation,
    evaluatedAt: '2026-07-24T19:00:00.000Z',
  });

  assert.equal(META_INSTAGRAM_STANDARD_REPLY_WINDOW_MS, 86_400_000);
  assert.equal(decision.policyId, 'INSTAGRAM_STANDARD_24H');
  assert.equal(decision.decision, 'ALLOWED');
  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, 'STANDARD_WINDOW_OPEN');
  assert.equal(decision.expiresAt, '2026-07-24T20:00:00.000Z');
  assert.equal(decision.remainingMs, 3_600_000);
  assert.equal(decision.sourceCommentId, null);
  assert.equal(isMetaSocialReplyWindowDecision(decision), true);
  assert.equal(Object.isFrozen(decision), true);
});

test('reply-window policy blocks missing, expired and inconsistent standard window state', async () => {
  const {
    createMetaInstagramConversation,
    createMetaInstagramSendRequest,
    evaluateMetaInstagramReplyWindow,
  } = await loadReplyWindowPolicy();
  const binding = {
    page: { environment: 'STAGING', connectionKey: 'social', assetType: 'PAGE', providerId: 'page-2' },
    instagramAccount: { environment: 'STAGING', connectionKey: 'social', assetType: 'INSTAGRAM_ACCOUNT', providerId: 'ig-2', pageId: 'page-2' },
  };
  const participant = { providerId: 'user-2' };
  const request = createMetaInstagramSendRequest({
    binding,
    participant,
    idempotencyKey: 'reply-window:message-2',
    mode: 'MESSAGE',
    text: 'Hello',
    requestedAt: '2026-07-24T20:00:00.000Z',
    correlationId: 'reply-window:message-2',
    actorType: 'SYSTEM',
  });

  const missing = evaluateMetaInstagramReplyWindow({
    request,
    conversation: createMetaInstagramConversation({ binding, participant }),
    evaluatedAt: '2026-07-24T20:00:00.000Z',
  });
  assert.equal(missing.allowed, false);
  assert.equal(missing.reason, 'STANDARD_LAST_INBOUND_REQUIRED');

  const expired = evaluateMetaInstagramReplyWindow({
    request,
    conversation: createMetaInstagramConversation({
      binding,
      participant,
      lastInboundAt: '2026-07-23T20:00:00.000Z',
      replyWindowExpiresAt: '2026-07-24T20:00:00.000Z',
    }),
    evaluatedAt: '2026-07-24T20:00:00.000Z',
  });
  assert.equal(expired.allowed, false);
  assert.equal(expired.reason, 'STANDARD_WINDOW_EXPIRED');
  assert.equal(expired.remainingMs, 0);

  const mismatch = evaluateMetaInstagramReplyWindow({
    request,
    conversation: createMetaInstagramConversation({
      binding,
      participant,
      lastInboundAt: '2026-07-23T20:00:00.000Z',
      replyWindowExpiresAt: '2026-07-25T20:00:00.000Z',
    }),
    evaluatedAt: '2026-07-24T19:00:00.000Z',
  });
  assert.equal(mismatch.allowed, false);
  assert.equal(mismatch.reason, 'STANDARD_WINDOW_STATE_MISMATCH');
});

test('reply-window policy enforces a one-shot seven-day private reply window for post and reel comments', async () => {
  const {
    createMetaInstagramConversation,
    createMetaInstagramSendRequest,
    evaluateMetaInstagramReplyWindow,
    META_INSTAGRAM_PRIVATE_REPLY_WINDOW_MS,
  } = await loadReplyWindowPolicy();
  const binding = {
    page: { environment: 'PRODUCTION', connectionKey: 'primary', assetType: 'PAGE', providerId: 'page-3' },
    instagramAccount: { environment: 'PRODUCTION', connectionKey: 'primary', assetType: 'INSTAGRAM_ACCOUNT', providerId: 'ig-3', pageId: 'page-3' },
  };
  const participant = { providerId: 'user-3' };
  const conversation = createMetaInstagramConversation({ binding, participant });
  const request = createMetaInstagramSendRequest({
    binding,
    participant,
    idempotencyKey: 'reply-window:private-3',
    mode: 'PRIVATE_REPLY',
    text: 'Details sent privately.',
    sourceCommentId: 'comment-3',
    sourcePostId: 'post-3',
    requestedAt: '2026-07-24T20:00:00.000Z',
    correlationId: 'reply-window:private-3',
    actorType: 'AUTOMATION',
  });
  const allowed = evaluateMetaInstagramReplyWindow({
    request,
    conversation,
    evaluatedAt: '2026-07-24T20:00:00.000Z',
    sourceCommentCreatedAt: '2026-07-18T20:00:00.000Z',
    sourcePrivateReplySentAt: null,
    privateReplySurface: 'POST_OR_REEL',
  });

  assert.equal(META_INSTAGRAM_PRIVATE_REPLY_WINDOW_MS, 604_800_000);
  assert.equal(allowed.policyId, 'INSTAGRAM_PRIVATE_REPLY_7D');
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.reason, 'PRIVATE_REPLY_WINDOW_OPEN');
  assert.equal(allowed.expiresAt, '2026-07-25T20:00:00.000Z');
  assert.equal(allowed.remainingMs, 86_400_000);

  const expired = evaluateMetaInstagramReplyWindow({
    request,
    conversation,
    evaluatedAt: '2026-07-25T20:00:00.000Z',
    sourceCommentCreatedAt: '2026-07-18T20:00:00.000Z',
    sourcePrivateReplySentAt: null,
    privateReplySurface: 'POST_OR_REEL',
  });
  assert.equal(expired.allowed, false);
  assert.equal(expired.reason, 'PRIVATE_REPLY_WINDOW_EXPIRED');

  const alreadySent = evaluateMetaInstagramReplyWindow({
    request,
    conversation,
    evaluatedAt: '2026-07-24T20:00:00.000Z',
    sourceCommentCreatedAt: '2026-07-18T20:00:00.000Z',
    sourcePrivateReplySentAt: '2026-07-19T20:00:00.000Z',
    privateReplySurface: 'POST_OR_REEL',
  });
  assert.equal(alreadySent.allowed, false);
  assert.equal(alreadySent.reason, 'PRIVATE_REPLY_ALREADY_SENT');
});

test('reply-window policy requires active Instagram Live state for live-comment private replies', async () => {
  const {
    createMetaInstagramConversation,
    createMetaInstagramSendRequest,
    evaluateMetaInstagramReplyWindow,
  } = await loadReplyWindowPolicy();
  const binding = {
    page: { environment: 'STAGING', connectionKey: 'live', assetType: 'PAGE', providerId: 'page-live' },
    instagramAccount: { environment: 'STAGING', connectionKey: 'live', assetType: 'INSTAGRAM_ACCOUNT', providerId: 'ig-live', pageId: 'page-live' },
  };
  const participant = { providerId: 'viewer-1' };
  const conversation = createMetaInstagramConversation({ binding, participant });
  const request = createMetaInstagramSendRequest({
    binding,
    participant,
    idempotencyKey: 'reply-window:live-1',
    mode: 'PRIVATE_REPLY',
    text: 'Thanks for joining live.',
    sourceCommentId: 'live-comment-1',
    requestedAt: '2026-07-24T20:00:00.000Z',
    correlationId: 'reply-window:live-1',
    actorType: 'SYSTEM',
  });
  const active = evaluateMetaInstagramReplyWindow({
    request,
    conversation,
    evaluatedAt: '2026-07-24T20:00:00.000Z',
    sourceCommentCreatedAt: '2026-07-24T19:59:00.000Z',
    sourcePrivateReplySentAt: null,
    privateReplySurface: 'LIVE',
    liveBroadcastActive: true,
  });
  assert.equal(active.policyId, 'INSTAGRAM_PRIVATE_REPLY_LIVE');
  assert.equal(active.allowed, true);
  assert.equal(active.expiresAt, null);
  assert.equal(active.remainingMs, null);

  const ended = evaluateMetaInstagramReplyWindow({
    request,
    conversation,
    evaluatedAt: '2026-07-24T20:00:00.000Z',
    sourceCommentCreatedAt: '2026-07-24T19:59:00.000Z',
    sourcePrivateReplySentAt: null,
    privateReplySurface: 'LIVE',
    liveBroadcastActive: false,
  });
  assert.equal(ended.allowed, false);
  assert.equal(ended.reason, 'PRIVATE_REPLY_LIVE_ENDED');

  const unknown = evaluateMetaInstagramReplyWindow({
    request,
    conversation,
    evaluatedAt: '2026-07-24T20:00:00.000Z',
    sourceCommentCreatedAt: '2026-07-24T19:59:00.000Z',
    sourcePrivateReplySentAt: null,
    privateReplySurface: 'LIVE',
  });
  assert.equal(unknown.allowed, false);
  assert.equal(unknown.reason, 'PRIVATE_REPLY_LIVE_STATE_REQUIRED');
});

test('reply-window policy and decision guard fail closed for forged or cross-scope state', async () => {
  const {
    createMetaInstagramConversation,
    createMetaInstagramSendRequest,
    evaluateMetaInstagramReplyWindow,
    isMetaSocialReplyWindowDecision,
  } = await loadReplyWindowPolicy();
  const binding = {
    page: { environment: 'PRODUCTION', connectionKey: 'primary', assetType: 'PAGE', providerId: 'page-4' },
    instagramAccount: { environment: 'PRODUCTION', connectionKey: 'primary', assetType: 'INSTAGRAM_ACCOUNT', providerId: 'ig-4', pageId: 'page-4' },
  };
  const participant = { providerId: 'user-4' };
  const conversation = createMetaInstagramConversation({
    binding,
    participant,
    lastInboundAt: '2026-07-24T18:00:00.000Z',
    replyWindowExpiresAt: '2026-07-25T18:00:00.000Z',
  });
  const request = createMetaInstagramSendRequest({
    binding,
    participant,
    idempotencyKey: 'reply-window:guard-4',
    mode: 'MESSAGE',
    text: 'Hello',
    requestedAt: '2026-07-24T20:00:00.000Z',
    correlationId: 'reply-window:guard-4',
    actorType: 'SYSTEM',
  });
  const decision = evaluateMetaInstagramReplyWindow({
    request,
    conversation,
    evaluatedAt: '2026-07-24T20:00:00.000Z',
  });

  assert.equal(isMetaSocialReplyWindowDecision(decision), true);
  assert.equal(isMetaSocialReplyWindowDecision(Object.fromEntries(Object.entries(decision).reverse())), true);
  assert.equal(isMetaSocialReplyWindowDecision({ ...decision, allowed: false }), false);
  assert.equal(isMetaSocialReplyWindowDecision({ ...decision, remainingMs: 1 }), false);
  assert.equal(isMetaSocialReplyWindowDecision({ ...decision, decisionKey: 'forged' }), false);
  assert.equal(isMetaSocialReplyWindowDecision({ ...decision, accessToken: 'EAABSECRET' }), false);

  const otherConversation = createMetaInstagramConversation({
    binding: {
      page: { ...binding.page, providerId: 'page-other' },
      instagramAccount: { ...binding.instagramAccount, providerId: 'ig-other', pageId: 'page-other' },
    },
    participant,
    lastInboundAt: '2026-07-24T18:00:00.000Z',
  });
  assert.throws(() => evaluateMetaInstagramReplyWindow({
    request,
    conversation: otherConversation,
    evaluatedAt: '2026-07-24T20:00:00.000Z',
  }), /META_REPLY_WINDOW_CONVERSATION_MISMATCH/);
});


test('attachment policy quarantines valid metadata until bounded download validation completes', async () => {
  const {
    createMetaInstagramMessage,
    evaluateMetaSocialAttachmentPolicy,
    isMetaSocialAttachmentPolicyDecision,
    META_SOCIAL_ATTACHMENT_MAX_BYTES,
  } = await loadAttachmentPolicy();
  const message = createMetaInstagramMessage({
    binding: {
      page: { environment: 'PRODUCTION', connectionKey: 'primary', assetType: 'PAGE', providerId: 'page-media-1' },
      instagramAccount: { environment: 'PRODUCTION', connectionKey: 'primary', assetType: 'INSTAGRAM_ACCOUNT', providerId: 'ig-media-1', pageId: 'page-media-1' },
    },
    participant: { providerId: 'user-media-1' },
    providerMessageId: 'mid-media-1',
    eventType: 'MESSAGE',
    senderId: 'user-media-1',
    recipientId: 'ig-media-1',
    direction: 'INBOUND',
    messageType: 'IMAGE',
    sentAt: '2026-07-24T21:00:00.000Z',
    attachments: [{
      externalId: 'att-media-1',
      type: 'IMAGE',
      url: 'https://scontent.cdninstagram.com/media/image-1.jpg',
      mimeType: 'image/jpeg',
      fileName: 'image-1.jpg',
      fileSize: 1024,
    }],
  });
  const decision = evaluateMetaSocialAttachmentPolicy({
    attachment: message.attachments[0],
    evaluatedAt: '2026-07-24T21:01:00.000Z',
  });

  assert.equal(META_SOCIAL_ATTACHMENT_MAX_BYTES, 25 * 1024 * 1024);
  assert.equal(decision.stage, 'METADATA');
  assert.equal(decision.decision, 'QUARANTINED');
  assert.equal(decision.allowed, false);
  assert.equal(decision.quarantined, true);
  assert.equal(decision.reason, 'MEDIA_DOWNLOAD_VALIDATION_REQUIRED');
  assert.equal(decision.sourceHost, 'scontent.cdninstagram.com');
  assert.equal(decision.requiresDownloadValidation, true);
  assert.equal(decision.requiresMalwareScan, true);
  assert.equal(isMetaSocialAttachmentPolicyDecision(decision), true);
  assert.equal(Object.isFrozen(decision), true);
});

test('attachment policy blocks unsafe URLs, path-like filenames, oversize metadata and MIME confusion', async () => {
  const { createMetaInstagramMessage, evaluateMetaSocialAttachmentPolicy } = await loadAttachmentPolicy();
  const base = {
    binding: {
      page: { environment: 'STAGING', connectionKey: 'media', assetType: 'PAGE', providerId: 'page-media-2' },
      instagramAccount: { environment: 'STAGING', connectionKey: 'media', assetType: 'INSTAGRAM_ACCOUNT', providerId: 'ig-media-2', pageId: 'page-media-2' },
    },
    participant: { providerId: 'user-media-2' },
    providerMessageId: 'mid-media-2',
    eventType: 'MESSAGE',
    senderId: 'user-media-2',
    recipientId: 'ig-media-2',
    direction: 'INBOUND',
    messageType: 'FILE',
    sentAt: '2026-07-24T21:00:00.000Z',
  };
  const attachment = (overrides) => createMetaInstagramMessage({
    ...base,
    attachments: [{
      externalId: 'att-media-2',
      type: 'FILE',
      url: 'https://lookaside.fbsbx.com/media/file.pdf',
      mimeType: 'application/pdf',
      fileName: 'file.pdf',
      fileSize: 2048,
      ...overrides,
    }],
  }).attachments[0];

  assert.equal(evaluateMetaSocialAttachmentPolicy({
    attachment: attachment({ url: 'http://127.0.0.1/secret' }),
    evaluatedAt: '2026-07-24T21:01:00.000Z',
  }).reason, 'MEDIA_URL_REJECTED');
  assert.equal(evaluateMetaSocialAttachmentPolicy({
    attachment: attachment({ fileName: '../../secret.pdf' }),
    evaluatedAt: '2026-07-24T21:01:00.000Z',
  }).reason, 'MEDIA_FILE_NAME_REJECTED');
  assert.equal(evaluateMetaSocialAttachmentPolicy({
    attachment: attachment({ fileSize: 25 * 1024 * 1024 + 1 }),
    evaluatedAt: '2026-07-24T21:01:00.000Z',
  }).reason, 'MEDIA_DECLARED_SIZE_BLOCKED');
  assert.equal(evaluateMetaSocialAttachmentPolicy({
    attachment: attachment({ type: 'IMAGE', mimeType: 'application/pdf' }),
    evaluatedAt: '2026-07-24T21:01:00.000Z',
  }).reason, 'MEDIA_TYPE_MIME_MISMATCH');
});

test('attachment policy requires verified actual MIME, bounded bytes and digest after download', async () => {
  const { createMetaInstagramMessage, evaluateMetaSocialAttachmentPolicy } = await loadAttachmentPolicy();
  const attachment = createMetaInstagramMessage({
    binding: {
      page: { environment: 'PRODUCTION', connectionKey: 'media', assetType: 'PAGE', providerId: 'page-media-3' },
      instagramAccount: { environment: 'PRODUCTION', connectionKey: 'media', assetType: 'INSTAGRAM_ACCOUNT', providerId: 'ig-media-3', pageId: 'page-media-3' },
    },
    participant: { providerId: 'user-media-3' },
    providerMessageId: 'mid-media-3',
    eventType: 'MESSAGE',
    senderId: 'user-media-3',
    recipientId: 'ig-media-3',
    direction: 'INBOUND',
    messageType: 'VIDEO',
    sentAt: '2026-07-24T21:00:00.000Z',
    attachments: [{
      externalId: 'att-media-3', type: 'VIDEO', url: 'https://video.cdninstagram.com/video.mp4', mimeType: 'video/mp4', fileName: 'video.mp4', fileSize: null,
    }],
  }).attachments[0];

  const missingDigest = evaluateMetaSocialAttachmentPolicy({
    attachment, stage: 'DOWNLOADED', evaluatedAt: '2026-07-24T21:02:00.000Z', actualMimeType: 'video/mp4', actualSize: 4096,
  });
  assert.equal(missingDigest.decision, 'BLOCKED');
  assert.equal(missingDigest.reason, 'MEDIA_DIGEST_REQUIRED');

  const mismatch = evaluateMetaSocialAttachmentPolicy({
    attachment, stage: 'DOWNLOADED', evaluatedAt: '2026-07-24T21:02:00.000Z', actualMimeType: 'image/jpeg', actualSize: 4096, contentDigest: 'a'.repeat(64),
  });
  assert.equal(mismatch.reason, 'MEDIA_TYPE_MIME_MISMATCH');

  const downloaded = evaluateMetaSocialAttachmentPolicy({
    attachment, stage: 'DOWNLOADED', evaluatedAt: '2026-07-24T21:02:00.000Z', actualMimeType: 'video/mp4', actualSize: 4096, contentDigest: 'a'.repeat(64),
  });
  assert.equal(downloaded.decision, 'QUARANTINED');
  assert.equal(downloaded.reason, 'MEDIA_SCAN_REQUIRED');
});

test('attachment policy blocks infected media and allows only clean verified stored media', async () => {
  const { createMetaInstagramMessage, evaluateMetaSocialAttachmentPolicy } = await loadAttachmentPolicy();
  const attachment = createMetaInstagramMessage({
    binding: {
      page: { environment: 'PRODUCTION', connectionKey: 'media', assetType: 'PAGE', providerId: 'page-media-4' },
      instagramAccount: { environment: 'PRODUCTION', connectionKey: 'media', assetType: 'INSTAGRAM_ACCOUNT', providerId: 'ig-media-4', pageId: 'page-media-4' },
    },
    participant: { providerId: 'user-media-4' },
    providerMessageId: 'mid-media-4',
    eventType: 'MESSAGE',
    senderId: 'user-media-4',
    recipientId: 'ig-media-4',
    direction: 'INBOUND',
    messageType: 'IMAGE',
    sentAt: '2026-07-24T21:00:00.000Z',
    attachments: [{ externalId: 'att-media-4', type: 'IMAGE', url: 'https://scontent.fbcdn.net/photo.jpg', mimeType: 'image/jpeg', fileName: 'photo.jpg', fileSize: 4096 }],
  }).attachments[0];
  const common = {
    attachment,
    evaluatedAt: '2026-07-24T21:03:00.000Z',
    actualMimeType: 'image/jpeg',
    actualSize: 4096,
    contentDigest: 'b'.repeat(64),
  };

  const infected = evaluateMetaSocialAttachmentPolicy({ ...common, stage: 'SCANNED', scanResult: 'INFECTED' });
  assert.equal(infected.decision, 'BLOCKED');
  assert.equal(infected.reason, 'MEDIA_SCAN_INFECTED');

  const cleanNotStored = evaluateMetaSocialAttachmentPolicy({ ...common, stage: 'SCANNED', scanResult: 'CLEAN' });
  assert.equal(cleanNotStored.decision, 'QUARANTINED');
  assert.equal(cleanNotStored.reason, 'MEDIA_STORAGE_VERIFICATION_REQUIRED');

  const ready = evaluateMetaSocialAttachmentPolicy({ ...common, stage: 'STORED', scanResult: 'CLEAN', storageVerified: true });
  assert.equal(ready.decision, 'ALLOWED');
  assert.equal(ready.allowed, true);
  assert.equal(ready.quarantined, false);
  assert.equal(ready.reason, 'MEDIA_READY');
  assert.equal(ready.requiresStorageVerification, false);
});

test('attachment policy decision guard rejects forged or impossible lifecycle state', async () => {
  const {
    createMetaInstagramMessage,
    evaluateMetaSocialAttachmentPolicy,
    isMetaSocialAttachmentPolicyDecision,
  } = await loadAttachmentPolicy();
  const attachment = createMetaInstagramMessage({
    binding: {
      page: { environment: 'PRODUCTION', connectionKey: 'guard', assetType: 'PAGE', providerId: 'page-media-5' },
      instagramAccount: { environment: 'PRODUCTION', connectionKey: 'guard', assetType: 'INSTAGRAM_ACCOUNT', providerId: 'ig-media-5', pageId: 'page-media-5' },
    },
    participant: { providerId: 'user-media-5' },
    providerMessageId: 'mid-media-5',
    eventType: 'MESSAGE', senderId: 'user-media-5', recipientId: 'ig-media-5', direction: 'INBOUND', messageType: 'IMAGE', sentAt: '2026-07-24T21:00:00.000Z',
    attachments: [{ externalId: 'att-media-5', type: 'IMAGE', url: 'https://scontent.cdninstagram.com/photo.jpg', mimeType: 'image/jpeg', fileName: 'photo.jpg', fileSize: 1024 }],
  }).attachments[0];
  const decision = evaluateMetaSocialAttachmentPolicy({ attachment, evaluatedAt: '2026-07-24T21:05:00.000Z' });

  assert.equal(isMetaSocialAttachmentPolicyDecision(decision), true);
  assert.equal(isMetaSocialAttachmentPolicyDecision(Object.fromEntries(Object.entries(decision).reverse())), true);
  assert.equal(isMetaSocialAttachmentPolicyDecision({ ...decision, allowed: true }), false);
  assert.equal(isMetaSocialAttachmentPolicyDecision({ ...decision, reason: 'MEDIA_READY' }), false);
  assert.equal(isMetaSocialAttachmentPolicyDecision({ ...decision, sourceHost: 'evil.example' }), false);
  assert.equal(isMetaSocialAttachmentPolicyDecision({ ...decision, accessToken: 'EAABSECRET' }), false);
  const impossible = evaluateMetaSocialAttachmentPolicy({
    attachment,
    stage: 'METADATA',
    evaluatedAt: '2026-07-24T21:05:00.000Z',
    actualMimeType: 'image/jpeg',
  });
  assert.equal(impossible.reason, 'MEDIA_STAGE_STATE_INVALID');
});
