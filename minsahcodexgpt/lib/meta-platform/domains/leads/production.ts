import {
  executeMetaLeadCutover,
  type MetaLeadCutoverStatus,
  type MetaLeadShadowComparison,
} from './cutover.ts';
import { compareMetaLeadShadowNormalization, META_LEAD_SHADOW_NOT_OBSERVED } from './shadow-comparison.ts';
import { processMetaLeadReceipt as processDomainMetaLeadReceipt } from './runtime';
import type { MetaLeadProviderPayload } from './types.ts';

type ProductionInput = Parameters<typeof processDomainMetaLeadReceipt>[0];
type LegacyProcessor = (typeof import('@/lib/meta/leads/legacy-service'))['processMetaLeadReceipt'];
type LegacyResult = Awaited<ReturnType<LegacyProcessor>>;
type PlatformResult = Awaited<ReturnType<typeof processDomainMetaLeadReceipt>>;
type ProductionAuthorityResult = LegacyResult | PlatformResult;
type ProductionCutoverMetadata = Readonly<
  Pick<MetaLeadCutoverStatus, 'mode' | 'authority' | 'reasonCode'>
  & { shadowComparison?: MetaLeadShadowComparison }
>;

function attachCutoverMetadata<T extends object>(value: T, metadata: ProductionCutoverMetadata) {
  return Object.freeze({ ...value, cutover: Object.freeze(metadata) });
}

async function runLegacy(
  input: ProductionInput,
  captureShadow: boolean,
): Promise<Readonly<{ value: LegacyResult; comparison?: MetaLeadShadowComparison }>> {
  const legacy = await import('@/lib/meta/leads/legacy-service');
  let comparison = captureShadow ? META_LEAD_SHADOW_NOT_OBSERVED : undefined;
  const previousObserver = input.observeFetchedPayload;
  try {
    const value = await legacy.processMetaLeadReceipt({
      ...input,
      observeFetchedPayload: (payload: MetaLeadProviderPayload) => {
        previousObserver?.(payload);
        if (captureShadow) comparison = compareMetaLeadShadowNormalization(payload);
      },
    });
    return { value, ...(comparison ? { comparison } : {}) };
  } catch (error) {
    const candidate = error as { code?: unknown; message?: unknown; permanent?: unknown };
    if (candidate?.permanent === true || typeof candidate?.code === 'string') {
      const wrapped = new Error(typeof candidate.message === 'string' ? candidate.message : 'Legacy Lead rollback failed') as Error & Record<string, unknown>;
      Object.assign(wrapped, candidate);
      throw wrapped;
    }
    throw error;
  }
}

export async function processMetaLeadReceiptProduction(input: ProductionInput) {
  const execution = await executeMetaLeadCutover<ProductionAuthorityResult>({
    source: process.env,
    runLegacy: ({ captureShadow }) => runLegacy(input, captureShadow),
    runPlatform: () => processDomainMetaLeadReceipt(input),
  });
  return attachCutoverMetadata(execution.value, {
    mode: execution.cutover.mode,
    authority: execution.cutover.authority,
    reasonCode: execution.cutover.reasonCode,
    ...(execution.comparison ? { shadowComparison: execution.comparison } : {}),
  });
}
