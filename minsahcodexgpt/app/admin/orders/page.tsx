'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import { Order, Stats, Pagination, STATUS_CONFIG } from './types';

// Atomic Admin Components
import { OrderStatsHeader } from '@/components/admin/orders/OrderStatsHeader';
import { OrderTableRow } from '@/components/admin/orders/OrderTableRow';
import { AdminPaginationBar } from '@/components/admin/common/AdminPaginationBar';
import { AdminBulkActionBar } from '@/components/admin/common/AdminBulkActionBar';
import { CourierDispatchDrawer } from '@/components/admin/courier/CourierDispatchDrawer';
import { CourierBulkDispatchModal, BulkDispatchResult } from '@/components/admin/courier/CourierBulkDispatchModal';

// Modals
import OrderDetailDrawer from './OrderDetailDrawer';
import ThermalReceiptModal from './ThermalReceiptModal';

import {
  Search,
  RefreshCw,
  Plus,
  Loader2,
  AlertCircle,
  Truck,
  RotateCcw,
} from 'lucide-react';

export default function OrdersPage() {
  const { hasPermission } = useAdminAuth();
  const { pushToast } = useToast();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<Stats>({
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
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

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [sortBy, setSortBy] = useState('created');

  // Selected state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Modals
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [dispatchOrder, setDispatchOrder] = useState<Order | null>(null);
  const [isBulkDispatchOpen, setIsBulkDispatchOpen] = useState(false);

  const searchRef = useRef<NodeJS.Timeout | null>(null);
  const hasAccess = hasPermission(PERMISSIONS.ORDERS_VIEW);

  // Fetch orders from API
  const fetchOrders = useCallback(
    async (page = 1, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(pagination.limit || 20),
          sortBy,
        });
        if (search.trim()) params.set('search', search.trim());
        if (statusFilter) params.set('status', statusFilter);
        if (paymentFilter) params.set('paymentStatus', paymentFilter);
        if (dateRange) params.set('dateRange', dateRange);

        const res = await fetch(`/api/admin/orders?${params}`, {
          credentials: 'include',
        });
        if (!res.ok) {
          throw new Error((await res.json()).error || 'Failed to fetch orders');
        }

        const data = await res.json();
        setOrders(data.orders || []);
        if (data.stats) setStats(data.stats);
        if (data.pagination) setPagination(data.pagination);
      } catch (err: any) {
        setError(err.message || 'Error loading orders');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, statusFilter, paymentFilter, dateRange, sortBy, pagination.limit]
  );

  // Debounce search
  useEffect(() => {
    if (!hasAccess) return;
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => fetchOrders(1), search ? 350 : 0);
    return () => {
      if (searchRef.current) clearTimeout(searchRef.current);
    };
  }, [search, statusFilter, paymentFilter, dateRange, sortBy, hasAccess, fetchOrders]);

  // Bulk status update
  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    try {
      setIsBulkUpdating(true);
      const promises = Array.from(selectedIds).map((id) =>
        fetch(`/api/admin/orders/${id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
      );
      await Promise.all(promises);
      pushToast({
        tone: 'success',
        description: `Updated ${selectedIds.size} orders to ${newStatus}`,
      });
      setSelectedIds(new Set());
      fetchOrders(pagination.page, true);
    } catch {
      pushToast({ tone: 'danger', description: 'Failed to update orders' });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Single status update from drawer
  const handleSingleStatusUpdate = async (id: string, newStatus: string, tracking?: string) => {
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, tracking }),
    });
    if (!res.ok) throw new Error('Status update failed');
    pushToast({ tone: 'success', description: `Order #${id} updated to ${newStatus}` });
    fetchOrders(pagination.page, true);
  };

  // Single note update from drawer
  const handleNoteUpdate = async (id: string, note: string) => {
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminNote: note }),
    });
    if (!res.ok) throw new Error('Failed to update note');
    pushToast({ tone: 'success', description: 'Internal memo saved' });
    fetchOrders(pagination.page, true);
  };

  // Toggle select item
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle select all
  const handleToggleSelectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    }
  };

  if (!hasAccess) {
    return (
      <div className="p-8 text-center text-slate-400">
        <AlertCircle className="w-8 h-8 mx-auto text-rose-500 mb-2" />
        <p>You do not have permission to view orders.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Order Management & Dispatch
          </h1>
          <p className="text-xs text-slate-400">
            Real-time multi-courier logistics, thermal packing slips and tracking
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/orders/returns"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Returns & Claims</span>
          </Link>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchOrders(pagination.page, true)}
            disabled={refreshing}
            className="h-8 text-xs border-slate-700 bg-slate-900 text-slate-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Link
            href="/admin/orders/new"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Order</span>
          </Link>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <OrderStatsHeader
        stats={stats}
        activeFilter={statusFilter}
        onFilterChange={(st) => setStatusFilter(st)}
      />

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID, customer, phone..."
            className="w-full h-9 pl-9 pr-4 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-rose-500"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
              <option key={k} value={k}>
                {cfg.label}
              </option>
            ))}
          </select>

          {/* Payment Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="h-9 px-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-rose-500"
          >
            <option value="">All Payments</option>
            <option value="paid">Paid</option>
            <option value="pending">COD Pending</option>
            <option value="refunded">Refunded</option>
          </select>

          {/* Reset Filters */}
          {(search || statusFilter || paymentFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setPaymentFilter('');
              }}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={orders.length > 0 && selectedIds.size === orders.length}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-700 bg-slate-950 text-rose-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="p-3">Order ID / Date</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Items Summary</th>
                <th className="p-3">Status</th>
                <th className="p-3">Total / Payment</th>
                <th className="p-3">Courier Logistics</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400 text-xs">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-rose-500 mb-2" />
                    <span>Loading verified order records...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500 text-xs">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <OrderTableRow
                    key={order.id}
                    order={order}
                    isSelected={selectedIds.has(order.id)}
                    onToggleSelect={handleToggleSelect}
                    onSelectOrder={(ord) => setSelectedOrder(ord)}
                    onOpenReceipt={(ord) => setReceiptOrder(ord)}
                    onOpenDispatch={(ord) => setDispatchOrder(ord)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Standardized Pagination Bar */}
        <AdminPaginationBar
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          pages={pagination.pages}
          onPageChange={(p) => fetchOrders(p)}
          onLimitChange={(l) => {
            setPagination((prev) => ({ ...prev, limit: l }));
            fetchOrders(1);
          }}
        />
      </div>

      {/* Floating Bulk Action Bar */}
      <AdminBulkActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        isUpdating={isBulkUpdating}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        onBulkDispatch={() => setIsBulkDispatchOpen(true)}
        onBulkPrint={() => {
          if (orders.length > 0) {
            setReceiptOrder(orders.find((o) => selectedIds.has(o.id)) || orders[0]);
          }
        }}
      />

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdate={handleSingleStatusUpdate}
          onNoteUpdate={handleNoteUpdate}
          onOpenReceipt={(ord) => setReceiptOrder(ord)}
        />
      )}

      {/* Thermal Packing Slip Modal */}
      <ThermalReceiptModal
        order={receiptOrder}
        isOpen={Boolean(receiptOrder)}
        onClose={() => setReceiptOrder(null)}
      />

      {/* Single Order Courier Dispatch Drawer */}
      <CourierDispatchDrawer
        order={dispatchOrder as any}
        isOpen={Boolean(dispatchOrder)}
        onClose={() => setDispatchOrder(null)}
        onDispatched={() => {
          setDispatchOrder(null);
          fetchOrders(pagination.page, true);
        }}
      />

      {/* Bulk Dispatch Modal */}
      <CourierBulkDispatchModal
        isOpen={isBulkDispatchOpen}
        selectedIds={selectedIds}
        onClose={() => setIsBulkDispatchOpen(false)}
        onComplete={(res: BulkDispatchResult) => {
          setIsBulkDispatchOpen(false);
          setSelectedIds(new Set());
          fetchOrders(pagination.page, true);
          pushToast({
            tone: 'success',
            description: `Bulk dispatch completed: ${res.dispatched} dispatched, ${res.skipped} skipped`,
          });
        }}
      />
    </div>
  );
}
