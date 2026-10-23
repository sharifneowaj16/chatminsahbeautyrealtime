export interface OrderItemSummary {
  id: string;
  title: string;
  brand?: string;
  quantity: number;
  price: number;
  image: string;
  lotNumber?: string;
}

export interface OrderTransitStep {
  id: string;
  title: string;
  time: string;
  description: string;
  status: 'completed' | 'active' | 'upcoming';
}

export interface OrderSuccessDetails {
  orderNumber: string;
  authCode: string;
  customerName: string;
  deliveryAddress: string;
  estimatedDelivery: string;
  temperatureControl: string;
  paymentMethod: string;
  items: OrderItemSummary[];
  freeGift?: {
    title: string;
    description: string;
  };
  pricing: {
    subtotal: number;
    tariff: string;
    discount: number;
    total: number;
    saved: number;
  };
}
