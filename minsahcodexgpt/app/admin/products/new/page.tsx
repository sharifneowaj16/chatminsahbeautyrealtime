'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import { useCategories } from '@/contexts/CategoriesContext';
import ProductFaqSection, { FaqItem } from '@/components/admin/ProductFaqSection';
import { adminFetchJson } from '@/lib/adminFetch';
import {
  ArrowLeft,
  Save,
  X,
  Upload,
  Plus,
  Trash2,
  Image as ImageIcon,
  Package,
  Tag,
  Search,
  TruckIcon,
  Percent,
  AlertCircle,
  Settings,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Megaphone,
} from 'lucide-react';

interface ProductVariant {
  id: string;
  size?: string;
  color?: string;
  price: string;
  stock: string;
  sku: string;
}

interface ProductImage {
  id: string;
  file: File;
  preview: string;
  isMain: boolean;
}

// ── PLACE 1: ProductFormData interface ────────────────────────────────────────
interface ProductFormData {
  name: string;
  category: string;
  subcategory: string;
  item: string;
  brand: string;
  originCountry: string;
  status: 'active' | 'inactive' | 'out_of_stock';
  featured: boolean;
  description: string;
  weight: string;
  ingredients: string;
  skinType: string[];
  expiryDate: string;
  shelfLife: string;
  productCondition: 'NEW' | 'USED' | 'REFURBISHED';
  gtin: string;
  averageRating: number;
  reviewCount: number;
  images: ProductImage[];
  variants: ProductVariant[];
  metaTitle: string;
  metaDescription: string;
  urlSlug: string;
  tags: string;
  bengaliProductName: string;
  bengaliMetaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string[];        // ← NEW
  bengaliFocusKeyword: string;        // ← NEW
  ogTitle: string;
  ogDescription: string;              // ← NEW
  ogImageUrl: string;
  canonicalUrl: string;
  pageH1: string;
  seoIntro: string;
  faqSchemaNote: string;
  authenticityNote: string;
  ingredientVerificationStatus: string;
  seoValidationChecklist: string[];
  structuredDataJsonLdJson: string;
  productGroupJsonLdJson: string;
  merchantListingJsonLdJson: string;
  breadcrumbJsonLdJson: string;
  sitemapIndexingJson: string;
  variantUrlStrategyJson: string;
  variantPriceTableJson: string;
  variantComparisonTableJson: string;
  internalLinksJson: string;
  bengaliSecondaryKeywords: string[];
  searchIntent: string;
  targetAudience: string;
  primaryConcern: string;
  keyBenefits: string[];
  buyingIntentKeywords: string[];
  searchTags: string[];
  synonyms: string[];
  banglaSearchTerms: string[];
  reviewKeywords: string[];
  entities: string[];
  productSpecsJson: string;
  productAttributesJson: string;
  shadeOptionsJson: string;
  usageInstructions: string[];
  descriptionSectionsJson: string;
  faqSchemaReady: boolean;
  gender: string;
  ogImageFile: File | null;
  ogImagePreview: string;
  imageAltTexts: string[];
  shippingWeight: string;
  dimensions: { length: string; width: string; height: string };
  isFragile: boolean;
  discountPercentage: string;
  salePrice: string;
  offerStartDate: string;
  offerEndDate: string;
  flashSaleEligible: boolean;
  lowStockThreshold: string;
  barcode: string;
  returnEligible: boolean;
  codAvailable: boolean;
  preOrderOption: boolean;
  relatedProducts: string;
  faqs: FaqItem[];
}

interface AiFacebookAdAngle {
  headline: string;
  primaryText: string;
  targetAudience: string;
}

const brands = [
  'Maybelline', "L'Oréal Paris", 'MAC', 'Estée Lauder', 'Clinique',
  'Lancôme', 'NARS', 'Urban Decay', 'Chanel', 'Dior', 'Fresh',
  'Neutrogena', 'CeraVe', 'The Ordinary', 'Other',
];

const countries = [
  'Bangladesh (Local)', 'USA', 'France', 'UK', 'Japan',
  'South Korea', 'Germany', 'Italy', 'Thailand', 'India', 'China',
];

const skinTypes = ['Oily', 'Dry', 'Combination', 'Sensitive', 'Normal', 'All Skin Types'];

// ── PLACE 1 (cont.): defaultForm ──────────────────────────────────────────────
const defaultForm: ProductFormData = {
  name: '', category: 'Make Up', subcategory: '', item: '', brand: '',
  originCountry: 'Bangladesh (Local)', status: 'active', featured: false,
  description: '', weight: '', ingredients: '', skinType: [], expiryDate: '',
  shelfLife: '', images: [],
  variants: [{ id: '1', size: '', color: '', price: '', stock: '', sku: '' }],
  metaTitle: '', metaDescription: '', urlSlug: '', tags: '',
  bengaliProductName: '', bengaliMetaDescription: '', focusKeyword: '',
  secondaryKeywords: [],              // ← NEW
  bengaliFocusKeyword: '',            // ← NEW
  ogTitle: '', ogDescription: '',     // ← NEW ogDescription
  ogImageUrl: '', canonicalUrl: '', pageH1: '', seoIntro: '', faqSchemaNote: '',
  authenticityNote: '', ingredientVerificationStatus: '', seoValidationChecklist: [],
  structuredDataJsonLdJson: '{}', productGroupJsonLdJson: '{}', merchantListingJsonLdJson: '{}',
  breadcrumbJsonLdJson: '{}', sitemapIndexingJson: '{}', variantUrlStrategyJson: '{}',
  variantPriceTableJson: '[]', variantComparisonTableJson: '[]', internalLinksJson: '[]',
  bengaliSecondaryKeywords: [], searchIntent: '', targetAudience: '', primaryConcern: '',
  keyBenefits: [], buyingIntentKeywords: [], searchTags: [], synonyms: [],
  banglaSearchTerms: [], reviewKeywords: [], entities: [], usageInstructions: [],
  productSpecsJson: '{}', productAttributesJson: '{}', shadeOptionsJson: '[]',
  descriptionSectionsJson: '[]', faqSchemaReady: false, gender: '',
  ogImageFile: null, ogImagePreview: '', imageAltTexts: [],
  productCondition: 'NEW', gtin: '', averageRating: 0, reviewCount: 0,
  shippingWeight: '', dimensions: { length: '', width: '', height: '' },
  isFragile: false, discountPercentage: '', salePrice: '',
  offerStartDate: '', offerEndDate: '', flashSaleEligible: false,
  lowStockThreshold: '10', barcode: '',
  returnEligible: true, codAvailable: true, preOrderOption: false, relatedProducts: '', faqs: [],
};

