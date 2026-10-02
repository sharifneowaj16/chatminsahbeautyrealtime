'use client';

import React, { useState } from 'react';
import { Truck, Printer, Trash2, X, Check, Loader2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface AdminBulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  statusOptions?: Array<{ value: string; label: string }>;
  onBulkStatusUpdate?: (status: string) => Promise<void> | void;
  onBulkDispatch?: () => void;
  onBulkPrint?: () => void;
  onBulkDelete?: () => void;
  isUpdating?: boolean;
  className?: string;
}

export const AdminBulkActionBar: React.FC<AdminBulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  statusOptions = [
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Dispatched / Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ],
  onBulkStatusUpdate,
  onBulkDispatch,
  onBulkPrint,
  onBulkDelete,
  isUpdating = false,
  className = '',
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>(
    statusOptions[0]?.value || 'processing'
  );

  if (selectedCount === 0) return null;

  const handleApplyStatus = async () => {
    if (!onBulkStatusUpdate) return;
    await onBulkStatusUpdate(selectedStatus);
  };

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-3 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md text-xs animate-slide-up text-white max-w-[95vw] overflow-x-auto ${className}`}
    >
      {/* Selected count pill */}
      <div className="flex items-center gap-2 pr-3 border-r border-slate-700/80 shrink-0">
        <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[11px] font-bold">
          {selectedCount}
        </span>
        <span className="font-semibold text-slate-200">
          Selected
        </span>
        <button
          type="button"
          onClick={onClearSelection}
          title="Clear selection"
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bulk Status Update */}
      {onBulkStatusUpdate && (
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={selectedStatus}
            disabled={isUpdating}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-8 px-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500 font-medium"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Move to {opt.label}
              </option>
            ))}
          </select>

          <Button
            variant="secondary"
            size="sm"
            disabled={isUpdating}
            onClick={handleApplyStatus}
            className="h-8 text-xs bg-slate-800 border-slate-700 hover:bg-slate-700 text-white font-medium"
          >
            {isUpdating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5 mr-1" />
            )}
            <span>Apply</span>
          </Button>
        </div>
      )}

      {/* Bulk Courier Dispatch Button */}
      {onBulkDispatch && (
        <Button
          variant="primary"
          size="sm"
          onClick={onBulkDispatch}
          disabled={isUpdating}
          className="h-8 text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5 shrink-0 shadow-md"
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Dispatch Courier</span>
        </Button>
      )}

      {/* Bulk Thermal Print Button */}
      {onBulkPrint && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onBulkPrint}
          disabled={isUpdating}
          className="h-8 text-xs border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 shrink-0"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Slips</span>
        </Button>
      )}

      {/* Bulk Delete if enabled */}
      {onBulkDelete && (
        <button
          type="button"
          onClick={onBulkDelete}
          disabled={isUpdating}
          title="Delete selected orders"
          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default AdminBulkActionBar;
