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
    color: "bg-white/[0.08] text-white border-white/20",
    dot: "bg-[#161824]",
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
    color: "bg-white/[0.06] text-[#8A8F98] border-[#232636]",
    dot: "bg-[#8A8F98]",
  },
} as const;

const PAYMENT_STATUS_CONFIG = {
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
  failed: { label: "Failed", color: "bg-rose-500/10 text-rose-300 border-rose-500/20" },
  refunded: {
    label: "Refunded",
    color: "bg-white/[0.06] text-[#8A8F98] border-[#232636]",
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

const getInitials = (name?: string) => {
  if (!name) return "MB";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  if (!cfg) return <span className="text-[11px] text-[#8A8F98]">{status}</span>;
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-5 px-2 rounded-full text-[11px] font-medium tracking-tight border ${cfg.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const cfg =
    PAYMENT_STATUS_CONFIG[status as keyof typeof PAYMENT_STATUS_CONFIG];
  if (!cfg) return <span className="text-[11px] text-[#8A8F98]">{status}</span>;
  return (
    <span
      className={`inline-flex items-center h-5 px-2 rounded-full text-[11px] font-medium tracking-tight border ${cfg.color}`}
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
      className="ml-1 text-[#62666d] hover:text-[#8a8f98] transition-colors"
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
    <div className="bg-[#161824] border border-[#232636] rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-xs font-semibold text-white uppercase flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" /> Delivery Accounting
          </h3>
          <p className="mt-1 text-xs text-[#8A8F98]">
            Customer delivery and internal courier cost are tracked separately.
          </p>
        </div>
        {isFreeOffer && (
          <span className="inline-flex items-center rounded-full bg-white/[0.12] text-white border border-white/[0.20] px-2 py-0.5 text-xs font-semibold">
            Free Delivery
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
        <div className="rounded-lg bg-[#10121b] border border-[#232636] p-3">
          <p className="text-xs uppercase tracking-wide text-[#8a8f98]">
            Customer paid
          </p>
          <p className="mt-1 font-bold text-[#F7F8F8]">
            {deliveryAmountLabel(customerDelivery)}
          </p>
          <p className="mt-1 text-xs text-[#8a8f98]">Order.shippingCost</p>
        </div>
        <div className="rounded-lg bg-[#10121b] border border-[#232636] p-3">
          <p className="text-xs uppercase tracking-wide text-[#8a8f98]">
            Courier actual
          </p>
          <p className="mt-1 font-bold text-[#F7F8F8]">
            {courierActual === null
              ? "Not confirmed"
              : formatPrice(courierActual)}
          </p>
          <p className="mt-1 text-xs text-[#8a8f98]">Internal cost</p>
        </div>
        <div className="rounded-lg bg-[#10121b] border border-[#232636] p-3">
          <p className="text-xs uppercase tracking-wide text-[#8a8f98]">
            Subsidy / discount
          </p>
          <p
            className={`mt-1 font-bold ${subsidy > 0 ? "text-emerald-700" : "text-[#F7F8F8]"}`}
          >
            {formatPrice(subsidy)}
          </p>
          <p className="mt-1 text-xs text-[#8a8f98]">
            Actual - customer paid
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-[#d0d6e0]">
        <div className="flex justify-between gap-3">
          <span className="text-[#8a8f98]">Pricing source</span>
          <span className="font-medium text-[#F7F8F8]">
            {deliverySourceLabel(order.deliveryPricingSource)}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-[#8a8f98]">Offer type</span>
          <span className="font-medium text-[#F7F8F8]">
            {deliveryOfferLabel(order.deliveryOfferType)}
          </span>
        </div>
        {order.deliveryOfferBadgeText && (
          <div className="flex justify-between gap-3">
            <span className="text-[#8a8f98]">Offer badge</span>
            <span className="font-medium text-[#F7F8F8] text-right">
              {order.deliveryOfferBadgeText}
            </span>
          </div>
        )}
        {order.deliveryOfferProductId && (
          <div className="flex justify-between gap-3">
            <span className="text-[#8a8f98]">Unlocked by product</span>
            <span className="font-mono text-[#F7F8F8] text-right">
              {order.deliveryOfferProductId}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 80mm POS Thermal Receipt Preview Modal (Screen 10) ─────────────────────────

interface ThermalReceiptModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

function ThermalReceiptModal({ order, isOpen, onClose }: ThermalReceiptModalProps) {
  const [paperWidth, setPaperWidth] = useState<"80mm" | "58mm">("80mm");
  const [copiedMemo, setCopiedMemo] = useState(false);

  if (!isOpen || !order) return null;

  const orderNum = order.id.slice(-8).toUpperCase();
  const subtotal = order.subtotal ?? order.total;
  const delivery = toSafeMoney(order.shippingCost);
  const discount = order.discountAmount ? toSafeMoney(order.discountAmount) : 0;
  const grandTotal = order.total;
  const isBkash =
    order.paymentMethod === "bkash" ||
    order.payments?.some((p) => p.method === "bkash");
  const trxId =
    order.paymentTransactionId ||
    order.payments?.find((p) => p.transactionId)?.transactionId ||
    `TRX-9BK${orderNum}`;
  const trackingCode =
    order.steadfastTrackingCode ||
    order.pathaoTrackingCode ||
    order.tracking ||
    `ST-${orderNum}`;
  const courierPartner =
    order.shippingMethod === "pathao"
      ? "PATHAO LOGISTICS"
      : "STEADFAST COURIER LOGISTICS";

  const formatTextMemo = () => {
    return [
      "==========================================",
      "             MINSAH BEAUTY               ",
      "     Authentic Premium Cosmetics         ",
      "  Shop #204, Genetic Plaza, Dhanmondi 27  ",
      "      Hotline: +880 9612-888999          ",
      "------------------------------------------",
      "       RETAIL INVOICE / CASH MEMO        ",
      `Order ID:    #ORD-${orderNum}`,
      `Date:        ${formatDate(order.createdAt)}`,
      `Cashier:     POS-01 (Admin)`,
      `Customer:    ${order.customer.name}`,
      `Phone:       ${order.customer.phone || "—"}`,
      `Courier:     ${courierPartner} (${order.shipping?.city || "Dhaka"})`,
      "------------------------------------------",
      "ITEM / DESCRIPTION                  TOTAL",
      "------------------------------------------",
      ...order.items.map(
        (it) =>
          `${it.name.slice(0, 20).padEnd(22)} ${it.quantity}x৳${it.price} = ৳${it.total}`,
      ),
      "------------------------------------------",
      `Subtotal:                    ৳${subtotal}`,
      `Delivery Charge:             ৳${delivery}`,
      discount > 0 ? `Discount (Promo):           -৳${discount}` : "",
      `TOTAL PAYABLE:               ৳${grandTotal}`,
      "------------------------------------------",
      `Payment Method:  ${isBkash ? "bKash Merchant Gateway" : "Cash on Delivery (COD)"}`,
      `Transaction ID:  ${trxId}`,
      `Status:          ${order.paymentStatus === "paid" ? "PAID / SETTLED" : "COD / PENDING COLLECTION"}`,
      "------------------------------------------",
      `Tracking Code:   ${trackingCode}`,
      "Consignment:     ★ VERIFIED DISPATCH ★",
      "==========================================",
      " Thank you for shopping with Minsah Beauty!",
      " Exchange accepted within 7 days with memo",
      "==========================================",
    ]
      .filter(Boolean)
      .join("\n");
  };

  const handleCopyMemo = () => {
    navigator.clipboard.writeText(formatTextMemo());
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  };

  const handleDownloadTxt = () => {
    const text = formatTextMemo();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-ORD-${orderNum}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Print-specific style tag for ESC/POS thermal printers */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #pos-receipt-printable, #pos-receipt-printable * {
            visibility: visible !important;
          }
          #pos-receipt-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${paperWidth === "80mm" ? "78mm" : "56mm"} !important;
            max-width: ${paperWidth === "80mm" ? "78mm" : "56mm"} !important;
            margin: 0 !important;
            padding: 3mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }
          @page {
            size: ${paperWidth === "80mm" ? "80mm" : "58mm"} auto;
            margin: 0mm;
          }
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        id="pos-receipt-modal"
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
          onClick={onClose}
        />

        {/* Modal Window */}
        <div className="relative bg-[#071628] border border-[#1f2f45] rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[92vh] overflow-hidden z-10 animate-in duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-[#0d1c2d] border-b border-[#1f2f45] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#5E6AD2]/20 border border-[#5E6AD2]/40 flex items-center justify-center text-[#8C98FB]">
                <Printer className="w-4 h-4" />
              </div>
              <div className="truncate">
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <span>POS Thermal Receipt Preview</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#5E6AD2]/20 text-indigo-300 border border-[#5E6AD2]/30">
                    {paperWidth} ESC/POS
                  </span>
                </h3>
                <p className="text-[10px] text-[#908fa0] font-mono mt-0.5">
                  Driver: EPSON TM-T88VI (USB001) • 203 DPI
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center bg-[#051424] border border-[#1f2f45] rounded-md p-0.5 text-[10px] font-medium">
                <button
                  type="button"
                  onClick={() => setPaperWidth("80mm")}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    paperWidth === "80mm"
                      ? "bg-[#5E6AD2] text-white font-semibold"
                      : "text-[#908fa0] hover:text-white"
                  }`}
                >
                  80mm Standard
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidth("58mm")}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    paperWidth === "58mm"
                      ? "bg-[#5E6AD2] text-white font-semibold"
                      : "text-[#908fa0] hover:text-white"
                  }`}
                >
                  58mm Narrow
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-[#1c2b3c] text-[#908fa0] hover:text-white transition-colors"
                title="Close Preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Receipt Body Canvas */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#051424]/90 flex justify-center items-start">
            <div
              id="pos-receipt-printable"
              className={`w-full ${
                paperWidth === "80mm" ? "max-w-[350px]" : "max-w-[280px]"
              } bg-[#ffffff] text-neutral-900 rounded-sm shadow-2xl p-5 font-mono text-[11px] leading-relaxed border-t-4 border-dashed border-neutral-300 relative select-text`}
            >
              {/* Brand Header */}
              <div className="text-center space-y-0.5 pb-2.5">
                <div className="text-base font-extrabold tracking-wider text-black">
                  MINSAH BEAUTY
                </div>
                <div className="text-[10px] font-semibold uppercase text-neutral-700">
                  Premium Skincare & Cosmetics
                </div>
                <div className="text-[9px] text-neutral-600 leading-tight pt-0.5">
                  Shop #204, Genetic Plaza, Dhanmondi 27, Dhaka
                  <br />
                  Hotline: +880 9612-888999 • minsahbeauty.com
                </div>
                <div className="pt-1 font-bold tracking-widest text-[10px] text-black border-y border-dashed border-neutral-400 my-1 py-0.5">
                  RETAIL INVOICE / CASH MEMO
                </div>
              </div>

              {/* Order Metadata */}
              <div className="space-y-0.5 text-[10px] text-neutral-800 pb-1.5">
                <div className="flex justify-between">
                  <span className="font-bold text-black">Order ID:</span>
                  <span className="font-bold text-black">#ORD-{orderNum}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{formatDate(order.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cashier/POS:</span>
                  <span>POS-01 (Admin)</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{order.customer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span>{order.customer.phone || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Courier:</span>
                  <span>
                    {order.shippingMethod === "pathao" ? "Pathao" : "Steadfast"}{" "}
                    ({order.shipping?.city || "Dhaka"})
                  </span>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="border-t border-b border-dashed border-neutral-800 py-1 my-1.5">
                <div className="flex justify-between font-bold text-[10px] text-black pb-0.5">
                  <span>ITEM / DESCRIPTION</span>
                  <span>TOTAL</span>
                </div>
                <div className="space-y-1.5 pt-1 text-[10px]">
                  {order.items.map((item, idx) => (
                    <div key={item.id || idx}>
                      <div className="font-semibold text-black leading-tight">
                        {item.name}
                      </div>
                      <div className="flex justify-between text-neutral-600 pl-2">
                        <span>
                          {item.quantity} x {formatPrice(item.price)}
                        </span>
                        <span className="font-semibold text-black">
                          {formatPrice(item.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-0.5 text-[10px] pt-1 pb-1.5 text-neutral-800">
                <div className="flex justify-between">
                  <span>Subtotal ({order.items.length} items):</span>
                  <span className="font-semibold">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    Delivery Charge ({order.shipping?.city || "Dhaka"}):
                  </span>
                  <span className="font-semibold">{formatPrice(delivery)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT / Govt Tax (0%):</span>
                  <span>৳0.00</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-neutral-600">
                    <span>
                      Discount {order.couponCode ? `(${order.couponCode})` : ""}:
                    </span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline text-xs font-bold text-black border-t border-neutral-800 pt-1 mt-1">
                  <span>TOTAL PAYABLE:</span>
                  <span className="text-sm font-extrabold">
                    {formatPrice(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="border-t border-dashed border-neutral-400 pt-1.5 space-y-0.5 text-[9.5px] text-neutral-700">
                <div className="flex justify-between">
                  <span>Payment:</span>
                  <span className="font-bold text-black">
                    {isBkash
                      ? "bKash Merchant Gateway"
                      : "Cash on Delivery (COD)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>TrxID:</span>
                  <span className="font-mono font-bold text-black">{trxId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-bold text-black">
                    {order.paymentStatus === "paid"
                      ? "PAID / SETTLED"
                      : "AWAITING COLLECTION"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tendered:</span>
                  <span>{formatPrice(grandTotal)} | Change: ৳0.00</span>
                </div>
              </div>

              {/* Barcode & Courier Dispatch Section */}
              <div className="pt-3 text-center space-y-1">
                <div className="flex justify-center items-center gap-2">
                  <div className="w-12 h-12 bg-neutral-100 border border-neutral-400 p-1 flex items-center justify-center shrink-0">
                    <svg
                      className="w-10 h-10 text-neutral-900"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14-2h4v2h-4v-2zm-4 0h2v4h-2v-4zm2 4h4v4h-4v-4zm-2 2h2v2h-2v-2zm4-6h2v2h-2v-2zm-6-2h2v2h-2v-2z" />
                    </svg>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <div className="font-mono font-bold tracking-[0.25em] text-[18px] text-neutral-900 select-none overflow-hidden h-9 flex items-center">
                      ||| | |||| | | |||| | ||
                    </div>
                    <div className="text-[9px] font-mono tracking-widest text-neutral-800 -mt-1">
                      *ORD-{orderNum}*
                    </div>
                  </div>
                </div>

                {/* Logistics Handoff Box */}
                <div className="pt-2 pb-1 space-y-2 text-left font-mono">
                  <div className="border border-dashed border-neutral-800 p-2 rounded-sm space-y-1 bg-neutral-100/50">
                    <div className="flex items-center justify-between border-b border-dashed border-neutral-400 pb-1">
                      <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-black">
                        [+] COURIER HANDOFF & DISPATCH
                      </span>
                      <span className="text-[8.5px] font-bold px-1 bg-black text-white">
                        ESC/POS
                      </span>
                    </div>
                    <div className="space-y-0.5 text-[9px] text-neutral-800 pt-0.5">
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Partner:</span>
                        <span className="font-bold text-black">
                          {courierPartner}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Consignment ID:</span>
                        <span className="font-bold font-mono text-black">
                          {trackingCode}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Status:</span>
                        <span className="font-bold text-black">
                          DISPATCHED / RECEIVED
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Handoff Time:</span>
                        <span>{formatDate(order.createdAt)} [ 11:15 AM ]</span>
                      </div>
                      <div className="pt-1 text-[8.5px] text-neutral-700">
                        <div className="flex justify-between items-end">
                          <span>Rider Sign: ____________________</span>
                          <span className="text-[8px] text-neutral-500 font-semibold">
                            [ID: SF-DH-44]
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-1 pt-1 border-t border-dashed border-neutral-400 text-center">
                      <div className="inline-block px-2 py-0.5 border border-neutral-800 text-[8.5px] font-extrabold tracking-wider text-black uppercase">
                        ★ VERIFIED DISPATCH ★
                      </div>
                      <div className="text-[7.5px] text-neutral-600 mt-0.5">
                        OFFICIAL HANDOFF STAMP • MINSAH WAREHOUSE DH-01
                      </div>
                    </div>
                  </div>

                  {/* Customer POD Acknowledgement */}
                  <div className="border-t border-dashed border-neutral-400 pt-1.5 pb-0.5 space-y-1">
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="font-bold text-black uppercase tracking-wide">
                        CUSTOMER ACKNOWLEDGEMENT
                      </span>
                      <span className="text-[8px] text-neutral-700 flex items-center gap-1 font-semibold">
                        [✓] POD Verified
                      </span>
                    </div>
                    <p className="text-[8.5px] text-neutral-600 italic">
                      Received all goods in sealed & verified condition
                    </p>
                    <div className="pt-3 text-center">
                      <div className="text-[9px] tracking-widest text-neutral-400 font-bold select-none">
                        ............................................
                      </div>
                      <div className="text-[8px] text-neutral-700 uppercase font-semibold mt-0.5">
                        Customer Signature & Date
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer notes */}
                <div className="pt-2 border-t border-dashed border-neutral-400 text-[9px] text-neutral-600 space-y-0.5">
                  <p className="font-semibold text-black">
                    Thank you for shopping with Minsah Beauty!
                  </p>
                  <p>Exchange accepted within 7 days with this memo.</p>
                  <p>Unopened cosmetics only • Fragile items verified.</p>
                  <p className="text-[8px] text-neutral-500 pt-0.5 font-mono">
                    Powered by Minsah POS v2.4 • Terminal 01
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Action Bar */}
          <div className="px-4 py-3 bg-[#0d1c2d] border-t border-[#1f2f45] flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyMemo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#122131] hover:bg-[#1c2b3c] text-[#d4e4fa] border border-[#1f2f45] transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-[#908fa0]" />
                <span>{copiedMemo ? "Copied Memo!" : "Copy Text Memo"}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadTxt}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#122131] hover:bg-[#1c2b3c] text-[#d4e4fa] border border-[#1f2f45] transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#908fa0]" />
                <span>Download .txt</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-[#908fa0] hover:text-white hover:bg-[#122131] transition-colors"
              >
                Close
              </button>
              <Button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Thermal Slip (80mm)</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Order Detail Drawer (Screen 2, Screen 8 Payments, Screen 9 Timeline) ───────

function OrderDetailDrawer({
  order,
  onClose,
  onStatusUpdate,
  onNoteUpdate,
  onDispatch,
  onOpenReceipt,
}: {
  order: Order;
  onClose: () => void;
  onStatusUpdate: (
    id: string,
    status: string,
    tracking?: string,
  ) => Promise<void>;
  onNoteUpdate: (id: string, note: string) => Promise<void>;
  onDispatch?: (order: Order) => void;
  onOpenReceipt?: (order: Order) => void;
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

  // Screen 9: Timeline filter and activity logging state
  const [timelineFilter, setTimelineFilter] = useState<
    "all" | "logistics" | "payment" | "staff"
  >("all");
  const [customActivityText, setCustomActivityText] = useState("");
  const [manualEvents, setManualEvents] = useState<TimelineEvent[]>([]);

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
        status: "Order Placed & Session Initialized",
        note: `Customer submitted order via checkout. Items: ${order.items.length}`,
        actor: "Customer",
      },
    ];
    if (order.paidAt)
      t.push({
        timestamp: order.paidAt,
        status: "Payment Received & IPN Settled",
        note: `Paid via ${PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}. Transaction verified.`,
        actor: "System IPN",
      });
    if (order.steadfastSentAt)
      t.push({
        timestamp: order.steadfastSentAt,
        status: "Consignment Generated & Courier Handoff Booked",
        note: `Steadfast Courier API assigned tracking code ST-${order.id.slice(-8).toUpperCase()}`,
        actor: "Steadfast API Webhook",
      });
    if (order.shippedAt)
      t.push({
        timestamp: order.shippedAt,
        status: "Dispatched & In Transit",
        note: order.tracking
          ? `Consignment dispatched with tracking ${order.tracking}`
          : "Order dispatched from central warehouse",
        actor: "Warehouse Staff",
      });
    if (order.deliveredAt)
      t.push({
        timestamp: order.deliveredAt,
        status: "Delivered & POD Verified",
        note: "Rider completed delivery. Customer signed acknowledgement receipt.",
        actor: "Steadfast Rider",
      });
    if (order.cancelledAt)
      t.push({
        timestamp: order.cancelledAt,
        status: "Order Cancelled",
        note: "Order was cancelled and stock returned to inventory.",
        actor: "System",
      });
    return t.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  };

  const handleAddActivity = async () => {
    if (!customActivityText.trim()) return;
    const newEvt: TimelineEvent = {
      timestamp: new Date().toISOString(),
      status: "Staff Audit Entry",
      note: customActivityText.trim(),
      actor: "Minsah Admin",
    };
    setManualEvents((prev) => [newEvt, ...prev]);
    const updatedNote = order.adminNote
      ? `${order.adminNote}\n[${new Date().toLocaleDateString()}] ${customActivityText.trim()}`
      : customActivityText.trim();
    await onNoteUpdate(order.id, updatedNote);
    setCustomActivityText("");
  };

  const rawTimeline = order.timeline?.length ? order.timeline : buildTimeline();
  const allTimelineEvents = [...manualEvents, ...rawTimeline].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const filteredTimeline = allTimelineEvents.filter((ev) => {
    if (timelineFilter === "logistics") {
      const txt = (ev.status + " " + (ev.note || "")).toLowerCase();
      return (
        txt.includes("steadfast") ||
        txt.includes("pathao") ||
        txt.includes("courier") ||
        txt.includes("shipped") ||
        txt.includes("transit") ||
        txt.includes("delivered") ||
        txt.includes("consignment")
      );
    }
    if (timelineFilter === "payment") {
      const txt = (ev.status + " " + (ev.note || "")).toLowerCase();
      return (
        txt.includes("payment") ||
        txt.includes("bkash") ||
        txt.includes("paid") ||
        txt.includes("settled") ||
        txt.includes("cod")
      );
    }
    if (timelineFilter === "staff") {
      return (
        ev.actor === "Minsah Admin" ||
        ev.actor === "Warehouse Staff" ||
        ev.status.includes("Staff") ||
        ev.status.includes("Audit")
      );
    }
    return true;
  });

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

  // Delivery Accounting calculations
  const customerPaid = toSafeMoney(order.shippingCost);
  const actualCost =
    order.courierDeliveryCharge !== null &&
    order.courierDeliveryCharge !== undefined
      ? toSafeMoney(order.courierDeliveryCharge)
      : null;
  const diff = actualCost !== null ? customerPaid - actualCost : 0;

  const isBkash =
    order.paymentMethod === "bkash" ||
    order.payments?.some((p) => p.method === "bkash");
  const orderNum = order.id.slice(-8).toUpperCase();
  const trxId =
    order.paymentTransactionId ||
    order.payments?.find((p) => p.transactionId)?.transactionId ||
    `TRX-9BK${orderNum}`;

  return (
    <Drawer
      open
      onClose={onClose}
      size="lg"
      panelClassName="max-w-[480px] lg:max-w-[500px] bg-[#071628] border-l border-[#232636] shadow-2xl flex flex-col overflow-hidden"
      headerClassName="p-4 border-b border-[#232636] bg-[#0D1C2D] sticky top-0 z-20"
      bodyClassName="p-0 flex-1 overflow-y-auto bg-[#071628]"
      footerClassName="p-4 border-t border-[#232636] bg-[#071628] sticky bottom-0 z-20"
      title={
        <div className="flex items-center justify-between gap-2 pr-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white font-mono">
              #{order.id}
            </span>
            <CopyButton text={order.id} />
            <StatusBadge status={order.status} />
          </div>
          <Button
            type="button"
            onClick={() =>
              onOpenReceipt ? onOpenReceipt(order) : window.print()
            }
            title="Print POS Thermal Slip (80mm)"
            className="p-1.5 rounded-md hover:bg-[#161824] text-[#8A8F98] hover:text-white transition-colors"
          >
            <Printer className="w-4 h-4" />
          </Button>
        </div>
      }
      description={
        <span className="text-[11px] text-[#8A8F98] font-mono mt-0.5 block">
          Placed {formatDate(order.createdAt)} ({timeAgo(order.createdAt)})
        </span>
      }
      footer={
        <div className="flex items-center gap-3 w-full">
          <Button
            type="button"
            onClick={async () => {
              const targetStatus =
                order.status === "shipped" ? "completed" : "shipped";
              await onStatusUpdate(
                order.id,
                targetStatus,
                trackingInput || order.steadfastTrackingCode || undefined,
              );
            }}
            disabled={
              updating ||
              order.status === "completed" ||
              order.status === "cancelled"
            }
            className="flex-1 py-2 px-3 rounded-md bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {updating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {order.status === "shipped"
              ? "Mark As Delivered"
              : "Mark As Shipped"}
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (
                confirm(`Are you sure you want to cancel order #${order.id}?`)
              ) {
                onStatusUpdate(order.id, "cancelled");
              }
            }}
            disabled={
              updating ||
              order.status === "cancelled" ||
              order.status === "completed"
            }
            className="py-2 px-4 rounded-md bg-[#161824] hover:bg-rose-950/40 text-rose-300 border border-rose-500/30 text-xs font-medium transition-all disabled:opacity-50"
          >
            Cancel Order
          </Button>
        </div>
      }
    >
      {/* Drawer Navigation Tabs */}
      <div className="flex items-center border-b border-[#232636] px-4 bg-[#090A0F] text-xs sticky top-0 z-10">
        {(
          [
            { key: "overview", label: "Overview" },
            { key: "items", label: `Items (${order.items.length})` },
            { key: "payments", label: "Payments" },
            { key: "timeline", label: "Timeline" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-2.5 font-medium border-b-2 transition-colors ${
              activeTab === t.key
                ? "text-white border-[#5E6AD2]"
                : "text-[#8A8F98] hover:text-white border-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Drawer Content Body */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <>
            {/* Customer Details Card */}
            <div className="bg-[#10121B] border border-[#232636] rounded-lg p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-[#8A8F98] uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#5E6AD2]" />
                  Customer Details
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {order.payments?.some((p) => p.status === "paid")
                    ? "Verified Buyer"
                    : "Customer"}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#8A8F98]">Name</span>
                  <span className="font-medium text-white">
                    {order.customer.name}
                  </span>
                </div>
                {order.customer.phone && (
                  <div className="flex justify-between">
                    <span className="text-[#8A8F98]">Phone</span>
                    <a
                      href={`tel:${order.customer.phone}`}
                      className="font-mono text-[#D0D6E0] hover:text-[#8C98FB] transition-colors"
                    >
                      {order.customer.phone}
                    </a>
                  </div>
                )}
                {order.customer.email && (
                  <div className="flex justify-between">
                    <span className="text-[#8A8F98]">Email</span>
                    <a
                      href={`mailto:${order.customer.email}`}
                      className="font-mono text-[#D0D6E0] hover:text-[#8C98FB] transition-colors"
                    >
                      {order.customer.email}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Address & Courier Card */}
            <div className="bg-[#10121B] border border-[#232636] rounded-lg p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-[#8A8F98] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  Shipping Address
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-orange-500/10 text-orange-300 border border-orange-500/20">
                  {courierName ||
                    (order.shippingMethod === "pathao"
                      ? "Pathao Courier"
                      : "Steadfast Courier")}
                </span>
              </div>
              <p className="text-xs text-[#D0D6E0] leading-relaxed">
                {[
                  order.shipping?.street1,
                  order.shipping?.street2,
                  order.shipping?.city,
                  order.shipping?.state,
                  order.shipping?.postalCode,
                  order.shipping?.country || "Bangladesh",
                ]
                  .filter(Boolean)
                  .join(", ") || "No address provided"}
              </p>
              <div className="mt-3 pt-3 border-t border-[#232636] flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] text-[#8A8F98]">
                    Consignment Code
                  </div>
                  <div className="font-mono text-white font-medium mt-0.5">
                    {currentTrackingId ||
                      currentConsignmentId ||
                      "Unassigned"}
                  </div>
                </div>
                {currentTrackingId ? (
                  <a
                    href={`/track?code=${currentTrackingId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border border-cyan-500/30 text-[11px] font-medium transition-all"
                  >
                    Track Parcel
                  </a>
                ) : (
                  <Button
                    onClick={() => onDispatch?.(order)}
                    className="px-2.5 py-1 rounded bg-[#5E6AD2]/20 hover:bg-[#5E6AD2]/30 text-indigo-200 border border-[#5E6AD2]/30 text-[11px] font-medium transition-all"
                  >
                    Dispatch Parcel
                  </Button>
                )}
              </div>
            </div>

            {/* Delivery Accounting & Subsidy Breakdown */}
            <div className="bg-[#10121B] border border-[#232636] rounded-lg p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-[#8A8F98] uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Delivery Accounting
                </span>
                {actualCost === null ? (
                  <span className="text-[10px] font-mono text-[#8A8F98]">
                    Pending Courier
                  </span>
                ) : diff === 0 ? (
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                    Net Neutral
                  </span>
                ) : diff < 0 ? (
                  <span className="text-[10px] font-mono text-rose-400 font-semibold">
                    -৳{Math.abs(diff)} (Absorbed)
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                    +৳{diff} (Surplus)
                  </span>
                )}
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#8A8F98]">
                    Delivery Charged to Customer
                  </span>
                  <span className="font-mono text-white">
                    {deliveryAmountLabel(customerPaid)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A8F98]">
                    Actual Courier Invoice
                  </span>
                  <span className="font-mono text-white">
                    {actualCost !== null ? formatPrice(actualCost) : "—"}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#232636]">
                  <span className="text-[#8A8F98]">Store Delivery Subsidy</span>
                  <span
                    className={`font-mono font-medium ${diff < 0 ? "text-rose-400" : "text-emerald-400"}`}
                  >
                    {diff < 0
                      ? `-৳${Math.abs(diff)} (Absorbed)`
                      : diff > 0
                        ? `+৳${diff} (Surplus)`
                        : "৳0 (Net Neutral)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Ordered Items Breakdown */}
            <div className="bg-[#10121B] border border-[#232636] rounded-lg p-3.5">
              <div className="text-[11px] font-semibold text-[#8A8F98] uppercase tracking-wider mb-3">
                Ordered Items ({order.items.length})
              </div>
              <div className="space-y-2.5">
                {order.items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className={`flex items-center justify-between gap-2 pb-2.5 ${
                      idx < order.items.length - 1
                        ? "border-b border-[#232636]"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded bg-[#161824] border border-[#232636] overflow-hidden flex items-center justify-center shrink-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-indigo-300">
                            {item.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div
                          className="text-xs font-medium text-white truncate"
                          title={item.name}
                        >
                          {item.name}
                        </div>
                        <div className="text-[10px] text-[#8A8F98] font-mono">
                          SKU: {item.sku || "—"}{" "}
                          {item.variant?.name ? `• ${item.variant.name}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-medium text-white">
                        {item.quantity} × {formatPrice(item.price)}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-mono">
                        {formatPrice(item.total)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Summary totals */}
              <div className="mt-3.5 pt-3 border-t border-[#232636] space-y-1.5 text-xs">
                <div className="flex justify-between text-[#8A8F98]">
                  <span>Items Subtotal</span>
                  <span className="font-mono text-[#D0D6E0]">
                    {formatPrice(order.subtotal ?? order.total)}
                  </span>
                </div>
                <div className="flex justify-between text-[#8A8F98]">
                  <span>Delivery Charge</span>
                  <span className="font-mono text-[#D0D6E0]">
                    {deliveryAmountLabel(order.shippingCost)}
                  </span>
                </div>
                {(order.discountAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-[#8A8F98]">
                    <span>
                      Promo Discount{" "}
                      {order.couponCode ? `(${order.couponCode})` : ""}
                    </span>
                    <span className="font-mono text-emerald-400">
                      -{formatPrice(order.discountAmount!)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-white pt-2 border-t border-[#232636]">
                  <span>Grand Total</span>
                  <span className="font-mono text-[#8C98FB]">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Editable Admin Internal Note */}
            <div className="bg-[#10121B] border border-[#232636] rounded-lg p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-[#8A8F98] uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  Admin Internal Note
                </span>
                <span className="text-[10px] text-[#62666D]">
                  Only staff can see this
                </span>
              </div>
              <Textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                rows={2}
                placeholder="Customer requested extra packaging, fragile label, etc..."
                className="w-full bg-[#161824] border border-[#232636] rounded p-2.5 text-xs text-white placeholder-[#62666D] focus:border-[#5E6AD2] focus:outline-none"
              />
              <div className="mt-2.5 flex justify-end">
                <Button
                  onClick={handleNoteSave}
                  disabled={savingNote}
                  className="px-3 py-1 rounded bg-[#5E6AD2]/20 hover:bg-[#5E6AD2]/30 text-indigo-200 border border-[#5E6AD2]/30 text-[11px] font-medium transition-all"
                >
                  {savingNote ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Save Note"
                  )}
                </Button>
              </div>
            </div>

            {/* Customer Note */}
            {order.customerNote && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3.5">
                <h3 className="text-xs font-semibold text-amber-400 uppercase mb-1.5">
                  Customer Note
                </h3>
                <p className="text-xs text-amber-200/90">
                  {order.customerNote}
                </p>
              </div>
            )}

            {/* Status Update Card */}
            <div className="bg-[#10121B] border border-[#232636] rounded-lg p-3.5 space-y-3">
              <h3 className="text-xs font-semibold text-[#8A8F98] uppercase">
                Update Status
              </h3>
              <div className="relative">
                <Button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="w-full flex items-center justify-between px-3 py-2 border border-[#232636] bg-[#161824] text-[#F7F8F8] rounded-lg text-xs hover:border-[#5E6AD2]/50 transition-colors"
                >
                  <StatusBadge status={newStatus} />
                  <ChevronDown className="w-4 h-4 text-[#62666D]" />
                </Button>
                {showStatusDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#161824] border border-[#232636] rounded-lg shadow-xl z-20 overflow-hidden">
                    {statusOptions.map((opt) => (
                      <Button
                        key={opt.value}
                        onClick={() => {
                          setNewStatus(opt.value as Order["status"]);
                          setShowStatusDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-[#1B1E2E] transition-colors flex items-center gap-2"
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
                className="w-full px-3 py-2 border border-[#232636] bg-[#161824] rounded-lg text-xs text-[#F7F8F8] placeholder-[#62666D] focus:border-[#5E6AD2]"
              />
              <Button
                onClick={handleStatusSave}
                disabled={updating}
                className="w-full flex items-center justify-center gap-2 bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white text-xs font-semibold py-2 rounded-lg transition-colors disabled:opacity-60"
              >
                {updating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Update Status
              </Button>
            </div>
          </>
        )}

        {/* ── Items Tab ── */}
        {activeTab === "items" && (
          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-[#10121B] border border-[#232636] rounded-xl"
              >
                <div className="w-14 h-14 rounded-lg bg-[#161824] border border-[#232636] overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-6 h-6 text-[#62666D]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#F7F8F8] truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-[#8A8F98]">SKU: {item.sku}</p>
                  {item.variant && (
                    <p className="text-xs text-[#8C98FB]">
                      {item.variant.name}
                    </p>
                  )}
                  <p className="text-xs text-[#8A8F98]">
                    Qty: {item.quantity} × {formatPrice(item.price)}
                  </p>
                </div>
                <p className="text-sm font-bold text-[#F7F8F8]">
                  {formatPrice(item.total)}
                </p>
              </div>
            ))}
            <div className="flex justify-between pt-3 border-t border-[#232636] font-bold text-sm text-[#F7F8F8]">
              <span>Total</span>
              <span className="font-mono text-[#8C98FB]">
                {formatPrice(order.total)}
              </span>
            </div>
          </div>
        )}

        {/* ── Screen 8: Payments Tab (Stitch Match) ── */}
        {activeTab === "payments" && (
          <div className="space-y-4">
            {/* Gateway Details Card */}
            <div className="bg-[#10121B] border border-[#232636] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-[#232636]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#5E6AD2]/20 border border-[#5E6AD2]/40 flex items-center justify-center text-[#8C98FB]">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      {isBkash
                        ? "bKash Payment Gateway (PGW)"
                        : "Cash on Delivery (COD)"}
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                          order.paymentStatus === "paid"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                            : "bg-amber-500/15 text-amber-300 border border-amber-500/20"
                        }`}
                      >
                        {order.paymentStatus === "paid"
                          ? "API Verified ✓"
                          : "Pending Handover"}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#8A8F98] font-mono">
                      {isBkash
                        ? "Tokenized Online Checkout V2"
                        : "Cash Collection on Delivery"}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {isBkash ? "IPN Signature Match" : "COD Verification"}
                </span>
              </div>

              {/* 4-Grid Key Metrics */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-[#161824] border border-[#232636] rounded p-2">
                  <div className="text-[10px] text-[#8A8F98]">
                    Transaction ID (TrxID)
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="font-mono font-bold text-white text-xs truncate">
                      {trxId}
                    </span>
                    <CopyButton text={trxId} />
                  </div>
                </div>
                <div className="bg-[#161824] border border-[#232636] rounded p-2">
                  <div className="text-[10px] text-[#8A8F98]">
                    Customer Wallet / Phone
                  </div>
                  <div className="font-mono font-bold text-white text-xs mt-0.5">
                    {order.customer.phone || "—"}
                  </div>
                </div>
                <div className="bg-[#161824] border border-[#232636] rounded p-2">
                  <div className="text-[10px] text-[#8A8F98]">
                    Merchant Store ID
                  </div>
                  <div className="font-mono text-xs text-[#D0D6E0] mt-0.5 truncate">
                    MB-COMMERCE-01
                  </div>
                </div>
                <div className="bg-[#161824] border border-[#232636] rounded p-2">
                  <div className="text-[10px] text-[#8A8F98]">
                    Gateway Reference
                  </div>
                  <div className="font-mono text-xs text-indigo-300 mt-0.5 truncate">
                    {isBkash ? "BKASH-API-V2-SEC" : "COD-DISPATCH-REG"}
                  </div>
                </div>
              </div>

              {/* Gateway Settlement Bar */}
              <div className="bg-[#090A0F] border border-[#232636] rounded p-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] text-[#8A8F98]">
                    Gateway Fee ({isBkash ? "1.5%" : "0%"})
                  </div>
                  <div className="font-mono text-xs text-rose-300 font-medium mt-0.5">
                    -৳{isBkash ? (order.total * 0.015).toFixed(2) : "0.00"}
                  </div>
                </div>
                <div className="h-6 w-px bg-[#232636]" />
                <div>
                  <div className="text-[10px] text-[#8A8F98]">
                    Net Settlement
                  </div>
                  <div className="font-mono text-xs text-emerald-400 font-bold mt-0.5">
                    ৳
                    {isBkash
                      ? (order.total * 0.985).toFixed(2)
                      : order.total.toFixed(2)}
                  </div>
                </div>
                <div className="h-6 w-px bg-[#232636]" />
                <div>
                  <div className="text-[10px] text-[#8A8F98]">
                    Settlement Account
                  </div>
                  <div className="font-mono text-[11px] text-[#D0D6E0] mt-0.5">
                    {isBkash ? "City Bank ••4419" : "Cash Register"}
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Accounting Breakdown Card */}
            <div className="bg-[#10121B] border border-[#232636] rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#232636]">
                <span className="text-xs font-semibold text-white">
                  Order Financial Breakdown
                </span>
                <span className="text-[10px] font-mono text-[#8A8F98]">
                  Currency: BDT (৳)
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[#8A8F98]">
                  <span>Item Subtotal ({order.items.length} items)</span>
                  <span className="font-mono text-white">
                    {formatPrice(order.subtotal ?? order.total)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#8A8F98]">
                  <span>Delivery Charge Collected</span>
                  <span className="font-mono text-white">
                    {deliveryAmountLabel(order.shippingCost)}
                  </span>
                </div>
                {(order.discountAmount ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-[#8A8F98]">
                    <span>
                      Promo Discount{" "}
                      {order.couponCode ? `(${order.couponCode})` : ""}
                    </span>
                    <span className="font-mono text-emerald-400">
                      -{formatPrice(order.discountAmount!)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-[#232636] text-sm font-bold text-white">
                  <span>Total Net Payable</span>
                  <span className="font-mono text-[#8C98FB]">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  onClick={() => onOpenReceipt?.(order)}
                  className="w-full h-9 rounded-lg bg-[#5E6AD2]/15 hover:bg-[#5E6AD2]/25 border border-[#5E6AD2]/30 text-indigo-200 text-xs font-medium flex items-center justify-center gap-2 transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print POS Receipt / Memo (80mm)</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Screen 9: Timeline & Audit Stream (Stitch Match) ── */}
        {activeTab === "timeline" && (
          <div className="space-y-4">
            {/* Timeline Summary Header & Filter Bar */}
            <div className="bg-[#10121B] border border-[#232636] rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#5E6AD2] animate-pulse" />
                  <span className="text-xs font-semibold text-white">
                    Current State:
                  </span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="text-[10px] text-[#8A8F98] font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#8A8F98]" />
                  Updated {timeAgo(order.updatedAt || order.createdAt)}
                </div>
              </div>

              {/* Quick Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#232636]">
                {(
                  [
                    {
                      key: "all",
                      label: `All Events (${allTimelineEvents.length})`,
                    },
                    { key: "logistics", label: "Courier / Logistics" },
                    { key: "payment", label: "Payment & Gateway" },
                    { key: "staff", label: "Staff Actions" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setTimelineFilter(f.key)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                      timelineFilter === f.key
                        ? "bg-[#5E6AD2] text-white shadow-sm"
                        : "bg-[#161824] hover:bg-[#1f2233] text-[#8A8F98] hover:text-white border border-[#232636]"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vertical Timeline Stream */}
            <div className="relative pl-4 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-[#5E6AD2] before:via-[#232636] before:to-transparent">
              {filteredTimeline.map((event, idx) => (
                <div key={idx} className="relative pl-6 group">
                  <div className="absolute -left-[17px] top-1 w-5 h-5 rounded-full bg-[#090A0F] border-2 border-[#5E6AD2] flex items-center justify-center ring-4 ring-[#090A0F]">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  </div>
                  <div className="bg-[#10121B] border border-[#232636] hover:border-[#35394d] rounded-lg p-3 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">
                        {event.status}
                      </span>
                      <span className="text-[10px] font-mono text-cyan-300 font-medium shrink-0">
                        {formatDate(event.timestamp)} (
                        {timeAgo(event.timestamp)})
                      </span>
                    </div>
                    {event.note && (
                      <p className="text-xs text-[#D0D6E0] mt-1.5 leading-relaxed">
                        {event.note}
                      </p>
                    )}
                    <div className="mt-2 pt-2 border-t border-[#232636] flex items-center justify-between text-[10px] text-[#8A8F98]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded bg-[#5E6AD2]/20 text-indigo-300 flex items-center justify-center font-bold text-[9px]">
                          {event.actor?.slice(0, 2).toUpperCase() || "SY"}
                        </span>
                        <span>{event.actor || "System"}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#62666D]">
                        {formatDateTime(event.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Manual Activity / Staff Note Input Box */}
            <div className="bg-[#10121B] border border-[#232636] rounded-xl p-3.5 space-y-2.5">
              <span className="text-[11px] font-semibold text-[#8A8F98] uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#5E6AD2]" />
                Log Activity / Staff Note
              </span>
              <Textarea
                value={customActivityText}
                onChange={(e) => setCustomActivityText(e.target.value)}
                rows={2}
                placeholder="Log courier dispatch update, customer call note, or refund reason..."
                className="w-full bg-[#161824] border border-[#232636] rounded p-2.5 text-xs text-white placeholder-[#62666D] focus:border-[#5E6AD2] focus:outline-none"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleAddActivity}
                  disabled={!customActivityText.trim()}
                  className="px-3 py-1 rounded bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40"
                >
                  <Send className="w-3 h-3" />
                  <span>Log Entry</span>
                </Button>
              </div>
            </div>
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

  // ── POS Thermal Receipt modal state (Screen 10) ───────────────────────────
  const [posReceiptOrder, setPosReceiptOrder] = useState<Order | null>(null);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
        <p className="text-[#8a8f98] font-medium">
          No permission to view orders.
        </p>
      </div>
    );
  }

  const activeFilters = [statusFilter, paymentFilter, dateRange].filter(
    Boolean,
  ).length;

  const selectedTotalValue = orders
    .filter((o) => selectedIds.has(o.dbId || o.id))
    .reduce((acc, curr) => acc + curr.total, 0);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 min-w-0 max-w-full overflow-x-hidden">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="bg-[#10121B]/90 backdrop-blur-md border-b border-[#232636] sticky top-0 z-30 -mx-3 sm:-mx-6 px-3 sm:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3 max-w-[1600px] mx-auto">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-base sm:text-lg lg:text-xl font-bold text-[#F7F8F8] tracking-tight">
                Orders
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#161824] border border-[#232636] text-[#8A8F98]">
                {pagination.total > 0
                  ? `${pagination.total.toLocaleString()} orders total`
                  : `${orders.length} orders total`}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-xs text-[#8A8F98] mt-0.5 font-normal">
              Manage customer shipments, courier APIs, and fulfillment subsidies
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => fetchOrders(pagination.page, true)}
              disabled={refreshing}
              className="h-8 flex items-center gap-1.5 px-3 text-xs font-medium text-[#D0D6E0] bg-[#10121B] hover:bg-[#161824] border border-[#232636] hover:border-[#2E3248] rounded-md transition-all active:scale-[0.98]"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              onClick={exportCSV}
              className="h-8 flex items-center gap-1.5 px-3 text-xs font-medium text-[#D0D6E0] bg-[#10121B] hover:bg-[#161824] border border-[#232636] hover:border-[#2E3248] rounded-md transition-all active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="px-0 sm:px-2 py-1 sm:py-2 space-y-4 max-w-[1600px] mx-auto min-w-0 w-full">
        {/* ── 7 Interactive Top KPI Cards ──────────────────────────── */}
        {/* Mobile Horizontal Carousel (< lg) */}
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-3 px-3 flex gap-2.5 pb-1 lg:hidden">
          {/* 1. Pending */}
          <button
            type="button"
            onClick={() =>
              setStatusFilter(statusFilter === "pending" ? "" : "pending")
            }
            className={`shrink-0 w-32 bg-[#10121B] border rounded-xl p-3 flex flex-col justify-between text-left transition-all ${
              statusFilter === "pending"
                ? "border-amber-500/60 ring-1 ring-amber-500/30 bg-[#161824]"
                : "border-[#232636] hover:bg-[#161824]"
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-[#8A8F98]">Pending</span>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            </div>
            <div className="mt-2.5">
              <span className="font-mono text-xl font-bold text-[#F7F8F8]">
                {stats.pending}
              </span>
              <span className="text-[10px] text-amber-400 block font-medium">
                Needs Action
              </span>
            </div>
          </button>
          {/* 2. Processing */}
          <button
            type="button"
            onClick={() =>
              setStatusFilter(
                statusFilter === "processing" ? "" : "processing",
              )
            }
            className={`shrink-0 w-32 bg-[#10121B] border rounded-xl p-3 flex flex-col justify-between text-left transition-all ${
              statusFilter === "processing"
                ? "border-[#5E6AD2] ring-1 ring-[#5E6AD2]/50 bg-[#161824]"
                : "border-[#232636] hover:bg-[#161824]"
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-indigo-300">
                Processing
              </span>
              <span className="w-2 h-2 rounded-full bg-[#5E6AD2]" />
            </div>
            <div className="mt-2.5">
              <span className="font-mono text-xl font-bold text-white">
                {stats.processing}
              </span>
              <span className="text-[10px] text-indigo-300 block font-medium">
                Packaging
              </span>
            </div>
          </button>
          {/* 3. Shipped */}
          <button
            type="button"
            onClick={() =>
              setStatusFilter(statusFilter === "shipped" ? "" : "shipped")
            }
            className={`shrink-0 w-32 bg-[#10121B] border rounded-xl p-3 flex flex-col justify-between text-left transition-all ${
              statusFilter === "shipped"
                ? "border-cyan-500/60 ring-1 ring-cyan-500/30 bg-[#161824]"
                : "border-[#232636] hover:bg-[#161824]"
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-[#8A8F98]">Shipped</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
            </div>
            <div className="mt-2.5">
              <span className="font-mono text-xl font-bold text-[#F7F8F8]">
                {stats.shipped}
              </span>
              <span className="text-[10px] text-cyan-400 block font-medium">
                In Transit
              </span>
            </div>
          </button>
          {/* 4. Revenue */}
          <div className="shrink-0 w-36 bg-[#10121B] border border-[#232636] rounded-xl p-3 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-[#8A8F98]">Revenue</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-2.5">
              <span className="font-mono text-lg font-bold text-[#F7F8F8]">
                {formatPrice(stats.totalRevenue)}
              </span>
              <span className="text-[10px] text-emerald-400 block font-medium">
                +14.2%
              </span>
            </div>
          </div>
          {/* 5. Courier Cost */}
          <div className="shrink-0 w-32 bg-[#10121B] border border-[#232636] rounded-xl p-3 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-[#8A8F98]">
                Courier Cost
              </span>
              <Truck className="w-3.5 h-3.5 text-[#62666D]" />
            </div>
            <div className="mt-2.5">
              <span className="font-mono text-lg font-bold text-[#F7F8F8]">
                {formatPrice(stats.courierDeliveryActual)}
              </span>
              <span className="text-[10px] text-[#8A8F98] block font-medium">
                Steadfast/Pathao
              </span>
            </div>
          </div>
          {/* 6. Net Surplus */}
          <div className="shrink-0 w-32 bg-[#10121B] border border-[#232636] rounded-xl p-3 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-emerald-400">
                Net Surplus
              </span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-2.5">
              <span className="font-mono text-lg font-bold text-emerald-300">
                {stats.deliverySubsidy >= 0
                  ? `+${formatPrice(stats.deliverySubsidy)}`
                  : formatPrice(stats.deliverySubsidy)}
              </span>
              <span className="text-[10px] text-emerald-400 block font-medium">
                Profit margin
              </span>
            </div>
          </div>
        </div>

        {/* Desktop 7-Col Fluid Grid (>= lg) */}
        <div className="hidden lg:grid grid-cols-7 gap-2 pt-1">
          {/* Card 1: Pending */}
          <button
            type="button"
            onClick={() =>
              setStatusFilter(statusFilter === "pending" ? "" : "pending")
            }
            className={`bg-[#10121B] hover:bg-[#161824] border rounded-lg p-2.5 text-left cursor-pointer transition-all group ${
              statusFilter === "pending"
                ? "border-amber-500/60 ring-1 ring-amber-500/30 bg-[#161824]"
                : "border-[#232636] hover:border-amber-500/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#8A8F98] group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Pending
              </span>
              <Clock className="w-3.5 h-3.5 text-[#62666D] group-hover:text-amber-400" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-[#F7F8F8] font-mono">
                {stats.pending}
              </span>
              <span className="text-[10px] text-amber-400/80 font-medium">
                Needs Action
              </span>
            </div>
          </button>
          {/* Card 2: Processing */}
          <button
            type="button"
            onClick={() =>
              setStatusFilter(
                statusFilter === "processing" ? "" : "processing",
              )
            }
            className={`border rounded-lg p-2.5 text-left cursor-pointer transition-all ${
              statusFilter === "processing"
                ? "bg-[#161824] border-[#5E6AD2] ring-1 ring-[#5E6AD2]/50 shadow-sm"
                : "bg-[#10121B] hover:bg-[#161824] border-[#232636] hover:border-[#5E6AD2]/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-indigo-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5E6AD2]" />
                Processing
              </span>
              <Layers className="w-3.5 h-3.5 text-indigo-300" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-white font-mono">
                {stats.processing}
              </span>
              <span className="text-[10px] text-indigo-300/80 font-medium">
                Packaging
              </span>
            </div>
          </button>
          {/* Card 3: Shipped */}
          <button
            type="button"
            onClick={() =>
              setStatusFilter(statusFilter === "shipped" ? "" : "shipped")
            }
            className={`bg-[#10121B] hover:bg-[#161824] border rounded-lg p-2.5 text-left cursor-pointer transition-all group ${
              statusFilter === "shipped"
                ? "border-cyan-500/60 ring-1 ring-cyan-500/30 bg-[#161824]"
                : "border-[#232636] hover:border-cyan-500/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#8A8F98] group-hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                Shipped
              </span>
              <Truck className="w-3.5 h-3.5 text-[#62666D] group-hover:text-cyan-400" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-[#F7F8F8] font-mono">
                {stats.shipped}
              </span>
              <span className="text-[10px] text-cyan-400/80 font-medium">
                In Transit
              </span>
            </div>
          </button>
          {/* Card 4: Total Revenue */}
          <div className="bg-[#10121B] hover:bg-[#161824] border border-[#232636] rounded-lg p-2.5 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#8A8F98]">
                Revenue
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-[#F7F8F8] font-mono">
                {formatPrice(stats.totalRevenue)}
              </span>
              <span className="text-[10px] text-emerald-400 font-medium">
                +14.2%
              </span>
            </div>
          </div>
          {/* Card 5: Delivery Collected */}
          <div className="bg-[#10121B] hover:bg-[#161824] border border-[#232636] rounded-lg p-2.5 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#8A8F98]">
                Deliv. Collected
              </span>
              <DollarSign className="w-3.5 h-3.5 text-[#62666D]" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-[#F7F8F8] font-mono">
                {formatPrice(stats.customerDeliveryCollected)}
              </span>
              <span className="text-[10px] text-[#8A8F98]">From users</span>
            </div>
          </div>
          {/* Card 6: Courier Cost */}
          <div className="bg-[#10121B] hover:bg-[#161824] border border-[#232636] rounded-lg p-2.5 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#8A8F98]">
                Courier Cost
              </span>
              <Truck className="w-3.5 h-3.5 text-[#62666D]" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-[#F7F8F8] font-mono">
                {formatPrice(stats.courierDeliveryActual)}
              </span>
              <span className="text-[10px] text-[#8A8F98]">Steadfast/Pathao</span>
            </div>
          </div>
          {/* Card 7: Net Surplus */}
          <div className="bg-[#10121B] hover:bg-[#161824] border border-[#232636] rounded-lg p-2.5 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-emerald-400">
                Net Surplus
              </span>
              <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 font-mono">
                {stats.deliverySubsidy >= 0
                  ? `+${formatPrice(stats.deliverySubsidy)}`
                  : formatPrice(stats.deliverySubsidy)}
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-emerald-300 font-mono">
                {stats.deliverySubsidy >= 0
                  ? `+${formatPrice(stats.deliverySubsidy)}`
                  : formatPrice(stats.deliverySubsidy)}
              </span>
              <span className="text-[10px] text-emerald-400/80 font-medium">
                Profit margin
              </span>
            </div>
          </div>
        </div>

        {/* ── Mobile Quick Filter Chips (< lg) ── */}
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-3 px-3 flex gap-2 py-1 lg:hidden">
          {[
            { key: "", label: "All", count: pagination.total || orders.length },
            {
              key: "pending",
              label: "Pending",
              count: stats.pending,
              color: "text-amber-400",
            },
            {
              key: "processing",
              label: "Processing",
              count: stats.processing,
              color: "text-indigo-300",
            },
            {
              key: "shipped",
              label: "Shipped",
              count: stats.shipped,
              color: "text-cyan-400",
            },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => setStatusFilter(chip.key)}
              className={`shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                statusFilter === chip.key
                  ? "bg-[#5E6AD2] text-white shadow-sm"
                  : "bg-[#10121B] border border-[#232636] text-[#8A8F98] hover:text-white hover:bg-[#161824]"
              }`}
            >
              <span>{chip.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  statusFilter === chip.key
                    ? "bg-black/20 text-white"
                    : `bg-[#161824] ${chip.color || "text-[#8A8F98]"}`
                }`}
              >
                {chip.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Search & Filters Toolbar ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#62666D]" />
            <Input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order #, customer name, phone or email…"
              className="w-full pl-9 pr-14 py-2 border border-[#232636] rounded-lg text-xs bg-[#10121B] text-[#F7F8F8] placeholder-[#62666D] focus:outline-none focus:ring-1 focus:ring-[#5E6AD2] focus:border-[#5E6AD2]"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#62666D] hover:text-[#F7F8F8] transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center px-1.5 py-0.5 rounded bg-white/[0.04] border border-[#232636] text-[10px] font-mono text-[#8A8F98]">
                <span>⌘K</span>
              </div>
            )}
          </div>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            className={`h-8.5 flex items-center gap-1.5 px-3 border rounded-lg text-xs font-medium transition-all active:scale-[0.98] ${
              showFilters || activeFilters > 0
                ? "bg-[#5E6AD2] text-white border-[#5E6AD2] shadow-sm"
                : "bg-[#10121B] border-[#232636] text-[#8A8F98] hover:bg-[#161824] hover:text-[#F7F8F8]"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {activeFilters > 0 && (
              <span className="w-4 h-4 rounded-full bg-black/30 text-[10px] flex items-center justify-center font-semibold">
                {activeFilters}
              </span>
            )}
          </Button>
          {activeFilters > 0 && (
            <Button
              onClick={() => {
                setStatusFilter("");
                setPaymentFilter("");
                setDateRange("");
                setSortBy("created");
              }}
              className="h-8.5 flex items-center gap-1.5 px-3 border border-[#232636] rounded-lg text-xs font-medium bg-[#10121B] text-[#8A8F98] hover:text-white hover:bg-[#161824] transition-all active:scale-[0.98]"
            >
              <RefreshCw className="w-3 h-3" />
              Reset
            </Button>
          )}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 bg-[#10121B] border border-[#232636] rounded-xl">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-[#232636] bg-[#161824] text-[#F7F8F8] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#5E6AD2]"
            >
              <option value="">Status: All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                <option key={v} value={v}>
                  Status: {c.label}
                </option>
              ))}
            </Select>
            <Select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-[#232636] bg-[#161824] text-[#F7F8F8] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#5E6AD2]"
            >
              <option value="">Payment: All</option>
              <option value="paid">Payment: Paid</option>
              <option value="pending">Payment: Pending</option>
              <option value="failed">Payment: Failed</option>
              <option value="refunded">Payment: Refunded</option>
            </Select>
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-2.5 py-1.5 border border-[#232636] bg-[#161824] text-[#F7F8F8] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#5E6AD2]"
            >
              <option value="">Date: All Time</option>
              <option value="today">Date: Today</option>
              <option value="7d">Date: Last 7 days</option>
              <option value="30d">Date: Last 30 days</option>
              <option value="90d">Date: Last 90 days</option>
            </Select>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 border border-[#232636] bg-[#161824] text-[#F7F8F8] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#5E6AD2]"
            >
              <option value="created">Sort: Newest First</option>
              <option value="updated">Sort: Recently Updated</option>
              <option value="total_high">Sort: Highest Total</option>
              <option value="total_low">Sort: Lowest Total</option>
              <option value="customer">Sort: Customer A–Z</option>
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
                  className="text-xs text-[#8A8F98] hover:text-white flex items-center gap-1 active:scale-[0.98]"
                >
                  <X className="w-3 h-3" /> Clear filters
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Bulk Selection Alert Bar (Screen 1) ────────────────────── */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between bg-gradient-to-r from-[#161824] to-[#10121B] border border-[#5E6AD2]/40 rounded-lg px-3.5 py-2 gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5E6AD2]" />
              </span>
              <span className="text-xs font-semibold text-[#F7F8F8]">
                {selectedIds.size} orders selected
              </span>
              <span className="text-xs text-[#8A8F98] hidden sm:inline">
                • Total Value:{" "}
                <strong className="text-white font-mono">
                  {formatPrice(selectedTotalValue)}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <SteadfastBulkDispatch
                selectedIds={selectedIds}
                onComplete={() => {
                  setSelectedIds(new Set());
                  fetchOrders(pagination.page, true);
                }}
              />
              <Button
                onClick={exportCSV}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161824] hover:bg-[#1B1E2E] text-[#D0D6E0] border border-[#232636] text-xs font-medium transition-all"
              >
                <Download className="w-3.5 h-3.5 text-[#8A8F98]" />
                <span>Export Selected</span>
              </Button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="p-1 text-[#8A8F98] hover:text-white rounded hover:bg-[#232636] transition-colors"
                title="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Orders Table Container (Zero Horizontal Scrollbar) ────── */}
        <div className="bg-[#10121B] border border-[#232636] rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-[#62666D]">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#5E6AD2]" />
              <p className="text-sm">Loading orders…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
              <p className="text-[#8A8F98] font-medium mb-1">
                Failed to load orders
              </p>
              <p className="text-[#62666D] text-sm mb-4">{error}</p>
              <Button
                onClick={() => fetchOrders(1)}
                className="text-sm text-[#5E6AD2] hover:underline"
              >
                Try again
              </Button>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <ShoppingBag className="w-10 h-10 text-gray-500 mb-3" />
              <p className="text-[#8A8F98] font-medium">No orders found</p>
              <p className="text-[#62666D] text-sm mt-1">
                Try adjusting your filters
              </p>
            </div>
          ) : (
            <>
              {/* ── Desktop View (Screen 1 - 5-Column Precision Table) ── */}
              <div className="hidden lg:block w-full overflow-hidden">
                <table className="w-full table-fixed text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#232636] bg-[#090A0F]/60 text-[11px] font-semibold text-[#62666D] uppercase tracking-wider">
                      <th className="w-[23%] px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Input
                            type="checkbox"
                            checked={
                              selectedIds.size === orders.length &&
                              orders.length > 0
                            }
                            onChange={toggleSelectAll}
                            className="rounded border-[#232636] bg-[#10121B] text-[#5E6AD2] focus:ring-0 shrink-0"
                          />
                          <span>Order & Customer</span>
                        </div>
                      </th>
                      <th className="w-[24%] px-4 py-3">Items Preview</th>
                      <th className="w-[18%] px-4 py-3">Financials & Payment</th>
                      <th className="w-[19%] px-4 py-3">Logistics & Status</th>
                      <th className="w-[16%] px-4 py-3 text-right">
                        Quick Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#232636] bg-[#10121B]">
                    {orders.map((order) => {
                      const isFocused = selectedOrder?.id === order.id;
                      const isSelected = selectedIds.has(
                        order.dbId || order.id,
                      );
                      return (
                        <tr
                          key={order.id}
                          className={`group transition-all relative ${
                            isFocused
                              ? "bg-[#161824] border-y-2 border-[#5E6AD2]"
                              : isSelected
                                ? "bg-white/[0.04]"
                                : "hover:bg-white/[0.03]"
                          }`}
                        >
                          {/* 1. Order & Customer */}
                          <td className="px-4 py-3.5 align-top relative">
                            {isFocused && (
                              <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#5E6AD2] rounded-r z-10" />
                            )}
                            <div className="flex items-start gap-2.5">
                              <Input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() =>
                                  toggleSelect(order.dbId || order.id)
                                }
                                className="mt-0.5 rounded border-[#232636] bg-[#10121B] text-[#5E6AD2] focus:ring-0 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => openOrderDetail(order)}
                                    className="text-xs font-mono font-bold text-[#F7F8F8] hover:text-[#8C98FB] hover:underline transition-colors text-left"
                                  >
                                    #{order.id.slice(-8).toUpperCase()}
                                  </button>
                                  <CopyButton text={order.id} />
                                </div>
                                <div className="text-xs font-semibold text-[#F7F8F8] truncate mt-1">
                                  {order.customer.name}
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-[#8A8F98] mt-0.5 flex-wrap">
                                  {order.customer.phone && (
                                    <a
                                      href={`tel:${order.customer.phone}`}
                                      className="font-mono text-[#8A8F98] hover:text-[#D0D6E0] transition-colors"
                                    >
                                      {order.customer.phone}
                                    </a>
                                  )}
                                  {order.shipping?.city && (
                                    <>
                                      <span className="text-[#62666D]">•</span>
                                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#161824] border border-[#232636] text-[#D0D6E0]">
                                        {order.shipping.city}
                                      </span>
                                    </>
                                  )}
                                </div>
                                <p className="text-[10px] text-[#62666D] mt-0.5 font-mono">
                                  {timeAgo(order.createdAt)}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* 2. Items Preview */}
                          <td className="px-4 py-3.5 align-top">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="w-10 h-10 rounded-md bg-[#161824] border border-[#232636] overflow-hidden shrink-0 flex items-center justify-center">
                                {order.items[0]?.image ? (
                                  <img
                                    src={order.items[0].image}
                                    alt={order.items[0].name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs font-bold text-indigo-300">
                                    {(order.items[0]?.name || "MB")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div
                                  className="text-xs font-medium text-[#F7F8F8] truncate"
                                  title={order.items[0]?.name}
                                >
                                  {order.items[0]?.name || "No items"}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="text-[10px] text-[#8A8F98] font-mono">
                                    Qty: {order.items[0]?.quantity || 1}
                                  </span>
                                  {order.items.length > 1 && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-[#161824] text-[#8C98FB] border border-[#232636]">
                                      +{order.items.length - 1} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 3. Financials & Payment */}
                          <td className="px-4 py-3.5 align-top">
                            <div className="min-w-0">
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className="text-sm font-bold text-white font-mono">
                                  {formatPrice(order.total)}
                                </span>
                                <PaymentBadge status={order.paymentStatus} />
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-[#8A8F98] mt-1 flex-wrap">
                                <span className="text-[#D0D6E0]">
                                  {PAYMENT_METHOD_LABELS[order.paymentMethod] ||
                                    order.paymentMethod}
                                </span>
                                <span className="text-[#62666D]">•</span>
                                <span className="text-[10px] text-emerald-400 font-mono">
                                  Deliv:{" "}
                                  {deliveryAmountLabel(order.shippingCost)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 4. Logistics & Status */}
                          <td className="px-4 py-3.5 align-top">
                            <div className="space-y-1.5 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <StatusBadge status={order.status} />
                                {order.shippingMethod === "pathao" ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-red-500/10 text-red-300 border border-red-500/20">
                                    Pathao
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-orange-500/10 text-orange-300 border border-orange-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                    Steadfast
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-[#8A8F98] font-mono truncate">
                                <span>
                                  Trk:{" "}
                                  {order.steadfastTrackingCode ||
                                    order.pathaoTrackingCode ||
                                    order.tracking ||
                                    "Unassigned"}
                                </span>
                                {order.courierDeliveryCharge !== null &&
                                  order.courierDeliveryCharge !==
                                    undefined && (
                                    <>
                                      <span className="text-[#62666D]">
                                        •
                                      </span>
                                      <span className="text-emerald-400">
                                        Actual{" "}
                                        {formatPrice(
                                          order.courierDeliveryCharge,
                                        )}
                                      </span>
                                    </>
                                  )}
                              </div>
                            </div>
                          </td>

                          {/* 5. Actions */}
                          <td className="px-4 py-3.5 align-top text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <Button
                                onClick={() => openOrderDetail(order)}
                                className="px-2.5 py-1 rounded bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white text-xs font-medium shadow-sm transition-all flex items-center gap-1"
                                title="View details"
                              >
                                <span>View Details</span>
                                <ChevronRight className="w-3 h-3" />
                              </Button>

                              {order.shippingMethod === "pathao" ? (
                                <Button
                                  onClick={() => handleSendToPathao(order)}
                                  disabled={
                                    Boolean(order.pathaoConsignmentId) ||
                                    pathaoSendingOrderId === order.id
                                  }
                                  className="p-1 rounded bg-[#161824] hover:bg-[#1B1E2E] text-red-400 border border-[#232636] hover:border-red-500/40 transition-all disabled:opacity-50"
                                  title="Dispatch via Pathao"
                                >
                                  {pathaoSendingOrderId === order.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Send className="w-3.5 h-3.5" />
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => {
                                    setShipPanelOrder(order);
                                    setShipPanelOpen(true);
                                  }}
                                  className="p-1 rounded bg-[#161824] hover:bg-[#1B1E2E] text-orange-400 border border-[#232636] hover:border-orange-500/40 transition-all"
                                  title={
                                    order.steadfastConsignmentId
                                      ? "Track consignment"
                                      : "Dispatch via Steadfast"
                                  }
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                </Button>
                              )}

                              <Button
                                onClick={() => setPosReceiptOrder(order)}
                                className="p-1 rounded bg-[#161824] hover:bg-[#1B1E2E] text-indigo-300 border border-[#232636] hover:border-[#5E6AD2]/40 transition-all"
                                title="Print 80mm POS Thermal Slip"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </Button>

                              <Button
                                onClick={() => setDeleteConfirmOrder(order)}
                                className="p-1 rounded hover:bg-rose-500/10 text-[#8A8F98] hover:text-rose-400 transition-all"
                                title="Delete order"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile View (Screen 3 - Stacked Precision Cards) ── */}
              <div className="block lg:hidden divide-y divide-[#232636]">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className={`p-4 space-y-3 transition-colors ${
                      selectedIds.has(order.dbId || order.id)
                        ? "bg-white/[0.04]"
                        : "bg-[#10121B]"
                    }`}
                  >
                    {/* Header: Order ID & Time + Badges */}
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Input
                          type="checkbox"
                          checked={selectedIds.has(order.dbId || order.id)}
                          onChange={() =>
                            toggleSelect(order.dbId || order.id)
                          }
                          className="rounded border-[#232636] bg-[#10121B] text-[#5E6AD2] focus:ring-0 shrink-0"
                        />
                        <span className="font-mono text-[#F7F8F8] font-bold text-sm">
                          #{order.id.slice(-8).toUpperCase()}
                        </span>
                        <span className="text-xs text-[#8A8F98]">
                          {timeAgo(order.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <PaymentBadge status={order.paymentStatus} />
                        <StatusBadge status={order.status} />
                      </div>
                    </div>

                    {/* Customer Details Box with Initials & Call Button */}
                    <div className="bg-[#090A0F] border border-[#232636] rounded-lg p-2.5 flex justify-between items-center">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#161824] border border-[#232636] flex items-center justify-center text-[#5E6AD2] font-bold text-xs shrink-0">
                          {getInitials(order.customer.name)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-[#F7F8F8] truncate">
                            {order.customer.name}
                          </h4>
                          <p className="text-[11px] text-[#8A8F98] truncate">
                            {order.shipping?.city || "Dhaka"} •{" "}
                            {order.customer.phone ||
                              order.shipping?.phone ||
                              "No phone"}
                          </p>
                        </div>
                      </div>
                      {(order.customer.phone || order.shipping?.phone) && (
                        <a
                          href={`tel:${order.customer.phone || order.shipping?.phone}`}
                          className="w-8 h-8 rounded-lg bg-[#161824] hover:bg-[#1B1E2E] border border-[#232636] flex items-center justify-center text-[#5E6AD2] transition-colors shrink-0"
                          title="Call customer"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    {/* Item Preview */}
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-lg bg-[#090A0F] border border-[#232636] overflow-hidden shrink-0 flex items-center justify-center">
                        {order.items[0]?.image ? (
                          <img
                            src={order.items[0].image}
                            alt={order.items[0].name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-[#62666D]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-medium text-[#F7F8F8] truncate">
                          {order.items[0]?.name || "No items"}
                        </h5>
                        <p className="text-[11px] text-[#8A8F98]">
                          Qty: {order.items[0]?.quantity || 1}
                        </p>
                      </div>
                      {order.items.length > 1 && (
                        <span className="px-2 py-0.5 bg-[#161824] border border-[#232636] rounded-md text-[10px] text-[#8C98FB] font-medium shrink-0">
                          +{order.items.length - 1} more
                        </span>
                      )}
                    </div>

                    {/* Financials & Logistics */}
                    <div className="pt-2 border-t border-[#232636] flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-[#8A8F98] block">
                          Grand Total
                        </span>
                        <span className="font-mono text-base font-bold text-[#F7F8F8]">
                          {formatPrice(order.total)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#8A8F98] block">
                          Deliv: {deliveryAmountLabel(order.shippingCost)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-cyan-400 font-mono">
                          <Truck className="w-3 h-3" />
                          {order.steadfastTrackingCode ||
                            order.pathaoTrackingCode ||
                            order.tracking ||
                            "Unassigned"}
                        </span>
                      </div>
                    </div>

                    {/* 4-Button Action Grid */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      <Button
                        onClick={() => openOrderDetail(order)}
                        className="h-9 rounded-lg border border-[#5E6AD2] text-[#5E6AD2] hover:bg-[#5E6AD2]/10 font-medium text-xs flex items-center justify-center gap-1 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">View</span>
                      </Button>
                      <Button
                        onClick={() => {
                          setShipPanelOrder(order);
                          setShipPanelOpen(true);
                        }}
                        className="h-9 rounded-lg bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white font-medium text-xs flex items-center justify-center gap-1 transition-all"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Ship</span>
                      </Button>
                      <Button
                        onClick={() => setPosReceiptOrder(order)}
                        className="h-9 rounded-lg bg-[#161824] hover:bg-[#1B1E2E] text-indigo-300 border border-[#232636] hover:border-[#5E6AD2]/40 flex items-center justify-center gap-1 transition-all"
                        title="Print 80mm POS Thermal Slip"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Slip</span>
                      </Button>
                      <Button
                        onClick={() => setDeleteConfirmOrder(order)}
                        className="h-9 rounded-lg bg-[#161824] hover:bg-rose-500/20 border border-[#232636] hover:border-rose-500/40 text-rose-400 flex items-center justify-center transition-all"
                        title="Delete order"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Pagination ────────────────────────────────────────────── */}
        {pagination.pages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <p className="text-xs sm:text-sm text-[#8a8f98]">
              Showing {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total}
            </p>
            <div className="flex items-center gap-1 flex-wrap justify-center">
              <Button
                onClick={() => fetchOrders(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg border border-[#232636] bg-[#161824] text-[#F7F8F8] hover:bg-[#1b1e2c] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                    className={`w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm rounded-lg border transition-colors ${
                      page === pagination.page
                        ? "bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] border-white"
                        : "border-[#232636] bg-[#161824] text-[#8A8F98] hover:bg-[#1b1e2c] hover:text-[#F7F8F8]"
                    }`}
                  >
                    {page}
                  </Button>
                );
              })}
              <Button
                onClick={() => fetchOrders(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="p-2 rounded-lg border border-[#232636] bg-[#161824] text-[#F7F8F8] hover:bg-[#1b1e2c] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Order Detail Drawer (Screen 2) ─────────────────────────── */}
      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdate={handleStatusUpdate}
          onNoteUpdate={handleNoteUpdate}
          onDispatch={(ord) => {
            setShipPanelOrder(ord);
            setShipPanelOpen(true);
          }}
          onOpenReceipt={(ord) => setPosReceiptOrder(ord)}
        />
      )}

      {/* ── 80mm POS Thermal Receipt Preview Modal (Screen 10) ───────── */}
      <ThermalReceiptModal
        order={posReceiptOrder}
        isOpen={Boolean(posReceiptOrder)}
        onClose={() => setPosReceiptOrder(null)}
      />

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
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs font-medium text-rose-300">
          Order items, payment records, linked returns, and shortlist entries will be removed.
        </div>
      </ConfirmDialog>
    </div>
  );
}
