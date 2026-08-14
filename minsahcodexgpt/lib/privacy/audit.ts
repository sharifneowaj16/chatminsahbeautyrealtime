import crypto from 'node:crypto';
import prisma from '@/lib/prisma';
import { redactOperationalPayload } from './pii-redaction';

export async function appendPrivacyAudit(input: {
  action: string;
  actorType: 'SYSTEM' | 'USER' | 'ADMIN' | 'META_CALLBACK';
  actorId?: string | null;
  subjectUserId?: string | null;
  requestId?: string | null;
  policyVersion: string;
  details?: Record<string, unknown> | null;
  retentionUntil: Date;
}) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO "PrivacyAuditLog"
      ("id", "action", "actorType", "actorId", "subjectUserId", "requestId", "policyVersion", "safeDetails", "retentionUntil", "createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,NOW())`,
    crypto.randomUUID(), input.action, input.actorType, input.actorId ?? null,
    input.subjectUserId ?? null, input.requestId ?? null, input.policyVersion,
    JSON.stringify(redactOperationalPayload(input.details ?? {})), input.retentionUntil
  );
}
