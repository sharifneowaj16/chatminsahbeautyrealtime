import 'server-only';

import { randomUUID } from 'node:crypto';
import prisma from '@/lib/prisma';
import type { MetaCredentialMetadata, MetaCredentialMetadataRepository } from './types';

function toDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

export class PrismaMetaCredentialMetadataRepository implements MetaCredentialMetadataRepository {
  async upsert(metadata: MetaCredentialMetadata): Promise<void> {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "MetaCredentialMetadata" (
         "id","connectionId","connectionKey","role","secretRef","credentialVersion","appId","permissions",
         "rotatedAt","expiresAt","dataAccessExpiresAt","lastVerifiedAt","createdAt","updatedAt"
       ) VALUES (
         $1,(SELECT "id" FROM "MetaConnection" WHERE "name"=$2 LIMIT 1),$2,$3::"MetaCredentialRole",$4,$5,$6,$7::jsonb,
         $8,$9,$10,$11,NOW(),NOW()
       )
       ON CONFLICT ("connectionKey","role") DO UPDATE SET
         "connectionId"=EXCLUDED."connectionId",
         "secretRef"=EXCLUDED."secretRef",
         "credentialVersion"=EXCLUDED."credentialVersion",
         "appId"=EXCLUDED."appId",
         "permissions"=EXCLUDED."permissions",
         "rotatedAt"=EXCLUDED."rotatedAt",
         "expiresAt"=EXCLUDED."expiresAt",
         "dataAccessExpiresAt"=EXCLUDED."dataAccessExpiresAt",
         "lastVerifiedAt"=EXCLUDED."lastVerifiedAt",
         "updatedAt"=NOW()`,
      randomUUID(),
      metadata.connectionKey,
      metadata.role,
      metadata.secretRef,
      metadata.credentialVersion,
      metadata.appId,
      JSON.stringify(metadata.permissions),
      toDate(metadata.rotatedAt),
      toDate(metadata.expiresAt),
      toDate(metadata.dataAccessExpiresAt),
      new Date(),
    );
  }
}

export function createPrismaMetaCredentialMetadataRepository(): MetaCredentialMetadataRepository {
  return new PrismaMetaCredentialMetadataRepository();
}
