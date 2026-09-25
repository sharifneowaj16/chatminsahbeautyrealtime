import { formatPrice } from "@/utils/currency";

export interface OrderItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
  image?: string;
  variant?: {
    name: string;
    attributes?: Record<string, string>;
  };
}

export interface Payment {
  id: string;
  method: string;
  status: string;
  amount: number;
  transactionId?: string;
  createdAt: string;
}

export interface ShippingAddress {
  name?: string;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
}

export interface TimelineEvent {
  timestamp: string;
  status: string;
  note?: string;
  actor?: string;
}

export interface Order {
  id: string; // orderNumber
  dbId?: string;
  customer: { name: string; email: string; phone: string };
  items: OrderItem[];
  total: number;
  subtotal?: number;
  shippingCost?: number;
  courierDeliveryCharge?: number | null;
  deliveryDiscountAmount?: number;
  deliveryPricingSource?: string;
  deliveryOfferType?: string;
  deliveryOfferProductId?: string | null;
  deliveryOfferBadgeText?: string | null;
  taxAmount?: number;
  discountAmount?: number;
  couponCode?: string;
  couponDiscount?: number;
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "completed"
    | "delivered"
    | "cancelled"
    | "refunded";
  paymentMethod: string;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  paymentTransactionId?: string | null;
  payments?: Payment[];
  shipping: ShippingAddress;
  shippingMethod?: string;
  tracking?: string;
  customerNote?: string;
  adminNote?: string;
  timeline?: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  // Steadfast fields
  steadfastConsignmentId?: string | null;
  steadfastTrackingCode?: string | null;
  steadfastStatus?: string | null;
  steadfastSentAt?: string | null;
  pathaoStatus?: string | null;
  pathaoTrackingCode?: string | null;
  pathaoConsignmentId?: string | null;
  pathaoSentAt?: string | null;
  courier?: "pathao" | "steadfast";
  trackingId?: string | null;
  consignmentId?: string | null;
  currentStatus?: string | null;
  lastUpdatedAt?: string | null;
}

export interface Stats {
  pending: number;
  processing: number;
  shipped: number;
  totalRevenue: number;
  customerDeliveryCollected: number;
  courierDeliveryActual: number;
  deliverySubsidy: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    dot: "bg-amber-400",
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    dot: "bg-blue-400",
  },
  processing: {
    label: "Processing",
    color: "bg-[#5E6AD2]/20 text-indigo-300 border-[#5E6AD2]/30",
    dot: "bg-[#5E6AD2]",
  },
  shipped: {
    label: "Shipped",
    color: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
    dot: "bg-cyan-400",
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  delivered: {
    label: "Delivered",
    color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-rose-500/10 text-rose-300 border-rose-500/20",
    dot: "bg-rose-400",
  },
  refunded: {
    label: "Refunded",
    color: "bg-white/[0.06] text-[#908fa0] border-[#1f2f45]",
    dot: "bg-[#908fa0]",
  },
} as const;

export const PAYMENT_STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  },
  paid: {
    label: "Paid",
    color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  },
  completed: {
    label: "Paid",
    color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  },
  failed: {
    label: "Failed",
    color: "bg-rose-500/10 text-rose-300 border-rose-500/20",
  },
  refunded: {
    label: "Refunded",
    color: "bg-white/[0.06] text-[#908fa0] border-[#1f2f45]",
  },
} as const;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash_on_delivery: "Cash on Delivery",
  cod: "Cash on Delivery",
  bkash: "bKash Gateway",
  nagad: "Nagad",
  rocket: "Rocket",
  card: "Card",
  sslcommerz: "SSLCommerz",
};

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const toSafeMoney = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const deliveryAmountLabel = (amount: unknown) => {
  const value = toSafeMoney(amount);
  return value <= 0 ? "Free" : formatPrice(value);
};

export const DELIVERY_SOURCE_LABELS: Record<string, string> = {
  DEFAULT: "Default",
  PATHAO: "Pathao quote",
  STEADFAST: "Steadfast quote",
  PRODUCT_OFFER: "Product offer",
  MANUAL: "Manual",
  FALLBACK: "Fallback",
};

export const DELIVERY_OFFER_LABELS: Record<string, string> = {
  DEFAULT: "No product offer",
  FREE: "Free delivery offer",
  FIXED: "Fixed delivery offer",
};

export function deliverySourceLabel(source?: string | null) {
  if (!source) return "Not set";
  const normalized = source.toUpperCase();
  return DELIVERY_SOURCE_LABELS[normalized] || source;
}

export function deliveryOfferLabel(type?: string | null) {
  if (!type) return "No product offer";
  const normalized = type.toUpperCase();
  return DELIVERY_OFFER_LABELS[normalized] || type;
}

export const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).catch(() => {});
};
