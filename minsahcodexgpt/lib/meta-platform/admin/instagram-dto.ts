import {
  projectMetaAdminFailure,
  projectMetaAdminProviderId,
  safeMetaAdminCode,
  safeMetaAdminText,
  toMetaAdminIso,
} from './contracts.ts';

function safeStoredUrl(value: unknown, status: unknown): string | null {
  if (String(status).toUpperCase() !== 'READY' || typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    if (/(?:access[_-]?token|signature|credential|x-amz-|x-goog-)/i.test(url.search)) return null;
    return url.toString().slice(0, 4_096);
  } catch {
    return null;
  }
}

function safeProviderValue(value: unknown): string {
  return projectMetaAdminProviderId(value)?.value ?? 'unknown';
}

export function projectInstagramReplyEligibility(input: Readonly<{
  status?: unknown;
  lastInboundAt?: unknown;
  replyWindowExpiresAt?: unknown;
  privateReplySentAt?: unknown;
  privateReplyExpiresAt?: unknown;
  permissionGranted?: boolean;
  accountHealthy?: boolean;
  now?: Date;
}>) {
  const now = input.now ?? new Date();
  const status = safeMetaAdminCode(input.status, 'UNKNOWN');
  const standardExpires = toMetaAdminIso(input.replyWindowExpiresAt);
  const standardExpiryMs = standardExpires ? new Date(standardExpires).getTime() : Number.NaN;
  const standardAllowed = input.permissionGranted === true
    && input.accountHealthy === true
    && !['SPAM', 'ARCHIVED'].includes(status)
    && Number.isFinite(standardExpiryMs)
    && standardExpiryMs > now.getTime();
  const standardReason = input.permissionGranted !== true
    ? input.permissionGranted === false ? 'PERMISSION_MISSING' : 'PERMISSION_HEALTH_UNKNOWN'
    : input.accountHealthy !== true
      ? input.accountHealthy === false ? 'ACCOUNT_UNHEALTHY' : 'ACCOUNT_HEALTH_UNKNOWN'
      : ['SPAM', 'ARCHIVED'].includes(status)
        ? 'CONVERSATION_CLOSED'
        : standardAllowed ? 'ELIGIBLE' : 'WINDOW_EXPIRED';

  const privateExpires = toMetaAdminIso(input.privateReplyExpiresAt);
  const privateExpiryMs = privateExpires ? new Date(privateExpires).getTime() : Number.NaN;
  const privateAllowed = input.permissionGranted === true
    && input.accountHealthy === true
    && !input.privateReplySentAt
    && Number.isFinite(privateExpiryMs)
    && privateExpiryMs > now.getTime();
  const privateReason = input.permissionGranted !== true
    ? input.permissionGranted === false ? 'PERMISSION_MISSING' : 'PERMISSION_HEALTH_UNKNOWN'
    : input.accountHealthy !== true
      ? input.accountHealthy === false ? 'ACCOUNT_UNHEALTHY' : 'ACCOUNT_HEALTH_UNKNOWN'
      : input.privateReplySentAt
        ? 'PRIVATE_REPLY_ALREADY_SENT'
        : privateAllowed ? 'ELIGIBLE' : 'WINDOW_EXPIRED';

  return Object.freeze({
    standard: Object.freeze({ allowed: standardAllowed, reasonCode: standardReason, expiresAt: standardExpires }),
    private: Object.freeze({ allowed: privateAllowed, reasonCode: privateReason, expiresAt: privateExpires }),
    evaluatedAt: now.toISOString(),
  });
}

export function projectInstagramAttachmentForAdmin(value: unknown) {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const storageUrl = safeStoredUrl(row.storageUrl, row.status);
  const thumbnailUrl = safeStoredUrl(row.thumbnailUrl, row.status);
  return Object.freeze({
    id: safeProviderValue(row.id),
    type: safeMetaAdminCode(row.type, 'UNKNOWN'),
    status: safeMetaAdminCode(row.status, 'UNKNOWN'),
    mimeType: safeMetaAdminText(row.mimeType, 255),
    fileName: safeMetaAdminText(row.fileName, 255),
    fileSize: typeof row.fileSize === 'number' && Number.isSafeInteger(row.fileSize) && row.fileSize >= 0 ? row.fileSize : null,
    storageUrl,
    thumbnailUrl,
    failureCode: row.failureCode ? safeMetaAdminCode(row.failureCode, 'ATTACHMENT_FAILED') : null,
    quarantined: Boolean(row.quarantinedAt),
  });
}

