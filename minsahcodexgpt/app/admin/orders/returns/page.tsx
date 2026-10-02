'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';

// Atomic Components
import { ReturnReasonBadge } from '@/components/admin/returns/ReturnReasonBadge';
import { ReturnStatusStepper, ReturnStatus } from '@/components/admin/returns/ReturnStatusStepper';
import { ReturnEvidenceGallery } from '@/components/admin/returns/ReturnEvidenceGallery';
import { RestockInventoryToggle } from '@/components/admin/returns/RestockInventoryToggle';
import { RefundActionModal, RefundData } from '@/components/admin/returns/RefundActionModal';
import { CustomerContactCard } from '@/components/admin/customer/CustomerContactCard';
import { CurrencyDisplay } from '@/components/admin/finance/CurrencyDisplay';
import { PaymentMethodBadge } from '@/components/admin/finance/PaymentMethodBadge';

import {
  ArrowLeft,
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Package,
} from 'lucide-react';

export interface ReturnRequest {
  id: string;
  dbId?: string;
  orderId: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  reason: string;
  status: ReturnStatus;
  refundAmount: number;
  requestDate: string;
  updatedAt: string;
  images?: string[];
  notes?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  paidAt?: string;
  orderCreatedAt?: string;
}

export interface ReturnStats {
  total: number;
  pending: number;
  approved: number;
  totalRefundAmount: number;
}

