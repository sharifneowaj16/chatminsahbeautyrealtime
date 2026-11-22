'use client';

// components/admin/OrderFraudAndReturnPanel.tsx
// Pillar 4, 6, 7 & Refinements 5, 7: Courier Return Risk, Vendor Defect Queue & Exchange Price Gap Reconciler

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  CheckCircle2,
  PackageCheck,
  PackageX,
  Repeat,
  Factory,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface OrderItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  itemStatus?: string;
  returnReason?: string | null;
}

interface OrderFraudAndReturnPanelProps {
  orderId: string;
  orderNumber: string;
  customerPhone: string;
  initialFraudScore?: number | null;
  initialFraudLevel?: string | null;
  initialFraudDetails?: any;
  items: OrderItem[];
  onItemUpdated?: () => void;
}

export default function OrderFraudAndReturnPanel({
  orderId,
  orderNumber,
  customerPhone,
  initialFraudScore,
  initialFraudLevel,
  initialFraudDetails,
  items,
  onItemUpdated,
}: OrderFraudAndReturnPanelProps) {
  // Fraud state
  const [fraudScore, setFraudScore] = useState<number | null>(initialFraudScore ?? null);
  const [fraudLevel, setFraudLevel] = useState<string | null>(initialFraudLevel ?? null);
  const [fraudDetails, setFraudDetails] = useState<any>(initialFraudDetails ?? null);
  const [checkingFraud, setCheckingFraud] = useState<boolean>(false);
  const [fraudError, setFraudError] = useState<string | null>(null);

  useEffect(() => {
    setFraudScore(initialFraudScore ?? null);
    setFraudLevel(initialFraudLevel ?? null);
    setFraudDetails(initialFraudDetails ?? null);
    setFraudError(null);
  }, [orderId, initialFraudScore, initialFraudLevel, initialFraudDetails]);

  // Item inspection state
  const [inspectingItemId, setInspectingItemId] = useState<string | null>(null);
  const [inspectReason, setInspectReason] = useState<string>('');
  const [inspecting, setInspecting] = useState<boolean>(false);
  const [inspectResultMsg, setInspectResultMsg] = useState<string | null>(null);

  // Refinement 5: Exchange Price Gap state
  const [exchangingItemId, setExchangingItemId] = useState<string | null>(null);
  const [exchangeProductId, setExchangeProductId] = useState<string>('');
  const [replacementPrice, setReplacementPrice] = useState<string>('');
  const [exchangeQty, setExchangeQty] = useState<number>(1);
  const [exchanging, setExchanging] = useState<boolean>(false);

  const handleCheckFraud = async (forceRefresh = false) => {
    if (!customerPhone) return;
    try {
      setCheckingFraud(true);
      setFraudError(null);
      const params = new URLSearchParams({
        phone: customerPhone,
        orderId,
      });
      if (forceRefresh) params.set("refresh", "true");
      const res = await fetch(`/api/admin/orders/fraud-check?${params.toString()}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Courier verification failed");
      }

      setFraudScore(json.data.fraudRiskScore ?? null);
      setFraudLevel(json.data.fraudRiskLevel ?? null);
      setFraudDetails(json.data.fraudRiskDetails ?? json.data.details ?? null);
    } catch (err: any) {
      setFraudError(err?.message || "Could not verify courier history");
    } finally {
      setCheckingFraud(false);
    }
  };

  // Refinement 7: Supports GOOD, DAMAGED, EXPIRED, VENDOR_DEFECT
  const handleInspectSubmit = async (itemId: string, condition: 'GOOD' | 'DAMAGED' | 'EXPIRED' | 'VENDOR_DEFECT') => {
    try {
      setInspecting(true);
      setInspectResultMsg(null);
      const res = await fetch('/api/admin/orders/returns/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId,
          orderItemId: itemId,
          condition,
          returnReason: inspectReason || `Return inspected as ${condition}`,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Inspection failed');
      }

      setInspectResultMsg(json.message);
      setInspectingItemId(null);
      setInspectReason('');
      if (onItemUpdated) onItemUpdated();
    } catch (err: any) {
      setInspectResultMsg(`Error: ${err?.message}`);
    } finally {
      setInspecting(false);
    }
  };

  // Refinement 5: Handle Item Exchange with Price Gap Reconciler
  const handleExchangeSubmit = async (item: OrderItem) => {
    if (!exchangeProductId) {
      setInspectResultMsg('Please enter or select a replacement product ID');
      return;
    }

    try {
      setExchanging(true);
      setInspectResultMsg(null);

      const res = await fetch(`/api/admin/orders/${orderId}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          itemId: item.id,
          itemStatus: 'EXCHANGED',
          exchangeProductId,
          exchangeQty,
          returnReason: inspectReason || `Exchanged for replacement product`,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Exchange failed');
      }

      const diff = json.data?.exchangePriceDifference ?? 0;
      setInspectResultMsg(
        `✓ Exchange Complete: ${item.name} replaced. Price gap: ${diff >= 0 ? '+' : ''}৳${diff}. Order total updated to ৳${json.data?.newOrderTotal}.`
      );
      setExchangingItemId(null);
      setExchangeProductId('');
      setReplacementPrice('');
      if (onItemUpdated) onItemUpdated();
    } catch (err: any) {
      setInspectResultMsg(`Error: ${err?.message}`);
    } finally {
      setExchanging(false);
    }
  };

  const sf = fraudDetails?.steadfast ?? null;
  const pathao = fraudDetails?.pathao ?? null;
  const sp = fraudDetails?.smartposbd ?? null;
  const storeHist = fraudDetails?.storeHistory ?? (
    typeof fraudDetails?.totalOrders === "number"
      ? {
          totalOrders: fraudDetails.totalOrders,
          deliveredCount: fraudDetails.deliveredCount ?? 0,
          cancelledCount: fraudDetails.cancelledCount ?? 0,
          returnedCount: fraudDetails.returnedCount ?? 0,
          pendingCount: 0,
          successRate: fraudDetails.successRate ?? null,
        }
      : null
  );
  const hasStructuredData = Boolean(sf || pathao || storeHist || fraudLevel);

  const statusText = (st?: string | null) => {
    switch (st) {
      case "timeout": return "Timeout";
      case "circuit_open": return "Paused (Auth/Rate limit)";
      case "unconfigured": return "Not configured";
      case "invalid_phone": return "Invalid BD phone";
      default: return "Unavailable";
    }
  };

  const checkedAtLabel = fraudDetails?.checkedAt
    ? new Date(fraudDetails.checkedAt).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="space-y-3 font-sans">
      {/* Pillar 6: Courier Delivery History (Raw Steadfast, Pathao & Minsah Data) */}
      <div className="p-3 rounded-lg bg-[#0d1c2d] border border-[#1f2f45] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-[#908fa0] uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            Courier &amp; Store History (Steadfast / Pathao)
          </span>

          <div className="flex items-center gap-2">
            {checkedAtLabel && (
              <span className="text-[10px] font-mono text-[#8a8f98]">
                {fraudDetails?.cached ? "Cached" : "Live"} {checkedAtLabel}
              </span>
            )}
            <button
              type="button"
              onClick={() => handleCheckFraud(true)}
              disabled={checkingFraud || !customerPhone}
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
              title="Bypass 12h Redis cache and query Steadfast & Pathao live"
            >
              <RefreshCw className={`w-3 h-3 ${checkingFraud ? "animate-spin" : ""}`} />
              <span>{checkingFraud ? "Checking..." : hasStructuredData ? "Live Refresh" : "Check Now"}</span>
            </button>
          </div>
        </div>

        {hasStructuredData ? (
          <div className="space-y-2 text-xs">
            {/* Steadfast Row */}
            <div className="p-2.5 rounded-md bg-[#081320] border border-[#1f2f45] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-200">Steadfast Courier</span>
                {sf?.status === "ok" ? (
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    {sf.deliveryRatio !== null && sf.deliveryRatio !== undefined && (
                      <span className={`px-1.5 py-0.5 rounded font-semibold ${
                        sf.deliveryRatio >= 85
                          ? "bg-emerald-500/15 text-emerald-300"
                          : sf.deliveryRatio >= 65
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-rose-500/15 text-rose-300"
                      }`}>
                        {sf.deliveryRatio}% Success
                      </span>
                    )}
                    {sf.volumeRange && (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300">
                        Vol {sf.volumeRange}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] font-mono text-slate-400">
                    {sf ? statusText(sf.status) : "Legacy snapshot"}
                  </span>
                )}
              </div>

              {sf?.status === "ok" ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-slate-300">
                  <span>Cancelled: {sf.cancellationRatio ?? 0}%</span>
                  {sf.totalParcels !== null && sf.totalParcels !== undefined && (
                    <span>Parcels: {sf.totalParcels} ({sf.deliveredCount ?? 0} ok / {sf.cancelledCount ?? 0} cancel)</span>
                  )}
                  <span className={(sf.totalReports ?? 0) > 0 ? "text-rose-400 font-bold" : "text-slate-400"}>
                    Merchant Reports: {sf.totalReports ?? 0}
                  </span>
                  {Array.isArray(sf.fraudCategories) && sf.fraudCategories.length > 0 && (
                    <span className="text-rose-300">Flags: {sf.fraudCategories.join(", ")}</span>
                  )}
                </div>
              ) : fraudDetails?.steadfastHistory ? (
                <div className="text-[11px] font-mono text-slate-400">
                  Success: {fraudDetails.steadfastHistory.delivery_ratio ?? "N/A"}% | Vol: {fraudDetails.steadfastHistory.volume_range ?? fraudDetails.steadfastHistory.total_parcels ?? "N/A"} | Reports: {fraudDetails.steadfastHistory.total_reports ?? 0}
                </div>
              ) : null}
            </div>

            {/* Pathao Row */}
            <div className="p-2.5 rounded-md bg-[#081320] border border-[#1f2f45] flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-200">Pathao Courier</span>
              {pathao?.status === "ok" ? (
                <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] font-mono text-slate-300">
                  {pathao.totalParcels !== null && pathao.deliveredCount !== null && (
                    <span>
                      {pathao.deliveredCount}/{pathao.totalParcels} ok
                      {pathao.successRate !== null ? ` (${pathao.successRate}%)` : ""}
                    </span>
                  )}
                  {pathao.customerRatingLabel && (
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-200">
                      {pathao.customerRatingLabel}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[10px] font-mono text-slate-400">
                  {pathao ? statusText(pathao.status) : "Not checked"}
                </span>
              )}
            </div>

            {/* SmartPOSBD 5-Courier Summary Row (optional enricher) */}
            {sp?.status === "ok" && (
              <div className="p-2.5 rounded-md bg-[#081320] border border-[#1f2f45] space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-200">
                    All 5 Couriers Summary
                  </span>
                  <span className="text-[11px] font-mono text-indigo-300">
                    {sp.successParcels}/{sp.totalParcels} ok
                    {sp.totalParcels > 0 ? ` (${Math.round((sp.successParcels / sp.totalParcels) * 100)}%)` : ""}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-slate-400">
                  {sp.couriers?.redx && <span>RedX: {sp.couriers.redx.success}/{sp.couriers.redx.total}</span>}
                  {sp.couriers?.carrybee && <span>CarryBee: {sp.couriers.carrybee.success}/{sp.couriers.carrybee.total}</span>}
                  {sp.couriers?.paperfly && <span>Paperfly: {sp.couriers.paperfly.success}/{sp.couriers.paperfly.total}</span>}
                  {sp.unresolvedReports > 0 && (
                    <span className="text-rose-400 font-bold">Community Reports: {sp.unresolvedReports}</span>
                  )}
                </div>
              </div>
            )}

            {/* Minsah Store Previous Orders Row */}
            <div className="p-2.5 rounded-md bg-[#081320] border border-[#1f2f45] flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-200">Minsah Prev Orders</span>
              {storeHist ? (
                storeHist.totalOrders === 0 ? (
                  <span className="text-[11px] font-mono text-slate-400">0 (First order)</span>
                ) : (
                  <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] font-mono text-slate-300">
                    <span>Total: {storeHist.totalOrders}</span>
                    <span className="text-emerald-400">Delivered: {storeHist.deliveredCount}</span>
                    <span className={storeHist.cancelledCount > 0 ? "text-amber-300" : "text-slate-400"}>
                      Cancel: {storeHist.cancelledCount}
                    </span>
                    <span className={storeHist.returnedCount > 0 ? "text-rose-400" : "text-slate-400"}>
                      Return: {storeHist.returnedCount}
                    </span>
                  </div>
                )
              ) : (
                <span className="text-[11px] font-mono text-slate-400">N/A</span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-[#8a8f98] flex items-center justify-between">
            <span>Courier history not checked yet for this order.</span>
            <button
              type="button"
              onClick={() => handleCheckFraud(false)}
              className="text-xs px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 transition-colors"
            >
              Verify Now
            </button>
          </div>
        )}

        {fraudError && <p className="text-[10px] text-rose-400">{fraudError}</p>}
      </div>

      {/* Item-Level Quality Inspection & Scrap Reconciler */}
      <div className="p-3 rounded-lg bg-[#0d1c2d] border border-[#1f2f45] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#908fa0] uppercase tracking-wider flex items-center gap-1.5">
            <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
            Item-Level Return, Defect Queue &amp; Exchange Reconciler
          </span>
          <span className="text-[10px] font-mono text-[#8a8f98]">{items.length} item(s)</span>
        </div>

        {inspectResultMsg && (
          <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{inspectResultMsg}</span>
          </div>
        )}

        <div className="space-y-2">
          {items.map((item) => {
            const isReturnedGood = item.itemStatus === 'RETURNED_GOOD';
            const isReturnedDamaged = item.itemStatus === 'RETURNED_DAMAGED';
            const isReturnedDefective = item.itemStatus === 'RETURNED_DEFECTIVE';
            const isExchanged = item.itemStatus === 'EXCHANGED';
            const isInspecting = inspectingItemId === item.id;
            const isExchanging = exchangingItemId === item.id;

            return (
              <div
                key={item.id}
                className="p-2.5 rounded bg-[#091524] border border-[#1a2b42] flex flex-col gap-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white">{item.name}</span>
                    <span className="text-[10px] text-gray-400 font-mono ml-1.5">
                      ({item.sku} • {item.quantity} pc • ৳{item.price})
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isReturnedDefective
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : isReturnedDamaged
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : isReturnedGood
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : isExchanged
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {isReturnedDefective
                      ? '🏭 VENDOR DEFECT QUEUED'
                      : isReturnedDamaged
                        ? '💥 TRANSIT SCRAPPED'
                        : isReturnedGood
                          ? '✓ RETURNED GOOD'
                          : isExchanged
                            ? '🔄 EXCHANGED'
                            : 'FULFILLED'}
                  </span>
                </div>

                {/* Primary Action Buttons */}
                {!isInspecting && !isExchanging ? (
                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-[#14233a]">
                    <button
                      type="button"
                      onClick={() => {
                        setInspectingItemId(item.id);
                        setExchangingItemId(null);
                      }}
                      className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[10px] text-slate-300 font-mono transition-colors"
                    >
                      Condition Inspection...
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExchangingItemId(item.id);
                        setInspectingItemId(null);
                        setReplacementPrice(String(item.price));
                      }}
                      className="px-2 py-0.5 rounded bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/30 text-[10px] font-mono transition-colors flex items-center gap-1"
                    >
                      <Repeat className="w-3 h-3" />
                      <span>Exchange Item...</span>
                    </button>
                  </div>
                ) : null}

                {/* Refinement 7: Quality Inspection Panel with Vendor Defect option */}
                {isInspecting && (
                  <div className="p-2.5 rounded bg-[#0d1c2e] border border-indigo-500/30 space-y-2 mt-1">
                    <span className="text-[11px] font-medium text-indigo-300 block">
                      Quality Inspection for {item.name}:
                    </span>
                    <input
                      type="text"
                      placeholder="Reason or supplier defect note..."
                      value={inspectReason}
                      onChange={(e) => setInspectReason(e.target.value)}
                      className="w-full h-7 px-2 rounded bg-[#060e1a] border border-[#1f2f45] text-white text-[11px] focus:outline-none focus:border-indigo-400 font-mono"
                    />
                    <div className="flex items-center justify-between gap-1.5 pt-1 flex-wrap">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setInspectingItemId(null)}
                        className="text-[10px] h-6 px-2 text-gray-400"
                      >
                        Cancel
                      </Button>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleInspectSubmit(item.id, 'GOOD')}
                          disabled={inspecting}
                          className="px-2 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors"
                          title="Restocks item back to sellable inventory"
                        >
                          <PackageCheck className="w-3 h-3" />
                          <span>Good (Restock +{item.quantity})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleInspectSubmit(item.id, 'DAMAGED')}
                          disabled={inspecting}
                          className="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors"
                          title="Scraps broken item & logs write-off loss"
                        >
                          <PackageX className="w-3 h-3" />
                          <span>Transit Damaged (Scrap Write-Off)</span>
                        </button>

                        {/* Refinement 7: Vendor Defect (Supplier Replacement Claim) */}
                        <button
                          type="button"
                          onClick={() => handleInspectSubmit(item.id, 'VENDOR_DEFECT')}
                          disabled={inspecting}
                          className="px-2 py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors"
                          title="Hold for runner wholesale supplier exchange (No net scrap loss)"
                        >
                          <Factory className="w-3 h-3" />
                          <span>Vendor Defect (Claim from Supplier)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Refinement 5: Item-Level Exchange Price Gap Reconciler Panel */}
                {isExchanging && (
                  <div className="p-2.5 rounded bg-purple-950/30 border border-purple-500/40 space-y-2 mt-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-purple-300">
                      <span className="flex items-center gap-1">
                        <Repeat className="w-3.5 h-3.5" /> Exchange Reconciler
                      </span>
                      <button
                        type="button"
                        onClick={() => setExchangingItemId(null)}
                        className="text-gray-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-mono text-gray-300 block mb-1">
                          Replacement Product ID or SKU *
                        </label>
                        <input
                          type="text"
                          value={exchangeProductId}
                          onChange={(e) => setExchangeProductId(e.target.value)}
                          placeholder="e.g. prod_cm1234 or SKU-99"
                          className="w-full h-7 px-2 rounded bg-[#060e1a] border border-[#2b1f45] text-white text-[11px] font-mono focus:outline-none focus:border-purple-400"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-gray-300 block mb-1">
                          Replacement Price (৳)
                        </label>
                        <input
                          type="number"
                          value={replacementPrice}
                          onChange={(e) => setReplacementPrice(e.target.value)}
                          placeholder="৳ Price"
                          className="w-full h-7 px-2 rounded bg-[#060e1a] border border-[#2b1f45] text-purple-300 font-bold text-[11px] font-mono focus:outline-none focus:border-purple-400"
                        />
                      </div>
                    </div>

                    {/* Dynamic Price Gap Computation Strip */}
                    {replacementPrice && (
                      <div className="p-2 rounded bg-[#0b0c1c] border border-purple-500/30 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-gray-400">
                          Original: ৳{item.price} <ArrowRight className="w-3 h-3 inline mx-1" /> Replacement: ৳{replacementPrice}
                        </span>
                        <span
                          className={`font-bold ${
                            Number(replacementPrice) - item.price >= 0 ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          Customer Diff:{' '}
                          {Number(replacementPrice) - item.price >= 0
                            ? `+৳${(Number(replacementPrice) - item.price).toFixed(2)} (Collect)`
                            : `-৳${Math.abs(Number(replacementPrice) - item.price).toFixed(2)} (Refund)`}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-end gap-1.5 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setExchangingItemId(null)}
                        className="text-[10px] h-6 px-2 text-gray-400"
                      >
                        Cancel
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleExchangeSubmit(item)}
                        disabled={exchanging || !exchangeProductId}
                        className="px-3 h-6 rounded bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-[10px] transition-colors disabled:opacity-50"
                      >
                        {exchanging ? 'Reconciling...' : 'Confirm Exchange & Adjust Invoice Total'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
