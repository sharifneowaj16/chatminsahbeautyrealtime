'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import { useCategories } from '@/contexts/CategoriesContext';
import ProductFaqSection, { FaqItem } from '@/components/admin/ProductFaqSection';
import { adminFetchJson } from '@/lib/adminFetch';
import {
  ArrowLeft, ClipboardPaste, CheckCircle, AlertCircle,
  Upload, Save, X, Loader2, Tag, Package, Search,
  TruckIcon, ChevronDown, ChevronUp, Sparkles, Info, HelpCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ImportVariant {
  size: string;
  color: string;
  price: string;   // blank from Claude — user fills
  stock: string;
  sku: string;
}

interface ImportData {
  name: string;
  category: string;
  subcategory: string;
  item: string;
  brand: string;
  originCountry: string;
  featured: boolean;
  description: string;
  weight: string;
  ingredients: string;
  skinType: string[];
  shelfLife: string;
  variants: ImportVariant[];
  metaTitle: string;
  metaDescription: string;
  bengaliProductName: string;
  bengaliMetaDescription: string;
  focusKeyword: string;
  ogTitle: string;
  urlSlug: string;
  tags: string;
  shippingWeight: string;
  dimensions: { length: string; width: string; height: string };
  isFragile: boolean;
  flashSaleEligible: boolean;
  lowStockThreshold: string;
  returnEligible: boolean;
  codAvailable: boolean;
  preOrderOption: boolean;
  marketPriceNote: string;
  faqs: FaqItem[];
}

interface ParseResult {
  data: ImportData | null;
  error: string | null;
}

const skinTypes = ['Oily', 'Dry', 'Combination', 'Sensitive', 'Normal', 'All Skin Types'];
const countries = [
  'Bangladesh (Local)', 'USA', 'France', 'UK', 'Japan',
  'South Korea', 'Germany', 'Italy', 'Thailand', 'India', 'China',
];

// ─── Parse IMPORT_DATA from Claude output ────────────────────────────────────
function parseImportData(raw: string): ParseResult {
  try {
    // Extract between [IMPORT_DATA] ... [/IMPORT_DATA]
    const match = raw.match(/\[IMPORT_DATA\]([\s\S]*?)\[\/IMPORT_DATA\]/i);
    if (!match) {
      // Try parsing as raw JSON directly (if user pasted just the JSON)
      const trimmed = raw.trim();
      if (trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        return { data: normalizeImportData(parsed), error: null };
      }
      return {
        data: null,
        error: '[IMPORT_DATA] block পাওয়া যায়নি। Claude এর output এ [IMPORT_DATA]...[/IMPORT_DATA] block সহ paste করো।',
      };
    }

    const jsonStr = match[1].trim();
    const parsed = JSON.parse(jsonStr);
    return { data: normalizeImportData(parsed), error: null };
  } catch (e) {
    return {
      data: null,
      error: `JSON parse error: ${e instanceof Error ? e.message : 'Invalid format'}`,
    };
  }
}

function normalizeImportData(p: Record<string, unknown>): ImportData {
  return {
    name:           String(p.name || ''),
    category:       String(p.category || ''),
    subcategory:    String(p.subcategory || ''),
    item:           String(p.item || ''),
    brand:          String(p.brand || ''),
    originCountry:  String(p.originCountry || 'Bangladesh (Local)'),
    featured:       Boolean(p.featured),
    description:    String(p.description || '').replace(/\\n/g, '\n'),
    weight:         String(p.weight || ''),
    ingredients:    String(p.ingredients || ''),
    skinType:       Array.isArray(p.skinType) ? (p.skinType as string[]) : [],
    shelfLife:      String(p.shelfLife || ''),
    variants:       Array.isArray(p.variants)
      ? (p.variants as Array<Record<string, unknown>>).map((v, i) => ({
          size:  String(v.size  || ''),
          color: String(v.color || ''),
          price: '',   // always blank — user fills
          stock: String(v.stock || '10'),
          sku:   String(v.sku   || `MSH-VAR-${i + 1}`),
        }))
      : [{ size: '', color: '', price: '', stock: '10', sku: '' }],
    metaTitle:              String(p.metaTitle              || ''),
    metaDescription:        String(p.metaDescription        || ''),
    bengaliProductName:     String(p.bengaliProductName     || ''),
    bengaliMetaDescription: String(p.bengaliMetaDescription || ''),
    focusKeyword:           String(p.focusKeyword           || ''),
    ogTitle:                String(p.ogTitle                || ''),
    urlSlug:                String(p.urlSlug                || ''),
    tags:                   String(p.tags                   || ''),
    shippingWeight:         String(p.shippingWeight         || ''),
    dimensions: {
      length: String((p.dimensions as Record<string, unknown>)?.length || ''),
      width:  String((p.dimensions as Record<string, unknown>)?.width  || ''),
      height: String((p.dimensions as Record<string, unknown>)?.height || ''),
    },
    isFragile:          Boolean(p.isFragile),
    flashSaleEligible:  Boolean(p.flashSaleEligible),
    lowStockThreshold:  String(p.lowStockThreshold || '10'),
    returnEligible:     p.returnEligible !== false,
    codAvailable:       p.codAvailable   !== false,
    preOrderOption:     Boolean(p.preOrderOption),
    marketPriceNote:    String(p.marketPriceNote || ''),
    faqs: Array.isArray(p.faqs)
      ? (p.faqs as Array<Record<string, unknown>>).map((faq, i) => ({
          id:       String(faq.id       || `faq-import-${Date.now()}-${i}`),
          question: String(faq.question || ''),
          answer:   String(faq.answer   || ''),
        }))
      : [],
  };
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ImportProductPage() {
  const router = useRouter();
  const { hasPermission } = useAdminAuth();
  const { getActiveCategories } = useCategories();

  const categoriesData = useMemo(() =>
    getActiveCategories().map((cat) => ({ name: cat.name, subcategories: cat.subcategories })),
    [getActiveCategories]
  );

  // ── State ──
  const [pasteText, setPasteText]     = useState('');
  const [parseError, setParseError]   = useState('');
  const [importData, setImportData]   = useState<ImportData | null>(null);
  const [step, setStep]               = useState<'paste' | 'review'>('paste');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true, variants: true, seo: false, shipping: false, options: false, faqs: false,
  });

  if (!hasPermission(PERMISSIONS.PRODUCTS_CREATE)) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">You don&apos;t have permission to create products.</p>
        </div>
      </div>
    );
  }

  // ── Helpers ──
  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleParse = () => {
    if (!pasteText.trim()) {
      setParseError('Claude এর output paste করো।');
      return;
    }
    const result = parseImportData(pasteText);
    if (result.error) {
      setParseError(result.error);
      setImportData(null);
    } else {
      setParseError('');
      setImportData(result.data);
      setStep('review');
    }
  };

  const updateField = (field: keyof ImportData, value: unknown) => {
    setImportData((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const updateVariant = (index: number, field: keyof ImportVariant, value: string) => {
    setImportData((prev) => {
      if (!prev) return prev;
      const variants = prev.variants.map((v, i) => i === index ? { ...v, [field]: value } : v);
      return { ...prev, variants };
    });
  };

  const updateDimension = (field: 'length' | 'width' | 'height', value: string) => {
    setImportData((prev) => prev ? { ...prev, dimensions: { ...prev.dimensions, [field]: value } } : prev);
  };

  const toggleSkinType = (type: string) => {
    setImportData((prev) => {
      if (!prev) return prev;
      const skinType = prev.skinType.includes(type)
        ? prev.skinType.filter((t) => t !== type)
        : [...prev.skinType, type];
      return { ...prev, skinType };
    });
  };

  // ── Validate before submit ──
  const validate = (): string[] => {
    if (!importData) return ['No data'];
    const errs: string[] = [];
    if (!importData.name.trim()) errs.push('Product name required');
    if (!importData.brand.trim()) errs.push('Brand required');
    if (!importData.description.trim()) errs.push('Description required');
    importData.variants.forEach((v, i) => {
      if (!v.price || parseFloat(v.price) <= 0) errs.push(`Variant ${i + 1}: price required`);
      if (!v.sku.trim()) errs.push(`Variant ${i + 1}: SKU required`);
    });
    return errs;
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!importData) return;
    const errs = validate();
    if (errs.length > 0) {
      alert('Fix these before saving:\n• ' + errs.join('\n• '));
      return;
    }
    setIsSubmitting(true);
    try {
      const basePrice = parseFloat(importData.variants[0]?.price || '0') || 0;

      await adminFetchJson<{ success: boolean }>('/api/admin/products', {
        method: 'POST',
        json: {
          name:          importData.name,
          category:      importData.category,
          subcategory:   importData.subcategory   || undefined,
          item:          importData.item          || undefined,
          brand:         importData.brand,
          originCountry: importData.originCountry,
          status:        'active',
          featured:      importData.featured,
          description:   importData.description,
          weight:        importData.weight        || undefined,
          ingredients:   importData.ingredients   || undefined,
          skinType:      importData.skinType.length > 0 ? importData.skinType : undefined,
          shelfLife:     importData.shelfLife     || undefined,
          images:        [],   // user adds images after import
          variants:      importData.variants.map((v) => ({
            size:       v.size,
            color:      v.color,
            price:      parseFloat(v.price) || basePrice,
            stock:      parseInt(v.stock)   || 0,
            sku:        v.sku,
            attributes: { size: v.size || '', color: v.color || '' },
          })),
          metaTitle:          importData.metaTitle          || undefined,
          metaDescription:    importData.metaDescription    || undefined,
          urlSlug:            importData.urlSlug            || undefined,
          tags:               importData.tags               || undefined,
          bengaliName:        importData.bengaliProductName || undefined,
          bengaliDescription: importData.bengaliMetaDescription || undefined,
          focusKeyword:       importData.focusKeyword       || undefined,
          ogTitle:            importData.ogTitle            || importData.metaTitle || undefined,
          canonicalUrl:       importData.urlSlug
            ? `https://minsahbeauty.cloud/products/${importData.urlSlug}`
            : undefined,
          condition:         'NEW',
          averageRating:     0,
          reviewCount:       0,
          shippingWeight:    importData.shippingWeight || undefined,
          dimensions:        (importData.dimensions.length || importData.dimensions.width || importData.dimensions.height)
            ? importData.dimensions : undefined,
          isFragile:         importData.isFragile,
          flashSaleEligible: importData.flashSaleEligible,
          lowStockThreshold: importData.lowStockThreshold || undefined,
          returnEligible:    importData.returnEligible,
          codAvailable:      importData.codAvailable,
          preOrderOption:    importData.preOrderOption,
          faqs:              importData.faqs && importData.faqs.length > 0 ? importData.faqs : undefined,
        },
      });

      router.push('/admin/products?imported=1');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/products" className="inline-flex items-center text-purple-600 hover:text-purple-800 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Products
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Claude থেকে Product Import</h1>
        <p className="text-gray-500 text-sm mt-1">
          Claude.ai chat এ SEO generate করে [IMPORT_DATA] block টা paste করো — form auto-fill হবে
        </p>
      </div>

      {/* How to use */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 space-y-1">
            <p className="font-semibold">কীভাবে করবে:</p>
            <p>1. Claude.ai তে লেখো: <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono">{'{seo: Vitamin C Serum}'}</code></p>
            <p>2. Output এর শেষে <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono">[IMPORT_DATA]...[/IMPORT_DATA]</code> block টা copy করো</p>
            <p>3. নিচে paste করো → Parse করো → Price দাও → Save</p>
          </div>
        </div>
      </div>

      {/* ── STEP 1: Paste ── */}
      {step === 'paste' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardPaste className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Claude Output Paste করো</h2>
          </div>

          <textarea
            value={pasteText}
            onChange={(e) => { setPasteText(e.target.value); setParseError(''); }}
            rows={14}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm resize-y"
            placeholder={`এখানে Claude এর পুরো output paste করো অথবা শুধু [IMPORT_DATA]...[/IMPORT_DATA] block টা paste করো।

উদাহরণ:
[IMPORT_DATA]
{
  "name": "Vitamin C Face Serum | Brightening & Glow",
  "category": "Skin care",
  ...
}
[/IMPORT_DATA]`}
          />

          {parseError && (
            <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleParse}
              disabled={!pasteText.trim()}
              className="inline-flex items-center px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Parse করো
            </button>
            <button
              type="button"
              onClick={() => setPasteText('')}
              className="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              <X className="w-4 h-4 mr-1" /> Clear
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Review & Edit ── */}
      {step === 'review' && importData && (
        <div className="space-y-4">

          {/* Success banner + market note */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="font-semibold text-green-800">Data parse হয়েছে — review করো, price দাও, তারপর save করো</p>
            </div>
            {importData.marketPriceNote && (
              <p className="text-sm text-green-700 ml-7">
                💰 <strong>Market Reference:</strong> {importData.marketPriceNote}
              </p>
            )}
          </div>

          {/* Price warning */}
          <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Variants এ <strong>Price (BDT)</strong> blank আছে — নিচে প্রতিটা variant এ তোমার selling price দাও।</span>
          </div>

          {/* ── Basic Info ── */}
          <Section
            icon={<Package className="w-5 h-5 text-purple-600" />}
            title="Basic Information"
            sectionKey="basic"
            expanded={expandedSections.basic}
            onToggle={() => toggleSection('basic')}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input type="text" value={importData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={importData.category}
                    onChange={(e) => updateField('category', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                    {categoriesData.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
                  <input type="text" value={importData.brand}
                    onChange={(e) => updateField('brand', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                  <input type="text" value={importData.subcategory}
                    onChange={(e) => updateField('subcategory', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Origin Country</label>
                  <select value={importData.originCountry}
                    onChange={(e) => updateField('originCountry', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                    {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={importData.featured}
                    onChange={(e) => updateField('featured', e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded" />
                  <span className="text-sm text-gray-700">Featured Product</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea value={importData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={7}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (numeric)</label>
                  <input type="text" value={importData.weight}
                    onChange={(e) => updateField('weight', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., 30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shelf Life</label>
                  <input type="text" value={importData.shelfLife}
                    onChange={(e) => updateField('shelfLife', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., 24 months" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skin Type</label>
                <div className="flex flex-wrap gap-2">
                  {skinTypes.map((type) => (
                    <button key={type} type="button" onClick={() => toggleSkinType(type)}
                      className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all ${
                        importData.skinType.includes(type)
                          ? 'bg-purple-600 border-purple-600 text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-purple-400'
                      }`}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ingredients</label>
                <textarea value={importData.ingredients}
                  onChange={(e) => updateField('ingredients', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="Aqua, Glycerin, Niacinamide..." />
              </div>
            </div>
          </Section>

          {/* ── Variants (price input here) ── */}
          <Section
            icon={<Tag className="w-5 h-5 text-purple-600" />}
            title="Variants — Price দাও ⬇"
            sectionKey="variants"
            expanded={expandedSections.variants}
            onToggle={() => toggleSection('variants')}
            highlight
          >
            <div className="space-y-3">
              {importData.variants.map((v, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Variant #{i + 1}</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Size/Volume</label>
                      <input type="text" value={v.size}
                        onChange={(e) => updateVariant(i, 'size', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Color/Shade</label>
                      <input type="text" value={v.color}
                        onChange={(e) => updateVariant(i, 'color', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-amber-700 mb-1 font-semibold">
                        Price (BDT ৳) *
                      </label>
                      <input type="number" value={v.price}
                        onChange={(e) => updateVariant(i, 'price', e.target.value)}
                        className={`w-full px-3 py-2 border-2 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 font-semibold ${
                          !v.price ? 'border-amber-400 bg-amber-50' : 'border-green-400 bg-green-50'
                        }`}
                        placeholder="৳ দাও" min="0" step="1" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Stock</label>
                      <input type="number" value={v.stock}
                        onChange={(e) => updateVariant(i, 'stock', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                        min="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">SKU</label>
                      <input type="text" value={v.sku}
                        onChange={(e) => updateVariant(i, 'sku', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── SEO ── */}
          <Section
            icon={<Search className="w-5 h-5 text-purple-600" />}
            title="SEO Settings"
            sectionKey="seo"
            expanded={expandedSections.seo}
            onToggle={() => toggleSection('seo')}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta Title <span className="text-xs text-gray-400">({importData.metaTitle.length}/60)</span>
                </label>
                <input type="text" value={importData.metaTitle} maxLength={60}
                  onChange={(e) => updateField('metaTitle', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta Description <span className="text-xs text-gray-400">({importData.metaDescription.length}/160)</span>
                </label>
                <textarea value={importData.metaDescription} maxLength={160} rows={2}
                  onChange={(e) => updateField('metaDescription', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">বাংলা Product Name</label>
                  <input type="text" value={importData.bengaliProductName}
                    onChange={(e) => updateField('bengaliProductName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Focus Keyword</label>
                  <input type="text" value={importData.focusKeyword}
                    onChange={(e) => updateField('focusKeyword', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">বাংলা Meta Description</label>
                <textarea value={importData.bengaliMetaDescription} rows={2}
                  onChange={(e) => updateField('bengaliMetaDescription', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
                  <input type="text" value={importData.urlSlug}
                    onChange={(e) => updateField('urlSlug', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
                  <p className="text-xs text-gray-400 mt-1">/products/<strong>{importData.urlSlug || '...'}</strong></p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OG Title</label>
                  <input type="text" value={importData.ogTitle}
                    onChange={(e) => updateField('ogTitle', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <input type="text" value={importData.tags}
                  onChange={(e) => updateField('tags', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="tag1, tag2, ট্যাগ..." />
              </div>
            </div>
          </Section>

          {/* ── Shipping ── */}
          <Section
            icon={<TruckIcon className="w-5 h-5 text-purple-600" />}
            title="Shipping"
            sectionKey="shipping"
            expanded={expandedSections.shipping}
            onToggle={() => toggleSection('shipping')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Weight</label>
                <input type="text" value={importData.shippingWeight}
                  onChange={(e) => updateField('shippingWeight', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., 150g" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions (L × W × H cm)</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['length', 'width', 'height'] as const).map((d) => (
                    <input key={d} type="text" value={importData.dimensions[d]}
                      onChange={(e) => updateDimension(d, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                      placeholder={d.charAt(0).toUpperCase()} />
                  ))}
                </div>
              </div>
            </div>
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input type="checkbox" checked={importData.isFragile}
                onChange={(e) => updateField('isFragile', e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded" />
              <span className="text-sm text-gray-700">Fragile Item</span>
            </label>
          </Section>

          {/* ── Additional Options ── */}
          <Section
            icon={<Upload className="w-5 h-5 text-purple-600" />}
            title="Additional Options"
            sectionKey="options"
            expanded={expandedSections.options}
            onToggle={() => toggleSection('options')}
          >
            <div className="flex flex-wrap gap-4">
              {[
                { key: 'returnEligible',   label: 'Return Eligible' },
                { key: 'codAvailable',     label: 'Cash on Delivery' },
                { key: 'flashSaleEligible',label: 'Flash Sale Eligible' },
                { key: 'preOrderOption',   label: 'Pre-order' },
              ].map((opt) => (
                <label key={opt.key} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="checkbox"
                    checked={importData[opt.key as keyof ImportData] as boolean}
                    onChange={(e) => updateField(opt.key as keyof ImportData, e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded" />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Threshold</label>
              <input type="number" value={importData.lowStockThreshold}
                onChange={(e) => updateField('lowStockThreshold', e.target.value)}
                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" min="0" />
            </div>
          </Section>

          {/* ── FAQs ── */}
          <Section
            icon={<HelpCircle className="w-5 h-5 text-purple-600" />}
            title="Product FAQs (Q&A)"
            sectionKey="faqs"
            expanded={expandedSections.faqs}
            onToggle={() => toggleSection('faqs')}
          >
            <p className="text-xs text-gray-500 mb-3">
              Claude import থেকে {importData.faqs.length} টি FAQ import হয়েছে।
              Edit করতে পারো অথবা নতুন add করতে পারো।
            </p>
            <ProductFaqSection
              faqs={importData.faqs}
              onChange={(faqs) => updateField('faqs', faqs)}
            />
          </Section>

          {/* Image reminder */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-start gap-3 text-sm text-yellow-800">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Images:</strong> Save করার পর product edit page এ গিয়ে images upload করো।
              Import এ image upload support নেই।
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-5 shadow-sm sticky bottom-0">
            <button type="button"
              onClick={() => { setStep('paste'); setImportData(null); }}
              className="inline-flex items-center px-5 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
              <ArrowLeft className="w-4 h-4 mr-2" /> আবার Paste করো
            </button>
            <button type="button" onClick={handleSubmit} disabled={isSubmitting}
              className="inline-flex items-center px-8 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium shadow-lg">
              {isSubmitting
                ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Saving...</>
                : <><Save className="w-5 h-5 mr-2" /> Product Save করো</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Collapsible Section helper ───────────────────────────────────────────────
function Section({
  icon, title, sectionKey, expanded, onToggle, children, highlight = false,
}: {
  icon: React.ReactNode;
  title: string;
  sectionKey: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${highlight ? 'border-amber-300' : 'border-gray-200'}`}>
      <button type="button" onClick={onToggle}
        className={`w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors ${highlight ? 'bg-amber-50' : ''}`}>
        <div className="flex items-center gap-2">
          {icon}
          <span className={`font-semibold ${highlight ? 'text-amber-800' : 'text-gray-900'}`}>{title}</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {expanded && (
        <div className="px-6 pb-6 pt-2 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
}