export default function ReturnsPage() {
  const { hasPermission } = useAdminAuth();
  const { pushToast } = useToast();

  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [stats, setStats] = useState<ReturnStats>({
    total: 0,
    pending: 0,
    approved: 0,
    totalRefundAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected for drawer
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [detailStatus, setDetailStatus] = useState<ReturnStatus>('pending');
  const [detailNote, setDetailNote] = useState('');
  const [shouldRestock, setShouldRestock] = useState(true);
  const [destinationWarehouse, setDestinationWarehouse] = useState('main');
  const [savingDetail, setSavingDetail] = useState(false);

  // Refund Modal
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: async () => {},
  });

  const hasAccess = hasPermission(PERMISSIONS.ORDERS_REFUND);

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/orders/returns?${params.toString()}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setReturns(data.returns || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching returns:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (hasAccess) fetchReturns();
  }, [fetchReturns, hasAccess]);

  const updateReturnStatus = async (
    returnId: string,
    status: ReturnStatus,
    note?: string
  ) => {
    try {
      setSavingDetail(true);
      const res = await fetch(`/api/admin/orders/returns/${returnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status,
          notes: note,
          restockInventory: shouldRestock,
          destinationWarehouse,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update return status');
      }

      pushToast({ tone: 'success', description: `Return ${status.toUpperCase()} successfully!` });
      setSelectedReturn(null);
      fetchReturns();
    } catch (err: any) {
      pushToast({ tone: 'danger', description: err.message || 'Update failed' });
    } finally {
      setSavingDetail(false);
    }
  };

  const handleProcessRefund = async (refund: RefundData) => {
    if (!selectedReturn) return;
    const res = await fetch(`/api/admin/orders/returns/${selectedReturn.id}/refund`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(refund),
    });
    if (!res.ok) throw new Error('Failed to process refund');
    pushToast({
      tone: 'success',
      description: `Refund of ৳${refund.amount} disbursed via ${refund.method.toUpperCase()}`,
    });
    setSelectedReturn(null);
    fetchReturns();
  };

  if (!hasAccess) {
    return (
      <div className="p-8 text-center text-slate-400">
        <AlertTriangle className="w-8 h-8 mx-auto text-rose-500 mb-2" />
        <p>You do not have permission to manage return claims.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Returns & Reverse Logistics
            </h1>
            <p className="text-xs text-slate-400">
              Manage product returns, defective inspection claims and refund disbursements
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchReturns}
          disabled={loading}
          className="h-8 text-xs border-slate-700 bg-slate-900 text-slate-300"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900/60">
          <span className="text-xs text-slate-400">Total Claims</span>
          <div className="text-xl font-extrabold text-white mt-1">{stats.total}</div>
        </div>
        <div className="p-3.5 rounded-2xl border border-amber-500/20 bg-amber-950/20">
          <span className="text-xs text-amber-400 font-medium">Pending Review</span>
          <div className="text-xl font-extrabold text-amber-300 mt-1">{stats.pending}</div>
        </div>
        <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-950/20">
          <span className="text-xs text-emerald-400 font-medium">Approved / In Transit</span>
          <div className="text-xl font-extrabold text-emerald-300 mt-1">{stats.approved}</div>
        </div>
        <div className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900/60">
          <span className="text-xs text-slate-400">Total Refunded</span>
          <div className="mt-1">
            <CurrencyDisplay amount={stats.totalRefundAmount} size="lg" className="font-extrabold text-rose-400" />
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search return by order ID, customer..."
            className="w-full h-9 pl-9 pr-4 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'pending', 'approved', 'processing', 'completed', 'rejected'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Returns Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="p-3">Order ID / Date</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Returned Product</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Status</th>
                <th className="p-3">Refund Amount</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-rose-500 mb-2" />
                    <span>Loading return claims...</span>
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    No return claims match your filter.
                  </td>
                </tr>
              ) : (
                returns.map((ret) => (
                  <tr
                    key={ret.id}
                    onClick={() => {
                      setSelectedReturn(ret);
                      setDetailStatus(ret.status);
                      setDetailNote(ret.notes || '');
                    }}
                    className="hover:bg-slate-900/60 transition-colors cursor-pointer"
                  >
                    <td className="p-3">
                      <span className="font-mono font-bold text-white block">#{ret.orderId}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(ret.requestDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-200 block truncate">{ret.customer?.name}</span>
                      <span className="text-[11px] text-slate-400">{ret.customer?.phone || ret.customer?.email}</span>
                    </td>
                    <td className="p-3 max-w-[200px]">
                      <span className="font-medium text-slate-300 block truncate">
                        {ret.items?.map((i) => `${i.quantity}x ${i.name}`).join(', ') || 'Item details'}
                      </span>
                    </td>
                    <td className="p-3">
                      <ReturnReasonBadge reason={ret.reason} size="sm" />
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                          ret.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : ret.status === 'approved'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : ret.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {ret.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <CurrencyDisplay amount={ret.refundAmount} size="sm" className="font-bold text-white" />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReturn(ret);
                          setDetailStatus(ret.status);
                          setDetailNote(ret.notes || '');
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Inspection Drawer */}
      <Drawer
        open={Boolean(selectedReturn)}
        onClose={() => setSelectedReturn(null)}
        title={`Return Claim #${selectedReturn?.id || ''}`}
        size="lg"
      >
        {selectedReturn && (
          <div className="p-5 space-y-5 text-xs">
            {/* Status Stepper */}
            <ReturnStatusStepper currentStatus={selectedReturn.status} />

            {/* Customer Details */}
            <CustomerContactCard
              name={selectedReturn.customer.name}
              phone={selectedReturn.customer.phone || '—'}
              email={selectedReturn.customer.email}
            />

            {/* Reason & Refund Target */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Claim Reason:</span>
                <ReturnReasonBadge reason={selectedReturn.reason} />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400">Claimed Refund Amount:</span>
                <CurrencyDisplay amount={selectedReturn.refundAmount} size="md" className="font-bold text-rose-400" />
              </div>
            </div>

            {/* Evidence Photo Gallery */}
            <ReturnEvidenceGallery images={selectedReturn.images} />

            {/* Restock Toggle */}
            <RestockInventoryToggle
              shouldRestock={shouldRestock}
              onToggle={setShouldRestock}
              destinationWarehouse={destinationWarehouse}
              onWarehouseChange={setDestinationWarehouse}
            />

            {/* Staff Notes */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                Internal Review / Rejection Notes
              </label>
              <textarea
                rows={2}
                value={detailNote}
                onChange={(e) => setDetailNote(e.target.value)}
                placeholder="Staff inspection remarks..."
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  updateReturnStatus(selectedReturn.id, 'rejected', detailNote)
                }
                className="text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Reject Claim
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsRefundModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Disburse Refund
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    updateReturnStatus(selectedReturn.id, 'approved', detailNote)
                  }
                  disabled={savingDetail}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  Approve Claim
                </Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Refund Disbursement Modal */}
      {selectedReturn && (
        <RefundActionModal
          isOpen={isRefundModalOpen}
          orderId={selectedReturn.orderId}
          customerName={selectedReturn.customer.name}
          maxRefundAmount={selectedReturn.refundAmount}
          onClose={() => setIsRefundModalOpen(false)}
          onProcessRefund={handleProcessRefund}
        />
      )}
    </div>
  );
}
