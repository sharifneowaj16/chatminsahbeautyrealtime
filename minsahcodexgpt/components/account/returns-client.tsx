'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RotateCcw, Search, ChevronRight, Package, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { formatPrice } from '@/utils/currency';

interface ReturnItem {
  name: string;
  quantity: number;
  price: number;
}

interface ReturnRecord {
  returnId: string;
  id: string;
  orderId: string;
  orderNumber: string;
  status: string;
  reason: string;
  refundAmount: number;
  requestDate: string | Date;
  updatedAt: string | Date;
  images: string[];
  items: ReturnItem[];
}

interface ReturnsClientProps {
  returns: ReturnRecord[];
}

export function ReturnsClient({ returns: initialReturns }: ReturnsClientProps) {
  const router = useRouter();
  const { requestConfirmation } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [cancelingReturnId, setCancelingReturnId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredReturns = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return initialReturns.filter((returnRequest) => {
      const matchesSearch =
        !normalizedSearchTerm ||
        returnRequest.id.toLowerCase().includes(normalizedSearchTerm) ||
        returnRequest.orderNumber.toLowerCase().includes(normalizedSearchTerm) ||
        returnRequest.reason.toLowerCase().includes(normalizedSearchTerm);

      const matchesStatus =
        statusFilter === 'all' || returnRequest.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [initialReturns, searchTerm, statusFilter]);

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; border: string }> = {
      approved: { bg: 'bg-[#5e6ad2]/15', text: 'text-[#828fff]', border: 'border-[#5e6ad2]/30' },
      processing: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
      completed: { bg: 'bg-[#27a644]/15', text: 'text-[#27a644]', border: 'border-[#27a644]/30' },
      rejected: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
    };
    const s = map[status] ?? { bg: 'bg-[#18191a]', text: 'text-[#8a8f98]', border: 'border-[#23252a]' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border ${s.bg} ${s.text} ${s.border}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const handleCancelReturn = async (returnRequest: ReturnRecord) => {
    const confirmed = await requestConfirmation({
      title: 'Cancel this return request?',
      description: `Cancel return request ${returnRequest.id}? You can submit a new request later if needed.`,
      confirmLabel: 'Cancel request',
      cancelLabel: 'Keep request',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    setFeedbackMessage('');
    setErrorMessage('');
    setCancelingReturnId(returnRequest.returnId);

    try {
      const response = await fetch(`/api/returns/${returnRequest.returnId}`, {
        method: 'DELETE',
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel return request');
      }

      setFeedbackMessage(`Return request ${returnRequest.id} was successfully cancelled.`);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to cancel return request'
      );
    } finally {
      setCancelingReturnId(null);
    }
  };

  return (
    <div className="w-full space-y-5 overflow-x-hidden">
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#f7f8f8]">
            Returns & Exchanges
          </h1>
          <p className="text-xs text-[#8a8f98] mt-0.5">
            Track return authorizations, doorstep pickup status, and refund disbursements
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#8a8f98] font-mono">
          <span className="w-2 h-2 rounded-full bg-[#5e6ad2] animate-pulse" />
          <span>{filteredReturns.length} {filteredReturns.length === 1 ? 'Request' : 'Requests'}</span>
        </div>
      </div>

      {feedbackMessage && (
        <div className="rounded-xl border border-[#27a644]/30 bg-[#27a644]/10 px-4 py-3 text-xs text-[#27a644]">
          {feedbackMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* ── Search & Filter Controls ──────────────────────────────────────────── */}
      <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-3 sm:p-4 flex flex-col sm:flex-row gap-2.5 shadow-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8a8f98] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by return ID, order # or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-[#141516] border border-[#23252a] rounded-xl text-xs sm:text-sm text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2] transition-colors"
          />
        </div>
        <div className="sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-11 px-3 bg-[#141516] border border-[#23252a] rounded-xl text-xs sm:text-sm text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2] transition-colors cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* ── Returns Listing ───────────────────────────────────────────────────── */}
      {filteredReturns.length === 0 ? (
        <div className="bg-[#0f1011] rounded-2xl border border-dashed border-[#23252a] p-10 text-center shadow-xl">
          <RotateCcw className="w-12 h-12 text-[#62666d] mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-[#f7f8f8] mb-1">No return requests found</h2>
          <p className="text-xs text-[#8a8f98] mb-4">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search criteria or filter options'
              : 'When you initiate a doorstep replacement or refund, it will display here.'}
          </p>
          <Link
            href="/account/orders"
            className="w-full sm:w-auto inline-flex items-center justify-center h-11 px-6 bg-[#5e6ad2] hover:bg-[#828fff] text-white rounded-xl text-xs font-semibold tracking-wide transition-all shadow-md active:scale-95"
          >
            Go to Orders
          </Link>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredReturns.map((returnRequest) => (
            <div
              key={returnRequest.id}
              className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-4 sm:p-5 shadow-xl transition-all hover:border-[#5e6ad2]/50"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#23252a]">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xs sm:text-sm font-semibold text-[#f7f8f8] font-mono">
                      {returnRequest.id}
                    </h2>
                    {getStatusBadge(returnRequest.status)}
                  </div>
                  <p className="mt-0.5 text-xs text-[#8a8f98]">
                    Order #{returnRequest.orderNumber} • Requested on{' '}
                    <span className="font-mono">
                      {mounted ? new Date(returnRequest.requestDate).toLocaleDateString() : '---'}
                    </span>
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8a8f98]">
                    Estimated Refund
                  </p>
                  <p className="text-sm sm:text-base font-bold text-[#27a644] font-mono">
                    {formatPrice(returnRequest.refundAmount)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[2fr,1fr]">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8a8f98] mb-1">
                    Return Reason
                  </h3>
                  <p className="text-xs text-[#f7f8f8] bg-[#141516] p-3 rounded-xl border border-[#23252a] leading-relaxed">
                    {returnRequest.reason}
                  </p>

                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8a8f98] mt-3.5 mb-2">
                    Returned Items
                  </h3>
                  <div className="space-y-2">
                    {returnRequest.items.map((item) => (
                      <div
                        key={`${returnRequest.id}-${item.name}-${item.quantity}`}
                        className="flex items-center justify-between rounded-xl bg-[#141516] border border-[#23252a] px-3.5 py-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#18191a] text-[#828fff] border border-[#23252a]">
                            <Package className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 truncate">
                            <p className="font-medium text-[#f7f8f8] truncate">{item.name}</p>
                            <p className="text-[11px] text-[#8a8f98] font-mono">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <p className="font-semibold text-[#f7f8f8] font-mono shrink-0 ml-2">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-[#23252a] bg-[#141516] p-3.5 flex flex-col justify-between gap-3">
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8a8f98]">
                      Actions
                    </h3>
                    <Link
                      href={`/account/orders/${returnRequest.orderId}/return`}
                      className="w-full inline-flex items-center justify-between h-10 px-3 bg-[#18191a] hover:bg-[#23252a] border border-[#23252a] rounded-xl text-xs font-medium text-[#f7f8f8] transition-all"
                    >
                      <span>Return Status Flow</span>
                      <ChevronRight className="h-3.5 w-3.5 text-[#8a8f98]" />
                    </Link>
                    <Link
                      href={`/account/orders/${returnRequest.orderId}`}
                      className="w-full inline-flex items-center justify-between h-10 px-3 bg-[#18191a] hover:bg-[#23252a] border border-[#23252a] rounded-xl text-xs font-medium text-[#f7f8f8] transition-all"
                    >
                      <span>Original Order Details</span>
                      <ChevronRight className="h-3.5 w-3.5 text-[#8a8f98]" />
                    </Link>
                    {returnRequest.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleCancelReturn(returnRequest)}
                        disabled={cancelingReturnId === returnRequest.returnId}
                        className="w-full inline-flex items-center justify-center h-10 px-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold transition-all gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {cancelingReturnId === returnRequest.returnId && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        )}
                        <span>Cancel Request</span>
                      </button>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#23252a] text-[11px] text-[#8a8f98]">
                    <span>Last Updated: </span>
                    <span className="font-mono text-[#f7f8f8]">
                      {mounted ? new Date(returnRequest.updatedAt).toLocaleDateString() : '---'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
