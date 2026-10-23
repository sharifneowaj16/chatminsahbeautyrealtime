export interface CouponItem {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: 'flat' | 'percentage' | 'shipping' | 'welcome';
  discountValue: number;
  badgeText: string;
  badgeVariant: 'primary' | 'secondary' | 'tertiary' | 'shipping';
  expiryText: string;
  isUrgent?: boolean;
  minSpend: number;
  terms: string[];
}

export interface AppliedCoupon {
  code: string;
  discountText: string;
  savingsAmount: number;
  campaignTitle: string;
}

export interface CouponApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal?: number;
  appliedCoupon?: AppliedCoupon | null;
  onApplyCoupon?: (coupon: CouponItem) => void;
  onRemoveCoupon?: () => void;
  onContinue?: () => void;
}
