import 'server-only';

import type { MetaCredentialMaterial, MetaCredentialMetadata } from './types';

export interface CreateMetaCredentialMaterialInput {
  readonly metadata: MetaCredentialMetadata;
  readonly accessToken?: string;
  readonly appSecret?: string;
}

export class ServerMetaCredentialMaterial implements MetaCredentialMaterial {
  readonly metadata: MetaCredentialMetadata;
  readonly #accessToken?: string;
  readonly #appSecret?: string;

  constructor(input: CreateMetaCredentialMaterialInput) {
    this.metadata = Object.freeze({
      ...input.metadata,
      permissions: Object.freeze([...input.metadata.permissions]),
    });
    this.#accessToken = input.accessToken;
    this.#appSecret = input.appSecret;
    Object.freeze(this);
  }

  readAccessToken(): string {
    if (!this.#accessToken) throw new Error('META_ACCESS_TOKEN_NOT_AVAILABLE_FOR_ROLE');
    return this.#accessToken;
  }

  readAppSecret(): string {
    if (!this.#appSecret) throw new Error('META_APP_SECRET_NOT_AVAILABLE_FOR_ROLE');
    return this.#appSecret;
  }

  toJSON(): MetaCredentialMetadata {
    return this.metadata;
  }
}
