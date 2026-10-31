// app/admin/shortlist/mockShortlistData.ts
// Cleaned: All mock records removed in favor of live DB orders

import {
  ShortlistOrder,
  ShortlistStats,
  WholesaleSkuRow,
  WholesalePickListManifestData,
  ThermalReceiptPayload,
} from './types';

export const INITIAL_SHORTLIST_STATS: ShortlistStats = {
  pendingOrders: 0,
  productsRemaining: 0,
  productsTotal: 0,
  acquiredProducts: 0,
  acquiredPercentage: 0,
  expectedProfit: 0,
  grossMarginPercent: 0,
  avgProfitPerOrder: 0,
  totalOrderRevenue: 0,
  wholesaleCost: 0,
  roiPercent: 0,
};

export const INITIAL_SHORTLIST_ORDERS: ShortlistOrder[] = [];

export const INITIAL_WHOLESALE_SKUS: WholesaleSkuRow[] = [];

export const DEFAULT_PICK_LIST_MANIFEST: WholesalePickListManifestData = {
  batchNumber: 'PL-00000',
  selectedSkusCount: 0,
  selectedUnitsCount: 0,
  totalCashFloat: 0,
  hubsCovered: 'None',
  qualityProtocolChecked: true,
  runnerName: '',
  runnerCode: '',
  walkingSteps: [],
};

export const DEFAULT_THERMAL_RECEIPT: ThermalReceiptPayload = {
  slipNumber: 'PL-00000',
  rigId: 'RIG #01',
  dateTimeStr: '',
  hubLocation: '',
  walkingRouteSummary: [],
  lineItems: [],
  totalUnits: 0,
  totalSkus: 0,
  requiredCashFloat: 0,
  settlementMethod: 'Cash Handover',
  barcodeString: '* PL-00000 *',
  runnerName: '',
  dispatchInCharge: '',
};
