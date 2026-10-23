export interface ReturnItemInfo {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  quantity: number;
  price: number;
  totalPrice: number;
  sku: string;
}

export interface ReturnReasonOption {
  id: string;
  title: string;
  description: string;
  tag?: string;
  iconType: 'damage' | 'wrong' | 'authenticity' | 'reaction' | 'mind';
}

export interface ReturnReasonState {
  selectedReason: string;
  notes: string;
  selectedItemId: string;
}
