// app/admin/shortlist/types.ts
// Strict type contracts matching Stitch Ground Truth (Screen ID: 46092511627045dd9f65eaa0328dd890)

export type SourcingPriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';

export interface ShortlistItem {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  sku: string;
  barcode: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  purchased: boolean;
  purchasedAt?: string | null;
  priority: SourcingPriority;
  supplierName: string;
  supplierPhone?: string;
  verifiedBy?: string | null;
  customerNote?: string | null;
}

export interface ShortlistCustomer {
  name: string;
  phone: string;
  address: string;
  area: string;
}

export interface ShortlistOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  relativeTime: string;
  priority: SourcingPriority;
  source: string;
  customer: ShortlistCustomer;
  items: ShortlistItem[];
  totalProducts: number;
  purchasedProducts: number;
  unpurchasedProducts: number;
  progress: number;
  isCompleted: boolean;
  totalBuyCost: number;
  totalCustomerBill: number;
  totalProfit: number;
}

export interface ShortlistStats {
  pendingOrders: number;
  productsRemaining: number;
  productsTotal: number;
  acquiredProducts: number;
  acquiredPercentage: number;
  expectedProfit: number;
  grossMarginPercent: number;
  avgProfitPerOrder: number;
  totalOrderRevenue: number;
  wholesaleCost: number;
  roiPercent: number;
}

export type ShortlistStatusTab = 'ALL' | 'PENDING' | 'URGENT' | 'COMPLETED';

export interface ShortlistFilterState {
  tab: ShortlistStatusTab;
  searchQuery: string;
  dateFilter: string;
  sortBy: 'urgent' | 'recent' | 'progress';
  multiSelectMode: boolean;
}

// ─────────────────────────────────────────────────────────────
// Screen 46092511627045dd9f65eaa0328dd890 Ground Truth Types
// ─────────────────────────────────────────────────────────────

export type WholesaleZone = 'ALL' | 'PALTAN' | 'CHAWKBAZAR' | 'ELEPHANT_RD';
export type WholesaleStatusTab = 'SKU_MATRIX' | 'PENDING' | 'URGENT' | 'SUPPLIERS';

export interface LinkedOrderDemand {
  orderId: string;
  orderNumber: string;
  quantity: number;
  shippingType?: 'Express' | 'Standard';
  customerNote?: string;
}

export interface VendorStallInfo {
  stallName: string;
  zone: 'Paltan' | 'Chawkbazar' | 'Elephant Rd' | string;
  standLocation: string; // e.g. "Stand 14, Lane 2, Paltan"
  contactPerson: string;
  phone: string;
  isVerified?: boolean;
  statusTag?: string; // e.g. "Verified Vendor · In Stock" | "Hold ends 1:00 PM today" | "Master Carton Ready"
  statusTagType?: 'verified' | 'urgent' | 'warning' | 'default';
}

export interface SkuFinancials {
  unitCost: number; // Wholesale buy price
  totalCost: number; // batch cost = unitCost * requiredQuantity
  retailValue: number; // retail price * requiredQuantity
  netProfit: number; // retailValue - totalCost
  marginPercent: number;
}

export interface WholesaleSkuRow {
  id: string;
  sku: string; // e.g. "MSB-LIP-01"
  barcode: string; // e.g. "890123450912"
  title: string; // e.g. "Velvet Matte Lipstick"
  variantOrShade: string; // e.g. "Ruby Rose"
  volumeSpec: string; // e.g. "3.2ml"
  categoryTag: string; // e.g. "Lips"
  batchFormulaNote: string; // e.g. "Batch LK-24 Long Wear"
  thumbnailUrl?: string;
  
  // Demand
  requiredQuantity: number;
  demandTag: 'Required' | 'Urgent Stock' | 'Bulk Source';
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
  linkedOrders: LinkedOrderDemand[];

  // Vendor
  vendor: VendorStallInfo;

  // Financials
  financials: SkuFinancials;

  // Sourcing & Progress
  pickedQuantity: number;
  progressPercent: number;
  statusNote: string; // e.g. "Picked 1 pc" | "Hold expiring soon" | "3 pcs pending pickup"
  isAcquired: boolean;
}

// ─────────────────────────────────────────────────────────────
// Dual-Drawer Types
// ─────────────────────────────────────────────────────────────

export interface WalkingRouteStep {
  stepIndex: number;
  marketName: string; // e.g. "PALTAN MARKET"
  unitsInStep: number;
  vendorName: string;
  stallAddress: string;
  phone: string;
  contactName: string;
  itemTitle: string;
  variantOrShade: string;
  skuCode: string;
  volumeSpec: string;
  orderAllocations: Array<{
    orderNumber: string;
    quantity: number;
    shippingType?: 'Express' | 'Standard';
  }>;
  unitCost: number;
  totalCost: number;
  unitsPicked: number;
  totalUnitsRequired: number;
  warningAlert?: string;
  retailPrice?: number;
}

export interface WholesalePickListManifestData {
  batchNumber: string; // e.g. "PL-84920"
  selectedSkusCount: number;
  selectedUnitsCount: number;
  totalCashFloat: number; // e.g. 2720
  hubsCovered: string; // e.g. "Paltan & Chawk"
  walkingSteps: WalkingRouteStep[];
  qualityProtocolChecked: boolean;
  runnerName: string;
  runnerCode: string;
}

export interface ThermalReceiptPayload {
  slipNumber: string;
  rigId: string;
  dateTimeStr: string;
  hubLocation: string;
  walkingRouteSummary: string[];
  lineItems: Array<{
    title: string;
    shadeOrType: string;
    skuCode: string;
    volumeSpec: string;
    qty: number;
    unitPrice: number;
    totalPrice: number;
    orderRefs: string[];
  }>;
  totalUnits: number;
  totalSkus: number;
  requiredCashFloat: number;
  settlementMethod: string;
  barcodeString: string;
  runnerName: string;
  dispatchInCharge: string;
}
