export interface VoucherCode {
  id: string;
  code: string;
  title: string;
  discount: string;
  description: string;
  category: 'first-order' | 'skincare' | 'sun-care' | 'general';
  categoryLabel: string;
}

export interface CuratedBundle {
  id: string;
  title: string;
  routineType: string;
  savingsBadge: string;
  description: string;
  price: number;
  originalPrice: number;
  savingsAmount: number;
  item1: {
    name: string;
    size: string;
    image: string;
  };
  item2: {
    name: string;
    size: string;
    image: string;
  };
}

export type OfferFilterCategory = 'all' | 'vouchers' | 'flash' | 'bundles' | 'vip';
