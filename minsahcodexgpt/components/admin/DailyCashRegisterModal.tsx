'use client';

// components/admin/DailyCashRegisterModal.tsx
// Pillar 10 & Refinement 1: Courier COD Pending Receivables vs In-Hand Cash Reconciliation

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DollarSign, CheckCircle2, AlertTriangle, Lock, RefreshCw, Calculator, Landmark, ArrowRight, ShieldCheck } from 'lucide-react';

interface DailyCashRegisterModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface RegisterData {
  date: string;
  isClosed: boolean;
  status: string;
  openingCash: number;
  codCollected: number;
  inOfficeCodCash?: number;
  courierDeliveredCod?: number;
  courierPendingReceivables?: number;
  courierSettledBank?: number;
  runnerExpenses: number;
  officeExpenses: number;
  expectedCash: number;
  actualCashCounted: number;
  discrepancy: number;
  notes?: string | null;
  deliveredCodOrdersCount: number;
  inOfficeOrdersCount?: number;
  courierOrdersCount?: number;
  runnerTripsCount: number;
}

export default function DailyCashRegisterModal({
  open,
  onClose,
  onSuccess,
}: DailyCashRegisterModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<RegisterData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [openingCashInput, setOpeningCashInput] = useState<number>(0);
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [officeExpensesInput, setOfficeExpensesInput] = useState<number>(0);
  const [notesInput, setNotesInput] = useState<string>('');

  // Courier Bank Payout Settlement state
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [bankReference, setBankReference] = useState<string>('');
  const [settlingPayout, setSettlingPayout] = useState(false);

  const fetchRegister = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/cash-register', { credentials: 'include' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch cash register data');
      }

      const reg = json.data as RegisterData;
      setData(reg);
      setOpeningCashInput(reg.openingCash);
      setActualCashInput(reg.actualCashCounted ? String(reg.actualCashCounted) : '');
      setOfficeExpensesInput(reg.officeExpenses);
      setNotesInput(reg.notes || '');
    } catch (err: any) {
      setError(err?.message || 'Error loading register');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSuccessMsg(null);
      fetchRegister();
    }
  }, [open]);

  // In-Office cash calculation vs Courier Receivables
  const inOfficeCash = data?.inOfficeCodCash ?? (data ? data.codCollected : 0);
  const parsedActualCash = actualCashInput !== '' ? parseFloat(actualCashInput) || 0 : 0;
  
  // Real expected physical drawer cash: Float + InOfficeCOD - RunnerExpenses - OfficeExpenses
  const currentExpected = data
    ? Number((openingCashInput + inOfficeCash - data.runnerExpenses - officeExpensesInput).toFixed(2))
    : 0;
  const currentDiscrepancy = Number((parsedActualCash - currentExpected).toFixed(2));
  const isZeroDiscrepancy = Math.abs(currentDiscrepancy) < 0.01;

  const handleCloseRegister = async () => {
    if (actualCashInput === '') {
      setError('Please count and enter the actual physical cash in the drawer.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch('/api/admin/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          openingCash: openingCashInput,
          actualCashCounted: parsedActualCash,
          officeExpenses: officeExpensesInput,
          notes: notesInput,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to close register');
      }

      setSuccessMsg(json.message);
      await fetchRegister();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Error submitting register closing');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettleCourierPayout = async () => {
    const amt = parseFloat(payoutAmount);
    if (!amt || amt <= 0) {
      setError('Please enter a valid payout amount');
      return;
    }

    try {
      setSettlingPayout(true);
      setError(null);
      const res = await fetch('/api/admin/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'SETTLE_COURIER_PAYOUT',
          amount: amt,
          bankReference: bankReference || 'Courier Bank Transfer',
          notes: `Settled ৳${amt} from Steadfast/Pathao courier receivables into bank.`,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to settle courier payout');
      }

      setSuccessMsg(json.message);
      setShowPayoutModal(false);
      setPayoutAmount('');
      setBankReference('');
      await fetchRegister();
    } catch (err: any) {
      setError(err?.message || 'Error settling courier payout');
    } finally {
      setSettlingPayout(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="admin"
      size="lg"
      title={
        <div className="flex items-center gap-2 text-white">
          <Calculator className="w-5 h-5 text-emerald-400" />
          <span>Day-End Cash Register & Courier Reconciliation</span>
          {data?.isClosed && (
            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Lock className="w-3 h-3" /> CLOSED & LOCKED
            </span>
          )}
        </div>
      }
      description="Reconcile physical in-drawer cash vs Steadfast/Pathao locked receivables with 1-click bank settlement."
    >
      <div className="space-y-4 text-sm text-[#8a8f98]">
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-2 text-[#8a8f98]">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            <p>Loading real-time drawer & courier ledger...</p>
          </div>
        ) : error ? (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-md text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            {/* Refinement 1: Dual Fund Partition — Physical Drawer Cash vs Courier Locked Receivables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Box A: Physical In-Drawer Cash */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <DollarSign className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-semibold text-white uppercase tracking-wider">Physical Drawer Cash</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                    In Office Hand
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="text-xs text-[#8a8f98] block">Direct In-Office Inflow</span>
                    <span className="text-xl font-bold text-white tracking-tight">৳{inOfficeCash.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-emerald-400 block">+{data.inOfficeOrdersCount ?? 0} Walk-in/Office Orders</span>
                    <span className="text-[10px] text-gray-500">Subject to physical drawer audit</span>
                  </div>
                </div>
              </div>

              {/* Box B: Courier Locked Receivables (Steadfast / Pathao) */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                      <Landmark className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-semibold text-white uppercase tracking-wider">Courier Receivables</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30">
                    Steadfast & Pathao
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="text-xs text-[#8a8f98] block">Pending Bank Transfer</span>
                    <span className="text-xl font-bold text-indigo-300 tracking-tight">
                      ৳{(data.courierPendingReceivables ?? (data.codCollected - inOfficeCash)).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setPayoutAmount(String(data.courierPendingReceivables ?? 0));
                        setShowPayoutModal(true);
                      }}
                      className="text-[11px] h-7 px-2.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border-indigo-500/40"
                    >
                      <Landmark className="w-3 h-3 mr-1" /> Settle Bank Payout
                    </Button>
                    <span className="text-[10px] text-gray-500 block mt-1">Settled: ৳{(data.courierSettledBank ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Courier Payout Settlement Sub-Modal */}
            {showPayoutModal && (
              <div className="p-3.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-200">
                  <span className="flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-indigo-400" /> Settle Courier Bank Transfer
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPayoutModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[11px] text-gray-400">
                  Record Steadfast or Pathao disbursement deposited directly into company bank account.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-300 block mb-1">Disbursed Amount (৳)</label>
                    <input
                      type="number"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      placeholder="e.g. 15000"
                      className="w-full h-8 px-2.5 rounded bg-[#0e1017] border border-[#232636] text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-300 block mb-1">Bank Statement / Ref No.</label>
                    <input
                      type="text"
                      value={bankReference}
                      onChange={(e) => setBankReference(e.target.value)}
                      placeholder="e.g. City Bank #TRX-94821"
                      className="w-full h-8 px-2.5 rounded bg-[#0e1017] border border-[#232636] text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowPayoutModal(false)}
                    className="text-xs h-7 text-gray-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSettleCourierPayout}
                    disabled={settlingPayout}
                    className="text-xs h-7 bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                  >
                    {settlingPayout ? 'Settling...' : 'Confirm Bank Deposit'}
                  </Button>
                </div>
              </div>
            )}

            {/* Live Ledger Breakdown Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-lg bg-white/[0.03] border border-[#232636]">
                <span className="text-[11px] text-[#8a8f98] uppercase tracking-wider block">Opening Float</span>
                <span className="text-base font-semibold text-white mt-1 block">৳{openingCashInput.toLocaleString()}</span>
                <span className="text-[10px] text-gray-500">Day start float</span>
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[11px] text-emerald-400 uppercase tracking-wider block">(+) Office Cash</span>
                <span className="text-base font-semibold text-emerald-300 mt-1 block">৳{inOfficeCash.toLocaleString()}</span>
                <span className="text-[10px] text-emerald-400/70">{data.inOfficeOrdersCount ?? 0} direct orders</span>
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-[11px] text-amber-400 uppercase tracking-wider block">(-) Runner Spent</span>
                <span className="text-base font-semibold text-amber-300 mt-1 block">৳{data.runnerExpenses.toLocaleString()}</span>
                <span className="text-[10px] text-amber-400/70">{data.runnerTripsCount} procurement trips</span>
              </div>

              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <span className="text-[11px] text-rose-400 uppercase tracking-wider block">(-) Office Spent</span>
                <span className="text-base font-semibold text-rose-300 mt-1 block">৳{officeExpensesInput.toLocaleString()}</span>
                <span className="text-[10px] text-rose-400/70">Petty cash</span>
              </div>
            </div>

            {/* Expected Math Formula Banner */}
            <div className="p-3 rounded-lg bg-[#141824] border border-[#2e344a] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="text-xs text-[#8a8f98] font-mono block">
                  Drawer Formula: ৳{openingCashInput} (Float) + ৳{inOfficeCash} (Office Cash) - ৳{data.runnerExpenses} - ৳{officeExpensesInput}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-medium text-gray-300">Expected Physical Drawer Cash:</span>
                  <span className="text-lg font-bold text-white tracking-tight">৳{currentExpected.toLocaleString()}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-[#8a8f98] block">Discrepancy</span>
                <span
                  className={`text-base font-bold ${
                    isZeroDiscrepancy
                      ? 'text-emerald-400'
                      : currentDiscrepancy > 0
                        ? 'text-blue-400'
                        : 'text-rose-400'
                  }`}
                >
                  {currentDiscrepancy > 0 ? `+৳${currentDiscrepancy}` : `৳${currentDiscrepancy}`}
                  {isZeroDiscrepancy && ' (Zero Math Error)'}
                </span>
              </div>
            </div>

            {/* Input Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Opening Cash (Float)</label>
                <input
                  type="number"
                  value={openingCashInput}
                  onChange={(e) => setOpeningCashInput(Number(e.target.value) || 0)}
                  disabled={data.isClosed}
                  className="w-full h-9 px-3 rounded-md bg-[#0e1017] border border-[#232636] text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Office Petty Cash Expenses</label>
                <input
                  type="number"
                  value={officeExpensesInput}
                  onChange={(e) => setOfficeExpensesInput(Number(e.target.value) || 0)}
                  disabled={data.isClosed}
                  className="w-full h-9 px-3 rounded-md bg-[#0e1017] border border-[#232636] text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-emerald-400 mb-1">Actual Physical Cash Counted *</label>
                <input
                  type="number"
                  value={actualCashInput}
                  onChange={(e) => setActualCashInput(e.target.value)}
                  disabled={data.isClosed}
                  className="w-full h-9 px-3 rounded-md bg-[#0e1017] border border-emerald-500/50 text-emerald-300 font-bold text-sm focus:outline-none focus:border-emerald-400 disabled:opacity-50"
                  placeholder="Count drawer cash..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Admin Audit Notes</label>
              <textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                disabled={data.isClosed}
                rows={2}
                className="w-full px-3 py-1.5 rounded-md bg-[#0e1017] border border-[#232636] text-white text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                placeholder="e.g. Verified by Accountant, ৳50 discrepancy due to petty courier tip"
              />
            </div>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="pt-3 border-t border-[#232636] flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-xs text-[#8a8f98] hover:text-white"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={fetchRegister}
              disabled={loading || submitting}
              className="text-xs border-[#232636] text-gray-300 hover:bg-white/[0.04]"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Recalculate
            </Button>

            <Button
              type="button"
              onClick={handleCloseRegister}
              disabled={loading || submitting || (data?.isClosed ?? false)}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4"
            >
              {submitting ? (
                'Closing & Locking...'
              ) : data?.isClosed ? (
                <>
                  <Lock className="w-3.5 h-3.5 mr-1.5" /> Drawer Locked
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Sign-off & Close Drawer
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
