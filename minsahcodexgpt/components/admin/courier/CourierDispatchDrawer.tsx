'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  Send,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Phone,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { CourierProviderSelector, CourierProvider } from './CourierProviderSelector';
import { CourierStatusBadge } from './CourierStatusBadge';
import { CourierTrackingButton } from './CourierTrackingButton';
import { CourierCodBreakdownCard } from './CourierCodBreakdownCard';
import { CourierWeightPicker } from './CourierWeightPicker';
import { CourierStorePicker } from './CourierStorePicker';

export interface OrderForCourierDispatch {
  id: string;
  dbId?: string;
  orderNumber?: string;
  customer: {
    name: string;
    email?: string;
    phone: string;
  };
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  shipping?: {
    address: string;
    city: string;
    phone?: string;
    name?: string;
  };
  shippingCost?: number;
  discountAmount?: number;
  courier?: 'steadfast' | 'pathao' | string;
  steadfastConsignmentId?: string | null;
  steadfastTrackingCode?: string | null;
  steadfastStatus?: string | null;
  pathaoConsignmentId?: string | null;
  pathaoTrackingCode?: string | null;
  pathaoStatus?: string | null;
}

export interface CourierDispatchDrawerProps {
  order: OrderForCourierDispatch | null;
  isOpen: boolean;
  onClose: () => void;
  onDispatched?: (orderId: string, trackingCode: string, provider: CourierProvider) => void;
}

export const CourierDispatchDrawer: React.FC<CourierDispatchDrawerProps> = ({
  order,
  isOpen,
  onClose,
  onDispatched,
}) => {
  const [provider, setProvider] = useState<CourierProvider>('steadfast');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [codAmount, setCodAmount] = useState(0);
  const [note, setNote] = useState('');
  const [weightKg, setWeightKg] = useState(0.5);
  const [selectedStoreId, setSelectedStoreId] = useState<string | number>('');

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync state when order opens
  useEffect(() => {
    if (!order) return;

    setRecipientName(order.shipping?.name || order.customer.name || '');
    setRecipientPhone(order.shipping?.phone || order.customer.phone || '');
    setRecipientAddress(
      [order.shipping?.address, order.shipping?.city].filter(Boolean).join(', ')
    );

    const isCod =
      order.paymentMethod === 'cash_on_delivery' ||
      order.paymentMethod === 'cod' ||
      order.paymentStatus !== 'paid';

    setCodAmount(isCod ? order.total : 0);
    setNote(`Order #${order.orderNumber || order.id.slice(-8).toUpperCase()}`);
    setError(null);
    setSuccessMsg(null);

    // Default provider based on order preference
    if (order.courier === 'pathao' || order.pathaoTrackingCode) {
      setProvider('pathao');
    } else {
      setProvider('steadfast');
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const isAlreadyDispatched =
    (provider === 'steadfast' && Boolean(order.steadfastTrackingCode)) ||
    (provider === 'pathao' && Boolean(order.pathaoTrackingCode));

  const currentTracking =
    provider === 'steadfast' ? order.steadfastTrackingCode : order.pathaoTrackingCode;
  const currentStatus =
    provider === 'steadfast' ? order.steadfastStatus : order.pathaoStatus;

  // Handle Dispatch
  const handleDispatch = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (provider === 'steadfast') {
        const res = await fetch('/api/admin/shipping/steadfast/send', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.dbId || order.id,
            invoice: order.orderNumber || order.id,
            recipientName,
            recipientPhone,
            recipientAddress,
            codAmount,
            note,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Steadfast dispatch failed');
        }

        setSuccessMsg(`Dispatched to Steadfast! Tracking: ${data.trackingCode}`);
        onDispatched?.(order.id, data.trackingCode, 'steadfast');
      } else {
        // Pathao Dispatch
        const res = await fetch('/api/admin/shipping/pathao/send', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.dbId || order.id,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Pathao dispatch failed');
        }

        setSuccessMsg(`Dispatched to Pathao! Tracking: ${data.trackingCode}`);
        onDispatched?.(order.id, data.trackingCode, 'pathao');
      }
    } catch (err: any) {
      setError(err.message || 'Dispatch error');
    } finally {
      setLoading(false);
    }
  };

  // Re-sync delivery status
  const handleSyncStatus = async () => {
    setSyncing(true);
    setError(null);
    try {
      if (provider === 'steadfast') {
        const res = await fetch('/api/admin/shipping/steadfast/sync', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.dbId || order.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Sync failed');
        setSuccessMsg(`Status synced: ${data.status}`);
      }
    } catch (err: any) {
      setError(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
      <div className="w-full max-w-lg bg-slate-950 border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Dispatch Order #{order.orderNumber || order.id.slice(-8).toUpperCase()}
              </h3>
              <p className="text-[11px] text-slate-400">
                Generate official courier consignment & tracking slip
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Already Dispatched Banner */}
          {isAlreadyDispatched && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Live Consignment Status:</span>
                <CourierStatusBadge
                  courier={provider}
                  status={currentStatus}
                  trackingCode={currentTracking}
                  size="sm"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <CourierTrackingButton courier={provider} trackingCode={currentTracking} />
                {provider === 'steadfast' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSyncStatus}
                    disabled={syncing}
                    className="h-7 text-xs border-slate-700 bg-slate-800"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                    Re-sync
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Provider Selector */}
          <CourierProviderSelector
            selected={provider}
            onSelect={setProvider}
            disabled={loading}
          />

          {/* Recipient Details */}
          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
            <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Recipient Information
            </h4>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Customer Name</label>
              <Input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                disabled={loading}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Phone Number</label>
              <Input
                type="text"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                disabled={loading}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Delivery Address</label>
              <Textarea
                rows={2}
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                disabled={loading}
                className="text-xs"
              />
            </div>
          </div>

          {/* Package Weight */}
          <CourierWeightPicker
            weightKg={weightKg}
            onChange={setWeightKg}
            disabled={loading}
          />

          {/* Store Picker for Pathao */}
          {provider === 'pathao' && (
            <CourierStorePicker
              selectedStoreId={selectedStoreId}
              onSelect={setSelectedStoreId}
              disabled={loading}
            />
          )}

          {/* Settlement Preview */}
          <CourierCodBreakdownCard
            orderTotal={order.total}
            advancePaid={order.paymentStatus === 'paid' ? order.total : 0}
            courierDeliveryFee={60}
            isCod={order.paymentMethod === 'cash_on_delivery' || order.paymentStatus !== 'paid'}
            courierName={provider === 'pathao' ? 'Pathao Logistics' : 'Steadfast Courier'}
          />

          {/* Staff Memo */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Courier Delivery Note</label>
            <Input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={loading}
              placeholder="e.g. Handle with care, fragile cosmetics"
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="border-slate-700 bg-slate-800 text-slate-300"
          >
            Close
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleDispatch}
            disabled={loading}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5 shadow-md flex-1 justify-center"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>
              {isAlreadyDispatched
                ? `Re-Send to ${provider === 'pathao' ? 'Pathao' : 'Steadfast'}`
                : `Dispatch to ${provider === 'pathao' ? 'Pathao' : 'Steadfast'}`}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CourierDispatchDrawer;
