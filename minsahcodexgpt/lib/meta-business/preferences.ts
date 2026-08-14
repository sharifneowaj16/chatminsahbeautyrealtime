import 'server-only';

import prisma from '@/lib/prisma';

export const META_BUSINESS_PREFERENCES_KEY = 'meta:business:preferences:v2';

export const META_BUSINESS_PREFERENCE_DEFAULTS = {
  defaultObjective: 'OUTCOME_SALES',
  defaultDailyBudgetBdt: 3000,
  defaultCountry: 'BD',
  defaultCurrency: 'BDT',
  defaultRetargetingDays: 30,
  catalogSyncEnabled: false,
  catalogSyncInventoryOnly: false,
};

export type MetaBusinessPreferences = typeof META_BUSINESS_PREFERENCE_DEFAULTS;

export async function getMetaBusinessPreferences(): Promise<MetaBusinessPreferences> {
  const config = await prisma.siteConfig.findUnique({
    where: { key: META_BUSINESS_PREFERENCES_KEY },
    select: { value: true },
  });
  const value = config?.value;
  const stored = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return {
    ...META_BUSINESS_PREFERENCE_DEFAULTS,
    defaultObjective: typeof stored.defaultObjective === 'string'
      ? stored.defaultObjective
      : META_BUSINESS_PREFERENCE_DEFAULTS.defaultObjective,
    defaultDailyBudgetBdt: typeof stored.defaultDailyBudgetBdt === 'number'
      ? stored.defaultDailyBudgetBdt
      : META_BUSINESS_PREFERENCE_DEFAULTS.defaultDailyBudgetBdt,
    defaultCountry: typeof stored.defaultCountry === 'string'
      ? stored.defaultCountry
      : META_BUSINESS_PREFERENCE_DEFAULTS.defaultCountry,
    defaultCurrency: typeof stored.defaultCurrency === 'string'
      ? stored.defaultCurrency
      : META_BUSINESS_PREFERENCE_DEFAULTS.defaultCurrency,
    defaultRetargetingDays: typeof stored.defaultRetargetingDays === 'number'
      ? stored.defaultRetargetingDays
      : META_BUSINESS_PREFERENCE_DEFAULTS.defaultRetargetingDays,
    catalogSyncEnabled: stored.catalogSyncEnabled === true,
    catalogSyncInventoryOnly: stored.catalogSyncInventoryOnly === true,
  };
}

export async function saveMetaBusinessPreferences(input: Record<string, unknown>) {
  const preferences: MetaBusinessPreferences = {
    ...META_BUSINESS_PREFERENCE_DEFAULTS,
    defaultObjective: typeof input.defaultObjective === 'string'
      ? input.defaultObjective
      : META_BUSINESS_PREFERENCE_DEFAULTS.defaultObjective,
    defaultDailyBudgetBdt: typeof input.defaultDailyBudgetBdt === 'number'
      ? input.defaultDailyBudgetBdt
      : META_BUSINESS_PREFERENCE_DEFAULTS.defaultDailyBudgetBdt,
    defaultCountry: typeof input.defaultCountry === 'string'
      ? input.defaultCountry
      : META_BUSINESS_PREFERENCE_DEFAULTS.defaultCountry,
    defaultCurrency: typeof input.defaultCurrency === 'string'
      ? input.defaultCurrency
      : META_BUSINESS_PREFERENCE_DEFAULTS.defaultCurrency,
    defaultRetargetingDays: typeof input.defaultRetargetingDays === 'number'
      ? input.defaultRetargetingDays
      : META_BUSINESS_PREFERENCE_DEFAULTS.defaultRetargetingDays,
    catalogSyncEnabled: input.catalogSyncEnabled === true,
    catalogSyncInventoryOnly: input.catalogSyncInventoryOnly === true,
  };

  await prisma.siteConfig.upsert({
    where: { key: META_BUSINESS_PREFERENCES_KEY },
    update: { value: preferences },
    create: { key: META_BUSINESS_PREFERENCES_KEY, value: preferences },
  });
  return preferences;
}