export default function NewProductPage() {
  const router = useRouter();
  const { hasPermission } = useAdminAuth();
  const { getActiveCategories } = useCategories();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoriesData = useMemo(() => {
    return getActiveCategories().map((cat) => ({
      name: cat.name,
      subcategories: cat.subcategories,
    }));
  }, [getActiveCategories]);

  const [formData, setFormData] = useState<ProductFormData>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── AI Generate state ──
  const [aiInput, setAiInput] = useState('');
  const [aiModel, setAiModel] = useState('claude-sonnet-4-20250514');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [facebookAdAngle, setFacebookAdAngle] = useState<AiFacebookAdAngle | null>(null);
  const [showAdAngle, setShowAdAngle] = useState(false);
  const [aiApplied, setAiApplied] = useState(false);
  const [aiAppliedModel, setAiAppliedModel] = useState('');
  const [marketNote, setMarketNote] = useState('');
  const [competitionNote, setCompetitionNote] = useState('');

  const AI_MODELS = [
    {
      id: 'claude-haiku-4-5-20251001',
      label: 'Haiku — দ্রুত (~5s)',
      badge: 'সাশ্রয়ী',
      badgeColor: 'bg-green-100 text-green-700',
      cost: '~$0.02/product',
      note: 'Simple products এর জন্য ভালো',
    },
    {
      id: 'claude-sonnet-4-20250514',
      label: 'Sonnet — balanced (~12s)',
      badge: 'Recommended',
      badgeColor: 'bg-purple-100 text-purple-700',
      cost: '~$0.09/product',
      note: 'Best quality-cost balance',
    },
    {
      id: 'claude-opus-4-20250514',
      label: 'Opus — সেরা (~25s)',
      badge: 'Premium',
      badgeColor: 'bg-amber-100 text-amber-700',
      cost: '~$0.40/product',
      note: 'Complex/premium products এর জন্য',
    },
  ];

  if (!hasPermission(PERMISSIONS.PRODUCTS_CREATE)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">You don&apos;t have permission to create products.</p>
      </div>
    );
  }

  // ── PLACE 2a: AI Generate handler — mapping ────────────────────────────────
  const handleAiGenerate = async () => {
    if (!aiInput.trim()) return;
    setIsGenerating(true);
    setAiError('');
    setFacebookAdAngle(null);
    setAiApplied(false);

    try {
      const data = await adminFetchJson<{ success: boolean; product: Record<string, unknown> }>(
        '/api/admin/products/ai-generate',
        { method: 'POST', json: { productName: aiInput.trim(), model: aiModel } }
      );

      if (!data.success || !data.product) throw new Error('No product data returned');

      const p = data.product as Record<string, unknown>;

      if (p.facebookAdAngle) {
        setFacebookAdAngle(p.facebookAdAngle as AiFacebookAdAngle);
        setShowAdAngle(true);
      }
      if (p.marketPriceNote) setMarketNote(String(p.marketPriceNote));
      if (p.competitionNote) setCompetitionNote(String(p.competitionNote));

      const variants: ProductVariant[] = Array.isArray(p.variants) && (p.variants as unknown[]).length > 0
        ? (p.variants as Array<Record<string, unknown>>).map((v, i) => ({
            id: String(v.id || Date.now() + i),
            size: String(v.size || ''),
            color: String(v.color || ''),
            price: '',
            stock: String(v.stock || '10'),
            sku: String(v.sku || ''),
          }))
        : defaultForm.variants;

      const dims = (p.dimensions as Record<string, string> | undefined) || { length: '', width: '', height: '' };

      setFormData((prev) => ({
        ...prev,
        name:           String(p.name || prev.name),
        category:       String(p.category || prev.category),
        subcategory:    String(p.subcategory || ''),
        item:           String(p.item || ''),
        brand:          String(p.brand || prev.brand),
        originCountry:  String(p.originCountry || 'Bangladesh (Local)'),
        status:         'active',
        featured:       Boolean(p.featured),
        description:    String(p.description || ''),
        weight:         String(p.weight || ''),
        ingredients:    String(p.ingredients || ''),
        skinType:       Array.isArray(p.skinType) ? (p.skinType as string[]) : [],
        shelfLife:      String(p.shelfLife || ''),
        productCondition: 'NEW',
        averageRating:  0,
        reviewCount:    0,
        variants,
        metaTitle:              String(p.metaTitle || ''),
        metaDescription:        String(p.metaDescription || ''),
        urlSlug:                String(p.urlSlug || ''),
        tags:                   String(p.tags || ''),
        bengaliProductName:     String(p.bengaliProductName || ''),
        bengaliMetaDescription: String(p.bengaliMetaDescription || ''),
        focusKeyword:           String(p.focusKeyword || ''),
        // ── NEW AI mapping ───────────────────────────────────────────────
        secondaryKeywords:   Array.isArray(p.secondaryKeywords)
          ? (p.secondaryKeywords as string[]).map(String)
          : [],
        bengaliFocusKeyword: String(p.bengaliFocusKeyword || ''),
        ogDescription:       String(p.ogDescription || ''),
        ogImageUrl:          String(p.ogImageUrl || ''),
        canonicalUrl:        String(p.canonicalUrl || ''),
        pageH1:              String(p.pageH1 || ''),
        seoIntro:            String(p.seoIntro || ''),
        faqSchemaNote:       String(p.faqSchemaNote || ''),
        authenticityNote:    String(p.authenticityNote || ''),
        ingredientVerificationStatus: String(p.ingredientVerificationStatus || ''),
        seoValidationChecklist: Array.isArray(p.seoValidationChecklist) ? (p.seoValidationChecklist as string[]).map(String) : [],
        structuredDataJsonLdJson: JSON.stringify(p.structuredDataJsonLd || {}, null, 2),
        productGroupJsonLdJson: JSON.stringify(p.productGroupJsonLd || {}, null, 2),
        merchantListingJsonLdJson: JSON.stringify(p.merchantListingJsonLd || {}, null, 2),
        breadcrumbJsonLdJson: JSON.stringify(p.breadcrumbJsonLd || {}, null, 2),
        sitemapIndexingJson: JSON.stringify(p.sitemapIndexing || {}, null, 2),
        variantUrlStrategyJson: JSON.stringify(p.variantUrlStrategy || {}, null, 2),
        variantPriceTableJson: JSON.stringify(Array.isArray(p.variantPriceTable) ? p.variantPriceTable : [], null, 2),
        variantComparisonTableJson: JSON.stringify(Array.isArray(p.variantComparisonTable) ? p.variantComparisonTable : [], null, 2),
        internalLinksJson: JSON.stringify(Array.isArray(p.internalLinks) ? p.internalLinks : [], null, 2),
        bengaliSecondaryKeywords: Array.isArray(p.bengaliSecondaryKeywords) ? (p.bengaliSecondaryKeywords as string[]).map(String) : [],
        searchIntent:        String(p.searchIntent || ''),
        targetAudience:      String(p.targetAudience || ''),
        primaryConcern:      String(p.primaryConcern || ''),
        keyBenefits:         Array.isArray(p.keyBenefits) ? (p.keyBenefits as string[]).map(String) : [],
        buyingIntentKeywords: Array.isArray(p.buyingIntentKeywords) ? (p.buyingIntentKeywords as string[]).map(String) : [],
        searchTags:          Array.isArray(p.searchTags) ? (p.searchTags as string[]).map(String) : [],
        synonyms:            Array.isArray(p.synonyms) ? (p.synonyms as string[]).map(String) : [],
        banglaSearchTerms:   Array.isArray(p.banglaSearchTerms) ? (p.banglaSearchTerms as string[]).map(String) : [],
        reviewKeywords:      Array.isArray(p.reviewKeywords) ? (p.reviewKeywords as string[]).map(String) : [],
        entities:            Array.isArray(p.entities) ? (p.entities as string[]).map(String) : [],
        productSpecsJson:    JSON.stringify(p.productSpecs || p.product_specs || {}, null, 2),
        productAttributesJson: JSON.stringify(p.productAttributes || p.attributes || {}, null, 2),
        shadeOptionsJson:    JSON.stringify(Array.isArray(p.shadeOptions) ? p.shadeOptions : [], null, 2),
        usageInstructions:   Array.isArray(p.usageInstructions) ? (p.usageInstructions as string[]).map(String) : [],
        descriptionSectionsJson: JSON.stringify(Array.isArray(p.descriptionSections) ? p.descriptionSections : [], null, 2),
        faqSchemaReady:      Boolean(p.faqSchemaReady),
        gender:              String(p.gender || ''),
        // ────────────────────────────────────────────────────────────────
        ogTitle:                String(p.ogTitle || ''),
        shippingWeight:         String(p.shippingWeight || ''),
        dimensions: {
          length: String(dims.length || ''),
          width:  String(dims.width  || ''),
          height: String(dims.height || ''),
        },
        isFragile:          Boolean(p.isFragile),
        flashSaleEligible:  Boolean(p.flashSaleEligible),
        lowStockThreshold:  String(p.lowStockThreshold || '10'),
        returnEligible:     p.returnEligible !== false,
        codAvailable:       p.codAvailable   !== false,
        preOrderOption:     Boolean(p.preOrderOption),
      }));

      setAiApplied(true);
      setAiAppliedModel(aiModel);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Image handlers ────────────────────────────────────────────────────
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newImages: ProductImage[] = [];
    Array.from(files).forEach((file, index) => {
      if (!file.type.startsWith('image/')) { alert(`File ${file.name} is not an image`); return; }
      if (file.size > 10 * 1024 * 1024) { alert(`File ${file.name} exceeds 10MB`); return; }
      newImages.push({
        id: `${Date.now()}_${index}`,
        file,
        preview: URL.createObjectURL(file),
        isMain: formData.images.length === 0 && index === 0,
      });
    });
    if (newImages.length > 0) {
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...newImages],
        imageAltTexts: [...prev.imageAltTexts, ...Array(newImages.length).fill('')],
      }));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (imageId: string) => {
    setFormData((prev) => {
      const idx = prev.images.findIndex((img) => img.id === imageId);
      URL.revokeObjectURL(prev.images[idx]?.preview || '');
      const newImages = prev.images.filter((img) => img.id !== imageId);
      const newAlts = prev.imageAltTexts.filter((_, i) => i !== idx);
      if (newImages.length > 0 && !newImages.some((img) => img.isMain)) newImages[0].isMain = true;
      return { ...prev, images: newImages, imageAltTexts: newAlts };
    });
  };

  const handleSetMainImage = (imageId: string) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.map((img) => ({ ...img, isMain: img.id === imageId })),
    }));
  };

  const handleOgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('OG Image must be under 5MB'); return; }
    setFormData((prev) => ({ ...prev, ogImageFile: file, ogImagePreview: URL.createObjectURL(file) }));
  };

  const handleImageAltTextChange = (index: number, value: string) => {
    setFormData((prev) => {
      const newAlts = [...prev.imageAltTexts];
      newAlts[index] = value;
      return { ...prev, imageAltTexts: newAlts };
    });
  };

  // ── Variant handlers ──────────────────────────────────────────────────
  const handleAddVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [...prev.variants, { id: Date.now().toString(), size: '', color: '', price: '', stock: '', sku: `SKU-${Date.now()}` }],
    }));
  };

  const handleRemoveVariant = (variantId: string) => {
    if (formData.variants.length <= 1) { alert('At least one variant is required'); return; }
    setFormData((prev) => ({ ...prev, variants: prev.variants.filter((v) => v.id !== variantId) }));
  };

  const handleVariantChange = (variantId: string, field: keyof ProductVariant, value: string) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v) => (v.id === variantId ? { ...v, [field]: value } : v)),
    }));
  };

  const handleSkinTypeToggle = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      skinType: prev.skinType.includes(type)
        ? prev.skinType.filter((t) => t !== type)
        : [...prev.skinType, type],
    }));
  };

  // ── Secondary keywords helper ──────────────────────────────────────────
  const handleSecondaryKeywordsChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      secondaryKeywords: value.split(',').map((s) => s.trim()).filter(Boolean),
    }));
  };

  const handleArrayFieldChange = (field: keyof ProductFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value.split(',').map((s) => s.trim()).filter(Boolean),
    }));
  };

  const parseJsonField = (field: keyof ProductFormData, fallback: unknown) => {
    const rawValue = formData[field];
    if (typeof rawValue !== 'string' || !rawValue.trim()) return fallback;

    try {
      return JSON.parse(rawValue);
    } catch {
      throw new Error(`${String(field)} must be valid JSON`);
    }
  };

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      urlSlug: prev.urlSlug === '' ? generateSlug(name) : prev.urlSlug,
      metaTitle: prev.metaTitle === '' ? name : prev.metaTitle,
    }));
  };

  const handleDiscountChange = (discount: string) => {
    setFormData((prev) => {
      const p = parseFloat(prev.variants[0]?.price || '0');
      const d = parseFloat(discount);
      const sale = !isNaN(p) && !isNaN(d) ? (p - (p * d) / 100).toFixed(2) : '';
      return { ...prev, discountPercentage: discount, salePrice: sale };
    });
  };

  const isValidOptionalNumber = (value: string) => !value.trim() || Number.isFinite(Number(value));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  const handleDimensionChange = (field: 'length' | 'width' | 'height', value: string) => {
    setFormData((prev) => ({ ...prev, dimensions: { ...prev.dimensions, [field]: value } }));
  };

  // ── Validate ──────────────────────────────────────────────────────────
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.brand.trim()) newErrors.brand = 'Brand is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (formData.images.length === 0) newErrors.images = 'At least one product image is required';
    formData.variants.forEach((v) => {
      if (!v.price || parseFloat(v.price) <= 0) newErrors[`variant_${v.id}_price`] = 'Valid price required';
      if (v.stock === '' || parseInt(v.stock) < 0) newErrors[`variant_${v.id}_stock`] = 'Valid stock required';
      if (!v.sku.trim()) newErrors[`variant_${v.id}_sku`] = 'SKU required';
    });
    if (!isValidOptionalNumber(formData.weight)) newErrors.weight = 'Weight must be a valid number';
    if (!isValidOptionalNumber(formData.dimensions.length)) newErrors.dimensions_length = 'Length must be a number';
    if (!isValidOptionalNumber(formData.dimensions.width)) newErrors.dimensions_width = 'Width must be a number';
    if (!isValidOptionalNumber(formData.dimensions.height)) newErrors.dimensions_height = 'Height must be a number';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── PLACE 2b: Submit — payload ─────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      alert('Please fix all errors before submitting');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setIsSubmitting(true);
    try {
      const uploadedImageUrls: string[] = [];
      for (const image of formData.images) {
        const uploadForm = new FormData();
        uploadForm.append('file', image.file);
        uploadForm.append('folder', 'products/new');
        const uploadData = await adminFetchJson<{ url: string }>('/api/upload', { method: 'POST', body: uploadForm });
        uploadedImageUrls.push(uploadData.url);
      }

      const mainIndex = formData.images.findIndex((img) => img.isMain);
      if (mainIndex > 0) {
        const [mainUrl] = uploadedImageUrls.splice(mainIndex, 1);
        uploadedImageUrls.unshift(mainUrl);
        const [mainAlt] = formData.imageAltTexts.splice(mainIndex, 1);
        formData.imageAltTexts.unshift(mainAlt);
      }

      let uploadedOgImageUrl: string | undefined;
      if (formData.ogImageFile) {
        const ogForm = new FormData();
        ogForm.append('file', formData.ogImageFile);
        ogForm.append('folder', 'products/og-images');
        const ogData = await adminFetchJson<{ url: string }>('/api/upload', { method: 'POST', body: ogForm });
        uploadedOgImageUrl = ogData.url;
      }

      const basePrice = parseFloat(formData.variants[0]?.price || '0') || 0;
      const originalPrice = formData.discountPercentage
        ? basePrice / (1 - parseFloat(formData.discountPercentage) / 100)
        : formData.salePrice ? parseFloat(formData.salePrice) : undefined;
      const productSpecs = parseJsonField('productSpecsJson', {});
      const productAttributes = parseJsonField('productAttributesJson', {});
      const shadeOptions = parseJsonField('shadeOptionsJson', []);
      const descriptionSections = parseJsonField('descriptionSectionsJson', []);
      const structuredDataJsonLd = parseJsonField('structuredDataJsonLdJson', {});
      const productGroupJsonLd = parseJsonField('productGroupJsonLdJson', {});
      const merchantListingJsonLd = parseJsonField('merchantListingJsonLdJson', {});
      const breadcrumbJsonLd = parseJsonField('breadcrumbJsonLdJson', {});
      const sitemapIndexing = parseJsonField('sitemapIndexingJson', {});
      const variantUrlStrategy = parseJsonField('variantUrlStrategyJson', {});
      const variantPriceTable = parseJsonField('variantPriceTableJson', []);
      const variantComparisonTable = parseJsonField('variantComparisonTableJson', []);
      const internalLinks = parseJsonField('internalLinksJson', []);

      await adminFetchJson<{ success: boolean }>('/api/admin/products', {
        method: 'POST',
        json: {
          name: formData.name, category: formData.category, subcategory: formData.subcategory || undefined,
          item: formData.item || undefined, brand: formData.brand, originCountry: formData.originCountry,
          status: formData.status, featured: formData.featured, description: formData.description,
          weight: formData.weight || undefined, ingredients: formData.ingredients || undefined,
          skinType: formData.skinType.length > 0 ? formData.skinType : undefined,
          expiryDate: formData.expiryDate || undefined, shelfLife: formData.shelfLife || undefined,
          images: uploadedImageUrls.map((url, i) => ({
            url, alt: formData.imageAltTexts[i] || formData.name,
            title: formData.imageAltTexts[i] || formData.name,
          })),
          variants: formData.variants,
          metaTitle: formData.metaTitle || undefined, metaDescription: formData.metaDescription || undefined,
          urlSlug: formData.urlSlug || undefined, tags: formData.tags || undefined,
          bengaliName: formData.bengaliProductName || undefined,
          bengaliDescription: formData.bengaliMetaDescription || undefined,
          focusKeyword: formData.focusKeyword || undefined,
          // ── NEW submit payload ────────────────────────────────────────
          secondaryKeywords:   formData.secondaryKeywords.length > 0 ? formData.secondaryKeywords : undefined,
          bengaliFocusKeyword: formData.bengaliFocusKeyword || undefined,
          ogDescription:       formData.ogDescription || undefined,
          pageH1:              formData.pageH1 || undefined,
          seoIntro:            formData.seoIntro || undefined,
          faqSchemaNote:       formData.faqSchemaNote || undefined,
          authenticityNote:    formData.authenticityNote || undefined,
          ingredientVerificationStatus: formData.ingredientVerificationStatus || undefined,
          seoValidationChecklist: formData.seoValidationChecklist.length > 0 ? formData.seoValidationChecklist : undefined,
          structuredDataJsonLd,
          productGroupJsonLd,
          merchantListingJsonLd,
          breadcrumbJsonLd,
          sitemapIndexing,
          variantUrlStrategy,
          variantPriceTable,
          variantComparisonTable,
          internalLinks,
          bengaliSecondaryKeywords: formData.bengaliSecondaryKeywords.length > 0 ? formData.bengaliSecondaryKeywords : undefined,
          searchIntent:        formData.searchIntent || undefined,
          targetAudience:      formData.targetAudience || undefined,
          primaryConcern:      formData.primaryConcern || undefined,
          keyBenefits:         formData.keyBenefits.length > 0 ? formData.keyBenefits : undefined,
          buyingIntentKeywords: formData.buyingIntentKeywords.length > 0 ? formData.buyingIntentKeywords : undefined,
          searchTags:          formData.searchTags.length > 0 ? formData.searchTags : undefined,
          synonyms:            formData.synonyms.length > 0 ? formData.synonyms : undefined,
          banglaSearchTerms:   formData.banglaSearchTerms.length > 0 ? formData.banglaSearchTerms : undefined,
          reviewKeywords:      formData.reviewKeywords.length > 0 ? formData.reviewKeywords : undefined,
          entities:            formData.entities.length > 0 ? formData.entities : undefined,
          productSpecs,
          productAttributes,
          shadeOptions,
          usageInstructions:   formData.usageInstructions.length > 0 ? formData.usageInstructions : undefined,
          imageAltTexts:       formData.imageAltTexts.filter(Boolean).length > 0 ? formData.imageAltTexts.filter(Boolean) : undefined,
          descriptionSections,
          faqSchemaReady:      formData.faqSchemaReady,
          gender:              formData.gender || undefined,
          // ─────────────────────────────────────────────────────────────
          ogTitle: formData.ogTitle || formData.metaTitle || undefined,
          ogImageUrl: uploadedOgImageUrl || formData.ogImageUrl || undefined,
          canonicalUrl: formData.canonicalUrl || (formData.urlSlug ? `https://minsahbeauty.cloud/products/${formData.urlSlug}` : undefined),
          condition: formData.productCondition || 'NEW', gtin: formData.gtin || undefined,
          averageRating: formData.averageRating || 0, reviewCount: formData.reviewCount || 0,
          shippingWeight: formData.shippingWeight || undefined,
          dimensions: (formData.dimensions.length || formData.dimensions.width || formData.dimensions.height)
            ? formData.dimensions : undefined,
          isFragile: formData.isFragile,
          discountPercentage: formData.discountPercentage || undefined,
          salePrice: formData.salePrice || undefined, originalPrice,
          offerStartDate: formData.offerStartDate || undefined, offerEndDate: formData.offerEndDate || undefined,
          flashSaleEligible: formData.flashSaleEligible,
          lowStockThreshold: formData.lowStockThreshold || undefined,
          barcode: formData.barcode || undefined,
          returnEligible: formData.returnEligible, codAvailable: formData.codAvailable,
          preOrderOption: formData.preOrderOption, relatedProducts: formData.relatedProducts || undefined,
          faqs: formData.faqs.length > 0 ? formData.faqs : undefined,
        },
      });

      alert('Product created successfully!');
      router.push('/admin/products');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategoryData = categoriesData.find((c) => c.name === formData.category);
  const subcategories = selectedCategoryData?.subcategories || [];
  const selectedSubcategoryData = subcategories.find((s: { name: string }) => s.name === formData.subcategory);
  const items = (selectedSubcategoryData as { name: string; items?: string[] } | undefined)?.items || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/products" className="inline-flex items-center text-purple-600 hover:text-purple-800 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Products
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
        <p className="text-gray-600">Create a comprehensive beauty product listing</p>
      </div>

      {/* ─── AI GENERATE PANEL ───────────────────────────────────────────── */}
      <div className={`mb-6 rounded-xl border-2 p-5 shadow-sm transition-all ${aiApplied ? 'border-green-400 bg-green-50' : 'border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50'}`}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className={`w-5 h-5 ${aiApplied ? 'text-green-600' : 'text-purple-600'}`} />
          <span className={`text-base font-semibold ${aiApplied ? 'text-green-800' : 'text-purple-900'}`}>
            {aiApplied
              ? `✅ ${AI_MODELS.find(m => m.id === aiAppliedModel)?.badge || 'AI'} দিয়ে Generate হয়েছে — Review & adjust করো`
              : 'AI Product Generator'}
          </span>
          {aiApplied && (
            <button
              type="button"
              onClick={() => { setAiApplied(false); setAiAppliedModel(''); setFormData(defaultForm); setFacebookAdAngle(null); setMarketNote(''); setCompetitionNote(''); setAiInput(''); }}
              className="ml-auto text-xs text-gray-500 hover:text-red-600 underline"
            >
              Reset & start fresh
            </button>
          )}
        </div>

        {!aiApplied && (
          <>
            <p className="text-sm text-purple-700 mb-3">
              Product name বা keyword দাও — AI সব fields automatically fill করে দেবে। শুধু price আর images তোমাকে দিতে হবে।
            </p>

            {/* Model selector */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-purple-800 mb-2">AI Model বেছে নাও:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {AI_MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setAiModel(m.id)}
                    className={`text-left px-3 py-2.5 rounded-lg border-2 transition-all ${
                      aiModel === m.id
                        ? 'border-purple-500 bg-white shadow-md'
                        : 'border-purple-200 bg-white/60 hover:border-purple-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-800">{m.label}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${m.badgeColor}`}>{m.badge}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">{m.note}</span>
                      <span className="text-[11px] font-mono text-gray-400">{m.cost}</span>
                    </div>
                    {aiModel === m.id && (
                      <div className="mt-1.5 h-0.5 bg-purple-500 rounded" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleAiGenerate()}
                placeholder="e.g., Vitamin C Serum, Korean Sheet Mask, Matte Lipstick..."
                className="flex-1 px-4 py-2.5 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm bg-white"
                disabled={isGenerating}
              />
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={isGenerating || !aiInput.trim()}
                className="inline-flex items-center px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium text-sm shadow"
              >
                {isGenerating
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {AI_MODELS.find(m => m.id === aiModel)?.badge} দিয়ে generate হচ্ছে...</>
                  : <><Sparkles className="w-4 h-4 mr-2" /> Generate</>}
              </button>
            </div>
          </>
        )}

        {aiError && (
          <div className="mt-3 flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {aiError}
          </div>
        )}

        {/* Market insights */}
        {aiApplied && (marketNote || competitionNote) && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {marketNote && (
              <div className="bg-white border border-green-200 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-green-700 mb-1">💰 Market Price Research</p>
                <p className="text-sm text-gray-700">{marketNote}</p>
              </div>
            )}
            {competitionNote && (
              <div className="bg-white border border-amber-200 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">📊 Competition Insight</p>
                <p className="text-sm text-gray-700">{competitionNote}</p>
              </div>
            )}
          </div>
        )}

        {/* Facebook Ad Angle panel */}
        {facebookAdAngle && (
          <div className="mt-4 border border-purple-200 rounded-lg bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdAngle((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-purple-800 hover:bg-purple-50"
            >
              <span className="flex items-center gap-2"><Megaphone className="w-4 h-4" /> Facebook Ad Copy (AI Generated)</span>
              {showAdAngle ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showAdAngle && (
              <div className="px-4 pb-4 space-y-3 border-t border-purple-100">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Headline</p>
                  <p className="text-sm bg-purple-50 rounded px-3 py-2 font-medium">{facebookAdAngle.headline}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Primary Text</p>
                  <p className="text-sm bg-purple-50 rounded px-3 py-2 whitespace-pre-line">{facebookAdAngle.primaryText}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Target Audience</p>
                  <p className="text-sm bg-purple-50 rounded px-3 py-2">{facebookAdAngle.targetAudience}</p>
                </div>
                <p className="text-xs text-gray-400">Copy these before creating your Meta ad campaign.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── FORM ────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 1. Basic Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <Package className="w-5 h-5 text-purple-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleNameChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="e.g., Hydrating Face Serum with Hyaluronic Acid" />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select name="category" value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value, subcategory: '', item: '' }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                  {categoriesData.map((cat) => <option key={cat.name} value={cat.name}>{cat.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                <select name="subcategory" value={formData.subcategory}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subcategory: e.target.value, item: '' }))}
                  disabled={!formData.category}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:opacity-50">
                  <option value="">Select subcategory</option>
                  {subcategories.map((s: { name: string }) => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Type/Item</label>
                <select name="item" value={formData.item} onChange={handleChange}
                  disabled={!formData.subcategory || items.length === 0}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:opacity-50">
                  <option value="">Select item</option>
                  {items.map((item: string) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
                <input type="text" name="brand" value={formData.brand} onChange={handleChange} list="brands"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${errors.brand ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Select or type brand" />
                <datalist id="brands">{brands.map((b) => <option key={b} value={b} />)}</datalist>
                {errors.brand && <p className="mt-1 text-sm text-red-600">{errors.brand}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Origin Country</label>
                <select name="originCountry" value={formData.originCountry} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                  {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                <select name="status" value={formData.status} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>
              <div className="flex items-center pt-6">
                <label className="flex items-center">
                  <input type="checkbox" name="featured" checked={formData.featured} onChange={handleChange}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded" />
                  <span className="ml-2 text-sm text-gray-700">Featured Product</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Description *</label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows={6}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Detailed product description..." />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>
          </div>
        </div>

        {/* 2. Product Images */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center mb-2">
            <ImageIcon className="w-5 h-5 text-purple-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Product Images</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Max 10MB per image. First/main image is the display image.</p>
          <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/jpg,image/webp" className="hidden" onChange={handleImageUpload} />

          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
            <Upload className="w-5 h-5 mr-2" /> Upload Images
          </button>
          {errors.images && <p className="mt-2 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.images}</p>}

          {formData.images.length > 0 && (
            <div className="mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
                {formData.images.map((image, index) => (
                  <div key={image.id}
                    className={`relative group rounded-lg overflow-hidden border-2 transition-all ${image.isMain ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'}`}>
                    <div className="aspect-square">
                      <img src={image.preview} alt="" className="w-full h-full object-cover" />
                    </div>
                    {image.isMain && <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs font-semibold px-2 py-1 rounded">Main</div>}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                      {!image.isMain && (
                        <button type="button" onClick={() => handleSetMainImage(image.id)} className="p-2 bg-white rounded-full hover:bg-gray-100">
                          <ImageIcon className="w-4 h-4 text-gray-700" />
                        </button>
                      )}
                      <button type="button" onClick={() => handleRemoveImage(image.id)} className="p-2 bg-red-500 rounded-full hover:bg-red-600">
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                    <div className="sr-only">{index + 1}</div>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Image Alt Texts (SEO)</h3>
                <div className="space-y-3">
                  {formData.images.map((image, index) => (
                    <div key={image.id} className="flex gap-3">
                      <img src={image.preview} alt="" className="w-16 h-16 object-cover rounded border flex-shrink-0" />
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Image {index + 1} {image.isMain && '(Main)'}</label>
                        <input type="text" value={formData.imageAltTexts[index] || ''}
                          onChange={(e) => handleImageAltTextChange(index, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                          placeholder="Rhode Peptide Lip Tint Ribbon Bangladesh" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Variants */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Tag className="w-5 h-5 text-purple-600 mr-2" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Product Variants</h2>
                <p className="text-sm text-gray-500">Size, color, price, stock per variant</p>
              </div>
            </div>
            <button type="button" onClick={handleAddVariant}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
              <Plus className="w-4 h-4 mr-1" /> Add Variant
            </button>
          </div>

          {aiApplied && (
            <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Price fields are intentionally blank — enter your selling prices below.
            </div>
          )}

          <div className="space-y-4">
            {formData.variants.map((variant, index) => (
              <div key={variant.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Variant #{index + 1}</h3>
                  {formData.variants.length > 1 && (
                    <button type="button" onClick={() => handleRemoveVariant(variant.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {(['size', 'color', 'price', 'stock', 'sku'] as const).map((field) => (
                    <div key={field}>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {field === 'size' ? 'Size/Volume' : field === 'color' ? 'Color/Shade' : field === 'price' ? 'Price (BDT ৳) *' : field === 'stock' ? 'Stock *' : 'SKU *'}
                      </label>
                      <input
                        type={field === 'price' || field === 'stock' ? 'number' : 'text'}
                        value={variant[field] || ''}
                        onChange={(e) => handleVariantChange(variant.id, field, e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm ${errors[`variant_${variant.id}_${field}`] ? 'border-red-500' : 'border-gray-300'} ${field === 'price' && aiApplied ? 'bg-amber-50 border-amber-300' : ''}`}
                        placeholder={field === 'price' ? '0.00' : field === 'stock' ? '0' : ''}
                        step={field === 'price' ? '0.01' : undefined}
                        min={field === 'price' || field === 'stock' ? '0' : undefined}
                      />
                      {errors[`variant_${variant.id}_${field}`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`variant_${variant.id}_${field}`]}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Specifications */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <Settings className="w-5 h-5 text-purple-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Product Specifications</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Net Weight/Volume (numeric)</label>
                <input type="text" name="weight" value={formData.weight} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., 30" />
                {errors.weight && <p className="mt-1 text-sm text-red-600">{errors.weight}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shelf Life</label>
                <input type="text" name="shelfLife" value={formData.shelfLife} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., 24 months" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Suitable Skin Type</label>
              <div className="flex flex-wrap gap-2">
                {skinTypes.map((type) => (
                  <button key={type} type="button" onClick={() => handleSkinTypeToggle(type)}
                    className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                      formData.skinType.includes(type)
                        ? 'bg-purple-600 border-purple-600 text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-purple-400'
                    }`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Condition</label>
                <select name="productCondition" value={formData.productCondition} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                  <option value="NEW">New</option>
                  <option value="USED">Used</option>
                  <option value="REFURBISHED">Refurbished</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GTIN/EAN/UPC</label>
                <input type="text" name="gtin" value={formData.gtin} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="1234567890123" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Average Rating (0–5)</label>
                <input type="number" name="averageRating" value={formData.averageRating} onChange={handleChange}
                  min="0" max="5" step="0.1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Review Count</label>
                <input type="number" name="reviewCount" value={formData.reviewCount} onChange={handleChange}
                  min="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ingredients List</label>
              <textarea name="ingredients" value={formData.ingredients} onChange={handleChange} rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Aqua, Glycerin, Hyaluronic Acid..." />
            </div>
          </div>
        </div>

        {/* ── PLACE 3: 5. SEO Settings — updated UI ─────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <Search className="w-5 h-5 text-purple-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">SEO Settings</h2>
          </div>
          <div className="space-y-4">

            {/* Meta Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
              <input type="text" name="metaTitle" value={formData.metaTitle} onChange={handleChange} maxLength={60}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="SEO title — include focus keyword" />
              <p className="text-xs text-gray-400 mt-1 text-right">{formData.metaTitle.length}/60</p>
            </div>

            {/* Meta Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
              <textarea name="metaDescription" value={formData.metaDescription} onChange={handleChange} maxLength={160} rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder='150–160 chars. Include "Cash on Delivery" or price signal.' />
              <p className="text-xs text-gray-400 mt-1 text-right">{formData.metaDescription.length}/160</p>
            </div>

            {/* বাংলা Product Name + Focus Keyword */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">বাংলা Product Name</label>
                <input type="text" name="bengaliProductName" value={formData.bengaliProductName} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="বাংলা নাম" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Focus Keyword</label>
                <input type="text" name="focusKeyword" value={formData.focusKeyword} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., vitamin c serum bangladesh" />
                <p className="text-xs text-gray-400 mt-1">Must appear in Meta Title, description first 100 words, and URL Slug</p>
              </div>
            </div>

            {/* Secondary Keywords — NEW */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secondary Keywords
                <span className="ml-2 text-xs font-normal text-gray-400">comma-separated, 3–5 long-tail terms</span>
              </label>
              <input
                type="text"
                value={formData.secondaryKeywords.join(', ')}
                onChange={(e) => handleSecondaryKeywordsChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="lip oil for dry lips bangladesh, non sticky lip gloss bd price, tinted lip oil buy online bd"
              />
              {formData.secondaryKeywords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {formData.secondaryKeywords.map((kw, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-full text-xs text-purple-700">
                      {kw}
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({
                          ...prev,
                          secondaryKeywords: prev.secondaryKeywords.filter((_, idx) => idx !== i),
                        }))}
                        className="text-purple-400 hover:text-purple-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* বাংলা Focus Keyword + OG Description — NEW */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  বাংলা Focus Keyword
                  <span className="ml-2 text-xs font-normal text-gray-400">Bengali script only</span>
                </label>
                <input
                  type="text"
                  name="bengaliFocusKeyword"
                  value={formData.bengaliFocusKeyword}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="লিপ অয়েল দাম বাংলাদেশ"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OG Description
                  <span className="ml-2 text-xs font-normal text-gray-400">Facebook/WhatsApp share — 100–130 chars</span>
                </label>
                <input
                  type="text"
                  name="ogDescription"
                  value={formData.ogDescription}
                  onChange={handleChange}
                  maxLength={130}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Glass lips in one swipe. Non-sticky & deeply nourishing."
                />
                <p className={`text-xs mt-1 text-right ${formData.ogDescription.length > 130 ? 'text-red-500' : 'text-gray-400'}`}>
                  {formData.ogDescription.length}/130
                </p>
              </div>
            </div>

            {/* বাংলা Meta Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">বাংলা Meta Description</label>
              <textarea name="bengaliMetaDescription" value={formData.bengaliMetaDescription} onChange={handleChange} maxLength={160} rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
            </div>

            {/* OG Title + URL Slug */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Open Graph Title</label>
                <input type="text" name="ogTitle" value={formData.ogTitle} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Leave blank to use Meta Title" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
                <input type="text" name="urlSlug" value={formData.urlSlug} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="product-url-slug" />
                <p className="text-xs text-gray-400 mt-1">/products/<strong>{formData.urlSlug || 'product-url-slug'}</strong></p>
              </div>
            </div>

            {/* Canonical, H1 and visible SEO intro */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Canonical URL</label>
                <input
                  type="text"
                  name="canonicalUrl"
                  value={formData.canonicalUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="https://minsahbeauty.cloud/products/product-url-slug"
                />
                <p className="text-xs text-gray-400 mt-1">Leave blank to auto-generate from slug.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Page H1</label>
                <input
                  type="text"
                  name="pageH1"
                  value={formData.pageH1}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Sunsilk Power Shot Hair Treatment Price in Bangladesh"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SEO Intro / Top Visible Intro</label>
              <textarea
                name="seoIntro"
                value={formData.seoIntro}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Short visible intro with price, sizes, variants and Bangladesh buying intent."
              />
            </div>

            {/* Manual OG Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OG Image URL</label>
              <input
                type="text"
                name="ogImageUrl"
                value={formData.ogImageUrl}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="https://cdn.example.com/products/og-image.webp"
              />
              <p className="text-xs text-gray-400 mt-1">Uploading a social image below will override this URL.</p>
            </div>

            {/* Social Sharing Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Social Sharing Image (1200×630px)</label>
              {formData.ogImagePreview && (
                <img src={formData.ogImagePreview} alt="OG" className="w-full max-w-md rounded-lg border mb-2" />
              )}
              <input type="file" accept="image/*" onChange={handleOgImageUpload}
                className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700" />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags/Keywords
                <span className="ml-2 text-xs font-normal text-gray-400">15–20 tags, priority order: focusKeyword first</span>
              </label>
              <input type="text" name="tags" value={formData.tags} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="beauty glazed lip oil bangladesh, lip oil bd, লিপ অয়েল, ..." />
            </div>

          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <Sparkles className="w-5 h-5 text-purple-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Semantic SEO & Structured Content</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Intent</label>
                <input type="text" name="searchIntent" value={formData.searchIntent} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Concern</label>
                <input type="text" name="primaryConcern" value={formData.primaryConcern} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <input type="text" name="gender" value={formData.gender} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
              <textarea name="targetAudience" value={formData.targetAudience} onChange={handleChange} rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">FAQ Schema Note</label>
                <textarea
                  name="faqSchemaNote"
                  value={formData.faqSchemaNote}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="FAQ content is for customers; Product/Merchant schema is SEO priority."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Authenticity Note</label>
                <textarea
                  name="authenticityNote"
                  value={formData.authenticityNote}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="Imported product. Check packaging, expiry and batch/barcode after receiving."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ingredient Verification Status</label>
              <input
                type="text"
                name="ingredientVerificationStatus"
                value={formData.ingredientVerificationStatus}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Pending physical packaging verification"
              />
            </div>

            {[
              ['keyBenefits', 'Key Benefits'],
              ['buyingIntentKeywords', 'Buying Intent Keywords'],
              ['searchTags', 'Search Tags'],
              ['synonyms', 'Synonyms'],
              ['banglaSearchTerms', 'Bangla Search Terms'],
              ['reviewKeywords', 'Review Keywords'],
              ['entities', 'Entities'],
              ['bengaliSecondaryKeywords', 'Bengali Secondary Keywords'],
              ['seoValidationChecklist', 'SEO Validation Checklist'],
              ['usageInstructions', 'Usage Instructions'],
            ].map(([field, label]) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <textarea value={(formData[field as keyof ProductFormData] as string[]).join(', ')}
                  onChange={(e) => handleArrayFieldChange(field as keyof ProductFormData, e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" />
              </div>
            ))}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ['productSpecsJson', 'Product Specs JSON'],
                ['productAttributesJson', 'Product Attributes JSON'],
                ['shadeOptionsJson', 'Shade Options JSON'],
                ['descriptionSectionsJson', 'Description Sections JSON'],
                ['variantPriceTableJson', 'Variant Price Table JSON'],
                ['variantComparisonTableJson', 'Variant Comparison Table JSON'],
                ['internalLinksJson', 'Internal Links JSON'],
                ['structuredDataJsonLdJson', 'Full Structured Data JSON-LD'],
                ['productGroupJsonLdJson', 'ProductGroup JSON-LD'],
                ['merchantListingJsonLdJson', 'Merchant Listing JSON-LD'],
                ['breadcrumbJsonLdJson', 'Breadcrumb JSON-LD'],
                ['sitemapIndexingJson', 'Sitemap / Indexing JSON'],
                ['variantUrlStrategyJson', 'Variant URL Strategy JSON'],
              ].map(([field, label]) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <textarea name={field} value={formData[field as keyof ProductFormData] as string}
                    onChange={handleChange} rows={7}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-xs font-mono" />
                </div>
              ))}
            </div>

            <label className="flex items-center gap-2">
              <input type="checkbox" name="faqSchemaReady" checked={formData.faqSchemaReady} onChange={handleChange}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded" />
              <span className="text-sm text-gray-700">FAQ schema ready</span>
            </label>
          </div>
        </div>

        {/* FAQ Section */}
        <ProductFaqSection
          faqs={formData.faqs}
          onChange={(faqs) => setFormData((prev) => ({ ...prev, faqs }))}
        />

        {/* 6. Shipping */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <TruckIcon className="w-5 h-5 text-purple-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Shipping & Delivery</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Weight</label>
                <input type="text" name="shippingWeight" value={formData.shippingWeight} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., 150g" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions (L × W × H cm)</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['length', 'width', 'height'] as const).map((dim) => (
                    <div key={dim}>
                      <input type="text" value={formData.dimensions[dim]}
                        onChange={(e) => handleDimensionChange(dim, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                        placeholder={dim.charAt(0).toUpperCase()} />
                      <p className="text-[10px] text-gray-400 mt-0.5 text-center">{dim.charAt(0).toUpperCase()} (cm)</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <label className="flex items-center">
              <input type="checkbox" name="isFragile" checked={formData.isFragile} onChange={handleChange}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded" />
              <span className="ml-2 text-sm text-gray-700">Fragile Item</span>
            </label>
          </div>
        </div>

        {/* 7. Discount */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <Percent className="w-5 h-5 text-purple-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Discount & Offers</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                <input type="number" value={formData.discountPercentage}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  min="0" max="100" step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price (৳)</label>
                <input type="number" name="salePrice" value={formData.salePrice} onChange={handleChange}
                  step="1" min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Auto-calculated" />
              </div>
              <div className="flex items-center pt-6">
                <label className="flex items-center">
                  <input type="checkbox" name="flashSaleEligible" checked={formData.flashSaleEligible} onChange={handleChange}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded" />
                  <span className="ml-2 text-sm text-gray-700">Flash Sale Eligible</span>
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Offer Start</label>
                <input type="datetime-local" name="offerStartDate" value={formData.offerStartDate} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Offer End</label>
                <input type="datetime-local" name="offerEndDate" value={formData.offerEndDate} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* 8. Stock */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <AlertCircle className="w-5 h-5 text-purple-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Stock Management</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert Threshold</label>
              <input type="number" name="lowStockThreshold" value={formData.lowStockThreshold} onChange={handleChange} min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Barcode/UPC</label>
              <input type="text" name="barcode" value={formData.barcode} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Enter barcode" />
            </div>
          </div>
        </div>

        {/* 9. Additional Options */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <Settings className="w-5 h-5 text-purple-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Additional Options</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'returnEligible', label: 'Return Eligible' },
                { name: 'codAvailable',   label: 'Cash on Delivery' },
                { name: 'preOrderOption', label: 'Pre-order Option' },
              ].map((opt) => (
                <label key={opt.name} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" name={opt.name}
                    checked={formData[opt.name as keyof ProductFormData] as boolean}
                    onChange={handleChange}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded" />
                  <span className="ml-2 text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Related Products</label>
              <input type="text" name="relatedProducts" value={formData.relatedProducts} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Product IDs separated by commas" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-6 shadow-sm sticky bottom-0">
          <Link href="/admin/products"
            className="inline-flex items-center px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
            <X className="w-5 h-5 mr-2" /> Cancel
          </Link>
          <button type="submit" disabled={isSubmitting}
            className="inline-flex items-center px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium shadow-lg">
            {isSubmitting
              ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating...</>
              : <><Save className="w-5 h-5 mr-2" /> Create Product</>}
          </button>
        </div>

      </form>
    </div>
  );
}
