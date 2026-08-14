import type { MetaOperationStore, MetaOperationTransactionContext } from './store';
import { MetaPayloadCodecRegistry, assertMetaVersionedPayload } from './payload';
import type { CreateMetaOperationInput, MetaCommittedOperation } from './types';

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;

function assertIdentifier(value: string, code: string, maxLength: number): void {
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || !IDENTIFIER_PATTERN.test(normalized)) throw new TypeError(code);
}

export interface MetaOperationServiceOptions {
  readonly store: MetaOperationStore;
  readonly payloadRegistry: MetaPayloadCodecRegistry;
}

export class MetaOperationService {
  private readonly store: MetaOperationStore;
  private readonly payloadRegistry: MetaPayloadCodecRegistry;

  constructor(options: MetaOperationServiceOptions) {
    this.store = options.store;
    this.payloadRegistry = options.payloadRegistry;
  }

  async commit<TBusinessResult = unknown>(
    input: CreateMetaOperationInput,
    businessMutation?: (tx: MetaOperationTransactionContext) => Promise<TBusinessResult>,
  ): Promise<MetaCommittedOperation<TBusinessResult>> {
    assertIdentifier(input.connectionKey, 'META_OPERATION_CONNECTION_KEY_INVALID', 80);
    assertIdentifier(input.idempotencyKey, 'META_OPERATION_IDEMPOTENCY_KEY_INVALID', 200);
    assertIdentifier(input.capability, 'META_OPERATION_CAPABILITY_INVALID', 120);
    assertIdentifier(input.operationType, 'META_OPERATION_TYPE_INVALID', 160);
    if (input.assetId) assertIdentifier(input.assetId, 'META_OPERATION_ASSET_ID_INVALID', 255);
    if (input.replayOfOperationId) assertIdentifier(input.replayOfOperationId, 'META_OPERATION_REPLAY_LINK_INVALID', 255);
    assertMetaVersionedPayload(input.payload);
    this.payloadRegistry.decode(input.payload);
    return this.store.commitWithOperation(input, businessMutation);
  }
}
