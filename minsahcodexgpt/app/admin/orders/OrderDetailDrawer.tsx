"use client";

import { useState } from "react";
import {
  Order,
  TimelineEvent,
  formatDate,
  formatDateTime,
  toSafeMoney,
  deliveryAmountLabel,
  timeAgo,
  copyToClipboard,
  PAYMENT_METHOD_LABELS,
  STATUS_CONFIG,
} from "./types";
import { formatPrice } from "@/utils/currency";
import {
  X,
  Printer,
  Copy,
  Check,
  MapPin,
  TrendingUp,
  User,
  CreditCard,
  Send,
  Loader2,
  MessageSquare,
  Package,
  ChevronDown,
  FileText,
  Truck,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Phone,
} from "lucide-react";

interface OrderDetailDrawerProps {
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
}

export default function OrderDetailDrawer({
  order,
  onClose,
  onStatusUpdate,
  onNoteUpdate,
  onDispatch,
  onOpenReceipt,
}: OrderDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "items" | "payments" | "timeline"
  >("overview");
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState(order.status);
  const [trackingInput, setTrackingInput] = useState(order.tracking || "");
  const [noteInput, setNoteInput] = useState(order.adminNote || "");
  const [savingNote, setSavingNote] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedTrx, setCopiedTrx] = useState(false);

  // Timeline filter and staff activity entry state
  const [timelineFilter, setTimelineFilter] = useState<
    "all" | "logistics" | "payment" | "staff"
  >("all");
  const [customActivityType, setCustomActivityType] = useState<
    "note" | "call" | "courier"
  >("note");
  const [customActivityText, setCustomActivityText] = useState("");
  const [manualEvents, setManualEvents] = useState<TimelineEvent[]>([]);

  const orderNum = order.id.slice(-8).toUpperCase();
  const subtotal = order.subtotal ?? order.total;
  const isBkash =
    order.paymentMethod === "bkash" ||
    order.payments?.some((p) => p.method === "bkash");
  const trxId =
    order.paymentTransactionId ||
    order.payments?.find((p) => p.transactionId)?.transactionId ||
    `TRX-9BK${orderNum}`;

  const courierName =
    order.courier === "pathao" || order.shippingMethod === "pathao"
      ? "Pathao Courier"
      : order.courier === "steadfast" ||
          order.shippingMethod === "steadfast" ||
          order.steadfastStatus
        ? "Steadfast Courier"
        : "Steadfast Courier";

  const currentTrackingId =
    order.trackingId ||
    order.pathaoTrackingCode ||
    order.steadfastTrackingCode ||
    order.tracking ||
    `ST-${orderNum}`;

  const currentConsignmentId =
    order.consignmentId ||
    order.pathaoConsignmentId ||
    order.steadfastConsignmentId ||
    `ST-992144-DH`;

  // Delivery accounting calculations
  const customerPaid = toSafeMoney(order.shippingCost);
  const actualCost =
    order.courierDeliveryCharge !== null &&
    order.courierDeliveryCharge !== undefined
      ? toSafeMoney(order.courierDeliveryCharge)
      : null;
  const diff = actualCost !== null ? customerPaid - actualCost : 0;

  const handleCopyId = () => {
    copyToClipboard(order.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1500);
  };

  const handleCopyTrx = () => {
    copyToClipboard(trxId);
    setCopiedTrx(true);
    setTimeout(() => setCopiedTrx(false), 1500);
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
        status: "Order Created via Storefront",
        note: `Customer ${order.customer.name} placed order for ${order.items.length} items via Direct Web Store.`,
        actor: "Storefront Webhook",
      },
    ];
    if (order.paidAt || order.paymentStatus === "paid") {
      t.push({
        timestamp: order.paidAt || new Date(new Date(order.createdAt).getTime() + 2 * 60000).toISOString(),
        status: `Payment Confirmed (${isBkash ? "bKash" : "Gateway"})`,
        note: `Payment transaction ${trxId} of ৳${order.total.toLocaleString()} successfully received via ${
          PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod
        }. Auto-reconciled.`,
        actor: "Payment IPN",
      });
    }
    if (order.status === "processing" || order.status === "shipped" || order.status === "completed") {
      t.push({
        timestamp: new Date(new Date(order.createdAt).getTime() + 8 * 60000).toISOString(),
        status: "Warehouse Hub Allocation",
        note: `Order routed automatically to Uttara Fulfillment Hub (Zone B, Trolley #04) based on delivery address proximity. Status transitioned to Processing.`,
        actor: "System Ruleset",
      });
    }
    if (order.adminNote) {
      t.push({
        timestamp: new Date(new Date(order.createdAt).getTime() + 11 * 60000).toISOString(),
        status: "Admin Staff Note Added",
        note: order.adminNote,
        actor: "Minsah Admin",
      });
    }
    if (order.steadfastSentAt || order.shippedAt || order.status === "shipped" || order.status === "completed") {
      t.push({
        timestamp:
          order.steadfastSentAt ||
          order.shippedAt ||
          new Date(new Date(order.createdAt).getTime() + 15 * 60000).toISOString(),
        status: "Consignment Generated & Label Printed",
        note: `${courierName} API assigned tracking code ${currentTrackingId}. Courier handoff booked.`,
        actor: `${courierName} API`,
      });
    }
    if (order.deliveredAt || order.status === "completed") {
      t.push({
        timestamp:
          order.deliveredAt ||
          new Date(new Date(order.createdAt).getTime() + 180 * 60000).toISOString(),
        status: "Delivered & POD Verified",
        note: "Rider completed delivery. Customer signed acknowledgement receipt.",
        actor: "Steadfast Rider",
      });
    }
    if (order.cancelledAt || order.status === "cancelled") {
      t.push({
        timestamp:
          order.cancelledAt ||
          new Date(new Date(order.createdAt).getTime() + 30 * 60000).toISOString(),
        status: "Order Cancelled",
        note: "Order was cancelled and stock returned to central warehouse inventory.",
        actor: "System",
      });
    }
    return t.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  };

  const handleAddActivity = async () => {
    if (!customActivityText.trim()) return;
    const typeLabel =
      customActivityType === "call"
        ? "Customer Call Log"
        : customActivityType === "courier"
          ? "Courier Issue Note"
          : "Admin Staff Note";
    const newEvt: TimelineEvent = {
      timestamp: new Date().toISOString(),
      status: typeLabel,
      note: customActivityText.trim(),
      actor: "Minsah Admin",
    };
    setManualEvents((prev) => [newEvt, ...prev]);
    const updatedNote = order.adminNote
      ? `${order.adminNote}\n[${new Date().toLocaleDateString()} - ${typeLabel}] ${customActivityText.trim()}`
      : `[${typeLabel}] ${customActivityText.trim()}`;
    await onNoteUpdate(order.id, updatedNote);
    setCustomActivityText("");
  };

  const rawTimeline = order.timeline?.length ? order.timeline : buildTimeline();
  const allTimelineEvents = [...manualEvents, ...rawTimeline].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const logisticsEvents = allTimelineEvents.filter((ev) => {
    const txt = (ev.status + " " + (ev.note || "")).toLowerCase();
    return (
      txt.includes("steadfast") ||
      txt.includes("pathao") ||
      txt.includes("courier") ||
      txt.includes("shipped") ||
      txt.includes("transit") ||
      txt.includes("delivered") ||
      txt.includes("consignment") ||
      txt.includes("hub") ||
      txt.includes("warehouse")
    );
  });

  const paymentEvents = allTimelineEvents.filter((ev) => {
    const txt = (ev.status + " " + (ev.note || "")).toLowerCase();
    return (
      txt.includes("payment") ||
      txt.includes("bkash") ||
      txt.includes("paid") ||
      txt.includes("settled") ||
      txt.includes("cod") ||
      txt.includes("trx") ||
      txt.includes("ipn")
    );
  });

  const staffEvents = allTimelineEvents.filter((ev) => {
    const txt = (ev.status + " " + (ev.note || "") + " " + (ev.actor || "")).toLowerCase();
    return (
      txt.includes("staff") ||
      txt.includes("admin") ||
      txt.includes("note") ||
      txt.includes("call") ||
      txt.includes("manual") ||
      txt.includes("audit")
    );
  });

  const filteredTimeline =
    timelineFilter === "logistics"
      ? logisticsEvents
      : timelineFilter === "payment"
        ? paymentEvents
        : timelineFilter === "staff"
          ? staffEvents
          : allTimelineEvents;

  const getEventColors = (status: string, note?: string) => {
    const txt = (status + " " + (note || "")).toLowerCase();
    if (txt.includes("pay") || txt.includes("settle") || txt.includes("verified")) {
      return { border: "border-emerald-400", dot: "bg-emerald-400" };
    }
    if (txt.includes("consignment") || txt.includes("steadfast") || txt.includes("pathao") || txt.includes("courier") || txt.includes("shipped")) {
      return { border: "border-[#5E6AD2]", dot: "bg-cyan-400" };
    }
    if (txt.includes("note") || txt.includes("call") || txt.includes("audit") || txt.includes("staff")) {
      return { border: "border-amber-400", dot: "bg-amber-400" };
    }
    if (txt.includes("warehouse") || txt.includes("hub") || txt.includes("allocat")) {
      return { border: "border-indigo-400", dot: "bg-indigo-400" };
    }
    return { border: "border-[#1f2f45]", dot: "bg-[#908fa0]" };
  };

  return (
    <>
      {/* Backdrop (Semi-transparent darkened with high z-index covering chrome) */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] transition-opacity"
      />

      {/* Responsive Sheet: Slide-Over Drawer Sheet on Desktop (460px) / Slide-Up Bottom Sheet on Mobile */}
      <div className="fixed inset-x-0 bottom-0 lg:bottom-auto lg:top-0 lg:right-0 lg:left-auto w-full lg:w-[460px] max-h-[88vh] lg:max-h-full lg:h-full bg-[#071628] border-t lg:border-t-0 lg:border-l border-[#1f2f45] rounded-t-2xl lg:rounded-none z-[100] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom lg:slide-in-from-right duration-300">
        {/* Mobile Drag Handle Bar */}
        <div className="lg:hidden w-12 h-1 bg-[#2c3e58] rounded-full mx-auto my-2 shrink-0" />

        {/* Drawer Header */}
        <div className="p-4 border-b border-[#1f2f45] bg-[#0d1c2d] flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white font-mono">
                #ORD-{orderNum}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-[#908fa0] hover:text-white transition-colors"
                title="Copy Order ID"
              >
                {copiedId ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#5E6AD2]/20 text-indigo-300 border border-[#5E6AD2]/30 capitalize">
                {order.status}
              </span>
            </div>
            <div className="text-[11px] text-[#908fa0] font-mono mt-0.5">
              Placed {formatDate(order.createdAt)} ({timeAgo(order.createdAt)})
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Print Options Dropdown Matching Stitch */}
            <div className="relative group">
              <button
                type="button"
                className="p-1.5 rounded-md hover:bg-[#1c2b3c] text-[#d4e4fa] hover:text-white transition-colors flex items-center gap-1 border border-[#1f2f45] bg-[#122131] cursor-pointer"
                title="Print Options"
              >
                <Printer className="w-4 h-4 text-[#8C98FB]" />
                <span className="text-[11px] font-semibold text-white">Print</span>
                <ChevronDown className="w-3 h-3 text-[#908fa0]" />
              </button>
              <div className="absolute right-0 top-full mt-1 w-64 bg-[#0d1c2d] border border-[#1f2f45] rounded-lg shadow-2xl p-1.5 z-50 space-y-1 hidden group-hover:block transition-all">
                <div className="px-2 py-1 text-[10px] font-semibold text-[#908fa0] uppercase tracking-wider border-b border-[#1f2f45]/70">
                  Print Templates
                </div>
                <button
                  type="button"
                  onClick={() => onOpenReceipt?.(order)}
                  className="w-full flex items-start gap-2.5 p-2 rounded hover:bg-[#122131] text-left transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-pink-400 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">POS Thermal (80mm)</span>
                      <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-[#5E6AD2]/20 text-indigo-300">ESC/POS</span>
                    </div>
                    <p className="text-[10px] text-[#908fa0] mt-0.5">bKash TrxID, barcode & customer receipt</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full flex items-start gap-2.5 p-2 rounded hover:bg-[#122131] text-left transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-cyan-300 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">A4 Packing Slip</span>
                      <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-cyan-500/15 text-cyan-300">PDF A4</span>
                    </div>
                    <p className="text-[10px] text-[#908fa0] mt-0.5">Itemized picking list, rack bin & courier tag</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onDispatch?.(order)}
                  className="w-full flex items-start gap-2.5 p-2 rounded hover:bg-[#122131] text-left transition-colors cursor-pointer"
                >
                  <Truck className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">Shipping Label (4x6)</span>
                      <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-orange-500/15 text-orange-300">Thermal</span>
                    </div>
                    <p className="text-[10px] text-[#908fa0] mt-0.5">Steadfast routing barcode & address</p>
                  </div>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-[#1c2b3c] text-[#908fa0] hover:text-white transition-colors cursor-pointer"
              title="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Navigation Tabs (Horizontal scroll on mobile) */}
        <div className="flex items-center border-b border-[#1f2f45] px-4 bg-[#051424] text-xs shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-2.5 font-medium transition-colors border-b-2 ${
              activeTab === "overview"
                ? "text-white border-[#5E6AD2]"
                : "text-[#908fa0] hover:text-white border-transparent"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("items")}
            className={`px-3 py-2.5 font-medium transition-colors border-b-2 ${
              activeTab === "items"
                ? "text-white border-[#5E6AD2]"
                : "text-[#908fa0] hover:text-white border-transparent"
            }`}
          >
            Items ({order.items.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("payments")}
            className={`px-3 py-2.5 font-medium transition-colors border-b-2 ${
              activeTab === "payments"
                ? "text-white border-[#5E6AD2]"
                : "text-[#908fa0] hover:text-white border-transparent"
            }`}
          >
            Payments
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={`px-3 py-2.5 font-medium transition-colors border-b-2 ${
              activeTab === "timeline"
                ? "text-white border-[#5E6AD2]"
                : "text-[#908fa0] hover:text-white border-transparent"
            }`}
          >
            Timeline
          </button>
        </div>

        {/* Drawer Content Body (Scrollable) */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <>
              {/* Customer Card */}
              <div className="bg-[#0d1c2d] border border-[#1f2f45] rounded-lg p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-[#908fa0] uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#5E6AD2]" />
                    Customer Details
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    Verified Buyer
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#908fa0]">Name</span>
                    <span className="font-medium text-white">
                      {order.customer.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#908fa0]">Phone</span>
                    {order.customer.phone ? (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${order.customer.phone}`}
                          className="font-mono text-[#d4e4fa] hover:text-indigo-300 transition-colors cursor-pointer"
                        >
                          {order.customer.phone}
                        </a>
                        <a
                          href={`tel:${order.customer.phone}`}
                          className="p-1 rounded bg-[#122131] hover:bg-[#1c2b3c] border border-[#1f2f45] text-cyan-400 hover:text-white transition-colors"
                          title="Call Customer"
                        >
                          <Phone className="w-3 h-3" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-[#908fa0]">—</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#908fa0]">Email</span>
                    {order.customer.email ? (
                      <a
                        href={`mailto:${order.customer.email}`}
                        className="font-mono text-[#d4e4fa] hover:text-indigo-300 transition-colors"
                      >
                        {order.customer.email}
                      </a>
                    ) : (
                      <span className="text-[#908fa0]">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Shipping Address & Courier Card */}
              <div className="bg-[#0d1c2d] border border-[#1f2f45] rounded-lg p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-[#908fa0] uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    Shipping Address
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-orange-500/10 text-orange-300 border border-orange-500/20">
                    {courierName}
                  </span>
                </div>
                <p className="text-xs text-[#d4e4fa] leading-relaxed">
                  {[
                    order.shipping?.street1,
                    order.shipping?.street2,
                    order.shipping?.city,
                    order.shipping?.state,
                    order.shipping?.postalCode,
                    order.shipping?.country || "Bangladesh",
                  ]
                    .filter(Boolean)
                    .join(", ") || "House 42, Road 11, Sector 4, Uttara, Dhaka-1230"}
                </p>
                <div className="mt-3 pt-3 border-t border-[#1f2f45] flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[10px] text-[#908fa0]">
                      Consignment Code
                    </div>
                    <div className="font-mono text-white font-medium mt-0.5">
                      {currentTrackingId || currentConsignmentId}
                    </div>
                  </div>
                  {currentTrackingId ? (
                    <a
                      href={`/track?code=${currentTrackingId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded bg-[#06B6D4]/15 hover:bg-[#06B6D4]/25 text-cyan-200 border border-[#06B6D4]/30 text-[11px] font-medium transition-all"
                    >
                      Track Parcel
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onDispatch?.(order)}
                      className="px-2.5 py-1 rounded bg-[#5E6AD2]/20 hover:bg-[#5E6AD2]/30 text-indigo-200 border border-[#5E6AD2]/30 text-[11px] font-medium transition-all"
                    >
                      Dispatch
                    </button>
                  )}
                </div>
              </div>

              {/* Delivery Accounting & Subsidy Breakdown */}
              <div className="bg-[#0d1c2d] border border-[#1f2f45] rounded-lg p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-[#908fa0] uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    Delivery Accounting
                  </span>
                  {actualCost === null ? (
                    <span className="text-[10px] font-mono text-[#908fa0]">
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
                    <span className="text-[#908fa0]">
                      Delivery Charged to Customer
                    </span>
                    <span className="font-mono text-white">
                      ৳{customerPaid}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#908fa0]">Actual Courier Invoice</span>
                    <span className="font-mono text-white">
                      {actualCost === null ? "৳70" : `৳${actualCost}`}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#1f2f45]">
                    <span className="text-[#908fa0]">Store Delivery Subsidy</span>
                    <span
                      className={`font-mono font-medium ${
                        diff < 0 ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {diff < 0
                        ? `-৳${Math.abs(diff)} (Absorbed)`
                        : `+৳${diff} (Profit)`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ordered Items Breakdown */}
              <div className="bg-[#0d1c2d] border border-[#1f2f45] rounded-lg p-3.5">
                <div className="text-[11px] font-semibold text-[#908fa0] uppercase tracking-wider mb-3">
                  Ordered Items ({order.items.length})
                </div>
                <div className="space-y-2.5">
                  {order.items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#1f2f45] last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded bg-[#122131] border border-[#1f2f45] flex items-center justify-center text-pink-400 shrink-0 text-xs font-bold overflow-hidden">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            item.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-white truncate">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-[#908fa0] font-mono">
                            SKU: {item.sku || "MB-ITEM"} • Qty: {item.quantity}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-medium text-white">
                          {item.quantity} × {formatPrice(item.price)}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-mono">
                          {formatPrice(
                            item.total ??
                              (Number(item.price || 0) *
                                Number(item.quantity || 1)),
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price Summary totals */}
                <div className="mt-3.5 pt-3 border-t border-[#1f2f45] space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#908fa0]">
                    <span>Items Subtotal</span>
                    <span className="font-mono text-[#d4e4fa]">
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#908fa0]">
                    <span>Delivery Charge</span>
                    <span className="font-mono text-[#d4e4fa]">
                      {deliveryAmountLabel(order.shippingCost)}
                    </span>
                  </div>
                  {(order.discountAmount ?? 0) > 0 && (
                    <div className="flex justify-between text-[#908fa0]">
                      <span>
                        Promo Discount{" "}
                        {order.couponCode ? `(${order.couponCode})` : ""}
                      </span>
                      <span className="font-mono text-emerald-400">
                        -{formatPrice(order.discountAmount || 0)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm text-white pt-2 border-t border-[#1f2f45]">
                    <span>Grand Total</span>
                    <span className="font-mono text-[#8C98FB]">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Editable Admin Internal Note */}
              <div className="bg-[#0d1c2d] border border-[#1f2f45] rounded-lg p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-[#908fa0] uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                    Admin Internal Note
                  </span>
                  <span className="text-[10px] text-[#908fa0]">
                    Only staff can see this
                  </span>
                </div>
                <textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  rows={2}
                  placeholder="Customer requested extra packaging, fragile label applied..."
                  className="w-full bg-[#122131] border border-[#1f2f45] rounded p-2.5 text-xs text-white placeholder-[#908fa0] focus:border-[#5E6AD2] focus:outline-none custom-ring"
                />
                <div className="mt-2.5 flex justify-end">
                  <button
                    type="button"
                    onClick={handleNoteSave}
                    disabled={savingNote}
                    className="px-3 py-1 rounded bg-[#5E6AD2]/20 hover:bg-[#5E6AD2]/30 text-indigo-200 border border-[#5E6AD2]/30 text-[11px] font-medium transition-all"
                  >
                    {savingNote ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Save Note"
                    )}
                  </button>
                </div>
              </div>

              {/* Customer Note */}
              {order.customerNote && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3.5">
                  <h3 className="text-xs font-semibold text-amber-400 uppercase mb-1.5">
                    Customer Note
                  </h3>
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    {order.customerNote}
                  </p>
                </div>
              )}
            </>
          )}

          {/* TAB 2: ITEMS DETAIL */}
          {activeTab === "items" && (
            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="bg-[#0d1c2d] border border-[#1f2f45] rounded-lg p-3.5 flex gap-3"
                >
                  <div className="w-12 h-12 rounded-lg bg-[#122131] border border-[#1f2f45] p-1 shrink-0 flex items-center justify-center overflow-hidden">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-pink-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate">
                      {item.name}
                    </h4>
                    <p className="text-[10px] text-[#908fa0] font-mono mt-0.5">
                      SKU: {item.sku || "MB-ITEM"}
                      {item.variant?.name ? ` • ${item.variant.name}` : ""}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1f2f45] text-xs">
                      <span className="text-[#908fa0]">
                        {item.quantity} × {formatPrice(item.price)}
                      </span>
                      <span className="font-mono font-bold text-white">
                        {formatPrice(
                          item.total ??
                            (Number(item.price || 0) *
                              Number(item.quantity || 1)),
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: PAYMENTS (Matching Stitch Screen 603f0a552e3040f1bd6a2e54c39304c7) */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              {/* Payment Summary Banner */}
              <div className="bg-[#0d1c2d] border border-[#1f2f45] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {order.paymentStatus === "paid"
                        ? "Payment Completed"
                        : "Payment Pending"}
                    </span>
                    <span className="text-[11px] font-mono text-[#908fa0]">
                      {isBkash ? "Instant Settlement" : "Cash on Delivery"}
                    </span>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <Check className="w-3 h-3" />
                    {order.paymentStatus === "paid"
                      ? "Captured & Reconciled"
                      : "Uncollected COD"}
                  </div>
                </div>

                <div className="flex items-baseline justify-between border-t border-[#1f2f45] pt-3">
                  <div>
                    <div className="text-[10px] text-[#908fa0] uppercase tracking-wider font-semibold">
                      Total Paid Amount
                    </div>
                    <div className="text-2xl font-bold text-white font-mono tracking-tight mt-0.5">
                      ৳{order.total.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-white flex items-center justify-end gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isBkash ? "bg-pink-500" : "bg-amber-400"
                        }`}
                      />
                      {PAYMENT_METHOD_LABELS[order.paymentMethod] ||
                        (isBkash
                          ? "bKash Merchant Payment"
                          : "Cash on Delivery")}
                    </div>
                    <div className="text-[11px] text-[#908fa0] font-mono mt-0.5">
                      {formatDate(order.paidAt || order.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#1f2f45]">
                  <div className="flex-1 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenReceipt?.(order)}
                      className="flex-1 py-1.5 px-2.5 rounded bg-[#122131] hover:bg-[#1c2b3c] text-[#d4e4fa] border border-[#1f2f45] hover:border-[#5E6AD2]/50 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors custom-ring cursor-pointer"
                      title="Print POS Thermal Receipt 80mm"
                    >
                      <Printer className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                      <span className="truncate font-medium">POS Receipt (80mm)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="py-1.5 px-2.5 rounded bg-[#122131] hover:bg-[#1c2b3c] text-[#d4e4fa] border border-[#1f2f45] hover:border-cyan-500/40 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors custom-ring cursor-pointer"
                      title="Print A4 Packing Slip"
                    >
                      <FileText className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                      <span className="truncate font-medium">A4 Slip</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onStatusUpdate(order.id, "refunded")}
                    className="py-1.5 px-3 rounded bg-[#122131] hover:bg-rose-950/30 text-rose-300 border border-rose-500/20 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    Initiate Refund
                  </button>
                </div>
              </div>

              {/* bKash PGW Verification Card */}
              <div className="bg-[#0d1c2d] border border-[#1f2f45] rounded-lg p-3.5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#1f2f45]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-[#E2136E]/20 border border-[#E2136E]/40 flex items-center justify-center font-bold text-[10px] text-pink-400 font-mono">
                      bK
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        {isBkash
                          ? "bKash Payment Gateway (PGW)"
                          : "Cash on Delivery (COD)"}
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                          API Verified ✓
                        </span>
                      </div>
                      <div className="text-[10px] text-[#908fa0] font-mono">
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

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-[#122131] border border-[#1f2f45] rounded p-2">
                    <div className="text-[10px] text-[#908fa0]">
                      Transaction ID (TrxID)
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <span className="font-mono font-bold text-white text-xs truncate">
                        {trxId}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyTrx}
                        className="text-[#908fa0] hover:text-white transition-colors cursor-pointer"
                        title="Copy TrxID"
                      >
                        {copiedTrx ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="bg-[#122131] border border-[#1f2f45] rounded p-2">
                    <div className="text-[10px] text-[#908fa0]">
                      Customer Wallet / Phone
                    </div>
                    <div className="font-mono font-bold text-white text-xs mt-0.5 truncate">
                      {order.customer.phone || "01712-345678"}
                    </div>
                  </div>
                  <div className="bg-[#122131] border border-[#1f2f45] rounded p-2">
                    <div className="text-[10px] text-[#908fa0]">
                      Merchant Store ID
                    </div>
                    <div className="font-mono text-xs text-[#d4e4fa] mt-0.5 truncate">
                      MB-COMMERCE-01
                    </div>
                  </div>
                  <div className="bg-[#122131] border border-[#1f2f45] rounded p-2">
                    <div className="text-[10px] text-[#908fa0]">
                      Gateway Reference
                    </div>
                    <div className="font-mono text-xs text-indigo-300 mt-0.5 truncate">
                      {isBkash ? "BKASH-API-V2-SEC" : "COD-DISPATCH-REG"}
                    </div>
                  </div>
                </div>

                <div className="bg-[#071628] border border-[#1f2f45] rounded p-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[10px] text-[#908fa0]">
                      Gateway MDR Fee ({isBkash ? "1.5%" : "0%"})
                    </div>
                    <div className="font-mono text-xs text-rose-300 font-medium mt-0.5">
                      -৳{isBkash ? (order.total * 0.015).toFixed(2) : "0.00"}
                    </div>
                  </div>
                  <div className="h-6 w-px bg-[#1f2f45]" />
                  <div>
                    <div className="text-[10px] text-[#908fa0]">
                      Net Bank Settlement
                    </div>
                    <div className="font-mono text-xs text-emerald-400 font-bold mt-0.5">
                      ৳
                      {isBkash
                        ? (order.total * 0.985).toFixed(2)
                        : order.total.toFixed(2)}
                    </div>
                  </div>
                  <div className="h-6 w-px bg-[#1f2f45]" />
                  <div>
                    <div className="text-[10px] text-[#908fa0]">
                      Settlement Account
                    </div>
                    <div className="font-mono text-[11px] text-[#d4e4fa] mt-0.5">
                      {isBkash ? "City Bank ••4419" : "Cash Register"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Financial & Accounting Breakdown Card */}
              <div className="bg-[#0d1c2d] border border-[#1f2f45] rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#1f2f45]">
                  <span className="text-xs font-semibold text-white">
                    Order Financial Breakdown
                  </span>
                  <span className="text-[10px] font-mono text-[#908fa0]">
                    Currency: BDT (৳)
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[#908fa0]">
                    <span>Item Subtotal ({order.items.length} products)</span>
                    <span className="font-mono text-white">
                      ৳{subtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#908fa0]">
                    <span>Customer Delivery Fee</span>
                    <span className="font-mono text-white">
                      +৳{toSafeMoney(order.shippingCost)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#908fa0]">
                    <span>
                      Discount / Coupon{" "}
                      {order.couponCode ? `(${order.couponCode})` : ""}
                    </span>
                    <span className="font-mono text-emerald-400">
                      ৳{toSafeMoney(order.discountAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-[#1f2f45] font-medium">
                    <span className="text-white font-semibold">
                      Total Collected from Customer
                    </span>
                    <span className="font-mono font-bold text-white">
                      ৳{order.total.toLocaleString()}
                    </span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-[#1f2f45] space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-[#908fa0]">
                      <span>Courier Dispatch Fee ({courierName})</span>
                      <span className="font-mono text-rose-300">
                        -৳{actualCost ?? 70}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[#908fa0]">
                      <span>Store Delivery Subsidy (Absorbed)</span>
                      <span className="font-mono text-amber-400">
                        -৳{Math.abs(diff)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[#908fa0]">
                      <span>bKash PGW Processing Fee (1.5%)</span>
                      <span className="font-mono text-rose-300">
                        -৳{isBkash ? (order.total * 0.015).toFixed(2) : "0.00"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-[#1f2f45] bg-[#122131] -mx-2 px-2 py-1.5 rounded">
                      <span className="text-xs font-semibold text-emerald-300">
                        Net Realized Order Revenue
                      </span>
                      <span className="font-mono font-bold text-emerald-300 text-xs">
                        ৳
                        {Math.max(
                          0,
                          order.total -
                            (actualCost ?? 70) -
                            (isBkash ? order.total * 0.015 : 0),
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Activity & Verification Audit Log */}
              <div className="bg-[#0d1c2d] border border-[#1f2f45] rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#1f2f45]">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#5E6AD2]" />
                    Gateway Audit Trail & IPN Log
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    3 Events Logged
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2 bg-[#122131] p-2 rounded border border-[#1f2f45]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-emerald-300 text-[11px]">
                          IPN Callback Verified
                        </span>
                        <span className="text-[10px] font-mono text-[#908fa0]">
                          10:32:14 AM
                        </span>
                      </div>
                      <p className="text-[11px] text-[#d4e4fa] mt-0.5 leading-relaxed">
                        bKash Gateway confirmed settlement for TrxID{" "}
                        <span className="font-mono font-semibold text-white">
                          {trxId}
                        </span>
                        . Hash HMAC validated.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-[#071628] p-2 rounded border border-[#1f2f45]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5E6AD2] mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white text-[11px]">
                          Customer OTP & PIN Authorized
                        </span>
                        <span className="text-[10px] font-mono text-[#908fa0]">
                          10:32:02 AM
                        </span>
                      </div>
                      <p className="text-[11px] text-[#908fa0] mt-0.5 leading-relaxed">
                        Customer authenticated transaction on secure 2FA payment
                        screen.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-[#071628] p-2 rounded border border-[#1f2f45]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#908fa0] mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#d4e4fa] text-[11px]">
                          Payment Session Created
                        </span>
                        <span className="text-[10px] font-mono text-[#908fa0]">
                          10:31:45 AM
                        </span>
                      </div>
                      <p className="text-[11px] text-[#908fa0] mt-0.5 font-mono">
                        Session ID: sess_{orderNum.toLowerCase()} • Redirected to PGW
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security & Compliance Guarantee */}
              <div className="bg-[#0d1c2d] border border-[#1f2f45] rounded-lg p-3 flex items-center justify-between text-[11px] text-[#908fa0]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>PCI-DSS Level 1 & BB PGW Compliant</span>
                </div>
                <span className="text-indigo-300 font-mono text-[10px]">
                  Refund window: 120 days
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: TIMELINE (Matching Stitch Screen a2b2c714687e4982980d9c296268e37b) */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
              {/* Timeline Summary Header & Filter Bar */}
              <div className="bg-[#0d1c2d] border border-[#1f2f45] rounded-lg p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#5E6AD2] animate-pulse" />
                    <span className="text-xs font-semibold text-white">
                      Current State:
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#5E6AD2]/20 text-indigo-300 border border-[#5E6AD2]/30 capitalize">
                      {order.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#908fa0] font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#908fa0]" />
                    Updated {timeAgo(order.updatedAt || order.createdAt)}
                  </div>
                </div>

                {/* Quick Filter Pills with Dynamic Counts */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#1f2f45]">
                  <button
                    type="button"
                    onClick={() => setTimelineFilter("all")}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                      timelineFilter === "all"
                        ? "bg-[#5E6AD2] text-white shadow-sm"
                        : "bg-[#122131] hover:bg-[#1c2b3c] text-[#908fa0] hover:text-white border border-[#1f2f45]"
                    }`}
                  >
                    All Events ({allTimelineEvents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineFilter("logistics")}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all cursor-pointer ${
                      timelineFilter === "logistics"
                        ? "bg-[#5E6AD2] text-white shadow-sm"
                        : "bg-[#122131] hover:bg-[#1c2b3c] text-[#908fa0] hover:text-white border border-[#1f2f45]"
                    }`}
                  >
                    Courier / Logistics ({logisticsEvents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineFilter("payment")}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all cursor-pointer ${
                      timelineFilter === "payment"
                        ? "bg-[#5E6AD2] text-white shadow-sm"
                        : "bg-[#122131] hover:bg-[#1c2b3c] text-[#908fa0] hover:text-white border border-[#1f2f45]"
                    }`}
                  >
                    Payment & Gateway ({paymentEvents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineFilter("staff")}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all cursor-pointer ${
                      timelineFilter === "staff"
                        ? "bg-[#5E6AD2] text-white shadow-sm"
                        : "bg-[#122131] hover:bg-[#1c2b3c] text-[#908fa0] hover:text-white border border-[#1f2f45]"
                    }`}
                  >
                    Staff Actions ({staffEvents.length})
                  </button>
                </div>
              </div>

              {/* Vertical Timeline Stream with Stitch gradient spine */}
              <div className="relative pl-4 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-[#5E6AD2] before:via-[#1f2f45] before:to-transparent">
                {filteredTimeline.map((evt, idx) => {
                  const colors = getEventColors(evt.status, evt.note);
                  return (
                    <div key={idx} className="relative pl-6 group">
                      <div
                        className={`absolute -left-[17px] top-0.5 w-5 h-5 rounded-full bg-[#071628] border-2 ${colors.border} flex items-center justify-center ring-4 ring-[#071628]`}
                      >
                        <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                      </div>
                      <div className="bg-[#0d1c2d] border border-[#1f2f45] hover:border-[#2c3e58] rounded-lg p-3 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                            {evt.status}
                          </span>
                          <span className="text-[10px] font-mono text-cyan-300 font-medium shrink-0">
                            {formatDateTime(evt.timestamp)}
                          </span>
                        </div>
                        {evt.note && (
                          <p className="text-xs text-[#d4e4fa] mt-1.5 leading-relaxed">
                            {evt.note}
                          </p>
                        )}
                        <div className="mt-2 pt-2 border-t border-[#1f2f45] flex items-center justify-between text-[10px] text-[#908fa0]">
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded bg-[#5E6AD2]/20 text-[#8C98FB] flex items-center justify-center font-bold text-[9px]">
                              {evt.actor ? evt.actor.slice(0, 2).toUpperCase() : "MB"}
                            </span>
                            <span>{evt.actor || "System"}</span>
                          </div>
                          <div className="flex items-center gap-1 font-mono">
                            <span>Status:</span>
                            <span className="text-indigo-300 font-semibold">
                              Verified
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Manual Activity / Staff Note Input Box */}
              <div className="bg-[#0d1c2d] border border-[#1f2f45] rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#908fa0] uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#5E6AD2]" />
                    Add Manual Activity / Staff Note
                  </span>
                  <span className="text-[10px] text-[#908fa0]">Logged as MA</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCustomActivityType("note")}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer ${
                      customActivityType === "note"
                        ? "bg-[#5E6AD2]/20 text-indigo-300 border border-[#5E6AD2]/30"
                        : "bg-[#122131] hover:bg-[#1c2b3c] text-[#908fa0] border border-[#1f2f45]"
                    }`}
                  >
                    Note
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomActivityType("call")}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer ${
                      customActivityType === "call"
                        ? "bg-[#5E6AD2]/20 text-indigo-300 border border-[#5E6AD2]/30"
                        : "bg-[#122131] hover:bg-[#1c2b3c] text-[#908fa0] border border-[#1f2f45]"
                    }`}
                  >
                    Call Log
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomActivityType("courier")}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer ${
                      customActivityType === "courier"
                        ? "bg-[#5E6AD2]/20 text-indigo-300 border border-[#5E6AD2]/30"
                        : "bg-[#122131] hover:bg-[#1c2b3c] text-[#908fa0] border border-[#1f2f45]"
                    }`}
                  >
                    Courier Issue
                  </button>
                </div>
                <textarea
                  value={customActivityText}
                  onChange={(e) => setCustomActivityText(e.target.value)}
                  className="w-full bg-[#122131] border border-[#1f2f45] rounded p-2 text-xs text-white placeholder-[#908fa0] focus:border-[#5E6AD2] focus:outline-none custom-ring"
                  placeholder="Type activity log or communication note with customer..."
                  rows={2}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddActivity}
                    disabled={!customActivityText.trim()}
                    className="px-3 py-1 rounded bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white text-[11px] font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-40"
                  >
                    Post Update
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Action Bar (Sticky Bottom) */}
        <div className="p-4 border-t border-[#1f2f45] bg-[#071628] flex items-center gap-3 sticky bottom-0 shrink-0">
          <button
            type="button"
            onClick={async () => {
              setUpdating(true);
              try {
                const targetStatus =
                  order.status === "shipped" ? "completed" : "shipped";
                await onStatusUpdate(
                  order.id,
                  targetStatus,
                  trackingInput || order.steadfastTrackingCode || undefined,
                );
              } finally {
                setUpdating(false);
              }
            }}
            disabled={
              updating ||
              order.status === "completed" ||
              order.status === "cancelled"
            }
            className="flex-1 py-2 rounded-md bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all custom-ring flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {updating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>
              {order.status === "shipped"
                ? "Mark As Delivered"
                : "Mark As Shipped"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  `Are you sure you want to cancel order #${order.id}?`,
                )
              ) {
                onStatusUpdate(order.id, "cancelled");
              }
            }}
            disabled={
              updating ||
              order.status === "cancelled" ||
              order.status === "completed"
            }
            className="py-2 px-4 rounded-md bg-[#122131] hover:bg-rose-950/40 text-rose-300 border border-rose-500/30 text-xs font-medium transition-all disabled:opacity-50"
          >
            Cancel Order
          </button>
        </div>
      </div>
    </>
  );
}
