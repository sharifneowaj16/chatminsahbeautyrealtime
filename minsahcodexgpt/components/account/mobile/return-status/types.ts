export interface ReturnStatusData {
  returnNumber: string;
  orderNumber: string;
  orderId?: string;
  status: string;
  refundAmount: number;
  paymentMethod?: string;
  accountNumber?: string;
  pickupWindow?: string;
  riderName?: string;
  riderPhone?: string;
  riderDistance?: string;
  etaMinutes?: number;
  pickupAddress?: {
    street: string;
    area: string;
    city: string;
    note?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    image?: string | null;
    issueDescription?: string;
  }>;
  timeline?: Array<{
    title: string;
    description: string;
    timestamp?: string;
    status: 'completed' | 'active' | 'upcoming';
  }>;
}
