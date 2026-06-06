'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Package,
  ChevronDown,
  ChevronUp,
  Tag,
  Cpu,
  Archive,
  Edit3,
  Check,
  X,
} from 'lucide-react';
import { formatPrice } from '@/utils/currency';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ProductType = 'new' | 'old' | 'virtual';

export interface ProductVariantOption {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
  image?: string;
}

export interface SearchedProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  variants: ProductVariantOption[];
}

export interface OrderLineItem {
  /** Unique key for this line item in the UI */
  key: string;
  /** null = custom product not in DB */
  productId: string | null;
  variantId?: string | null;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  productType: ProductType;
  /** true if this was typed in manually (not found in DB) */
  isCustom: boolean;
}

interface Props {
  orderItems: OrderLineItem[];
  onChange: (items: OrderLineItem[]) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genKey() {
  return Math.random().toString(36).slice(2, 9);
}

const PRODUCT_TYPE_META: Record<ProductType, { label: string; icon: React.ReactNode; color: string }> = {
  new:     { label: 'New',     icon: <Tag className="w-3 h-3" />,     color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  old:     { label: 'Old',     icon: <Archive className="w-3 h-3" />, color: 'bg-amber-100 text-amber-700 border-amber-300' },
  virtual: { label: 'Virtual', icon: <Cpu className="w-3 h-3" />,     color: 'bg-violet-100 text-violet-700 border-violet-300' },
};

// ─── Variant Attribute Formatter ────────────────────────────────────────────

function formatVariantLabel(variant: ProductVariantOption) {
  const attrs = variant.attributes;
  if (!attrs || Object.keys(attrs).length === 0) return variant.name || variant.sku;
  return Object.entries(attrs)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' / ');
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OrderProductSection({ orderItems, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchedProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const [addQty, setAddQty] = useState(1);

  // inline edit state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<OrderLineItem>>({});

  // variant picker state per search result
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string | null>>({});

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Search with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); setSearching(false); return; }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/products/search?q=${encodeURIComponent(query.trim())}`,
          { credentials: 'include' }
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.products || []);
        }
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 380);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // ── Add a DB product ───────────────────────────────────────────────────────
  const addDbProduct = useCallback((product: SearchedProduct, variantId?: string | null) => {
    const variant = variantId ? product.variants.find(v => v.id === variantId) : null;
    const price = variant ? variant.price : product.price;
    const sku   = variant ? variant.sku   : product.sku;

    const existing = orderItems.find(
      i => i.productId === product.id && i.variantId === (variantId ?? null)
    );

    if (existing) {
      onChange(orderItems.map(i =>
        i.key === existing.key ? { ...i, quantity: i.quantity + addQty } : i
      ));
    } else {
      const item: OrderLineItem = {
        key: genKey(),
        productId: product.id,
        variantId: variantId ?? null,
        name: variant
          ? `${product.name} — ${formatVariantLabel(variant)}`
          : product.name,
        sku,
        price,
        quantity: addQty,
        productType: 'new',
        isCustom: false,
      };
      onChange([...orderItems, item]);
    }

    setQuery('');
    setResults([]);
    setShowDrop(false);
    setAddQty(1);
  }, [orderItems, onChange, addQty]);

  // ── Add as custom product ──────────────────────────────────────────────────
  const addCustomProduct = useCallback(() => {
    const name = query.trim();
    if (!name) return;
    const item: OrderLineItem = {
      key: genKey(),
      productId: null,
      variantId: null,
      name,
      sku: `CUSTOM-${Date.now()}`,
      price: 0,
      quantity: addQty,
      productType: 'new',
      isCustom: true,
    };
    onChange([...orderItems, item]);
    setQuery('');
    setResults([]);
    setShowDrop(false);
    setAddQty(1);
    // immediately open edit for price
    setEditingKey(item.key);
    setEditValues({ price: 0, name, sku: item.sku, productType: 'new' });
  }, [query, addQty, orderItems, onChange]);

  // ── Remove item ────────────────────────────────────────────────────────────
  const removeItem = (key: string) => {
    onChange(orderItems.filter(i => i.key !== key));
  };

  // ── Update quantity ────────────────────────────────────────────────────────
  const updateQty = (key: string, qty: number) => {
    if (qty <= 0) { removeItem(key); return; }
    onChange(orderItems.map(i => i.key === key ? { ...i, quantity: qty } : i));
  };

  // ── Inline edit helpers ────────────────────────────────────────────────────
  const startEdit = (item: OrderLineItem) => {
    setEditingKey(item.key);
    setEditValues({ price: item.price, name: item.name, sku: item.sku, productType: item.productType });
  };

  const commitEdit = (key: string) => {
    onChange(orderItems.map(i =>
      i.key === key ? { ...i, ...editValues } : i
    ));
    setEditingKey(null);
    setEditValues({});
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValues({});
  };

  const subtotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Section header */}
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Package className="w-5 h-5" /> Products
      </h2>

      {/* ── Search bar ──────────────────────────────────────────────────────── */}
      <div className="relative mb-4" ref={dropRef}>
        <div className="flex gap-2">
          {/* qty */}
          <input
            type="number"
            min={1}
            value={addQty}
            onChange={e => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 px-2 py-2.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          {/* search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products or type a custom name..."
              value={query}
              onChange={e => { setQuery(e.target.value); setShowDrop(true); }}
              onFocus={() => query && setShowDrop(true)}
              onKeyDown={e => {
                if (e.key === 'Enter' && results.length === 0 && query.trim()) {
                  e.preventDefault();
                  addCustomProduct();
                }
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* ── Dropdown ──────────────────────────────────────────────────────── */}
        {showDrop && query.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-80 overflow-y-auto">

            {/* Loading */}
            {searching && (
              <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full" />
                Searching…
              </div>
            )}

            {/* DB Results */}
            {!searching && results.map(product => {
              const selVariantId = selectedVariants[product.id] ?? null;
              const selVariant   = selVariantId
                ? product.variants.find(v => v.id === selVariantId)
                : null;

              return (
                <div key={product.id} className="border-b border-gray-100 last:border-0">
                  {/* Product row */}
                  <div className="px-4 py-3 hover:bg-gray-50 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">SKU: {product.sku} · Stock: {product.stock} · {formatPrice(product.price)}</p>

                      {/* Variants */}
                      {product.variants.length > 0 && (
                        <div className="mt-1.5">
                          <p className="text-xs text-gray-400 mb-1">Select variant (optional):</p>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedVariants(p => ({ ...p, [product.id]: null }))}
                              className={`text-xs px-2 py-1 rounded border transition-colors ${
                                selVariantId === null
                                  ? 'bg-violet-600 text-white border-violet-600'
                                  : 'bg-white text-gray-600 border-gray-300 hover:border-violet-400'
                              }`}
                            >
                              Base
                            </button>
                            {product.variants.map(v => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => setSelectedVariants(p => ({ ...p, [product.id]: v.id }))}
                                className={`text-xs px-2 py-1 rounded border transition-colors ${
                                  selVariantId === v.id
                                    ? 'bg-violet-600 text-white border-violet-600'
                                    : 'bg-white text-gray-600 border-gray-300 hover:border-violet-400'
                                }`}
                                title={`${formatPrice(v.price)} · Stock: ${v.stock}`}
                              >
                                {formatVariantLabel(v)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Add button */}
                    <button
                      type="button"
                      onClick={() => addDbProduct(product, selVariantId)}
                      className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add{selVariant ? ` (${formatPrice(selVariant.price)})` : ''}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* "Add as custom" row always shown when there's a query */}
            {!searching && (
              <button
                type="button"
                onClick={addCustomProduct}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-violet-50 border-t border-dashed border-violet-200 group"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center transition-colors">
                  <Plus className="w-3.5 h-3.5 text-violet-600" />
                </span>
                <span className="text-sm">
                  Add <strong className="text-violet-700">"{query}"</strong> as custom product
                  <span className="text-xs text-gray-400 ml-1">(not in DB)</span>
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Line Items ──────────────────────────────────────────────────────── */}
      {orderItems.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          No products added yet
        </p>
      ) : (
        <div className="space-y-2">
          {orderItems.map(item => {
            const isEditing = editingKey === item.key;
            const typeMeta  = PRODUCT_TYPE_META[item.productType];

            return (
              <div
                key={item.key}
                className={`rounded-lg border transition-all ${
                  isEditing
                    ? 'border-violet-400 bg-violet-50'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                {/* ── View mode ──────────────────────────────────────────── */}
                {!isEditing ? (
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    {/* badges */}
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${typeMeta.color}`}>
                          {typeMeta.icon} {typeMeta.label}
                        </span>
                        {item.isCustom && (
                          <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded border bg-rose-50 text-rose-600 border-rose-200">
                            Custom
                          </span>
                        )}
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      </div>
                      <p className="text-xs text-gray-400">SKU: {item.sku}</p>
                    </div>

                    {/* qty */}
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => updateQty(item.key, parseInt(e.target.value) || 1)}
                      className="w-14 px-1.5 py-1 border border-gray-200 rounded text-xs text-center bg-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />

                    {/* price */}
                    <span className="text-sm font-semibold text-gray-900 w-20 text-right shrink-0">
                      {formatPrice(item.price * item.quantity)}
                    </span>

                    {/* actions */}
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-100 rounded transition-colors"
                      title="Edit price / type / variant"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  /* ── Edit mode ──────────────────────────────────────────── */
                  <div className="p-3 space-y-3">
                    {/* Name */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Name</label>
                      <input
                        type="text"
                        value={editValues.name ?? item.name}
                        onChange={e => setEditValues(p => ({ ...p, name: e.target.value }))}
                        className="w-full px-2.5 py-1.5 border border-violet-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {/* Price */}
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Unit Price (৳)</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={editValues.price ?? item.price}
                          onChange={e => setEditValues(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-2.5 py-1.5 border border-violet-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                        />
                      </div>

                      {/* SKU */}
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">SKU</label>
                        <input
                          type="text"
                          value={editValues.sku ?? item.sku}
                          onChange={e => setEditValues(p => ({ ...p, sku: e.target.value }))}
                          className="w-full px-2.5 py-1.5 border border-violet-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                        />
                      </div>

                      {/* Product Type */}
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
                        <select
                          value={editValues.productType ?? item.productType}
                          onChange={e => setEditValues(p => ({ ...p, productType: e.target.value as ProductType }))}
                          className="w-full px-2.5 py-1.5 border border-violet-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                        >
                          <option value="new">New</option>
                          <option value="old">Old</option>
                          <option value="virtual">Virtual</option>
                        </select>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => commitEdit(item.key)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Subtotal */}
          <div className="flex justify-end pt-2 border-t border-gray-200">
            <span className="text-sm font-semibold text-gray-700">
              Items subtotal: <span className="text-gray-900">{formatPrice(subtotal)}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
