export type OrderStatusFilter = 'all' | 'transit' | 'delivered' | 'cancelled';

export interface OrderProductLine {
  id: string;
  name: string;
  details?: string;
  quantity: number;
  price: number;
  image: string;
  hologramSealed?: boolean;
}

export interface MobileOrderRecord {
  id: string;
  orderNumber: string;
  status: 'transit' | 'delivered' | 'cancelled' | 'processing';
  statusLabel: string;
  statusBadgeVariant: 'secondary' | 'surface' | 'neutral';
  timestampLabel: string;
  totalAmount: number;
  paymentMethod: string;
  products: OrderProductLine[];
  // Active in-transit specific fields
  transitProgress?: {
    riderName: string;
    hubName: string;
    etaMinutes: number;
    progressPercentage: number;
    destinationAddress: string;
  };
  // Delivered specific fields
  batchSeal?: {
    code: string;
    notes: string;
  };
  canReview?: boolean;
}
