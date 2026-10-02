'use client';

import React, { useState } from 'react';
import { X, Plus, PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { QuantityStepper } from './QuantityStepper';

export interface CustomItemCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomItem: (item: {
    name: string;
    sku: string;
    price: number;
    quantity: number;
    productType: 'new' | 'old' | 'virtual';
  }) => void;
}

export const CustomItemCreateModal: React.FC<CustomItemCreateModalProps> = ({
  isOpen,
  onClose,
  onAddCustomItem,
}) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [productType, setProductType] = useState<'new' | 'old' | 'virtual'>('new');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product title is required');
      return;
    }
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setError('Please provide a valid price');
      return;
    }

    const generatedSku = sku.trim() || `CUSTOM-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    onAddCustomItem({
      name: name.trim(),
      sku: generatedSku,
      price: numPrice,
      quantity,
      productType,
    });

    // Reset and close
    setName('');
    setSku('');
    setPrice('');
    setQuantity(1);
    setProductType('new');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Add Custom / Offline Item</h3>
              <p className="text-[11px] text-slate-400">Add an ad-hoc product not listed in the catalog</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Item Name / Title <span className="text-rose-400">*</span>
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Rare Beauty Liquid Blush Custom Pack"
              className="h-9 text-xs"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Unit Price (৳) <span className="text-rose-400">*</span>
              </label>
              <Input
                type="number"
                min={0}
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value === '' ? '' : Number(e.target.value));
                  setError(null);
                }}
                placeholder="0"
                className="h-9 text-xs font-semibold tabular-nums"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Quantity</label>
              <QuantityStepper value={quantity} onChange={setQuantity} size="sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">SKU (Optional)</label>
              <Input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Leave blank for auto"
                className="h-9 text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Type</label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value as any)}
                className="w-full h-9 px-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500"
              >
                <option value="new">New Product</option>
                <option value="old">Old / Clearance</option>
                <option value="virtual">Virtual / Gift Sample</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="border-slate-700 bg-slate-800 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add to Order
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomItemCreateModal;
