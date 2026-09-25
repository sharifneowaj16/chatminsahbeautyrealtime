"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAdminAuth, PERMISSIONS } from "@/contexts/AdminAuthContext";
import { useToast } from "@/components/ui/ToastProvider";
import {
  Order,
  Stats,
  Pagination,
  STATUS_CONFIG,
  PAYMENT_METHOD_LABELS,
  toSafeMoney,
  timeAgo,
  copyToClipboard,
} from "./types";
import OrderDetailDrawer from "./OrderDetailDrawer";
import ThermalReceiptModal from "./ThermalReceiptModal";
import SteadfastShipPanel from "@/components/admin/SteadfastShipPanel";
import SteadfastBulkDispatch from "@/components/admin/SteadfastBulkDispatch";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Search,
  Truck,
  RefreshCw,
  Download,
  X,
  ChevronDown,
  Package,
  Clock,
  AlertCircle,
  Copy,
  Printer,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  MoreHorizontal,
  Check,
  Loader2,
  Layers,
  Plus,
  ChevronRight,
  Trash2,
  ExternalLink,
  Phone,
  Eye,
  Menu,
} from "lucide-react";

interface ApiOrderItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: string | number;
  total: string | number;
  product?: { images?: Array<{ url: string }> };
  variant?: { name: string; attributes?: Record<string, string> };
}

