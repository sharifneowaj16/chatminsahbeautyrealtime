export type WarrantyStep = 1 | 2 | 3;

export type WarrantyReasonId = 'broken_dropper' | 'damaged_seal' | 'leakage' | 'formula_issue';

export type WarrantyResolutionType = 'replacement' | 'refund';

export interface WarrantyEligibleProduct {
  id: string;
  name: string;
  image: string;
  size: string;
  orderNumber: string;
  daysRemaining: number;
}

export interface WarrantyClaimHistoryItem {
  id: string;
  claimNumber: string;
  orderNumber: string;
  resolvedDate: string;
  productName: string;
  productImage: string;
  price: number;
  issue: string;
  resolutionText: string;
  resolutionType: 'replacement' | 'refund';
  hasSlipDownload: boolean;
}

export interface WarrantyActiveClaim {
  claimNumber: string;
  orderNumber: string;
  orderDate: string;
  productName: string;
  productImage: string;
  price: number;
  defectSummary: string;
  currentStep: number;
  totalSteps: number;
  assignedRiderName?: string;
  assignedHub?: string;
  scheduledTimeWindow?: string;
}
