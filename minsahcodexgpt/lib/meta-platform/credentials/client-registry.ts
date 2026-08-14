import 'server-only';

import type { MetaCredentialMaterial } from './types';

interface ClientEntry<TClient> {
  readonly credentialVersion: string;
  readonly client: TClient;
  readonly dispose?: (client: TClient) => void | Promise<void>;
}

function clientKey(credential: MetaCredentialMaterial): string {
  return `${credential.metadata.connectionKey}::${credential.metadata.role}`;
}

export class MetaCredentialClientRegistry<TClient> {
  readonly #entries = new Map<string, ClientEntry<TClient>>();

  async getOrCreate(input: {
    readonly credential: MetaCredentialMaterial;
    readonly create: (credential: MetaCredentialMaterial) => TClient | Promise<TClient>;
    readonly dispose?: (client: TClient) => void | Promise<void>;
  }): Promise<TClient> {
    const key = clientKey(input.credential);
    const existing = this.#entries.get(key);
    if (existing?.credentialVersion === input.credential.metadata.credentialVersion) {
      return existing.client;
    }
    if (existing?.dispose) await existing.dispose(existing.client);
    const client = await input.create(input.credential);
    this.#entries.set(key, {
      credentialVersion: input.credential.metadata.credentialVersion,
      client,
      dispose: input.dispose,
    });
    return client;
  }

  async invalidate(input: { readonly connectionKey: string; readonly role?: string }): Promise<number> {
    const prefix = `${input.connectionKey.trim()}::`;
    const keys = [...this.#entries.keys()].filter((key) => key.startsWith(prefix) && (!input.role || key === `${prefix}${input.role}`));
    for (const key of keys) {
      const entry = this.#entries.get(key);
      if (entry?.dispose) await entry.dispose(entry.client);
      this.#entries.delete(key);
    }
    return keys.length;
  }

  snapshot(): readonly Readonly<{ connectionKey: string; role: string; credentialVersion: string }>[] {
    return Object.freeze([...this.#entries.entries()].map(([key, entry]) => {
      const [connectionKey, role] = key.split('::');
      return Object.freeze({ connectionKey, role, credentialVersion: entry.credentialVersion });
    }));
  }
}