interface ApiPayment {
  id: string;
  method: string;
  status?: string;
  amount: string | number;
  transactionId?: string | null;
  createdAt: string;
}

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

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeMenuOrderId, setActiveMenuOrderId] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Steadfast ship panel state
  const [shipPanelOrder, setShipPanelOrder] = useState<Order | null>(null);
  const [shipPanelOpen, setShipPanelOpen] = useState(false);

  // POS Thermal Receipt preview modal state (Screen 10)
  const [posReceiptOrder, setPosReceiptOrder] = useState<Order | null>(null);

  // Delete modal state
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut (⌘K / Ctrl+K)
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

  // Close 3-dots menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        activeMenuOrderId &&
        !(e.target as HTMLElement).closest(".row-action-menu")
      ) {
        setActiveMenuOrderId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [activeMenuOrderId]);

  // Read URL query params on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
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

  // Fetch orders from API
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
        if (!res.ok) {
          throw new Error((await res.json()).error || "Failed to fetch orders");
        }
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

  // Open order detail drawer and fetch full enriched record
  const openOrderDetail = async (order: Order) => {
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
      /* Keep fallback */
    }
  };

  // Status and Note Updates
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
      pushToast({
        tone: "success",
        description: `Order #${orderNumber.slice(-8).toUpperCase()} updated to ${status}`,
      });
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
      pushToast({ tone: "success", description: "Internal note saved" });
    }
  };

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
      if (selectedOrder?.id === order.id) setSelectedOrder(null);
      setDeleteConfirmOrder(null);
      pushToast({ tone: "success", description: "Order deleted successfully" });
    } catch (e) {
      pushToast({
        tone: "danger",
        description: e instanceof Error ? e.message : "Delete failed",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Selection Logic
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  const selectedTotalValue = orders
    .filter((o) => selectedIds.has(o.dbId || o.id))
    .reduce((sum, o) => sum + o.total, 0);

  // CSV Export
  const exportCSV = () => {
    const target =
      selectedIds.size > 0
        ? orders.filter((o) => selectedIds.has(o.dbId || o.id))
        : orders;
    const header = [
      "Order ID",
      "Customer",
      "Phone",
      "City",
      "Status",
      "Payment Method",
      "Payment Status",
      "Total",
      "Delivery Cost",
      "Items Count",
      "Tracking Code",
      "Date",
    ].join(",");
    const rows = target.map((o) =>
      [
        `"${o.id}"`,
        `"${o.customer.name}"`,
        `"${o.customer.phone}"`,
        `"${o.shipping?.city || ""}"`,
        `"${o.status}"`,
        `"${o.paymentMethod}"`,
        `"${o.paymentStatus}"`,
        o.total,
        o.shippingCost || 0,
        o.items.length,
        `"${o.steadfastTrackingCode || o.tracking || ""}"`,
        `"${new Date(o.createdAt).toLocaleDateString()}"`,
      ].join(","),
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyOrderId = (id: string) => {
    copyToClipboard(id);
    setCopiedOrderId(id);
    setTimeout(() => setCopiedOrderId(null), 1500);
  };

  return (
    <div className="min-h-screen bg-[#051424] text-[#d4e4fa] font-sans antialiased overflow-x-hidden selection:bg-indigo-600/30 selection:text-indigo-200">
      {/* ── Top Sticky Navigation & Header ────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#051424]/95 backdrop-blur-md border-b border-[#1f2f45] px-4 lg:px-7 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Page Title & Stats Badge */}
          <div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-admin-sidebar'))}
                className="lg:hidden p-1.5 rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.06] active:bg-white/[0.10] cursor-pointer"
                aria-label="Open admin sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>
              <h1 className="text-lg lg:text-xl font-bold text-white tracking-tight">
                Orders
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#122131] border border-[#1f2f45] text-[#908fa0]">
                {pagination.total > 0
                  ? `${pagination.total.toLocaleString()} orders total`
                  : `${orders.length} orders total`}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-xs text-[#908fa0] mt-0.5">
              Manage customer shipments, courier APIs, and fulfillment subsidies
            </p>
          </div>

          {/* Top Right Action Cluster */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchOrders(pagination.page, true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#0d1c2d] hover:bg-[#122131] text-[#d4e4fa] border border-[#1f2f45] hover:border-[#2c3e58] transition-all cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#908fa0] ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#0d1c2d] hover:bg-[#122131] text-[#d4e4fa] border border-[#1f2f45] hover:border-[#2c3e58] transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#908fa0]" />
              <span>Export CSV</span>
            </button>
            <Link
              href="/admin/orders/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white shadow-md shadow-indigo-500/25 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Order</span>
            </Link>
          </div>
        </div>

        {/* ── 7 KPI Metrics Row (Touch Carousel on Mobile, 7-col Grid on Desktop) ── */}
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 flex lg:grid lg:grid-cols-7 gap-2.5 pt-3.5 pb-2 lg:pb-0">
          {/* Card 1: Pending */}
          <div
            onClick={() =>
              setStatusFilter(statusFilter === "pending" ? "" : "pending")
            }
            className={`bg-[#0d1c2d] hover:bg-[#122131] border rounded-lg p-2.5 cursor-pointer transition-all group shrink-0 w-36 lg:w-auto ${
              statusFilter === "pending"
                ? "border-amber-500/60 ring-1 ring-amber-500/30 bg-[#122131]"
                : "border-[#1f2f45] hover:border-amber-500/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#908fa0] group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Pending
              </span>
              <Clock className="w-3.5 h-3.5 text-[#908fa0] group-hover:text-amber-400 transition-colors" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-white font-mono">
                {stats.pending}
              </span>
              <span className="text-[10px] text-amber-400/90 font-medium">
                Needs Action
              </span>
            </div>
          </div>

          {/* Card 2: Processing */}
          <div
            onClick={() =>
              setStatusFilter(
                statusFilter === "processing" ? "" : "processing",
              )
            }
            className={`border rounded-lg p-2.5 cursor-pointer transition-all shrink-0 w-36 lg:w-auto ${
              statusFilter === "processing"
                ? "bg-[#122131] border-[#5E6AD2]/50 ring-1 ring-[#5E6AD2]/30 shadow-sm"
                : "bg-[#0d1c2d] hover:bg-[#122131] border-[#1f2f45] hover:border-[#5E6AD2]/30"
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
              <span className="text-[10px] text-indigo-300/90 font-medium">
                Packaging
              </span>
            </div>
          </div>

          {/* Card 3: Shipped */}
          <div
            onClick={() =>
              setStatusFilter(statusFilter === "shipped" ? "" : "shipped")
            }
            className={`bg-[#0d1c2d] hover:bg-[#122131] border rounded-lg p-2.5 cursor-pointer transition-all group shrink-0 w-36 lg:w-auto ${
              statusFilter === "shipped"
                ? "border-cyan-500/60 ring-1 ring-cyan-500/30 bg-[#122131]"
                : "border-[#1f2f45] hover:border-cyan-500/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#908fa0] group-hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                Shipped
              </span>
              <Truck className="w-3.5 h-3.5 text-[#908fa0] group-hover:text-cyan-400 transition-colors" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-white font-mono">
                {stats.shipped}
              </span>
              <span className="text-[10px] text-cyan-400/90 font-medium">
                In Transit
              </span>
            </div>
          </div>

          {/* Card 4: Revenue */}
          <div className="bg-[#0d1c2d] hover:bg-[#122131] border border-[#1f2f45] rounded-lg p-2.5 transition-all shrink-0 w-40 lg:w-auto">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#908fa0]">
                Revenue
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-white font-mono">
                <span className="font-sans mr-0.5">৳</span>
                {stats.totalRevenue.toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-400 font-medium">
                +14.2%
              </span>
            </div>
          </div>

          {/* Card 5: Deliv. Collected */}
          <div className="bg-[#0d1c2d] hover:bg-[#122131] border border-[#1f2f45] rounded-lg p-2.5 transition-all shrink-0 w-40 lg:w-auto">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#908fa0]">
                Deliv. Collected
              </span>
              <DollarSign className="w-3.5 h-3.5 text-[#908fa0]" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-white font-mono">
                <span className="font-sans mr-0.5">৳</span>
                {stats.customerDeliveryCollected.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#908fa0]">From users</span>
            </div>
          </div>

          {/* Card 6: Courier Cost */}
          <div className="bg-[#0d1c2d] hover:bg-[#122131] border border-[#1f2f45] rounded-lg p-2.5 transition-all shrink-0 w-40 lg:w-auto">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#908fa0]">
                Courier Cost
              </span>
              <Truck className="w-3.5 h-3.5 text-[#908fa0]" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-white font-mono">
                <span className="font-sans mr-0.5">৳</span>
                {stats.courierDeliveryActual.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#908fa0]">Steadfast/Pathao</span>
            </div>
          </div>

          {/* Card 7: Net Surplus */}
          <div className="bg-[#0d1c2d] hover:bg-[#122131] border border-[#1f2f45] rounded-lg p-2.5 transition-all shrink-0 w-40 lg:w-auto lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-emerald-400">
                Net Surplus
              </span>
              <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 font-mono">
                {stats.deliverySubsidy >= 0 ? (
                  <>
                    +<span className="font-sans">৳</span>
                    {stats.deliverySubsidy.toLocaleString()}
                  </>
                ) : (
                  <>
                    -<span className="font-sans">৳</span>
                    {Math.abs(stats.deliverySubsidy).toLocaleString()}
                  </>
                )}
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-emerald-300 font-mono">
                {stats.deliverySubsidy >= 0 ? (
                  <>
                    +<span className="font-sans">৳</span>
                    {stats.deliverySubsidy.toLocaleString()}
                  </>
                ) : (
                  <>
                    -<span className="font-sans">৳</span>
                    {Math.abs(stats.deliverySubsidy).toLocaleString()}
                  </>
                )}
              </span>
              <span className="text-[10px] text-emerald-400/80">
                Profit margin
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Search, Multi-Filter Toolbar & Bulk Selection Bar ──────── */}
      <section className="px-4 lg:px-7 py-3 border-b border-[#1f2f45] bg-[#071628]/70 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Search input with ⌘K */}
          <div className="flex-1 min-w-[280px] max-w-xl relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-[#908fa0]" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order #, customer name, phone, or email..."
              className="w-full pl-9 pr-8 py-1.5 bg-[#0d1c2d] border border-[#1f2f45] rounded-md text-xs text-white placeholder-[#908fa0] focus:border-[#5E6AD2] focus:bg-[#122131] transition-all custom-ring"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#908fa0] hover:text-white"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters cluster (Desktop/Tablet) */}
          <div className="hidden sm:flex flex-wrap items-center gap-2">
            {/* Status Dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-[#0d1c2d] text-xs text-[#d4e4fa] border border-[#1f2f45] rounded-md pl-2.5 pr-7 py-1.5 hover:bg-[#122131] hover:border-[#2c3e58] cursor-pointer focus:border-[#5E6AD2] custom-ring"
              >
                <option value="">Status: All Statuses</option>
                <option value="pending">Status: Pending</option>
                <option value="processing">Status: Processing</option>
                <option value="shipped">Status: Shipped</option>
                <option value="completed">Status: Completed</option>
                <option value="delivered">Status: Delivered</option>
                <option value="cancelled">Status: Cancelled</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#908fa0]">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Payment Method Dropdown */}
            <div className="relative">
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="appearance-none bg-[#0d1c2d] text-xs text-[#d4e4fa] border border-[#1f2f45] rounded-md pl-2.5 pr-7 py-1.5 hover:bg-[#122131] hover:border-[#2c3e58] cursor-pointer focus:border-[#5E6AD2] custom-ring"
              >
                <option value="">Payment: All</option>
                <option value="paid">Payment: Paid</option>
                <option value="pending">Payment: Pending</option>
                <option value="cod">Payment: Cash on Delivery</option>
                <option value="bkash">Payment: bKash</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#908fa0]">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="relative">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="appearance-none bg-[#0d1c2d] text-xs text-[#d4e4fa] border border-[#1f2f45] rounded-md pl-2.5 pr-7 py-1.5 hover:bg-[#122131] hover:border-[#2c3e58] cursor-pointer focus:border-[#5E6AD2] custom-ring"
              >
                <option value="">Date: All Time</option>
                <option value="today">Date: Today</option>
                <option value="7d">Date: Last 7 days</option>
                <option value="30d">Date: Last 30 days</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#908fa0]">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Sort By */}
            <div className="relative hidden sm:block">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-[#0d1c2d] text-xs text-[#d4e4fa] border border-[#1f2f45] rounded-md pl-2.5 pr-7 py-1.5 hover:bg-[#122131] hover:border-[#2c3e58] cursor-pointer focus:border-[#5E6AD2] custom-ring"
              >
                <option value="created">Sort: Newest First</option>
                <option value="total_high">Sort: Highest Amount</option>
                <option value="updated">Sort: Recently Updated</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#908fa0]">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Reset Button */}
            {(statusFilter || paymentFilter || dateRange || search) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("");
                  setPaymentFilter("");
                  setDateRange("");
                  setSearch("");
                  setSortBy("created");
                }}
                className="px-2.5 py-1.5 text-xs text-[#908fa0] hover:text-white flex items-center gap-1.5 hover:bg-[#0d1c2d] border border-[#1f2f45] rounded-md transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Mobile Horizontal Filter Chips Bar (Matching Stitch Screen 9) ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-4 px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setStatusFilter("")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              !statusFilter
                ? "bg-[#e91e63] text-white shadow-sm shadow-[#e91e63]/25"
                : "bg-[#0d1c2d] text-[#908fa0] hover:text-white border border-[#1f2f45]"
            }`}
          >
            <span>All</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                !statusFilter
                  ? "bg-white/20 text-white"
                  : "bg-[#122131] text-[#908fa0]"
              }`}
            >
              {pagination.total || orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setStatusFilter(statusFilter === "pending" ? "" : "pending")
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              statusFilter === "pending"
                ? "bg-[#e91e63] text-white shadow-sm shadow-[#e91e63]/25"
                : "bg-[#0d1c2d] text-[#908fa0] hover:text-white border border-[#1f2f45]"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <span>Pending</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                statusFilter === "pending"
                  ? "bg-white/20 text-white"
                  : "bg-[#122131] text-amber-400/90"
              }`}
            >
              {stats.pending}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setStatusFilter(statusFilter === "processing" ? "" : "processing")
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              statusFilter === "processing"
                ? "bg-[#e91e63] text-white shadow-sm shadow-[#e91e63]/25"
                : "bg-[#0d1c2d] text-[#908fa0] hover:text-white border border-[#1f2f45]"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
            <span>Processing</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                statusFilter === "processing"
                  ? "bg-white/20 text-white"
                  : "bg-[#122131] text-indigo-300"
              }`}
            >
              {stats.processing}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setStatusFilter(statusFilter === "shipped" ? "" : "shipped")
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              statusFilter === "shipped"
                ? "bg-[#e91e63] text-white shadow-sm shadow-[#e91e63]/25"
                : "bg-[#0d1c2d] text-[#908fa0] hover:text-white border border-[#1f2f45]"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
            <span>Shipped</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                statusFilter === "shipped"
                  ? "bg-white/20 text-white"
                  : "bg-[#122131] text-cyan-300"
              }`}
            >
              {stats.shipped}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setStatusFilter(statusFilter === "delivered" ? "" : "delivered")
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              statusFilter === "delivered"
                ? "bg-[#e91e63] text-white shadow-sm shadow-[#e91e63]/25"
                : "bg-[#0d1c2d] text-[#908fa0] hover:text-white border border-[#1f2f45]"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span>Delivered</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setStatusFilter(statusFilter === "cancelled" ? "" : "cancelled")
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              statusFilter === "cancelled"
                ? "bg-[#e91e63] text-white shadow-sm shadow-[#e91e63]/25"
                : "bg-[#0d1c2d] text-[#908fa0] hover:text-white border border-[#1f2f45]"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
            <span>Cancelled</span>
          </button>
        </div>

        {/* ── Bulk Selection Alert Bar (Screen 1 - Active with selected items) ── */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between bg-gradient-to-r from-[#122131] to-[#0d1c2d] border border-[#5E6AD2]/40 rounded-lg px-3.5 py-2 gap-2 shadow-sm animate-in duration-200">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5E6AD2]" />
              </span>
              <span className="text-xs font-semibold text-white">
                {selectedIds.size} orders selected
              </span>
              <span className="text-xs text-[#908fa0] hidden sm:inline">
                • Total Value:{" "}
                <strong className="text-white font-mono">
                  ৳{selectedTotalValue.toLocaleString()}
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
              <button
                type="button"
                onClick={exportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#0d1c2d] hover:bg-[#16263d] text-[#d4e4fa] border border-[#1f2f45] text-xs font-medium transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#908fa0]" />
                <span>Export Selected</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="p-1 text-[#908fa0] hover:text-white rounded hover:bg-[#1f2f45] transition-colors"
                title="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── FULL-WIDTH ORDERS TABLE CONTAINER (Card-Rows Stack Matching Stitch) ── */}
      <section className="flex-1 w-full px-4 lg:px-7 py-4 space-y-3">
        {/* Column Header Guide (Exact matching widths with CSS Grid) */}
        <div className="hidden lg:grid grid-cols-[minmax(0,20fr)_minmax(0,22fr)_minmax(0,18fr)_minmax(0,18fr)_minmax(0,22fr)] items-center gap-3 px-4 py-2 text-[11px] font-semibold text-[#908fa0] uppercase tracking-wider border-b border-[#1f2f45]">
          <div className="flex items-center gap-2.5 min-w-0">
            <input
              type="checkbox"
              checked={
                selectedIds.size === orders.length && orders.length > 0
              }
              onChange={toggleSelectAll}
              className="rounded border-[#1f2f45] bg-[#0d1c2d] text-[#5E6AD2] focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span className="truncate">Order & Customer</span>
          </div>
          <div className="min-w-0 truncate">Items Preview</div>
          <div className="min-w-0 truncate">Financials & Payment</div>
          <div className="min-w-0 truncate">Logistics & Status</div>
          <div className="text-right min-w-0 truncate pr-1">Quick Actions</div>
        </div>

        {/* Loading / Error / Empty States */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#908fa0]">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#5E6AD2]" />
            <p className="text-sm">Loading orders…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
            <p className="text-white font-medium mb-1">Failed to load orders</p>
            <p className="text-[#908fa0] text-xs mb-4">{error}</p>
            <button
              type="button"
              onClick={() => fetchOrders(1)}
              className="px-3 py-1.5 rounded-md bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white text-xs font-semibold"
            >
              Try again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <ShoppingBag className="w-10 h-10 text-[#908fa0] mb-3" />
            <p className="text-white font-medium">No orders found</p>
            <p className="text-[#908fa0] text-xs mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {orders.map((order) => {
              const isSelected = selectedIds.has(order.dbId || order.id);
              const isDrawerOpen = selectedOrder?.id === order.id;
              const orderNum = order.id.slice(-8).toUpperCase();
              const firstItem = order.items[0];
              const remainingCount = order.items.length - 1;

              const isBkash =
                order.paymentMethod === "bkash" ||
                order.payments?.some((p) => p.method === "bkash");

              const trackingCode =
                order.steadfastTrackingCode ||
                order.pathaoTrackingCode ||
                order.tracking ||
                null;

              return (
                <div
                  key={order.id}
                  className={`bg-[#0d1c2d] hover:bg-[#122131] rounded-lg p-3.5 transition-all relative group shadow-sm ${
                    isDrawerOpen
                      ? "border-2 border-[#5E6AD2] shadow-lg shadow-indigo-950/20"
                      : isSelected
                        ? "border-2 border-[#5E6AD2]/70 shadow-md shadow-indigo-950/15"
                        : "border border-[#1f2f45] hover:border-[#2c3e58]"
                  }`}
                >
                  {/* ── Mobile Order Card Stack (< 1024px, Matching Stitch Screen 9 & 10) ── */}
                  <div className="lg:hidden space-y-3">
                    {/* Top Row: Checkbox, Order ID, Timestamp, Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(order.dbId || order.id)}
                          className="rounded border-[#1f2f45] bg-[#051424] text-[#5E6AD2] focus:ring-0 focus:ring-offset-0 shrink-0 cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => openOrderDetail(order)}
                          className="font-mono text-sm font-bold text-white tracking-wider hover:text-indigo-300 transition-colors truncate cursor-pointer"
                        >
                          #ORD-{orderNum}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyOrderId(order.id)}
                          className="text-[#908fa0] hover:text-white transition-colors shrink-0"
                          title="Copy Order ID"
                        >
                          {copiedOrderId === order.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        <span className="text-[11px] text-[#908fa0] font-mono shrink-0">
                          · {timeAgo(order.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Payment Badge */}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            order.paymentStatus === "paid"
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                              : order.paymentStatus === "failed"
                                ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                                : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                          }`}
                        >
                          {order.paymentStatus === "paid"
                            ? isBkash
                              ? "Paid bKash"
                              : "Paid"
                            : order.paymentStatus === "failed"
                              ? "Failed"
                              : isBkash
                                ? "Pending"
                                : "COD"}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border capitalize ${
                            STATUS_CONFIG[
                              order.status as keyof typeof STATUS_CONFIG
                            ]?.color ||
                            "bg-[#5E6AD2]/20 text-indigo-300 border-[#5E6AD2]/30"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>

                    {/* Customer Info Sub-row */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#122131] border border-[#1f2f45] flex items-center justify-center text-indigo-300 font-bold text-[11px] shrink-0">
                          {order.customer.name
                            ? order.customer.name.slice(0, 2).toUpperCase()
                            : "CU"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate text-xs">
                            {order.customer.name}
                          </p>
                          <p className="text-[11px] text-[#908fa0] font-mono truncate">
                            {order.customer.phone || "No phone"}
                            {order.shipping?.city ? ` · ${order.shipping.city}` : ""}
                          </p>
                        </div>
                      </div>

                      {order.customer.phone && (
                        <a
                          href={`tel:${order.customer.phone}`}
                          className="p-1.5 rounded-lg bg-[#122131] hover:bg-[#1a2c42] text-indigo-300 hover:text-white border border-[#1f2f45] transition-colors shrink-0"
                          title="Call customer"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    {/* Items Summary Sub-card */}
                    <div
                      onClick={() => openOrderDetail(order)}
                      className="bg-[#091522] hover:bg-[#0c1a2b] rounded-lg p-2.5 flex items-center justify-between border border-[#1f2f45]/80 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-9 h-9 rounded bg-[#122131] border border-[#1f2f45] p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
                          {firstItem?.image ? (
                            <img
                              src={firstItem.image}
                              alt={firstItem.name}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <Package className="w-4 h-4 text-pink-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white truncate">
                            {firstItem?.name || "Product Item"}
                          </p>
                          <p className="text-[11px] text-[#908fa0] truncate">
                            {order.items.length}{" "}
                            {order.items.length === 1 ? "item" : "items"} ·{" "}
                            {order.shippingMethod === "pathao"
                              ? "Pathao"
                              : "Steadfast"}
                            {trackingCode ? ` (${trackingCode})` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold font-mono text-white">
                          <span className="font-sans mr-0.5">৳</span>
                          {order.total.toLocaleString()}
                        </p>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          Deliv: ৳{toSafeMoney(order.shippingCost)}
                        </span>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 pt-1 border-t border-[#1f2f45]">
                      {/* View Details Button */}
                      <button
                        type="button"
                        onClick={() => openOrderDetail(order)}
                        className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                          isDrawerOpen
                            ? "bg-[#5E6AD2] text-white"
                            : "bg-[#122131] hover:bg-[#1a2c42] text-[#d4e4fa] border border-[#1f2f45]"
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </button>

                      {/* Dispatch / Track Button */}
                      {trackingCode ? (
                        <a
                          href={`/track?code=${trackingCode}`}
                          target="_blank"
                          rel="noreferrer"
                          className="py-1.5 px-3 rounded-lg bg-[#06B6D4]/15 hover:bg-[#06B6D4]/25 text-cyan-200 border border-[#06B6D4]/30 text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Track</span>
                        </a>
                      ) : order.status === "cancelled" ? (
                        <button
                          type="button"
                          onClick={() => openOrderDetail(order)}
                          className="py-1.5 px-3 rounded-lg bg-[#122131] hover:bg-[#1a2c42] text-[#908fa0] border border-[#1f2f45] text-xs font-semibold transition-all flex items-center justify-center"
                        >
                          Details
                        </button>
                      ) : order.shippingMethod === "pathao" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShipPanelOrder(order);
                            setShipPanelOpen(true);
                          }}
                          className="py-1.5 px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/30 text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Pathao</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setShipPanelOrder(order);
                            setShipPanelOpen(true);
                          }}
                          className="py-1.5 px-3 rounded-lg bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-900/30"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Dispatch</span>
                        </button>
                      )}

                      {/* 3-Dots Menu Dropdown */}
                      <div className="relative row-action-menu">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenuOrderId(
                              activeMenuOrderId === `mobile-${order.id}`
                                ? null
                                : `mobile-${order.id}`,
                            )
                          }
                          className="h-8 w-8 rounded-lg bg-[#122131] hover:bg-[#1a2c42] border border-[#1f2f45] text-[#908fa0] hover:text-white inline-flex items-center justify-center transition-all cursor-pointer"
                          title="More options"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {activeMenuOrderId === `mobile-${order.id}` && (
                          <div className="absolute right-0 bottom-full mb-1 w-44 bg-[#0d1c2d] border border-[#1f2f45] rounded-lg shadow-2xl py-1 z-30 animate-in duration-150">
                            <button
                              type="button"
                              onClick={() => {
                                handleCopyOrderId(order.id);
                                setActiveMenuOrderId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-[#d4e4fa] hover:text-white hover:bg-[#122131] flex items-center gap-2 text-left"
                            >
                              <Copy className="w-3.5 h-3.5 text-[#908fa0]" />
                              <span>Copy Order ID</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPosReceiptOrder(order);
                                setActiveMenuOrderId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-[#d4e4fa] hover:text-white hover:bg-[#122131] flex items-center gap-2 text-left"
                            >
                              <Printer className="w-3.5 h-3.5 text-[#908fa0]" />
                              <span>Print Thermal Slip</span>
                            </button>
                            <div className="h-px bg-[#1f2f45] my-1" />
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteConfirmOrder(order);
                                setActiveMenuOrderId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 flex items-center gap-2 text-left"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Order</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Desktop Order Row (>= 1024px, Matching Screen 9367f8808741428a90a24cbf0d1ab57e) ── */}
                  <div className="hidden lg:grid grid-cols-[minmax(0,20fr)_minmax(0,22fr)_minmax(0,18fr)_minmax(0,18fr)_minmax(0,22fr)] items-center gap-3 w-full">
                    {/* Col 1: Order & Customer (20%) */}
                    <div className="w-full min-w-0 flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(order.dbId || order.id)}
                        className="mt-1 rounded border-[#1f2f45] bg-[#051424] text-[#5E6AD2] focus:ring-0 focus:ring-offset-0 shrink-0 cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => openOrderDetail(order)}
                            className="text-xs font-bold text-white font-mono tracking-tight hover:underline cursor-pointer text-left truncate"
                          >
                            #ORD-{orderNum}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyOrderId(order.id)}
                            className="text-[#908fa0] hover:text-white transition-colors shrink-0"
                            title="Copy Order ID"
                          >
                            {copiedOrderId === order.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                          <span className="text-[10px] text-[#908fa0] font-mono shrink-0">
                            {timeAgo(order.createdAt)}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-white truncate mt-0.5">
                          {order.customer.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[#908fa0] mt-0.5 flex-wrap">
                          {order.customer.phone ? (
                            <a
                              href={`tel:${order.customer.phone}`}
                              className="font-mono text-[#d4e4fa] hover:text-indigo-300 transition-colors truncate"
                            >
                              {order.customer.phone}
                            </a>
                          ) : (
                            <span className="font-mono text-[#908fa0]">
                              No Phone
                            </span>
                          )}
                          {order.shipping?.city && (
                            <>
                              <span className="text-[#1f2f45]">•</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#122131] border border-[#1f2f45] text-[#d4e4fa] truncate max-w-[100px]">
                                {order.shipping.city}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Col 2: Items Preview (22%) */}
                    <div className="w-full min-w-0 flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg bg-[#122131] border border-[#1f2f45] p-1 shrink-0 flex items-center justify-center overflow-hidden">
                        {firstItem?.image ? (
                          <img
                            src={firstItem.image}
                            alt={firstItem.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-pink-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className="text-xs font-medium text-white truncate cursor-pointer"
                          title={firstItem?.name || "Items"}
                          onClick={() => openOrderDetail(order)}
                        >
                          {firstItem?.name || "Organic Product"}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-[#908fa0] font-mono">
                            Qty: {firstItem?.quantity || 1}
                          </span>
                          {remainingCount > 0 ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#5E6AD2]/20 text-indigo-300 border border-[#5E6AD2]/30">
                              +{remainingCount} more
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#122131] text-[#908fa0] border border-[#1f2f45]">
                              Single item
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Col 3: Financials & Payment (18%) */}
                    <div className="w-full min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white font-mono">
                          <span className="font-sans mr-0.5">৳</span>
                          {order.total.toLocaleString()}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            order.paymentStatus === "paid"
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                              : order.paymentStatus === "failed"
                                ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                                : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                          }`}
                        >
                          {order.paymentStatus === "paid"
                            ? "Paid"
                            : order.paymentStatus === "failed"
                              ? "Failed"
                              : isBkash
                                ? "Pending"
                                : "COD"}
                        </span>
                      </div>
                      <div className="text-xs text-[#908fa0] mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-[#d4e4fa]">
                          {PAYMENT_METHOD_LABELS[order.paymentMethod] ||
                            (isBkash ? "bKash Gateway" : "Cash on Delivery")}
                        </span>
                        <span className="text-[#1f2f45]">•</span>
                        <span className="text-[11px] text-emerald-400 font-mono">
                          Deliv: <span className="font-sans">৳</span>
                          {toSafeMoney(order.shippingCost)}
                        </span>
                      </div>
                    </div>

                    {/* Col 4: Logistics & Status (18%) */}
                    <div className="w-full min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${
                            STATUS_CONFIG[
                              order.status as keyof typeof STATUS_CONFIG
                            ]?.color ||
                            "bg-[#5E6AD2]/20 text-indigo-300 border-[#5E6AD2]/30"
                          }`}
                        >
                          {order.status}
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-orange-500/10 text-orange-300 border border-orange-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                          {order.shippingMethod === "pathao"
                            ? "Pathao"
                            : "Steadfast"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#908fa0] font-mono">
                        <span className="truncate max-w-[120px]">
                          {trackingCode || "Unassigned"}
                        </span>
                        {order.courierDeliveryCharge !== null &&
                          order.courierDeliveryCharge !== undefined && (
                            <>
                              <span className="text-[#1f2f45]">•</span>
                              <span className="text-emerald-400">
                                <span className="font-sans">৳</span>
                                {order.courierDeliveryCharge}
                              </span>
                            </>
                          )}
                      </div>
                    </div>

                    {/* Col 5: Quick Actions (22%) */}
                    <div className="w-full min-w-0 flex items-center lg:justify-end gap-1.5">
                      {/* View Button with subtle unselected state vs brand active state */}
                      <button
                        type="button"
                        onClick={() => openOrderDetail(order)}
                        className={`h-8 px-2.5 rounded-md text-xs font-semibold shadow-sm transition-all custom-ring inline-flex items-center gap-1 cursor-pointer shrink-0 ${
                          isDrawerOpen
                            ? "bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white"
                            : "bg-[#122131] hover:bg-[#1c2b3c] text-[#d4e4fa] border border-[#1f2f45]"
                        }`}
                      >
                        <span>View</span>
                        {isDrawerOpen && <ChevronRight className="w-3.5 h-3.5" />}
                      </button>

                      {/* Dynamic Courier Dispatch / Track / Assign Button */}
                      {trackingCode ? (
                        <a
                          href={`/track?code=${trackingCode}`}
                          target="_blank"
                          rel="noreferrer"
                          className="h-8 px-2.5 rounded-md bg-[#06B6D4]/15 hover:bg-[#06B6D4]/25 text-cyan-200 border border-[#06B6D4]/30 text-xs font-medium transition-all inline-flex items-center gap-1 shrink-0"
                          title="Track Parcel on Courier Live"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Track</span>
                        </a>
                      ) : order.status === "cancelled" ? (
                        <button
                          type="button"
                          onClick={() => openOrderDetail(order)}
                          className="h-8 px-2.5 rounded-md bg-[#122131] hover:bg-[#1c2b3c] text-[#908fa0] hover:text-white border border-[#1f2f45] text-xs font-semibold transition-all cursor-pointer shrink-0"
                        >
                          Details
                        </button>
                      ) : order.shippingMethod === "pathao" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShipPanelOrder(order);
                            setShipPanelOpen(true);
                          }}
                          className="h-8 px-2.5 rounded-md bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/30 text-xs font-medium transition-all inline-flex items-center gap-1 cursor-pointer shrink-0"
                          title="Assign Pathao Courier"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Pathao</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setShipPanelOrder(order);
                            setShipPanelOpen(true);
                          }}
                          className="h-8 px-2.5 rounded-md bg-[#122131] hover:bg-[#1c2b3c] text-orange-400 border border-[#1f2f45] hover:border-orange-500/40 text-xs font-medium transition-all inline-flex items-center gap-1 cursor-pointer shrink-0"
                          title="Dispatch parcel via Steadfast"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Dispatch</span>
                        </button>
                      )}

                      {/* 3-Dots Menu Dropdown */}
                      <div className="relative row-action-menu shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenuOrderId(
                              activeMenuOrderId === order.id ? null : order.id,
                            )
                          }
                          className="h-8 w-8 rounded-md bg-[#051424] hover:bg-[#122131] border border-[#1f2f45] text-[#908fa0] hover:text-white inline-flex items-center justify-center transition-all cursor-pointer"
                          title="More options"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {activeMenuOrderId === order.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-[#0d1c2d] border border-[#1f2f45] rounded-lg shadow-2xl py-1 z-30 animate-in duration-150">
                            <button
                              type="button"
                              onClick={() => {
                                handleCopyOrderId(order.id);
                                setActiveMenuOrderId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-[#d4e4fa] hover:text-white hover:bg-[#122131] flex items-center gap-2 text-left"
                            >
                              <Copy className="w-3.5 h-3.5 text-[#908fa0]" />
                              <span>Copy Order ID</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPosReceiptOrder(order);
                                setActiveMenuOrderId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-[#d4e4fa] hover:text-white hover:bg-[#122131] flex items-center gap-2 text-left"
                            >
                              <Printer className="w-3.5 h-3.5 text-[#908fa0]" />
                              <span>Print Thermal Slip</span>
                            </button>
                            <div className="h-px bg-[#1f2f45] my-1" />
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteConfirmOrder(order);
                                setActiveMenuOrderId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 flex items-center gap-2 text-left"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Order</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination Bar (Matching Stitch Exact Structure) ─────── */}
        {!loading && orders.length > 0 && (
          <div className="flex flex-wrap items-center justify-between pt-4 border-t border-[#1f2f45] text-xs text-[#908fa0]">
            <div className="flex items-center gap-2">
              <span>
                Showing{" "}
                <strong className="text-white font-mono">
                  {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total || orders.length,
                  )}
                </strong>{" "}
                of{" "}
                <strong className="text-white font-mono">
                  {(pagination.total || orders.length).toLocaleString()}
                </strong>{" "}
                orders
              </span>
              <span className="text-[#1f2f45]">•</span>
              <div className="flex items-center gap-1.5">
                <span>Rows per page:</span>
                <select
                  value={pagination.limit}
                  onChange={(e) => {
                    setPagination((prev) => ({
                      ...prev,
                      limit: Number(e.target.value),
                    }));
                    fetchOrders(1);
                  }}
                  className="bg-[#0d1c2d] text-[#d4e4fa] border border-[#1f2f45] rounded px-2 py-0.5 text-[11px] focus:outline-none"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-2 sm:mt-0">
              <button
                type="button"
                onClick={() => fetchOrders(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1 rounded bg-[#0d1c2d] border border-[#1f2f45] text-[#908fa0] hover:text-white disabled:opacity-40 disabled:hover:text-[#908fa0] transition-colors cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                className="px-2.5 py-1 rounded bg-[#5E6AD2] text-white font-medium text-xs shadow-xs"
              >
                {pagination.page}
              </button>
              {pagination.pages > pagination.page && (
                <button
                  type="button"
                  onClick={() => fetchOrders(pagination.page + 1)}
                  className="px-2.5 py-1 rounded hover:bg-[#122131] text-[#908fa0] hover:text-white text-xs transition-colors cursor-pointer"
                >
                  {pagination.page + 1}
                </button>
              )}
              {pagination.pages > pagination.page + 1 && (
                <>
                  <span className="text-[#908fa0]">...</span>
                  <button
                    type="button"
                    onClick={() => fetchOrders(pagination.pages)}
                    className="px-2.5 py-1 rounded hover:bg-[#122131] text-[#908fa0] hover:text-white text-xs transition-colors cursor-pointer"
                  >
                    {pagination.pages}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => fetchOrders(pagination.page + 1)}
                disabled={
                  pagination.page >= pagination.pages ||
                  pagination.pages === 0
                }
                className="px-3 py-1 rounded bg-[#0d1c2d] border border-[#1f2f45] text-[#d4e4fa] hover:text-white hover:bg-[#122131] disabled:opacity-40 disabled:hover:bg-[#0d1c2d] transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Slide-Over Drawer Sheet (Screen 2 / Screen 8 / Screen 9) ── */}
      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdate={handleStatusUpdate}
          onNoteUpdate={handleNoteUpdate}
          onDispatch={(order) => {
            setShipPanelOrder(order);
            setShipPanelOpen(true);
          }}
          onOpenReceipt={(order) => setPosReceiptOrder(order)}
        />
      )}

      {/* ── POS Thermal Receipt Modal (Screen 10) ──────────────────── */}
      {posReceiptOrder && (
        <ThermalReceiptModal
          order={posReceiptOrder}
          isOpen={Boolean(posReceiptOrder)}
          onClose={() => setPosReceiptOrder(null)}
        />
      )}

      {/* ── Steadfast Ship Panel Modal ─────────────────────────────── */}
      <SteadfastShipPanel
        order={
          shipPanelOrder
            ? {
                id: shipPanelOrder.id,
                dbId: shipPanelOrder.dbId || shipPanelOrder.id,
                total: shipPanelOrder.total,
                paymentMethod: shipPanelOrder.paymentMethod,
                paymentStatus: shipPanelOrder.paymentStatus,
                status: shipPanelOrder.status,
                customer: {
                  name: shipPanelOrder.customer.name,
                  email: shipPanelOrder.customer.email || "",
                  phone: shipPanelOrder.customer.phone,
                },
                shipping: shipPanelOrder.shipping
                  ? {
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
                      name:
                        shipPanelOrder.shipping.name ||
                        shipPanelOrder.customer.name,
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
          Order items, payment records, and linked tracking will be permanently removed.
        </div>
      </ConfirmDialog>
    </div>
  );
}
