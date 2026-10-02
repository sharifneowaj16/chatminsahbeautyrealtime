'use client';

import React from 'react';
import { PackageCheck, Warehouse, AlertCircle } from 'lucide-react';

export interface RestockInventoryToggleProps {
  shouldRestock: boolean;
  onToggle: (checked: boolean) => void;
  destinationWarehouse?: string;
  onWarehouseChange?: (warehouse: string) => void;
  disabled?: boolean;
  className?: string;
}

export const RestockInventoryToggle: React.FC<RestockInventoryToggleProps> = ({
  shouldRestock,
  onToggle,
  destinationWarehouse = 'main',
  onWarehouseChange,
  disabled = false,
  className = '',
}) => {
  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-3 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className={`p-2 rounded-lg ${
              shouldRestock
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-slate-800 text-slate-500'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-white">Restock Return Into Inventory</h5>
            <p className="text-[11px] text-slate-400">
              Increment sellable stock counts upon physical inspection
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={shouldRestock}
            disabled={disabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
        </label>
      </div>

      {shouldRestock && onWarehouseChange && (
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-400 flex items-center gap-1 text-[11px]">
            <Warehouse className="w-3.5 h-3.5 text-slate-500" />
            Destination Hub:
          </span>
          <select
            value={destinationWarehouse}
            disabled={disabled}
            onChange={(e) => onWarehouseChange(e.target.value)}
            className="h-7 px-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500"
          >
            <option value="main">Main Sellable Warehouse</option>
            <option value="qc_hold">Quarantine QC Inspection Hold</option>
            <option value="outlet">Outlet / B-Grade Rack</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default RestockInventoryToggle;
