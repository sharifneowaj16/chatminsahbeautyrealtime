'use client';

import React, { useState } from 'react';
import {
  X,
  Printer,
  Copy,
  Check,
  Send,
  Loader2,
  Package,
  Clock,
  Truck,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Order, STATUS_CONFIG } from './types';
import { PaymentMethodBadge } from '@/components/admin/finance/PaymentMethodBadge';
import { CourierStatusBadge } from '@/components/admin/courier/CourierStatusBadge';
import { CourierDispatchDrawer } from '@/components/admin/courier/CourierDispatchDrawer';

// Sub Tabs
import { OrderDetailOverviewTab } from './components/drawer/OrderDetailOverviewTab';
import { OrderDetailItemsTab } from './components/drawer/OrderDetailItemsTab';
import { OrderDetailLogisticsTab } from './components/drawer/OrderDetailLogisticsTab';
import { OrderDetailTimelineTab } from './components/drawer/OrderDetailTimelineTab';

export interface OrderDetailDrawerProps {
  order: Order;
  onClose: () => void;
  onStatusUpdate: (
    id: string,
    status: string,
    tracking?: string
  ) => Promise<void>;
  onNoteUpdate: (id: string, note: string) => Promise<void>;
  onDispatch?: (order: Order) => void;
  onOpenReceipt?: (order: Order) => void;
  onItemUpdated?: () => void;
}

export default function OrderDetailDrawer({
  order,
  onClose,
  onStatusUpdate,
  onNoteUpdate,
  onDispatch,
  onOpenReceipt,
  onItemUpdated,
}: OrderDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'logistics' | 'timeline'>('overview');
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(order.status);
  const [copiedId, setCopiedId] = useState(false);

  const orderNum = order.id.slice(-8).toUpperCase();
  const courierPartner =
    order.courier === 'pathao' || order.shippingMethod === 'pathao' ? 'pathao' : 'steadfast';

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(order.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStat = e.target.value;
    setSelectedStatus(newStat as any);
    try {
      setUpdatingStatus(true);
      await onStatusUpdate(order.id, newStat);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'items', label: `Items (${order.items?.length || 0})`, icon: Package },
    { id: 'logistics', label: 'Logistics & Courier', icon: Truck },
    { id: 'timeline', label: 'Timeline & Notes', icon: Clock },
  ] as const;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
        <div className="w-full max-w-xl bg-slate-950 border-l border-slate-800 h-full flex flex-col shadow-2xl">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyOrderId}
                  className="font-mono text-sm font-bold text-white hover:text-rose-400 flex items-center gap-1.5 transition-colors"
                >
                  <span>#{orderNum}</span>
                  {copiedId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </button>
                <PaymentMethodBadge
                  method={order.paymentMethod}
                  trxId={order.paymentTransactionId}
                  status={order.paymentStatus}
                  size="sm"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {onOpenReceipt && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onOpenReceipt(order)}
                    className="h-8 text-xs border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
                    title="Print Thermal Packing Slip"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1" />
                    <span>Thermal Slip</span>
                  </Button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Status Control Bar */}
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-medium">Status:</span>
                <div className="relative">
                  <select
                    value={selectedStatus}
                    disabled={updatingStatus}
                    onChange={handleStatusChange}
                    className="h-7 px-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-semibold focus:outline-none focus:border-rose-500"
                  >
                    {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                      <option key={k} value={k}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                  {updatingStatus && (
                    <Loader2 className="w-3 h-3 text-rose-400 animate-spin absolute right-2 top-2" />
                  )}
                </div>
              </div>

              <CourierStatusBadge
                courier={courierPartner}
                status={courierPartner === 'pathao' ? order.pathaoStatus : order.steadfastStatus}
                trackingCode={order.steadfastTrackingCode || order.pathaoTrackingCode || order.tracking}
                size="sm"
              />
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 pt-1 border-t border-slate-800/60 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'overview' && (
              <OrderDetailOverviewTab
                order={order}
                onNoteUpdate={onNoteUpdate}
                onItemUpdated={onItemUpdated}
              />
            )}

            {activeTab === 'items' && <OrderDetailItemsTab order={order} />}

            {activeTab === 'logistics' && (
              <OrderDetailLogisticsTab
                order={order}
                onOpenDispatchDrawer={() => setIsDispatchOpen(true)}
              />
            )}

            {activeTab === 'timeline' && (
              <OrderDetailTimelineTab
                order={order}
                onAddNote={(note) => onNoteUpdate(order.id, note)}
              />
            )}
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-3.5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="border-slate-700 bg-slate-800 text-slate-300"
            >
              Close Drawer
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsDispatchOpen(true)}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5 shadow-md"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Courier Dispatch</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Unified Courier Dispatch Drawer */}
      <CourierDispatchDrawer
        order={order as any}
        isOpen={isDispatchOpen}
        onClose={() => setIsDispatchOpen(false)}
        onDispatched={() => {
          setIsDispatchOpen(false);
          onDispatch?.(order);
        }}
      />
    </>
  );
}
