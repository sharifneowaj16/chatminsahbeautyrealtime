'use client';

import React, { useState, useEffect } from 'react';
import { Warehouse, Loader2 } from 'lucide-react';

export interface PathaoStore {
  store_id: string | number;
  store_name: string;
  store_address: string;
  is_default?: boolean;
}

export interface CourierStorePickerProps {
  selectedStoreId: string | number | undefined;
  onSelect: (storeId: string | number) => void;
  disabled?: boolean;
  className?: string;
}

export const CourierStorePicker: React.FC<CourierStorePickerProps> = ({
  selectedStoreId,
  onSelect,
  disabled = false,
  className = '',
}) => {
  const [stores, setStores] = useState<PathaoStore[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetch('/api/admin/shipping/pathao/stores', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data?.stores || data?.data || data)
          ? (data.stores || data.data || data).map((s: any) => ({
              store_id: s.store_id || s.id,
              store_name: s.store_name || s.name || 'Main Warehouse',
              store_address: s.store_address || s.address || '',
              is_default: s.is_default,
            }))
          : [];

        // Fallback default warehouse if empty
        if (list.length === 0) {
          list.push({
            store_id: 'default-hub-1',
            store_name: 'Dhanmondi Central Hub (Genetic Plaza)',
            store_address: 'Shop #204, Genetic Plaza, Dhanmondi 27, Dhaka',
            is_default: true,
          });
        }

        setStores(list);
        if (!selectedStoreId && list.length > 0) {
          const def = list.find((s: PathaoStore) => s.is_default) || list[0];
          onSelect(def.store_id);
        }
      })
      .catch(() => {
        if (isMounted) {
          setStores([
            {
              store_id: 'default-hub-1',
              store_name: 'Dhanmondi Central Hub',
              store_address: 'Shop #204, Genetic Plaza, Dhanmondi 27, Dhaka',
              is_default: true,
            },
          ]);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Warehouse className="w-3.5 h-3.5 text-rose-400" />
          Pickup Warehouse Hub
        </span>
        {loading && <Loader2 className="w-3 h-3 animate-spin text-rose-400" />}
      </label>

      <select
        value={selectedStoreId || ''}
        disabled={disabled || loading}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full h-9 px-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500 disabled:opacity-50"
      >
        {stores.map((s) => (
          <option key={String(s.store_id)} value={String(s.store_id)}>
            {s.store_name} {s.store_address ? `(${s.store_address.slice(0, 30)}...)` : ''}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CourierStorePicker;
