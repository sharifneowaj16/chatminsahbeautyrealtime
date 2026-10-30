export interface TrackingMilestone {
  id: string;
  title: string;
  time: string;
  description: string;
  status: 'completed' | 'active' | 'upcoming';
  iconType: 'check' | 'plane' | 'shield' | 'bike' | 'home';
  activeDetails?: {
    riderName: string;
    riderPhone: string;
  };
}

export interface ShipmentItemLine {
  id: string;
  title: string;
  variant: string;
  price: number;
  quantity: number;
  image: string;
  hologramSealed: boolean;
}

export interface ShipmentCourierInfo {
  name: string;
  partner: string;
  rating?: string;
  deliveriesCount?: number;
  phone?: string;
  distanceLabel?: string;
}

export interface LiveTrackingOrderData {
  orderNumber: string;
  eta: string;
  etaSubtext: string;
  courierPartner: string;
  hub: string;
  trackingAwb: string;
  deliveryDestination: string;
  milestones: TrackingMilestone[];
  courier?: ShipmentCourierInfo | null;
  items: ShipmentItemLine[];
  payment: {
    subtotal: number;
    freight: string;
    total: number;
    method: string;
  };
  previousOrder?: {
    orderNumber: string;
    deliveredDate: string;
    total: number;
    itemSummary: string;
  };
}
