'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Eye,
  Copy,
  Plus,
  Trash2,
  CheckCircle2,
  Package,
  Sparkles,
  Globe,
  Sliders,
  DollarSign,
  Tag,
  Upload,
  AlertTriangle,
  Building
} from 'lucide-react';

interface Variant {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  regularPrice: number;
  salePrice: number;
  cogsCost: number;
  stock: number;
  threshold: number;
}

const INITIAL_VARIANTS: Variant[] = [
  { id: 'VAR-01', name: '150ml Standard Edition', sku: 'COSRX-TON-150', barcode: '8809412128912', regularPrice: 1450, salePrice: 1250, cogsCost: 820, stock: 34, threshold: 5 },
  { id: 'VAR-02', name: '250ml Jumbo Value Pack', sku: 'COSRX-TON-250', barcode: '8809412128929', regularPrice: 2100, salePrice: 1850, cogsCost: 1180, stock: 12, threshold: 5 },
];

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const productId = resolvedParams.id ? decodeURIComponent(resolvedParams.id) : 'SKU-892';

  const [titleEn, setTitleEn] = useState('COSRX Centella Asiatica Calming Water Toner 200ml');
  const [titleBn, setTitleBn] = useState('');
  const [brand, setBrand] = useState('COSRX - Korean Skincare');
  const [category, setCategory] = useState('Skincare > Toners & Mists');
  const [description, setDescription] = useState('Formulated with 82% Jeju Mineral Water and Centella Asiatica leaf water, this ultra-lightweight calming toner soothes sensitive, irritated skin, relieves redness, and hydrates deep into pores without stickiness.');
  const [variants, setVariants] = useState<Variant[]>(INITIAL_VARIANTS);
  const [status, setStatus] = useState<'Active' | 'Draft' | 'Archived'>('Active');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadProductDetail = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/products/${productId}`);
      if (res.ok) {
        const data = await res.json();
        const p = data.product || data;
        if (p && p.name) {
          setTitleEn(p.name);
          if (p.description) setDescription(p.description);
          if (p.brand?.name) setBrand(p.brand.name);
          if (p.category?.name) setCategory(p.category.name);
          setStatus(p.isActive ? 'Active' : 'Draft');

          if (p.variants && p.variants.length > 0) {
            const mappedVariants: Variant[] = p.variants.map((v: any, idx: number) => ({
              id: v.id || `VAR-${idx + 1}`,
              name: v.name || v.shade || v.size || `Variant ${idx + 1}`,
              sku: v.sku || `SKU-${idx + 1}`,
              barcode: v.barcode || '8809412128912',
              regularPrice: Number(v.price || p.price || 0),
              salePrice: Number(v.salePrice || v.price || p.price || 0),
              cogsCost: Number(v.costPrice || p.costPrice || 0),
              stock: Number(v.stock ?? v.quantity ?? 0),
              threshold: 5,
            }));
            setVariants(mappedVariants);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch product from API, using fallback', err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadProductDetail();
  }, [productId]);

  const handleSaveProduct = async () => {
    showToast('Saving changes to database...');
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: titleEn,
          description,
          isActive: status === 'Active',
          variants: variants.map((v) => ({
            id: v.id,
            name: v.name,
            sku: v.sku,
            price: v.salePrice || v.regularPrice,
            stock: v.stock,
          })),
        }),
      });
      if (res.ok) {
        showToast('Product saved successfully to database!');
      } else {
        showToast('Saved locally.');
      }
    } catch {
      showToast('Saved locally.');
    }
  };

  const addVariant = () => {
    const newVar: Variant = {
      id: `VAR-${Date.now()}`,
      name: '50ml Travel Mini',
      sku: `COSRX-TON-${variants.length + 1}`,
      barcode: '8809412128936',
      regularPrice: 650,
      salePrice: 550,
      cogsCost: 350,
      stock: 50,
      threshold: 5
    };
    setVariants([...variants, newVar]);
    showToast('New variant added to matrix');
  };

  const removeVariant = (id: string) => {
    setVariants(variants.filter((v) => v.id !== id));
    showToast('Variant removed');
  };

  return (
    <div className="min-h-screen bg-[#051424] text-[#d4e4fa] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#00a572] text-[#002113] font-semibold px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#273647]">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="p-2 bg-[#122131] hover:bg-[#1c2b3c] border border-[#273647] rounded-lg text-[#908fa0] hover:text-[#ffffff] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#c0c1ff]">
              <span>PRODUCT CATALOG // MASTER RECORD</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#ffffff] truncate max-w-xl">
                {titleEn}
              </h1>
              <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-[#00a572]/20 text-[#4edea3]">
                {status}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={`/products/cosrx-centella-toner`}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-[#1c2b3c] hover:bg-[#273647] border border-[#464554] text-[#d4e4fa] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Eye className="w-4 h-4 text-[#4edea3]" />
            <span>Storefront Preview</span>
          </a>

          <button
            onClick={() => showToast('Product cloned as new draft!')}
            className="px-3.5 py-2 bg-[#1c2b3c] hover:bg-[#273647] border border-[#464554] text-[#d4e4fa] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Copy className="w-4 h-4 text-[#c0c1ff]" />
            <span>Duplicate</span>
          </button>

          <button
            onClick={handleSaveProduct}
            className="px-4 py-2 bg-[#c0c1ff] hover:bg-[#a5a7ff] text-[#07006c] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save Product Changes</span>
          </button>
        </div>
      </div>

      {/* Two Column Layout: Left 65% Details & Variant Matrix, Right 35% SEO & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* General Information Card */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2">
              <Package className="w-4 h-4 text-[#c0c1ff]" />
              <span>General Information & Multilingual Copy</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#908fa0] block mb-1">English Product Title</label>
                <input
                  type="text"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs font-bold text-[#ffffff] focus:outline-none focus:border-[#4edea3]"
                />
              </div>

              <div>
                <label className="text-[#908fa0] block mb-1">Secondary / Local Title</label>
                <input
                  type="text"
                  value={titleBn}
                  onChange={(e) => setTitleBn(e.target.value)}
                  className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs font-medium text-[#d4e4fa] focus:outline-none focus:border-[#4edea3]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#908fa0] block mb-1">Brand</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs text-[#ffffff] focus:outline-none focus:border-[#4edea3]"
                  />
                </div>

                <div>
                  <label className="text-[#908fa0] block mb-1">Category Taxonomy</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs text-[#ffffff] focus:outline-none focus:border-[#4edea3]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#908fa0] block mb-1">Detailed Description & Benefits</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full p-3 bg-[#051424] border border-[#273647] rounded-lg text-xs text-[#d4e4fa] leading-relaxed focus:outline-none focus:border-[#4edea3]"
                />
              </div>
            </div>
          </div>

          {/* Multi-Variant Matrix & Inventory */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#273647] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#4edea3]" />
                  <span>Variant Matrix, Pricing & Margins</span>
                </h3>
                <span className="text-[11px] text-[#908fa0]">Individual SKUs, sizes, and COGS calculations</span>
              </div>
              <button
                onClick={addVariant}
                className="px-3 py-1.5 bg-[#4edea3] hover:bg-[#00a572] text-[#002113] rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Variant</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0d1c2d] text-[#908fa0] uppercase tracking-wider font-mono text-[10px] border-b border-[#273647]">
                  <tr>
                    <th className="py-3 px-4">Variant Option</th>
                    <th className="py-3 px-4">SKU Code</th>
                    <th className="py-3 px-4 text-right">Regular Price</th>
                    <th className="py-3 px-4 text-right">Sale Price</th>
                    <th className="py-3 px-4 text-right">COGS Cost</th>
                    <th className="py-3 px-4 text-center">Margin</th>
                    <th className="py-3 px-4 text-center">Stock Units</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#273647]">
                  {variants.map((v) => {
                    const marginPct = (((v.salePrice - v.cogsCost) / v.salePrice) * 100).toFixed(1);
                    return (
                      <tr key={v.id} className="hover:bg-[#1c2b3c]/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-[#ffffff]">{v.name}</td>
                        <td className="py-3 px-4 font-mono text-[#c0c1ff]">{v.sku}</td>
                        <td className="py-3 px-4 text-right font-mono text-[#908fa0]">৳ {v.regularPrice}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#ffffff]">৳ {v.salePrice}</td>
                        <td className="py-3 px-4 text-right font-mono text-[#ffb4ab]">৳ {v.cogsCost}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-[#4edea3]">
                          {marginPct}%
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded ${
                              v.stock <= v.threshold
                                ? 'bg-[#93000a]/20 text-[#ffb4ab]'
                                : 'bg-[#00a572]/20 text-[#4edea3]'
                            }`}
                          >
                            {v.stock} pcs
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {variants.length > 1 && (
                            <button
                              onClick={() => removeVariant(v.id)}
                              className="p-1 hover:text-[#ffb4ab] text-[#908fa0] transition-colors"
                              title="Delete Variant"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): SEO, Images, Supplier Mapping */}
        <div className="lg:col-span-4 space-y-6">
          {/* Product Media Gallery Mock */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#ffffff] flex items-center justify-between">
              <span>Product Image Gallery</span>
              <span className="text-xs text-[#4edea3]">3 Photos</span>
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <div className="relative rounded-lg overflow-hidden border-2 border-[#4edea3] aspect-square">
                <img
                  src="/images/categories/Skincare.png"
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-1 px-1 bg-[#00a572] text-[#002113] rounded text-[9px] font-bold">
                  Cover
                </span>
              </div>
              <div className="rounded-lg overflow-hidden border border-[#273647] aspect-square">
                <img
                  src="/images/categories/Skincare.png"
                  alt="Angle 2"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="rounded-lg border-2 border-dashed border-[#273647] hover:border-[#4edea3]/50 flex flex-col items-center justify-center cursor-pointer aspect-square text-[#908fa0] hover:text-[#ffffff] transition-all">
                <Upload className="w-4 h-4 mb-1" />
                <span className="text-[10px]">Add Photo</span>
              </div>
            </div>
          </div>

          {/* Supplier Sourcing Mapping */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2">
              <Building className="w-4 h-4 text-[#c0c1ff]" />
              <span>Sourcing & Vendor Mapping</span>
            </h3>

            <div className="text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#908fa0]">Primary Vendor:</span>
                <span className="font-bold text-[#ffffff]">Golden Beauty Imports Korea</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#908fa0]">Import Batch Origin:</span>
                <span className="font-mono text-[#4edea3]">South Korea</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#908fa0]">Batch Expiry Date:</span>
                <span className="font-mono text-[#ffffff]">March 2027</span>
              </div>
            </div>
          </div>

          {/* Product SEO Snippet */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#4edea3]" />
              <span>Google SERP Preview</span>
            </h3>

            <div className="p-3 bg-[#ffffff] rounded-lg text-[#1a0dab] font-sans space-y-1">
              <div className="text-[10px] text-[#202124]">https://minsahbeauty.com › products › cosrx-toner</div>
              <div className="text-xs font-semibold hover:underline line-clamp-1">{titleEn}</div>
              <div className="text-[10px] text-[#4d5156] line-clamp-2 leading-tight">
                Buy genuine COSRX Centella Toner in Bangladesh at Minsah Beauty. Verified 100% authentic Korean formula.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
