"use client";






import { useToast } from '@/components/ui/ToastProvider';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Drawer } from '@/components/ui/Drawer';
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAdminAuth, PERMISSIONS } from "@/contexts/AdminAuthContext";
import { formatPrice } from "@/utils/currency";
import {
  Search,
  Filter,
  Eye,
  Truck,
  RefreshCw,
  Download,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  MapPin,
  User,
  Phone,
  Mail,
  Copy,
  ExternalLink,
  Printer,
  MessageSquare,
  ArrowUpDown,
  Calendar,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  MoreHorizontal,
  Edit3,
  Check,
  Loader2,
  ChevronUp,
  Hash,
  Layers,
  Star,
  Send,
  Trash2,
} from "lucide-react";
import SteadfastShipPanel from "@/components/admin/SteadfastShipPanel";
import SteadfastStatusBadge from "@/components/admin/SteadfastStatusBadge";
import SteadfastBulkDispatch from "@/components/admin/SteadfastBulkDispatch";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
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

interface Payment {
  id: string;
  method: string;
  status: string;
  amount: number;
  transactionId?: string;
  createdAt: string;
}

interface ShippingAddress {
  name?: string;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
}

interface TimelineEvent {
  timestamp: string;
  status: string;
  note?: string;
  actor?: string;
}

interface ApiOrderItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number | string;
  total: number | string;
  product?: { images?: Array<{ url?: string | null }> } | null;
  variant?: { name: string; attributes?: Record<string, string> } | null;
}

interface ApiPayment {
  id: string;
  method: string;
  status?: string | null;
  amount: number | string;
  transactionId?: string | null;
  createdAt: string;
}

interface Order {
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
    | "cancelled"
    | "refunded";
  paymentMethod: string;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
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

interface Stats {
  pending: number;
  processing: number;
  shipped: number;
  totalRevenue: number;
  customerDeliveryCollected: number;
  courierDeliveryActual: number;
  deliverySubsidy: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-400",
  },
  processing: {
    label: "Processing",
    color: "bg-admin-panel text-admin-primary border-admin-border",
    dot: "bg-admin-primary",
  },
  shipped: {
    label: "Shipped",
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
    dot: "bg-cyan-400",
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-400",
  },
  delivered: {
    label: "Delivered",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-400",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-400",
  },
  refunded: {
    label: "Refunded",
    color: "bg-slate-50 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
} as const;

const PAYMENT_STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  paid: {
    label: "Paid",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  completed: {
    label: "Paid",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  failed: { label: "Failed", color: "bg-red-50 text-red-700 border-red-200" },
  refunded: {
    label: "Refunded",
    color: "bg-slate-50 text-slate-600 border-slate-200",
  },
} as const;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash_on_delivery: "Cash on Delivery",
  cod: "Cash on Delivery",
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  card: "Card",
  sslcommerz: "SSLCommerz",
};

// ─── Utility helpers ──────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const toSafeMoney = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const deliveryAmountLabel = (amount: unknown) => {
  const value = toSafeMoney(amount);
  return value <= 0 ? "Free" : formatPrice(value);
};

const DELIVERY_SOURCE_LABELS: Record<string, string> = {
  DEFAULT: "Default",
  PATHAO: "Pathao quote",
  STEADFAST: "Steadfast quote",
  PRODUCT_OFFER: "Product offer",
  MANUAL: "Manual",
  FALLBACK: "Fallback",
};

const DELIVERY_OFFER_LABELS: Record<string, string> = {
  DEFAULT: "No product offer",
  FREE: "Free delivery offer",
  FIXED: "Fixed delivery offer",
};

function deliverySourceLabel(source?: string | null) {
  if (!source) return "Not set";
  const normalized = source.toUpperCase();
  return DELIVERY_SOURCE_LABELS[normalized] || source;
}

function deliveryOfferLabel(type?: string | null) {
  if (!type) return "No product offer";
  const normalized = type.toUpperCase();
  return DELIVERY_OFFER_LABELS[normalized] || type;
}