export function projectInstagramReplyAttemptForAdmin(value: unknown) {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const failure = row.failureCode || row.failureSummary || row.failureData
    ? projectMetaAdminFailure({
        code: row.failureCode,
        classification: row.failureCategory,
        failureSummary: row.failureSummary,
      })
    : null;
  return Object.freeze({
    id: safeProviderValue(row.id),
    mode: safeMetaAdminCode(row.mode, 'UNKNOWN'),
    eligibility: safeMetaAdminCode(row.eligibility, 'UNKNOWN'),
    status: safeMetaAdminCode(row.status, 'UNKNOWN'),
    providerStatus: safeMetaAdminCode(row.providerStatus, 'UNKNOWN'),
    reconciliationStatus: safeMetaAdminCode(row.reconciliationStatus, 'UNKNOWN'),
    attemptedAt: toMetaAdminIso(row.attemptedAt),
    completedAt: toMetaAdminIso(row.completedAt),
    reconciledAt: toMetaAdminIso(row.reconciledAt),
    failure,
  });
}

export function projectInstagramMessageForAdmin(value: unknown) {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.freeze({
    id: safeProviderValue(row.id),
    platformId: safeProviderValue(row.platformId ?? row.providerMessageId ?? row.id),
    direction: safeMetaAdminCode(row.direction, 'UNKNOWN'),
    messageType: safeMetaAdminCode(row.messageType, 'UNKNOWN'),
    status: safeMetaAdminCode(row.status, 'UNKNOWN'),
    providerStatus: safeMetaAdminCode(row.providerStatus, 'UNKNOWN'),
    text: typeof row.text === 'string' ? row.text.slice(0, 4_000) : null,
    sentAt: toMetaAdminIso(row.sentAt),
    deliveredAt: toMetaAdminIso(row.deliveredAt),
    readAt: toMetaAdminIso(row.readAt),
    failedAt: toMetaAdminIso(row.failedAt),
    privateReplyExpiresAt: toMetaAdminIso(row.privateReplyExpiresAt),
    attachments: Array.isArray(row.attachments) ? row.attachments.map(projectInstagramAttachmentForAdmin) : [],
    replyAttempts: Array.isArray(row.replyAttempts) ? row.replyAttempts.map(projectInstagramReplyAttemptForAdmin) : [],
  });
}

export function projectInstagramConversationForAdmin(value: unknown, options: Readonly<{
  permissionGranted?: boolean;
  accountHealthy?: boolean;
  now?: Date;
}> = {}) {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const messages = Array.isArray(row.messages) ? row.messages.map(projectInstagramMessageForAdmin) : [];
  const latestPrivateExpiry = [...messages].reverse().find((message) => message.direction === 'INBOUND' && message.privateReplyExpiresAt)?.privateReplyExpiresAt ?? null;
  const links = Array.isArray(row.links) ? row.links.map((value) => {
    const link = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    return Object.freeze({
      id: safeProviderValue(link.id),
      linkType: safeMetaAdminCode(link.linkType, 'UNKNOWN'),
      targetId: safeProviderValue(link.targetId),
      verificationMethod: safeMetaAdminCode(link.verificationMethod, 'UNKNOWN'),
      linkedAt: toMetaAdminIso(link.linkedAt),
    });
  }) : [];
  return Object.freeze({
    id: safeProviderValue(row.id),
    platformId: safeProviderValue(row.platformId ?? row.providerConversationKey ?? row.id),
    providerIds: Object.freeze({
      conversation: projectMetaAdminProviderId(row.platformId ?? row.providerConversationKey),
      participant: projectMetaAdminProviderId(row.participantId),
      account: projectMetaAdminProviderId(row.accountId),
    }),
    participantId: safeProviderValue(row.participantId),
    participantUsername: safeMetaAdminText(row.participantUsername, 255),
    participantName: safeMetaAdminText(row.participantName, 255),
    assignedToId: typeof row.assignedToId === 'string' ? row.assignedToId.slice(0, 255) : null,
    status: safeMetaAdminCode(row.status, 'UNKNOWN'),
    tags: Array.isArray(row.tags) ? row.tags.map((item) => safeMetaAdminText(item, 32)).filter(Boolean).slice(0, 20) : [],
    subject: safeMetaAdminText(row.subject, 200),
    lastMessageAt: toMetaAdminIso(row.lastMessageAt),
    lastActivityAt: toMetaAdminIso(row.lastActivityAt),
    lastInboundAt: toMetaAdminIso(row.lastInboundAt),
    replyWindowExpiresAt: toMetaAdminIso(row.replyWindowExpiresAt),
    privateReplySentAt: toMetaAdminIso(row.privateReplySentAt),
    replyEligibility: projectInstagramReplyEligibility({
      status: row.status,
      lastInboundAt: row.lastInboundAt,
      replyWindowExpiresAt: row.replyWindowExpiresAt,
      privateReplySentAt: row.privateReplySentAt,
      privateReplyExpiresAt: latestPrivateExpiry,
      permissionGranted: options.permissionGranted,
      accountHealthy: options.accountHealthy,
      now: options.now,
    }),
    messages,
    links,
    replyAttempts: Array.isArray(row.replyAttempts) ? row.replyAttempts.map(projectInstagramReplyAttemptForAdmin) : [],
    updatedAt: toMetaAdminIso(row.updatedAt),
  });
}
