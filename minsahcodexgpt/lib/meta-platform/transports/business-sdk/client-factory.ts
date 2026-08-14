import 'server-only';

import { authorizeMetaCapability } from '../../capabilities/governance';
import { MetaCredentialClientRegistry } from '../../credentials/client-registry';
import { buildMetaAppSecretProof } from '../../credentials/appsecret-proof';
import { MetaCredentialResolutionError } from '../../credentials/provider';
import type { MetaCredentialMaterial } from '../../credentials/types';
import { DEFAULT_META_GRAPH_API_VERSION, META_BUSINESS_SDK_VERSION } from '../../versioning/registry';
import { getMetaBusinessSdkRuntime, getMetaBusinessSdkRuntimeContract } from './runtime';
import type {
  MetaBusinessSdkClient,
  MetaBusinessSdkClientFactoryOptions,
  MetaBusinessSdkClientRequest,
  MetaSdkApiClient,
} from './types';

export function decorateMetaSdkApiWithAppSecretProof(input: {
  readonly api: MetaSdkApiClient;
  readonly accessCredential: MetaCredentialMaterial;
  readonly appCredential: MetaCredentialMaterial;
}): boolean {
  const proof = buildMetaAppSecretProof({
    accessCredential: input.accessCredential,
    appCredential: input.appCredential,
  });
  const originalCall = input.api.call?.bind(input.api);
  if (!originalCall) return false;
  input.api.call = (method, path, params = {}, files = {}, useMultipartFormData = false, urlOverride = '') =>
    originalCall(
      method,
      path,
      { ...params, appsecret_proof: proof },
      files,
      useMultipartFormData,
      urlOverride,
    );
  return true;
}


export function disposeMetaBusinessSdkClient(client: MetaBusinessSdkClient): void {
  if (typeof client.api.accessToken === 'string') client.api.accessToken = '';
  client.api.call = async () => {
    throw new Error('META_BUSINESS_SDK_CLIENT_DISPOSED');
  };
}

export class MetaBusinessSdkClientFactory {
  readonly #options: MetaBusinessSdkClientFactoryOptions;
  readonly #registry = new MetaCredentialClientRegistry<MetaBusinessSdkClient>();

  constructor(options: MetaBusinessSdkClientFactoryOptions) {
    this.#options = Object.freeze({
      ...options,
      locale: options.locale?.trim() || 'en_US',
      debug: options.debug === true,
    });
  }

  async getClient(input: MetaBusinessSdkClientRequest): Promise<MetaBusinessSdkClient> {
    const runtimeContract = getMetaBusinessSdkRuntimeContract();
    const graphApiVersion = input.graphApiVersion ?? DEFAULT_META_GRAPH_API_VERSION;
    if (runtimeContract.graphVersion && runtimeContract.graphVersion !== graphApiVersion) {
      throw new Error(`META_BUSINESS_SDK_GRAPH_VERSION_MISMATCH:${runtimeContract.graphVersion}:${graphApiVersion}`);
    }
    const authorization = await authorizeMetaCapability({
      capability: input.capability,
      connectionKey: input.connectionKey,
      credentialRole: input.credentialRole,
      credentialProvider: this.#options.credentialProvider,
      graphApiVersion,
      sdkVersion: runtimeContract.packageVersion,
      correlationId: input.correlationId,
    });
    if (!authorization.ok) throw authorization.error;
    if (!authorization.value.credential) throw new Error('META_BUSINESS_SDK_CREDENTIAL_REQUIRED');

    return this.#registry.getOrCreate({
      credential: authorization.value.credential,
      create: (credential) => this.#createClient(credential, graphApiVersion),
      dispose: disposeMetaBusinessSdkClient,
    });
  }

  async invalidate(input: { readonly connectionKey: string; readonly credentialRole?: MetaBusinessSdkClientRequest['credentialRole'] }): Promise<number> {
    return this.#registry.invalidate({ connectionKey: input.connectionKey, role: input.credentialRole });
  }

  snapshot() {
    return this.#registry.snapshot();
  }

  async #createClient(credential: MetaCredentialMaterial, graphApiVersion: string): Promise<MetaBusinessSdkClient> {
    const runtime = getMetaBusinessSdkRuntime();
    const accessToken = credential.readAccessToken();
    const api = new runtime.FacebookAdsApi(
      accessToken,
      this.#options.locale,
      false,
    );
    if (this.#options.debug && typeof api.setDebug === 'function') api.setDebug(true);

    let appSecretProofEnabled = false;
    const appProvider = this.#options.appCredentialProvider ?? this.#options.credentialProvider;
    try {
      const appCredential = await appProvider.resolve({
        connectionKey: credential.metadata.connectionKey,
        role: 'APP',
      });
      appSecretProofEnabled = decorateMetaSdkApiWithAppSecretProof({
        api,
        accessCredential: credential,
        appCredential,
      });
    } catch (error) {
      if (!(error instanceof MetaCredentialResolutionError && error.code === 'META_CREDENTIAL_NOT_CONFIGURED')) {
        throw error;
      }
    }

    return Object.freeze({
      api,
      runtime,
      credential,
      sdkVersion: META_BUSINESS_SDK_VERSION,
      graphApiVersion,
      appSecretProofEnabled,
    });
  }
}
