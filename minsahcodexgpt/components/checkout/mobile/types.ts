export type PaymentMethodType = 'bkash' | 'nagad' | 'card' | 'cod';

export interface MobileCheckoutAddress {
  fullName: string;
  phoneNumber: string;
  streetAddress: string;
  city: string;
  zone?: string;
  area?: string;
  deliveryTimeEstimate?: string;
  hubName?: string;
  coldChainInsulated?: boolean;
}

export interface MobileCheckoutItem {
  id: string;
  brand: string;
  title: string;
  variant?: string;
  quantity: number;
  price: number;
  image: string;
  badge?: string;
}

export interface MobileCheckoutGift {
  title: string;
  tierInfo: string;
  batchNumber: string;
}

export interface MobileCheckoutPricing {
  subtotal: number;
  shipping: number;
  shippingDiscount: number;
  voucherCode?: string;
  voucherDiscount: number;
  glowPointsDiscount: number;
  glowPointsAvailable: number;
  glowPointsRedeemed: number;
  total: number;
  totalSaved: number;
}