function hasDeliverySubsidy(order: Pick<Order, "deliveryDiscountAmount">) {
  return toSafeMoney(order.deliveryDiscountAmount) > 0;
}

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).catch(() => {});
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  if (!cfg) return <span className="text-xs text-gray-500">{status}</span>;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const cfg =
    PAYMENT_STATUS_CONFIG[status as keyof typeof PAYMENT_STATUS_CONFIG];
  if (!cfg) return <span className="text-xs text-gray-500">{status}</span>;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cfg.color}`}
    >
      {cfg.label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Button
      onClick={handle}
      className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
    >
      {copied ? (
        <Check className="w-3 h-3 text-emerald-500" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </Button>
  );
}

function DeliveryAccountingPanel({ order }: { order: Order }) {
  const customerDelivery = toSafeMoney(order.shippingCost);
  const courierActual =
    order.courierDeliveryCharge === null ||
    order.courierDeliveryCharge === undefined
      ? null
      : toSafeMoney(order.courierDeliveryCharge);
  const subsidy = toSafeMoney(order.deliveryDiscountAmount);
  const isFreeOffer =
    order.deliveryOfferType?.toUpperCase() === "FREE" ||
    (customerDelivery <= 0 && subsidy > 0);

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-xs font-semibold text-orange-700 uppercase flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" /> Delivery Accounting
          </h3>
          <p className="mt-1 text-xs text-orange-700/80">
            Customer delivery and internal courier cost are tracked separately.
          </p>
        </div>
        {isFreeOffer && (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            Free Delivery
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
        <div className="rounded-lg bg-white/80 border border-orange-100 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Customer paid
          </p>
          <p className="mt-1 font-bold text-gray-900">
            {deliveryAmountLabel(customerDelivery)}
          </p>
          <p className="mt-1 text-xs text-gray-500">Order.shippingCost</p>
        </div>
        <div className="rounded-lg bg-white/80 border border-orange-100 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Courier actual
          </p>
          <p className="mt-1 font-bold text-gray-900">
            {courierActual === null
              ? "Not confirmed"
              : formatPrice(courierActual)}
          </p>
          <p className="mt-1 text-xs text-gray-500">Internal cost</p>
        </div>
        <div className="rounded-lg bg-white/80 border border-orange-100 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Subsidy / discount
          </p>
          <p
            className={`mt-1 font-bold ${subsidy > 0 ? "text-emerald-700" : "text-gray-900"}`}
          >
            {formatPrice(subsidy)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Actual - customer paid
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-gray-700">
        <div className="flex justify-between gap-3">
          <span className="text-gray-500">Pricing source</span>
          <span className="font-medium text-gray-900">
            {deliverySourceLabel(order.deliveryPricingSource)}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-500">Offer type</span>
          <span className="font-medium text-gray-900">
            {deliveryOfferLabel(order.deliveryOfferType)}
          </span>
        </div>
        {order.deliveryOfferBadgeText && (
          <div className="flex justify-between gap-3">
            <span className="text-gray-500">Offer badge</span>
            <span className="font-medium text-gray-900 text-right">
              {order.deliveryOfferBadgeText}
            </span>
          </div>
        )}
        {order.deliveryOfferProductId && (
          <div className="flex justify-between gap-3">
            <span className="text-gray-500">Unlocked by product</span>
            <span className="font-mono text-gray-900 text-right">
              {order.deliveryOfferProductId}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Order Detail Drawer ──────────────────────────────────────────────────────

function OrderDetailDrawer({
  order,
  onClose,
  onStatusUpdate,
  onNoteUpdate,
}: {
  order: Order;
  onClose: () => void;
  onStatusUpdate: (
    id: string,
    status: string,
    tracking?: string,
  ) => Promise<void>;
  onNoteUpdate: (id: string, note: string) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "items" | "payments" | "timeline"
  >("overview");
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState(order.status);
  const [trackingInput, setTrackingInput] = useState(order.tracking || "");
  const [noteInput, setNoteInput] = useState(order.adminNote || "");
  const [savingNote, setSavingNote] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const statusOptions = Object.entries(STATUS_CONFIG).map(([v, c]) => ({
    value: v,
    label: c.label,
  }));

  const handleStatusSave = async () => {
    setUpdating(true);
    try {
      await onStatusUpdate(order.id, newStatus, trackingInput || undefined);
    } finally {
      setUpdating(false);
    }
  };

  const handleNoteSave = async () => {
    setSavingNote(true);
    try {
      await onNoteUpdate(order.id, noteInput);
    } finally {
      setSavingNote(false);
    }
  };

  const buildTimeline = (): TimelineEvent[] => {
    const t: TimelineEvent[] = [
      {
        timestamp: order.createdAt,
        status: "Order Placed",
        note: "Customer submitted order",
        actor: "Customer",
      },
    ];
    if (order.paidAt)
      t.push({
        timestamp: order.paidAt,
        status: "Payment Received",
        note: `Paid via ${PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}`,
        actor: "System",
      });
    if (order.steadfastSentAt)
      t.push({
        timestamp: order.steadfastSentAt,
        status: "Sent to Steadfast",
        note: `Tracking: ${order.steadfastTrackingCode || "—"}`,
        actor: "Admin",
      });
    if (order.shippedAt)
      t.push({
        timestamp: order.shippedAt,
        status: "Shipped",
        note: order.tracking
          ? `Tracking: ${order.tracking}`
          : "Order dispatched",
        actor: "Warehouse",
      });
    if (order.deliveredAt)
      t.push({
        timestamp: order.deliveredAt,
        status: "Delivered",
        note: "Order delivered successfully",
        actor: "Courier",
      });
    if (order.cancelledAt)
      t.push({
        timestamp: order.cancelledAt,
        status: "Cancelled",
        note: "Order cancelled",
        actor: "System",
      });
    return t.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  };

  const timeline = order.timeline?.length ? order.timeline : buildTimeline();
  const courierName =
    order.courier === "pathao" || order.shippingMethod === "pathao"
      ? "Pathao Courier"
      : order.courier === "steadfast" ||
          order.shippingMethod === "steadfast" ||
          order.steadfastStatus
        ? "Steadfast Courier"
        : null;
  const currentTrackingId =
    order.trackingId ||
    order.pathaoTrackingCode ||
    order.steadfastTrackingCode ||
    order.tracking ||
    null;
  const currentConsignmentId =
    order.consignmentId ||
    order.pathaoConsignmentId ||
    order.steadfastConsignmentId ||
    null;
  const currentCourierStatus =
    order.currentStatus || order.pathaoStatus || order.steadfastStatus || null;
  const courierLastUpdatedAt =
    order.lastUpdatedAt || order.pathaoSentAt || order.steadfastSentAt || null;

  return (
    <Drawer
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <span>#{order.id}</span>
          <CopyButton text={order.id} />
          <StatusBadge status={order.status} />
        </span>
      }
      description={formatDateTime(order.createdAt)}
      size="lg"
      bodyClassName="p-0 sm:p-0"
    >
        {/* Tabs */}
        <div className="px-6 border-b border-gray-100">
          <div className="flex gap-1 -mb-px">
            {(["overview", "items", "payments", "timeline"] as const).map(
              (tab) => (
                <Button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                    activeTab === tab
                      ? "border-admin-primary text-admin-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab}
                </Button>
              ),
            )}
          </div>
        </div>

        <div className="flex-1 p-6 space-y-5">
          {/* ── Overview Tab ──────────────────────────────────────── */}
          {activeTab === "overview" && (
            <>
              {/* Customer */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                  Customer
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">
                      {order.customer.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <a
                      href={`mailto:${order.customer.email}`}
                      className="hover:text-admin-primary"
                    >
                      {order.customer.email}
                    </a>
                  </div>
                  {order.customer.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <a
                        href={`tel:${order.customer.phone}`}
                        className="hover:text-admin-primary"
                      >
                        {order.customer.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping Address */}
              {order.shipping && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                    Shipping Address
                  </h3>
                  <div className="flex items-start gap-2 text-sm text-gray-700">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      {order.shipping.name && (
                        <p className="font-medium">{order.shipping.name}</p>
                      )}
                      {order.shipping.street1 && (
                        <p>{order.shipping.street1}</p>
                      )}
                      {order.shipping.street2 && (
                        <p>{order.shipping.street2}</p>
                      )}
                      <p>
                        {[
                          order.shipping.city,
                          order.shipping.state,
                          order.shipping.postalCode,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      {order.shipping.country && (
                        <p>{order.shipping.country}</p>
                      )}
                      {order.shipping.phone && (
                        <p className="mt-1 flex items-center gap-1 text-gray-500">
                          <Phone className="w-3 h-3" /> {order.shipping.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Steadfast Status Block */}
              {(courierName ||
                currentTrackingId ||
                currentConsignmentId ||
                currentCourierStatus ||
                timeline.length > 0) && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                    Tracking Timeline
                  </h3>
                  <div className="space-y-2 text-sm">
                    {courierName && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Courier</span>
                        <span className="font-medium text-gray-900">
                          {courierName}
                        </span>
                      </div>
                    )}
                    {currentTrackingId && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Tracking ID</span>
                        <span className="font-mono text-gray-900">
                          {currentTrackingId}
                        </span>
                      </div>
                    )}
                    {currentConsignmentId && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Consignment ID</span>
                        <span className="font-mono text-gray-900">
                          {currentConsignmentId}
                        </span>
                      </div>
                    )}
                    {currentCourierStatus && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Current Status</span>
                        <span className="font-medium text-gray-900">
                          {currentCourierStatus}
                        </span>
                      </div>
                    )}
                    {courierLastUpdatedAt && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Last Updated</span>
                        <span className="text-gray-900">
                          {formatDateTime(courierLastUpdatedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Steadfast Status Block */}
              {(order.steadfastConsignmentId ||
                order.steadfastTrackingCode) && (
                <div className="bg-admin-panel border border-admin-border rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-admin-primary uppercase mb-3 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" /> Steadfast Courier
                  </h3>
                  <div className="space-y-2">
                    {order.steadfastStatus && (
                      <div className="flex items-center gap-2">
                        <SteadfastStatusBadge
                          status={order.steadfastStatus}
                          trackingCode={order.steadfastTrackingCode}
                        />
                      </div>
                    )}
                    {order.steadfastTrackingCode && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 text-xs">Tracking:</span>
                        <span className="font-mono font-semibold text-gray-900">
                          {order.steadfastTrackingCode}
                        </span>
                        <CopyButton text={order.steadfastTrackingCode} />
                        <a
                          href={`/track?code=${order.steadfastTrackingCode}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-admin-primary hover:text-admin-primary-hover"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                    {order.steadfastConsignmentId && (
                      <p className="text-xs text-gray-500">
                        Consignment ID:{" "}
                        <span className="font-mono">
                          {order.steadfastConsignmentId}
                        </span>
                      </p>
                    )}
                    {order.steadfastSentAt && (
                      <p className="text-xs text-gray-400">
                        Dispatched: {formatDateTime(order.steadfastSentAt)}
                      </p>
                    )}
                    <p className="text-xs text-admin-primary pt-2 border-t border-admin-border mt-2">
                      Live updates from Steadfast use the{" "}
                      <Link
                        href="/admin/shipping/steadfast-webhooks"
                        className="font-medium underline hover:text-admin-text"
                      >
                        webhook log
                      </Link>
                      . Callback:{" "}
                      <code className="text-xs bg-white/80 rounded px-1">
                        /api/webhook/steadfast
                      </code>
                    </p>
                  </div>
                </div>
              )}

              {/* Order Totals */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                  Order Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatPrice(order.subtotal ?? order.total)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Customer delivery paid</span>
                    <span>{deliveryAmountLabel(order.shippingCost)}</span>
                  </div>
                  {(order.discountAmount ?? 0) > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>
                        Discount {order.couponCode && `(${order.couponCode})`}
                      </span>
                      <span>-{formatPrice(order.discountAmount!)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Payment</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-700">
                        {PAYMENT_METHOD_LABELS[order.paymentMethod] ||
                          order.paymentMethod}
                      </span>
                      <PaymentBadge status={order.paymentStatus} />
                    </div>
                  </div>
                </div>
              </div>

              <DeliveryAccountingPanel order={order} />

              {/* Status Update */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase">
                  Update Status
                </h3>
                <div className="relative">
                  <Button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 bg-white rounded-lg text-sm hover:border-admin-border transition-colors"
                  >
                    <StatusBadge status={newStatus} />
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </Button>
                  {showStatusDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                      {statusOptions.map((opt) => (
                        <Button
                          key={opt.value}
                          onClick={() => {
                            setNewStatus(opt.value as Order["status"]);
                            setShowStatusDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                          <StatusBadge status={opt.value} />
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
                <Input
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  placeholder="Tracking number (optional)"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-admin-primary"
                />
                <Button
                  onClick={handleStatusSave}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 bg-admin-primary hover:bg-admin-primary-hover text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60"
                >
                  {updating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Update Status
                </Button>
              </div>

              {/* Admin Note */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Admin Note
                </h3>
                <Textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  rows={3}
                  placeholder="Internal note (not visible to customer)…"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-admin-primary"
                />
                <Button
                  onClick={handleNoteSave}
                  disabled={savingNote}
                  className="flex items-center gap-2 text-sm text-admin-primary hover:text-admin-primary-hover font-medium disabled:opacity-60"
                >
                  {savingNote ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Save Note
                </Button>
              </div>

              {/* Customer Note */}
              {order.customerNote && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-amber-700 uppercase mb-2">
                    Customer Note
                  </h3>
                  <p className="text-sm text-amber-900">{order.customerNote}</p>
                </div>
              )}
            </>
          )}

          {/* ── Items Tab ─────────────────────────────────────────── */}
          {activeTab === "items" && (
            <div className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                >
                  <div className="w-14 h-14 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                    {item.variant && (
                      <p className="text-xs text-admin-primary">
                        {item.variant.name}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Qty: {item.quantity} × {formatPrice(item.price)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">
                    {formatPrice(item.total)}
                  </p>
                </div>
              ))}
              <div className="flex justify-between pt-3 border-t border-gray-200 font-bold text-sm">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          )}

          {/* ── Payments Tab ──────────────────────────────────────── */}
          {activeTab === "payments" && (
            <div className="space-y-3">
              {order.payments?.length ? (
                order.payments.map((p) => (
                  <div key={p.id} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium capitalize">
                        {PAYMENT_METHOD_LABELS[p.method] || p.method}
                      </span>
                      <PaymentBadge status={p.status} />
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {formatPrice(p.amount)}
                    </p>
                    {p.transactionId && (
                      <p className="text-xs text-gray-500 mt-1 font-mono">
                        TXN: {p.transactionId}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDateTime(p.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No payment records yet</p>
                </div>
              )}
            </div>
          )}

          {/* ── Timeline Tab ──────────────────────────────────────── */}
          {activeTab === "timeline" && (
            <div className="space-y-1">
              {timeline.map((event, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-admin-panel flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-admin-primary" />
                    </div>
                    {idx < timeline.length - 1 && (
                      <div className="w-px flex-1 bg-gray-200 my-1" />
                    )}
                  </div>
                  <div className="pb-4 pt-1">
                    <p className="text-sm font-medium text-gray-900">
                      {event.status}
                    </p>
                    {event.note && (
                      <p className="text-xs text-gray-500">{event.note}</p>
                    )}
                    {event.actor && (
                      <p className="text-xs uppercase tracking-wide text-admin-primary mt-1">
                        {event.actor}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDateTime(event.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </Drawer>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const { hasPermission } = useAdminAuth();
  const { pushToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    processing: 0,
    shipped: 0,
    totalRevenue: 0,
    customerDeliveryCollected: 0,
    courierDeliveryActual: 0,
    deliverySubsidy: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [sortBy, setSortBy] = useState("created");
  const [showFilters, setShowFilters] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Steadfast state ────────────────────────────────────────────────────────
  const [shipPanelOrder, setShipPanelOrder] = useState<Order | null>(null);
  const [shipPanelOpen, setShipPanelOpen] = useState(false);
  const [pathaoSendingOrderId, setPathaoSendingOrderId] = useState<
    string | null
  >(null);

  // ── Delete state ───────────────────────────────────────────────────────────
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<Order | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    pushToast({ tone: type === 'success' ? 'success' : 'danger', description: message });
  }, [pushToast]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const q = params.get("search")?.trim();
    const status = params.get("status")?.trim();
    const paymentStatus = params.get("paymentStatus")?.trim();
    const range = params.get("dateRange")?.trim();
    const sort = params.get("sortBy")?.trim();

    if (q) setSearch(q);
    if (status) setStatusFilter(status);
    if (paymentStatus) setPaymentFilter(paymentStatus);
    if (range) setDateRange(range);
    if (sort) setSortBy(sort);
  }, []);

  // ── Fetch list ─────────────────────────────────────────────────────────────

  const fetchOrders = useCallback(
    async (page = 1, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
          sortBy,
        });
        if (search) params.set("search", search);
        if (statusFilter) params.set("status", statusFilter);
        if (paymentFilter) params.set("paymentStatus", paymentFilter);
        if (dateRange) params.set("dateRange", dateRange);

        const res = await fetch(`/api/admin/orders?${params}`, {
          credentials: "include",
        });
        if (!res.ok)
          throw new Error((await res.json()).error || "Failed to fetch orders");
        const data = await res.json();
        setOrders(data.orders || []);
        setStats(
          data.stats || {
            pending: 0,
            processing: 0,
            shipped: 0,
            totalRevenue: 0,
            customerDeliveryCollected: 0,
            courierDeliveryActual: 0,
            deliverySubsidy: 0,
          },
        );
        setPagination(
          data.pagination || { page, limit: 20, total: 0, pages: 0 },
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error loading orders");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, statusFilter, paymentFilter, dateRange, sortBy],
  );

  useEffect(() => {
    if (!hasPermission(PERMISSIONS.ORDERS_VIEW)) return;
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => fetchOrders(1), search ? 400 : 0);
    return () => {
      if (searchRef.current) clearTimeout(searchRef.current);
    };
  }, [fetchOrders, hasPermission, search]);

  // ── Fetch single order detail ──────────────────────────────────────────────

  const openOrderDetail = async (order: Order) => {
    setDetailLoading(true);
    setSelectedOrder(order);
    try {
      const res = await fetch(`/api/admin/orders/${order.dbId || order.id}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const o = data.order;
        let trackingData: {
          courier?: "pathao" | "steadfast";
          trackingId?: string | null;
          consignmentId?: string | null;
          currentStatus?: string;
          lastUpdatedAt?: string | null;
          deliveryCharge?: number;
          timeline?: Array<{
            status: string;
            message: string;
            timestamp: string;
            source: "pathao" | "steadfast";
          }>;
        } | null = null;
        const trackingRes = await fetch(`/api/orders/${o.id}/tracking`, {
          credentials: "include",
          cache: "no-store",
        });
        if (trackingRes.ok) {
          trackingData = await trackingRes.json();
        }
        setSelectedOrder({
          id: o.orderNumber,
          dbId: o.id,
          customer: {
            name:
              `${o.user?.firstName || ""} ${o.user?.lastName || ""}`.trim() ||
              o.user?.email ||
              "Unknown",
            email: o.user?.email || "",
            phone: o.user?.phone || "",
          },
          items: ((o.items || []) as ApiOrderItem[]).map((i) => ({
            id: i.id,
            name: i.name,
            sku: i.sku,
            quantity: i.quantity,
            price: Number(i.price),
            total: Number(i.total),
            image: i.product?.images?.[0]?.url ?? undefined,
            variant: i.variant
              ? { name: i.variant.name, attributes: i.variant.attributes }
              : undefined,
          })),
          total: Number(o.total),
          subtotal: Number(o.subtotal),
          shippingCost: Number(o.shippingCost),
          courierDeliveryCharge:
            o.courierDeliveryCharge === null ||
            o.courierDeliveryCharge === undefined
              ? null
              : Number(o.courierDeliveryCharge),
          deliveryDiscountAmount: Number(o.deliveryDiscountAmount || 0),
          deliveryPricingSource: o.deliveryPricingSource,
          deliveryOfferType: o.deliveryOfferType,
          deliveryOfferProductId: o.deliveryOfferProductId,
          deliveryOfferBadgeText: o.deliveryOfferBadgeText,
          taxAmount: Number(o.taxAmount),
          discountAmount: Number(o.discountAmount),
          couponCode: o.couponCode,
          couponDiscount: o.couponDiscount
            ? Number(o.couponDiscount)
            : undefined,
          status: o.status?.toLowerCase() as Order["status"],
          paymentMethod: o.paymentMethod || "cod",
          paymentStatus:
            o.paymentStatus?.toLowerCase() as Order["paymentStatus"],
          payments: ((o.payments || []) as ApiPayment[]).map((p) => ({
            id: p.id,
            method: p.method,
            status: p.status?.toLowerCase() ?? "pending",
            amount: Number(p.amount),
            transactionId: p.transactionId ?? undefined,
            createdAt: p.createdAt,
          })),
          shipping: o.shippingAddress
            ? {
                name: `${o.shippingAddress.firstName || ""} ${o.shippingAddress.lastName || ""}`.trim(),
                street1: o.shippingAddress.street1,
                street2: o.shippingAddress.street2,
                city: o.shippingAddress.city,
                state: o.shippingAddress.state,
                postalCode: o.shippingAddress.postalCode,
                country: o.shippingAddress.country,
                phone: o.shippingAddress.phone,
              }
            : {},
          shippingMethod: o.shippingMethod,
          tracking: o.trackingNumber,
          customerNote: o.customerNote,
          adminNote: o.adminNote,
          timeline: trackingData?.timeline?.map((event) => ({
            timestamp: event.timestamp,
            status: event.status,
            note: event.message,
            actor: event.source,
          })),
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
          paidAt: o.paidAt,
          shippedAt: o.shippedAt,
          deliveredAt: o.deliveredAt,
          cancelledAt: o.cancelledAt,
          steadfastConsignmentId: o.steadfastConsignmentId,
          steadfastTrackingCode: o.steadfastTrackingCode,
          steadfastStatus: o.steadfastStatus,
          steadfastSentAt: o.steadfastSentAt,
          pathaoStatus: o.pathaoStatus,
          pathaoTrackingCode: o.pathaoTrackingCode,
          pathaoConsignmentId: o.pathaoConsignmentId,
          courier: trackingData?.courier,
          trackingId: trackingData?.trackingId,
          consignmentId: trackingData?.consignmentId,
          currentStatus: trackingData?.currentStatus,
          lastUpdatedAt: trackingData?.lastUpdatedAt,
        });
      }
    } catch {
      /* keep list data */
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Status / Note update ───────────────────────────────────────────────────

  const handleStatusUpdate = async (
    orderNumber: string,
    status: string,
    tracking?: string,
  ) => {
    const res = await fetch(`/api/admin/orders/${orderNumber}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, trackingNumber: tracking }),
    });
    if (res.ok) {
      const data = await res.json();
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderNumber
            ? { ...o, status: data.order.status, tracking: data.order.tracking }
            : o,
        ),
      );
      setSelectedOrder((prev) =>
        prev?.id === orderNumber
          ? {
              ...prev,
              status: data.order.status,
              tracking: data.order.tracking,
            }
          : prev,
      );
    }
  };

  const handleNoteUpdate = async (orderNumber: string, adminNote: string) => {
    const res = await fetch(`/api/admin/orders/${orderNumber}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminNote }),
    });
    if (res.ok) {
      setSelectedOrder((prev) =>
        prev?.id === orderNumber ? { ...prev, adminNote } : prev,
      );
    }
  };

  const handleSendToPathao = async (order: Order) => {
    setPathaoSendingOrderId(order.id);
    try {
      const res = await fetch("/api/admin/shipping/pathao/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.dbId || order.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send order to Pathao");
      }

      setOrders((prev) =>
        prev.map((current) =>
          current.id === order.id
            ? {
                ...current,
                shippingMethod: "pathao",
                pathaoStatus: data.pathaoStatus ?? current.pathaoStatus,
                pathaoTrackingCode:
                  data.trackingCode ?? current.pathaoTrackingCode,
                pathaoConsignmentId:
                  data.consignmentId ?? current.pathaoConsignmentId,
                pathaoSentAt: new Date().toISOString(),
                shippingCost:
                  typeof data.shippingCost === "number"
                    ? data.shippingCost
                    : current.shippingCost,
                courierDeliveryCharge:
                  typeof data.courierDeliveryCharge === "number"
                    ? data.courierDeliveryCharge
                    : current.courierDeliveryCharge,
                deliveryDiscountAmount:
                  typeof data.deliveryDiscountAmount === "number"
                    ? data.deliveryDiscountAmount
                    : current.deliveryDiscountAmount,
              }
            : current,
        ),
      );
      setSelectedOrder((prev) =>
        prev?.id === order.id
          ? {
              ...prev,
              shippingMethod: "pathao",
              pathaoStatus: data.pathaoStatus ?? prev.pathaoStatus,
              pathaoTrackingCode: data.trackingCode ?? prev.pathaoTrackingCode,
              pathaoConsignmentId:
                data.consignmentId ?? prev.pathaoConsignmentId,
              pathaoSentAt: new Date().toISOString(),
              shippingCost:
                typeof data.shippingCost === "number"
                  ? data.shippingCost
                  : prev.shippingCost,
              courierDeliveryCharge:
                typeof data.courierDeliveryCharge === "number"
                  ? data.courierDeliveryCharge
                  : prev.courierDeliveryCharge,
              deliveryDiscountAmount:
                typeof data.deliveryDiscountAmount === "number"
                  ? data.deliveryDiscountAmount
                  : prev.deliveryDiscountAmount,
            }
          : prev,
      );
      showToast(
        "success",
        data.alreadyDispatched
          ? "Order was already sent to Pathao."
          : "Order sent to Pathao.",
      );
    } catch (error) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "Failed to send order to Pathao.",
      );
    } finally {
      setPathaoSendingOrderId(null);
    }
  };

  // ── Delete order ───────────────────────────────────────────────────────────

  const handleDeleteOrder = async (order: Order) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.dbId || order.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete order");
      }
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      setDeleteConfirmOrder(null);
      if (selectedOrder?.id === order.id) setSelectedOrder(null);
      showToast("success", `Order #${order.id} deleted successfully.`);
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to delete order",
      );
    } finally {
      setDeleting(false);
    }
  };

  // ── Bulk actions ───────────────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.dbId || o.id)));
    }
  };

  // ── Export ─────────────────────────────────────────────────────────────────

  const exportCSV = () => {
    const rows = [
      [
        "Order #",
        "Date",
        "Customer",
        "Email",
        "Phone",
        "Items",
        "Total",
        "Customer Delivery Paid",
        "Courier Actual Charge",
        "Delivery Subsidy",
        "Delivery Pricing Source",
        "Delivery Offer Type",
        "Status",
        "Payment Status",
        "Payment Method",
        "City",
        "Tracking",
        "Steadfast Status",
        "Steadfast Tracking",
      ],
      ...orders.map((o) => [
        o.id,
        formatDate(o.createdAt),
        o.customer.name,
        o.customer.email,
        o.customer.phone,
        o.items.reduce((s, i) => s + i.quantity, 0),
        o.total,
        toSafeMoney(o.shippingCost),
        o.courierDeliveryCharge ?? "",
        toSafeMoney(o.deliveryDiscountAmount),
        o.deliveryPricingSource || "",
        o.deliveryOfferType || "",
        o.status,
        o.paymentStatus,
        PAYMENT_METHOD_LABELS[o.paymentMethod] || o.paymentMethod,
        o.shipping?.city || "",
        o.tracking || "",
        o.steadfastStatus || "",
        o.steadfastTrackingCode || "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // ── Guard ──────────────────────────────────────────────────────────────────

  if (!hasPermission(PERMISSIONS.ORDERS_VIEW)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-10 h-10 text-red-300 mb-3" />
        <p className="text-gray-500 font-medium">
          No permission to view orders.
        </p>
      </div>
    );
  }

  const activeFilters = [statusFilter, paymentFilter, dateRange].filter(
    Boolean,
  ).length;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-minsah-surface-page">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Orders
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {pagination.total > 0
                ? `${pagination.total.toLocaleString()} orders total`
                : "Manage and track all orders"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => fetchOrders(pagination.page, true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4 max-w-[1600px] mx-auto">
        {/* ── Stats Bar ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {[
            {
              label: "Pending",
              value: stats.pending,
              icon: Clock,
              color: "text-amber-500",
              bg: "bg-amber-50",
              filter: "pending",
            },
            {
              label: "Processing",
              value: stats.processing,
              icon: Layers,
              color: "text-admin-primary",
              bg: "bg-admin-panel",
              filter: "processing",
            },
            {
              label: "Shipped",
              value: stats.shipped,
              icon: Truck,
              color: "text-cyan-500",
              bg: "bg-cyan-50",
              filter: "shipped",
            },
            {
              label: "Total Revenue",
              value: formatPrice(stats.totalRevenue),
              icon: TrendingUp,
              color: "text-emerald-500",
              bg: "bg-emerald-50",
              filter: "",
            },
            {
              label: "Delivery Collected",
              value: formatPrice(stats.customerDeliveryCollected),
              icon: DollarSign,
              color: "text-blue-500",
              bg: "bg-blue-50",
              filter: "",
            },
            {
              label: "Courier Actual",
              value: formatPrice(stats.courierDeliveryActual),
              icon: Truck,
              color: "text-orange-500",
              bg: "bg-orange-50",
              filter: "",
            },
            {
              label: "Delivery Subsidy",
              value: formatPrice(stats.deliverySubsidy),
              icon: DollarSign,
              color: "text-rose-500",
              bg: "bg-rose-50",
              filter: "",
            },
          ].map((stat) => (
            <Button
              key={stat.label}
              onClick={() =>
                stat.filter &&
                setStatusFilter(statusFilter === stat.filter ? "" : stat.filter)
              }
              className={`bg-white border rounded-xl p-4 text-left hover:shadow-md transition-all ${
                stat.filter && statusFilter === stat.filter
                  ? "border-admin-primary ring-2 ring-minsah-border-subtle"
                  : "border-gray-100 hover:border-gray-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}
                >
                  <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="text-lg font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
              </div>
            </Button>
          ))}
        </div>

        {/* ── Search & Filters ──────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order #, customer name or email…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-admin-primary focus:border-transparent"
            />
          </div>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm transition-colors ${
              showFilters || activeFilters > 0
                ? "bg-admin-panel border-admin-border text-admin-primary"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilters > 0 && (
              <span className="w-5 h-5 rounded-full bg-admin-primary text-white text-xs flex items-center justify-center font-bold">
                {activeFilters}
              </span>
            )}
          </Button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-white border border-gray-100 rounded-xl">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-admin-primary"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                <option key={v} value={v}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-admin-primary"
            >
              <option value="">All Payments</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </Select>
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-admin-primary"
            >
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </Select>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-admin-primary"
            >
              <option value="created">Newest First</option>
              <option value="updated">Recently Updated</option>
              <option value="total_high">Highest Total</option>
              <option value="total_low">Lowest Total</option>
              <option value="customer">Customer A–Z</option>
            </Select>
            {activeFilters > 0 && (
              <div className="col-span-full flex justify-end">
                <Button
                  onClick={() => {
                    setStatusFilter("");
                    setPaymentFilter("");
                    setDateRange("");
                    setSortBy("created");
                  }}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear filters
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Bulk Action Bar ───────────────────────────────────────── */}
        {selectedIds.size > 0 && (
          <div className="bg-admin-primary text-white rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-sm font-medium">
              {selectedIds.size} selected
            </span>
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              {/* Steadfast Bulk Dispatch */}
              <SteadfastBulkDispatch
                selectedIds={selectedIds}
                onComplete={() => {
                  setSelectedIds(new Set());
                  fetchOrders(pagination.page, true);
                }}
              />
              <Button
                onClick={exportCSV}
                className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
              >
                Export Selected
              </Button>
              <Button
                onClick={() => setSelectedIds(new Set())}
                className="text-white/70 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Orders Table ──────────────────────────────────────────── */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-admin-primary" />
              <p className="text-sm">Loading orders…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <AlertCircle className="w-10 h-10 text-red-300 mb-3" />
              <p className="text-gray-600 font-medium mb-1">
                Failed to load orders
              </p>
              <p className="text-gray-400 text-sm mb-4">{error}</p>
              <Button
                onClick={() => fetchOrders(1)}
                className="text-sm text-admin-primary hover:underline"
              >
                Try again
              </Button>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <ShoppingBag className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">No orders found</p>
              <p className="text-gray-400 text-sm mt-1">
                Try adjusting your filters
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-4 py-3 text-left">
                      <Input
                        type="checkbox"
                        checked={
                          selectedIds.size === orders.length &&
                          orders.length > 0
                        }
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-admin-primary focus:ring-admin-primary"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Order
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                      Items
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Total
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Courier
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                      Payment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className={`group hover:bg-gray-50/50 transition-colors ${
                        selectedIds.has(order.dbId || order.id)
                          ? "bg-admin-panel/30"
                          : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3.5">
                        <Input
                          type="checkbox"
                          checked={selectedIds.has(order.dbId || order.id)}
                          onChange={() => toggleSelect(order.dbId || order.id)}
                          className="rounded border-gray-300 text-admin-primary focus:ring-admin-primary"
                        />
                      </td>

                      {/* Order # */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-mono font-semibold text-gray-900">
                            #{order.id.slice(-8).toUpperCase()}
                          </span>
                          <CopyButton text={order.id} />
                        </div>
                        {order.tracking && (
                          <p className="text-xs text-gray-400 mt-0.5 font-mono">
                            🚚 {order.tracking.slice(0, 12)}
                          </p>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[140px]">
                          {order.customer.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate max-w-[140px]">
                          {order.customer.email}
                        </p>
                        {order.shipping?.city && (
                          <p className="text-xs text-gray-400 flex items-center gap-0.5 mt-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            {order.shipping.city}
                          </p>
                        )}
                      </td>

                      {/* Items */}
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <p className="text-sm text-gray-700 truncate max-w-[160px]">
                          {order.items[0]?.name}
                          {order.items.length > 1
                            ? ` +${order.items.length - 1}`
                            : ""}
                        </p>
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-bold text-gray-900">
                          {formatPrice(order.total)}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">
                          {PAYMENT_METHOD_LABELS[order.paymentMethod] ||
                            order.paymentMethod}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${toSafeMoney(order.shippingCost) <= 0 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}
                          >
                            Delivery: {deliveryAmountLabel(order.shippingCost)}
                          </span>
                          {hasDeliverySubsidy(order) && (
                            <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                              Subsidy{" "}
                              {formatPrice(order.deliveryDiscountAmount || 0)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <StatusBadge status={order.status} />
                      </td>

                      {/* Courier */}
                      <td className="px-4 py-3.5">
                        {order.shippingMethod === "pathao" ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                              Pathao
                            </span>
                            {order.pathaoStatus && (
                              <p className="text-xs text-gray-700">
                                {order.pathaoStatus}
                              </p>
                            )}
                            {(order.pathaoTrackingCode || order.tracking) && (
                              <p className="text-xs font-mono text-gray-500">
                                {(
                                  order.pathaoTrackingCode || order.tracking
                                )?.slice(0, 12)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <SteadfastStatusBadge
                            status={order.steadfastStatus}
                            trackingCode={order.steadfastTrackingCode}
                          />
                        )}
                        <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                          <p>
                            Actual:{" "}
                            {order.courierDeliveryCharge === null ||
                            order.courierDeliveryCharge === undefined
                              ? "pending"
                              : formatPrice(order.courierDeliveryCharge)}
                          </p>
                          {hasDeliverySubsidy(order) && (
                            <p className="text-orange-700">
                              Subsidy:{" "}
                              {formatPrice(order.deliveryDiscountAmount || 0)}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Payment */}
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <PaymentBadge status={order.paymentStatus} />
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <p className="text-xs text-gray-600">
                          {formatDate(order.createdAt)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {timeAgo(order.createdAt)}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View detail */}
                          <Button
                            onClick={() => openOrderDetail(order)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-admin-primary bg-admin-panel border border-admin-border rounded-lg hover:bg-admin-panel transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </Button>
                          <Button
                            onClick={() => handleSendToPathao(order)}
                            disabled={
                              Boolean(order.pathaoConsignmentId) ||
                              pathaoSendingOrderId === order.id
                            }
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                              order.pathaoConsignmentId
                                ? "cursor-not-allowed border-blue-200 bg-blue-50 text-blue-700"
                                : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                            } disabled:opacity-70`}
                          >
                            {pathaoSendingOrderId === order.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Sending...
                              </>
                            ) : order.pathaoConsignmentId ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                Pathao Sent
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                Send to Pathao
                              </>
                            )}
                          </Button>
                          {/* Steadfast Dispatch / Track button */}
                          <Button
                            onClick={() => {
                              setShipPanelOrder(order);
                              setShipPanelOpen(true);
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                              order.steadfastConsignmentId
                                ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                                : "text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            {order.steadfastConsignmentId ? (
                              <>
                                <Truck className="w-3.5 h-3.5" />
                                Track
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                Parcel
                              </>
                            )}
                          </Button>
                          {/* Delete button */}
                          <Button
                            onClick={() => setDeleteConfirmOrder(order)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors"
                            title="Delete order"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Pagination ────────────────────────────────────────────── */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                onClick={() => fetchOrders(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const page =
                  Math.max(
                    1,
                    Math.min(pagination.pages - 4, pagination.page - 2),
                  ) + i;
                return (
                  <Button
                    key={page}
                    onClick={() => fetchOrders(page)}
                    className={`w-9 h-9 text-sm rounded-lg border transition-colors ${
                      page === pagination.page
                        ? "bg-admin-primary text-white border-admin-primary"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </Button>
                );
              })}
              <Button
                onClick={() => fetchOrders(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Order Detail Drawer ───────────────────────────────────── */}
      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdate={handleStatusUpdate}
          onNoteUpdate={handleNoteUpdate}
        />
      )}

      {/* ── Steadfast Ship Panel ──────────────────────────────────── */}
      <SteadfastShipPanel
        order={
          shipPanelOrder
            ? {
                id: shipPanelOrder.id,
                dbId: shipPanelOrder.dbId || shipPanelOrder.id,
                customer: shipPanelOrder.customer,
                total: shipPanelOrder.total,
                paymentMethod: shipPanelOrder.paymentMethod,
                paymentStatus: shipPanelOrder.paymentStatus,
                status: shipPanelOrder.status,
                shipping: shipPanelOrder.shipping
                  ? {
                      name:
                        shipPanelOrder.shipping.name ||
                        shipPanelOrder.customer.name,
                      address: [
                        shipPanelOrder.shipping.street1,
                        shipPanelOrder.shipping.street2,
                      ]
                        .filter(Boolean)
                        .join(", "),
                      city: shipPanelOrder.shipping.city || "",
                      phone:
                        shipPanelOrder.shipping.phone ||
                        shipPanelOrder.customer.phone,
                    }
                  : undefined,
                steadfastConsignmentId:
                  shipPanelOrder.steadfastConsignmentId || undefined,
                steadfastTrackingCode:
                  shipPanelOrder.steadfastTrackingCode || undefined,
                steadfastStatus: shipPanelOrder.steadfastStatus || undefined,
                steadfastSentAt: shipPanelOrder.steadfastSentAt || undefined,
              }
            : null
        }
        isOpen={shipPanelOpen}
        onClose={() => setShipPanelOpen(false)}
        onDispatched={(orderNumber, trackingCode) => {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === orderNumber
                ? {
                    ...o,
                    steadfastTrackingCode: trackingCode,
                    steadfastStatus: "pending",
                    status: "shipped",
                  }
                : o,
            ),
          );
          fetchOrders(pagination.page, true);
        }}
      />

      {/* ── Delete Confirmation Modal ─────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(deleteConfirmOrder)}
        onClose={() => setDeleteConfirmOrder(null)}
        onConfirm={() => {
          if (deleteConfirmOrder) void handleDeleteOrder(deleteConfirmOrder);
        }}
        title="Delete Order"
        description={
          deleteConfirmOrder
            ? `Permanently delete order #${deleteConfirmOrder.id.slice(-8).toUpperCase()}? This action cannot be undone.`
            : undefined
        }
        confirmLabel="Delete Order"
        tone="danger"
        loading={deleting}
      >
        <div className="rounded-xl bg-minsah-status-danger-surface p-3 text-sm text-minsah-status-danger-text">
          Order items, payment records, linked returns, and shortlist entries will be removed.
        </div>
      </ConfirmDialog>
    </div>
  );
}
