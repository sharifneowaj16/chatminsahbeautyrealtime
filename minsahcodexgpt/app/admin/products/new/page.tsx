'use client';

import { useToast } from '@/components/ui/ToastProvider';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import { adminFetchJson } from '@/lib/adminFetch';
import { DEFAULT_SITE_URL } from '@/lib/seo';
import ProductFaqSection from '@/components/admin/ProductFaqSection';

// Shared Types
import {
  ProductFormData,
  ProductImage,
  ProductVariant,
  DeliveryOfferType,
} from '@/components/admin/products/types';

// Loop 3: Common & Form & Media
import { ProductFormHeader } from '@/components/admin/products/common/ProductFormHeader';
import { ProductStickyActionsBar } from '@/components/admin/products/common/ProductStickyActionsBar';
import { ProductBasicInfoCard } from '@/components/admin/products/form/ProductBasicInfoCard';
import { ProductNameInput } from '@/components/admin/products/form/ProductNameInput';
import { ProductCategoryCascadePicker } from '@/components/admin/products/form/ProductCategoryCascadePicker';
import { ProductBrandSelector } from '@/components/admin/products/form/ProductBrandSelector';
import { ProductOriginCountrySelect } from '@/components/admin/products/form/ProductOriginCountrySelect';
import { ProductStatusToggleGroup } from '@/components/admin/products/form/ProductStatusToggleGroup';
import { ProductFeaturedToggle } from '@/components/admin/products/form/ProductFeaturedToggle';
import { ProductDescriptionEditor } from '@/components/admin/products/form/ProductDescriptionEditor';
import { ProductImageUploaderCard } from '@/components/admin/products/media/ProductImageUploaderCard';
import { ProductImageDropzone } from '@/components/admin/products/media/ProductImageDropzone';
import { ProductImageGrid } from '@/components/admin/products/media/ProductImageGrid';
import { ProductImageAltEditor } from '@/components/admin/products/media/ProductImageAltEditor';
import { ProductVisualManagersWrapper } from '@/components/admin/products/media/ProductVisualManagersWrapper';

// Loop 4: Variants & Pricing
import { ProductVariantMatrixCard } from '@/components/admin/products/variants/ProductVariantMatrixCard';
import { ProductVariantRowItem } from '@/components/admin/products/variants/ProductVariantRowItem';
import { ProductStockThresholdInput } from '@/components/admin/products/variants/ProductStockThresholdInput';
import { ProductBarcodeScannerInput } from '@/components/admin/products/variants/ProductBarcodeScannerInput';
import { ProductDiscountOffersCard } from '@/components/admin/products/pricing/ProductDiscountOffersCard';
import { ProductFlashSaleToggle } from '@/components/admin/products/pricing/ProductFlashSaleToggle';
import { ProductPolicyTogglesCard } from '@/components/admin/products/pricing/ProductPolicyTogglesCard';

// Loop 5: Specifications
import { ProductSpecificationsCard } from '@/components/admin/products/specs/ProductSpecificationsCard';
import { ProductSkinTypePills } from '@/components/admin/products/specs/ProductSkinTypePills';
import { ProductWeightInput } from '@/components/admin/products/specs/ProductWeightInput';
import { ProductShelfLifeInputs } from '@/components/admin/products/specs/ProductShelfLifeInputs';
import { ProductConditionSelect } from '@/components/admin/products/specs/ProductConditionSelect';
import { ProductGtinInput } from '@/components/admin/products/specs/ProductGtinInput';
import { ProductRatingReviewsInputs } from '@/components/admin/products/specs/ProductRatingReviewsInputs';
import { ProductIngredientsTextarea } from '@/components/admin/products/specs/ProductIngredientsTextarea';

// Loop 6: SEO & Structured Data
import { ProductSeoSettingsCard } from '@/components/admin/products/seo/ProductSeoSettingsCard';
import { ProductMetaTitleDescriptionInputs } from '@/components/admin/products/seo/ProductMetaTitleDescriptionInputs';
import { ProductSlugInput } from '@/components/admin/products/seo/ProductSlugInput';
import { ProductKeywordChipsInput } from '@/components/admin/products/seo/ProductKeywordChipsInput';
import { ProductBilingualMetaCard } from '@/components/admin/products/seo/ProductBilingualMetaCard';
import { ProductSocialOgCard } from '@/components/admin/products/seo/ProductSocialOgCard';
import { ProductCanonicalH1Inputs } from '@/components/admin/products/seo/ProductCanonicalH1Inputs';
import { ProductSemanticSeoCard } from '@/components/admin/products/seo/ProductSemanticSeoCard';
import { ProductJsonLdAccordion } from '@/components/admin/products/seo/ProductJsonLdAccordion';

// Loop 7: Shipping & AI
import { ProductShippingCard } from '@/components/admin/products/shipping/ProductShippingCard';
import { ProductDimensionsInputs } from '@/components/admin/products/shipping/ProductDimensionsInputs';
import { ProductDeliveryOfferCard } from '@/components/admin/products/shipping/ProductDeliveryOfferCard';
import { ProductCityDeliveryRatesInput } from '@/components/admin/products/shipping/ProductCityDeliveryRatesInput';
import { ProductOfferDateRangePickers } from '@/components/admin/products/shipping/ProductOfferDateRangePickers';
import { ProductAiGeneratorPanel } from '@/components/admin/products/ai/ProductAiGeneratorPanel';
import { ProductAiModelSelector } from '@/components/admin/products/ai/ProductAiModelSelector';
import { ProductAiResearchNotes } from '@/components/admin/products/ai/ProductAiResearchNotes';
import { ProductAiFacebookAdAngle } from '@/components/admin/products/ai/ProductAiFacebookAdAngle';

const ADMIN_SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
const canonicalProductUrl = (slug: string) => slug.trim() ? `${ADMIN_SITE_URL}/products/${slug.trim()}` : undefined;

const defaultForm: ProductFormData = {
  name: '',
  category: 'Make Up',
  subcategory: '',
  item: '',
  brand: '',
  originCountry: 'Bangladesh (Local)',
  status: 'active',
  featured: false,
  description: '',
  weight: '',
  ingredients: '',
  skinType: [],
  expiryDate: '',
  shelfLife: '',
  images: [],
  variants: [{ id: '1', size: '', color: '', price: '', stock: '', sku: '' }],
  metaTitle: '',
  metaDescription: '',
  urlSlug: '',
  tags: '',
  bengaliProductName: '',
  bengaliMetaDescription: '',
  focusKeyword: '',
  secondaryKeywords: [],
  bengaliFocusKeyword: '',
  ogTitle: '',
  ogDescription: '',
  ogImageUrl: '',
  canonicalUrl: '',
  pageH1: '',
  seoIntro: '',
  faqSchemaNote: '',
  authenticityNote: '',
  ingredientVerificationStatus: 'Verified',
  seoValidationChecklist: [],
  structuredDataJsonLdJson: '{}',
  productGroupJsonLdJson: '{}',
  merchantListingJsonLdJson: '{}',
  breadcrumbJsonLdJson: '{}',
  sitemapIndexingJson: '{}',
  variantUrlStrategyJson: '{}',
  variantPriceTableJson: '[]',
  variantComparisonTableJson: '[]',
  internalLinksJson: '[]',
  bengaliSecondaryKeywords: [],
  searchIntent: '',
  targetAudience: '',
  primaryConcern: '',
  keyBenefits: [],
  buyingIntentKeywords: [],
  searchTags: [],
  synonyms: [],
  banglaSearchTerms: [],
  reviewKeywords: [],
  entities: [],
  usageInstructions: [],
  productSpecsJson: '{}',
  productAttributesJson: '{}',
  shadeOptionsJson: '[]',
  descriptionSectionsJson: '[]',
  faqSchemaReady: false,
  gender: '',
  ogImageFile: null,
  ogImagePreview: '',
  imageAltTexts: [],
  productCondition: 'NEW',
  gtin: '',
  averageRating: 0,
  reviewCount: 0,
  shippingWeight: '',
  dimensions: { length: '', width: '', height: '' },
  isFragile: false,
  deliveryOfferEnabled: false,
  deliveryOfferType: 'DEFAULT',
  deliveryOfferAmount: '',
  deliveryChargeInsideDhaka: '',
  deliveryChargeOutsideDhaka: '',
  deliveryOfferStartDate: '',
  deliveryOfferEndDate: '',
  deliveryOfferBadgeText: '',
  discountPercentage: '',
  salePrice: '',
  offerStartDate: '',
  offerEndDate: '',
  flashSaleEligible: false,
  lowStockThreshold: '10',
  barcode: '',
  returnEligible: true,
  codAvailable: true,
  preOrderOption: false,
  relatedProducts: '',
  faqs: [],
};

export default function NewProductPage() {
  const { pushToast } = useToast();
  const router = useRouter();
  const { hasPermission } = useAdminAuth();

  const [formData, setFormData] = useState<ProductFormData>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Generator state
  const [aiInput, setAiInput] = useState('');
  const [aiModel, setAiModel] = useState('claude-sonnet-4-20250514');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [facebookAdAngle, setFacebookAdAngle] = useState<{
    headline: string;
    primaryText: string;
    targetAudience: string;
  } | null>(null);
  const [aiApplied, setAiApplied] = useState(false);
  const [aiAppliedModel, setAiAppliedModel] = useState('');
  const [marketNote, setMarketNote] = useState('');
  const [competitionNote, setCompetitionNote] = useState('');

  if (!hasPermission(PERMISSIONS.PRODUCTS_CREATE)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#8a8f98]">You don&apos;t have permission to create products.</p>
      </div>
    );
  }

  const updateField = <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleNameChange = (name: string) => {
    updateField('name', name);
    if (!formData.urlSlug) {
      updateField('urlSlug', name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
    }
  };

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

      if (!data.success || !data.product) throw new Error('No product data returned from AI');

      const p = data.product as Record<string, unknown>;

      if (p.facebookAdAngle) {
        setFacebookAdAngle(p.facebookAdAngle as { headline: string; primaryText: string; targetAudience: string });
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
        name: String(p.name || prev.name),
        category: String(p.category || prev.category),
        subcategory: String(p.subcategory || ''),
        item: String(p.item || ''),
        brand: String(p.brand || prev.brand),
        originCountry: String(p.originCountry || 'Bangladesh (Local)'),
        status: 'active',
        featured: Boolean(p.featured),
        description: String(p.description || ''),
        weight: String(p.weight || ''),
        ingredients: String(p.ingredients || ''),
        skinType: Array.isArray(p.skinType) ? (p.skinType as string[]) : [],
        shelfLife: String(p.shelfLife || ''),
        variants,
        metaTitle: String(p.metaTitle || ''),
        metaDescription: String(p.metaDescription || ''),
        urlSlug: String(p.urlSlug || ''),
        tags: String(p.tags || ''),
        bengaliProductName: String(p.bengaliProductName || ''),
        bengaliMetaDescription: String(p.bengaliMetaDescription || ''),
        focusKeyword: String(p.focusKeyword || ''),
        secondaryKeywords: Array.isArray(p.secondaryKeywords) ? (p.secondaryKeywords as string[]).map(String) : [],
        bengaliFocusKeyword: String(p.bengaliFocusKeyword || ''),
        ogDescription: String(p.ogDescription || ''),
        ogImageUrl: String(p.ogImageUrl || ''),
        canonicalUrl: String(p.canonicalUrl || ''),
        pageH1: String(p.pageH1 || ''),
        seoIntro: String(p.seoIntro || ''),
        faqSchemaNote: String(p.faqSchemaNote || ''),
        authenticityNote: String(p.authenticityNote || ''),
        ingredientVerificationStatus: String(p.ingredientVerificationStatus || 'Verified'),
        structuredDataJsonLdJson: JSON.stringify(p.structuredDataJsonLd || {}, null, 2),
        productGroupJsonLdJson: JSON.stringify(p.productGroupJsonLd || {}, null, 2),
        searchIntent: String(p.searchIntent || ''),
        targetAudience: String(p.targetAudience || ''),
        primaryConcern: String(p.primaryConcern || ''),
        keyBenefits: Array.isArray(p.keyBenefits) ? (p.keyBenefits as string[]).map(String) : [],
        searchTags: Array.isArray(p.searchTags) ? (p.searchTags as string[]).map(String) : [],
        shippingWeight: String(p.shippingWeight || ''),
        dimensions: { length: String(dims.length || ''), width: String(dims.width || ''), height: String(dims.height || '') },
        isFragile: Boolean(p.isFragile),
      }));

      setAiApplied(true);
      setAiAppliedModel(aiModel);
      pushToast({ tone: 'success', description: 'Product metadata generated with AI' });
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI generation failed');
      pushToast({ tone: 'danger', description: 'Failed to generate product via AI' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Image handlers
  const handleFilesSelected = (files: File[]) => {
    const newImages: ProductImage[] = [];
    files.forEach((file, index) => {
      if (file.size > 10 * 1024 * 1024) {
        pushToast({ tone: 'danger', description: `File ${file.name} exceeds 10MB limit` });
        return;
      }
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
  };

  const handleSetMainImage = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.map((img) => ({ ...img, isMain: img.id === id })),
    }));
  };

  const handleRemoveImage = (id: string) => {
    setFormData((prev) => {
      const idx = prev.images.findIndex((img) => img.id === id);
      if (idx !== -1) {
        URL.revokeObjectURL(prev.images[idx].preview);
      }
      const newImages = prev.images.filter((img) => img.id !== id);
      const newAlts = prev.imageAltTexts.filter((_, i) => i !== idx);
      if (newImages.length > 0 && !newImages.some((img) => img.isMain)) {
        newImages[0].isMain = true;
      }
      return { ...prev, images: newImages, imageAltTexts: newAlts };
    });
  };

  const handleUpdateImageAlt = (index: number, val: string) => {
    setFormData((prev) => {
      const alts = [...prev.imageAltTexts];
      alts[index] = val;
      return { ...prev, imageAltTexts: alts };
    });
  };

  // Variant handlers
  const handleAddVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { id: Date.now().toString(), size: '', color: '', price: '', stock: '', sku: `SKU-${Date.now()}` },
      ],
    }));
  };

  const handleUpdateVariant = (index: number, field: keyof ProductVariant, val: string) => {
    setFormData((prev) => {
      const copy = [...prev.variants];
      copy[index] = { ...copy[index], [field]: val };
      return { ...prev, variants: copy };
    });
  };

  const handleRemoveVariant = (index: number) => {
    if (formData.variants.length <= 1) {
      pushToast({ tone: 'danger', description: 'At least one product variant is required' });
      return;
    }
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  // Discount calculation
  const handleDiscountChange = (percentage: string) => {
    updateField('discountPercentage', percentage);
    const p = parseFloat(percentage);
    const firstPrice = parseFloat(formData.variants[0]?.price || '0');
    if (!isNaN(p) && p > 0 && !isNaN(firstPrice) && firstPrice > 0) {
      const discounted = Math.round(firstPrice * (1 - p / 100));
      updateField('salePrice', String(discounted));
    }
  };

  // Submit Handler
  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Product name is required';
    if (!formData.category.trim()) errs.category = 'Category is required';
    if (!formData.brand.trim()) errs.brand = 'Brand is required';
    if (!formData.description.trim()) errs.description = 'Description is required';
    if (formData.images.length === 0) errs.images = 'At least one product image is required';

    formData.variants.forEach((v) => {
      if (!v.price || parseFloat(v.price) <= 0) errs[`variant_${v.id}_price`] = 'Price is required';
      if (!v.stock || parseInt(v.stock, 10) < 0) errs[`variant_${v.id}_stock`] = 'Stock is required';
      if (!v.sku.trim()) errs[`variant_${v.id}_sku`] = 'SKU is required';
    });

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      pushToast({ tone: 'danger', description: 'Please resolve form validation errors before saving' });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload Images to S3/Cloud Storage
      const uploadedImages: Array<{ url: string; alt: string; sortOrder: number; isDefault: boolean }> = [];
      for (let i = 0; i < formData.images.length; i++) {
        const img = formData.images[i];
        if (img.file) {
          const uploadData = new FormData();
          uploadData.append('file', img.file);
          uploadData.append('folder', 'products');
          const uploadRes = await fetch('/api/admin/upload', {
            method: 'POST',
            body: uploadData,
            credentials: 'include',
          });
          if (!uploadRes.ok) throw new Error('Image upload failed');
          const { url } = await uploadRes.json();
          uploadedImages.push({
            url,
            alt: formData.imageAltTexts[i] || formData.name,
            sortOrder: i,
            isDefault: img.isMain,
          });
        }
      }

      // 2. Upload OG Image if selected
      let uploadedOgImageUrl = formData.ogImageUrl;
      if (formData.ogImageFile) {
        const ogData = new FormData();
        ogData.append('file', formData.ogImageFile);
        ogData.append('folder', 'products/og');
        const ogRes = await fetch('/api/admin/upload', { method: 'POST', body: ogData, credentials: 'include' });
        if (ogRes.ok) {
          const { url } = await ogRes.json();
          uploadedOgImageUrl = url;
        }
      }

      // 3. Assemble JSON Payload
      const primaryVariant = formData.variants[0];
      const sellingPrice = parseFloat(primaryVariant?.price || '0');
      const originalPrice = formData.discountPercentage && formData.salePrice
        ? sellingPrice
        : undefined;

      await adminFetchJson('/api/admin/products', {
        method: 'POST',
        json: {
          name: formData.name,
          category: formData.category,
          subcategory: formData.subcategory || undefined,
          item: formData.item || undefined,
          brand: formData.brand,
          originCountry: formData.originCountry,
          status: formData.status,
          featured: formData.featured,
          description: formData.description,
          price: sellingPrice,
          originalPrice,
          salePrice: formData.salePrice ? parseFloat(formData.salePrice) : undefined,
          discountPercentage: formData.discountPercentage ? parseFloat(formData.discountPercentage) : undefined,
          weight: formData.weight || undefined,
          ingredients: formData.ingredients || undefined,
          skinType: formData.skinType,
          shelfLife: formData.shelfLife || undefined,
          expiryDate: formData.expiryDate || undefined,
          images: uploadedImages,
          variants: formData.variants.map((v) => ({
            size: v.size || undefined,
            color: v.color || undefined,
            price: parseFloat(v.price),
            stock: parseInt(v.stock, 10),
            sku: v.sku,
          })),
          metaTitle: formData.metaTitle || undefined,
          metaDescription: formData.metaDescription || undefined,
          urlSlug: formData.urlSlug || undefined,
          tags: formData.tags || undefined,
          bengaliProductName: formData.bengaliProductName || undefined,
          bengaliMetaDescription: formData.bengaliMetaDescription || undefined,
          focusKeyword: formData.focusKeyword || undefined,
          secondaryKeywords: formData.secondaryKeywords,
          bengaliFocusKeyword: formData.bengaliFocusKeyword || undefined,
          ogTitle: formData.ogTitle || formData.metaTitle || undefined,
          ogDescription: formData.ogDescription || undefined,
          ogImageUrl: uploadedOgImageUrl || undefined,
          canonicalUrl: formData.canonicalUrl || canonicalProductUrl(formData.urlSlug),
          pageH1: formData.pageH1 || undefined,
          seoIntro: formData.seoIntro || undefined,
          searchIntent: formData.searchIntent || undefined,
          targetAudience: formData.targetAudience || undefined,
          primaryConcern: formData.primaryConcern || undefined,
          keyBenefits: formData.keyBenefits,
          searchTags: formData.searchTags,
          condition: formData.productCondition,
          gtin: formData.gtin || undefined,
          averageRating: formData.averageRating || 0,
          reviewCount: formData.reviewCount || 0,
          shippingWeight: formData.shippingWeight || undefined,
          dimensions: formData.dimensions.length ? formData.dimensions : undefined,
          isFragile: formData.isFragile,
          deliveryOfferEnabled: formData.deliveryOfferEnabled && formData.deliveryOfferType !== 'DEFAULT',
          deliveryOfferType: formData.deliveryOfferType,
          deliveryChargeInsideDhaka: formData.deliveryOfferEnabled ? formData.deliveryChargeInsideDhaka : undefined,
          deliveryChargeOutsideDhaka: formData.deliveryOfferEnabled ? formData.deliveryChargeOutsideDhaka : undefined,
          deliveryOfferBadgeText: formData.deliveryOfferBadgeText || undefined,
          flashSaleEligible: formData.flashSaleEligible,
          lowStockThreshold: formData.lowStockThreshold ? parseInt(formData.lowStockThreshold, 10) : 10,
          barcode: formData.barcode || undefined,
          returnEligible: formData.returnEligible,
          codAvailable: formData.codAvailable,
          preOrderOption: formData.preOrderOption,
          relatedProducts: formData.relatedProducts || undefined,
          faqs: formData.faqs.length > 0 ? formData.faqs : undefined,
        },
      });

      pushToast({ tone: 'success', description: 'Product successfully published to catalogue!' });
      router.push('/admin/products');
    } catch (err) {
      console.error('Failed to create product:', err);
      pushToast({ tone: 'danger', description: err instanceof Error ? err.message : 'Failed to publish product' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header */}
      <ProductFormHeader
        title="Add New Product"
        subtitle="Create a comprehensive beauty catalogue listing with SEO, media, and delivery rules"
        backHref="/admin/products"
      />

      {/* 2. AI Marketing Copilot */}
      <ProductAiGeneratorPanel
        aiInput={aiInput}
        isGenerating={isGenerating}
        aiApplied={aiApplied}
        aiAppliedModelName={aiAppliedModel}
        aiError={aiError}
        onChangeInput={setAiInput}
        onGenerate={handleAiGenerate}
        onReset={() => {
          setAiApplied(false);
          setAiInput('');
          setFormData(defaultForm);
          setFacebookAdAngle(null);
        }}
      >
        <ProductAiModelSelector selectedModel={aiModel} onSelectModel={setAiModel} />
        <ProductAiResearchNotes marketNote={marketNote} competitionNote={competitionNote} />
        <ProductAiFacebookAdAngle adAngle={facebookAdAngle} />
      </ProductAiGeneratorPanel>

      {/* 3. Basic Information */}
      <ProductBasicInfoCard>
        <ProductNameInput
          value={formData.name}
          onChange={handleNameChange}
          error={errors.name}
        />

        <ProductCategoryCascadePicker
          category={formData.category}
          subcategory={formData.subcategory}
          item={formData.item}
          onChange={(vals) => {
            updateField('category', vals.category);
            updateField('subcategory', vals.subcategory);
            updateField('item', vals.item);
          }}
          error={errors.category}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ProductBrandSelector
            value={formData.brand}
            onChange={(b) => updateField('brand', b)}
            error={errors.brand}
          />
          <ProductOriginCountrySelect
            value={formData.originCountry}
            onChange={(c) => updateField('originCountry', c)}
          />
          <ProductStatusToggleGroup
            value={formData.status}
            onChange={(s) => updateField('status', s)}
          />
        </div>

        <ProductFeaturedToggle
          checked={formData.featured}
          onChange={(f) => updateField('featured', f)}
        />

        <ProductDescriptionEditor
          value={formData.description}
          onChange={(d) => updateField('description', d)}
          error={errors.description}
        />
      </ProductBasicInfoCard>

      {/* 4. Product Images */}
      <ProductImageUploaderCard imageCount={formData.images.length}>
        <ProductImageDropzone
          onFilesSelected={handleFilesSelected}
          error={errors.images}
        />
        <ProductImageGrid
          images={formData.images}
          onSetMain={handleSetMainImage}
          onRemove={handleRemoveImage}
        />
        <ProductImageAltEditor
          imageAltTexts={formData.imageAltTexts}
          images={formData.images}
          onChangeAlt={handleUpdateImageAlt}
        />
      </ProductImageUploaderCard>

      {/* 5. Product Variants & Stock */}
      <ProductVariantMatrixCard
        variantCount={formData.variants.length}
        onAddVariant={handleAddVariant}
        aiApplied={aiApplied}
      >
        {formData.variants.map((variant, index) => (
          <ProductVariantRowItem
            key={variant.id}
            index={index}
            variant={variant}
            canRemove={formData.variants.length > 1}
            aiApplied={aiApplied}
            errors={errors}
            onChange={(field, val) => handleUpdateVariant(index, field, val)}
            onRemove={() => handleRemoveVariant(index)}
          />
        ))}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#232636]">
          <ProductStockThresholdInput
            value={formData.lowStockThreshold}
            onChange={(val) => updateField('lowStockThreshold', val)}
          />
          <ProductBarcodeScannerInput
            value={formData.barcode}
            onChange={(val) => updateField('barcode', val)}
          />
        </div>
      </ProductVariantMatrixCard>

      {/* 6. Product Specifications */}
      <ProductSpecificationsCard>
        <ProductSkinTypePills
          selected={formData.skinType}
          onToggle={(type) => {
            const next = formData.skinType.includes(type)
              ? formData.skinType.filter((t) => t !== type)
              : [...formData.skinType, type];
            updateField('skinType', next);
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ProductWeightInput
            value={formData.weight}
            onChange={(w) => updateField('weight', w)}
          />
          <ProductShelfLifeInputs
            shelfLife={formData.shelfLife}
            expiryDate={formData.expiryDate}
            onChangeShelfLife={(s) => updateField('shelfLife', s)}
            onChangeExpiryDate={(d) => updateField('expiryDate', d)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ProductConditionSelect
            value={formData.productCondition}
            onChange={(c) => updateField('productCondition', c)}
          />
          <ProductGtinInput
            value={formData.gtin}
            onChange={(g) => updateField('gtin', g)}
          />
        </div>

        <ProductRatingReviewsInputs
          rating={formData.averageRating}
          reviews={formData.reviewCount}
          onChangeRating={(r) => updateField('averageRating', r)}
          onChangeReviews={(rc) => updateField('reviewCount', rc)}
        />

        <ProductIngredientsTextarea
          ingredients={formData.ingredients}
          verificationStatus={formData.ingredientVerificationStatus}
          onChangeIngredients={(i) => updateField('ingredients', i)}
          onChangeStatus={(s) => updateField('ingredientVerificationStatus', s)}
        />
      </ProductSpecificationsCard>

      {/* 7. Interactive Visual & Routine Controllers */}
      <ProductVisualManagersWrapper
        productName={formData.name}
        descriptionSectionsJson={formData.descriptionSectionsJson}
        productSpecsJson={formData.productSpecsJson}
        relatedProducts={formData.relatedProducts}
        ingredients={formData.ingredients}
        skinType={formData.skinType}
        shelfLife={formData.shelfLife}
        originCountry={formData.originCountry}
        deliveryOfferEnabled={formData.deliveryOfferEnabled}
        onDescriptionSectionsChange={(json) => updateField('descriptionSectionsJson', json)}
        onProductSpecsChange={(json) => updateField('productSpecsJson', json)}
        onRelatedProductsChange={(r) => updateField('relatedProducts', r)}
        onDeliveryOfferToggle={(enabled) => updateField('deliveryOfferEnabled', enabled)}
        onSkinTypeChange={(types) => updateField('skinType', types)}
      />

      {/* 8. SEO & Social Metadata */}
      <ProductSeoSettingsCard>
        <ProductMetaTitleDescriptionInputs
          metaTitle={formData.metaTitle}
          metaDescription={formData.metaDescription}
          onChangeTitle={(t) => updateField('metaTitle', t)}
          onChangeDescription={(d) => updateField('metaDescription', d)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ProductSlugInput
            slug={formData.urlSlug}
            onChange={(s) => updateField('urlSlug', s)}
          />
          <ProductCanonicalH1Inputs
            pageH1={formData.pageH1}
            seoIntro={formData.seoIntro}
            canonicalUrl={formData.canonicalUrl}
            onChangeH1={(h) => updateField('pageH1', h)}
            onChangeSeoIntro={(si) => updateField('seoIntro', si)}
            onChangeCanonicalUrl={(cu) => updateField('canonicalUrl', cu)}
          />
        </div>

        <ProductKeywordChipsInput
          label="Secondary Keywords (Long-tail Search Terms)"
          keywords={formData.secondaryKeywords}
          onChange={(kws) => updateField('secondaryKeywords', kws)}
        />

        <ProductBilingualMetaCard
          bengaliName={formData.bengaliProductName}
          bengaliMetaDescription={formData.bengaliMetaDescription}
          bengaliFocusKeyword={formData.bengaliFocusKeyword}
          focusKeyword={formData.focusKeyword}
          onChangeName={(n) => updateField('bengaliProductName', n)}
          onChangeDescription={(d) => updateField('bengaliMetaDescription', d)}
          onChangeBengaliKeyword={(bk) => updateField('bengaliFocusKeyword', bk)}
          onChangeFocusKeyword={(fk) => updateField('focusKeyword', fk)}
        />

        <ProductSocialOgCard
          ogTitle={formData.ogTitle}
          ogDescription={formData.ogDescription}
          ogImageUrl={formData.ogImageUrl}
          ogImagePreview={formData.ogImagePreview}
          onChangeTitle={(t) => updateField('ogTitle', t)}
          onChangeDescription={(d) => updateField('ogDescription', d)}
          onChangeImageUrl={(url) => updateField('ogImageUrl', url)}
          onFileSelected={(file) =>
            setFormData((prev) => ({
              ...prev,
              ogImageFile: file,
              ogImagePreview: URL.createObjectURL(file),
            }))
          }
          onClearImage={() =>
            setFormData((prev) => ({ ...prev, ogImageFile: null, ogImagePreview: '' }))
          }
        />

        <ProductSemanticSeoCard
          searchIntent={formData.searchIntent}
          targetAudience={formData.targetAudience}
          primaryConcern={formData.primaryConcern}
          keyBenefits={formData.keyBenefits}
          searchTags={formData.searchTags}
          onChangeSearchIntent={(si) => updateField('searchIntent', si)}
          onChangeTargetAudience={(ta) => updateField('targetAudience', ta)}
          onChangePrimaryConcern={(pc) => updateField('primaryConcern', pc)}
          onChangeKeyBenefits={(kb) => updateField('keyBenefits', kb)}
          onChangeSearchTags={(st) => updateField('searchTags', st)}
        />

        <ProductJsonLdAccordion
          title="Product Schema (JSON-LD Structured Data)"
          jsonString={formData.structuredDataJsonLdJson}
          onChange={(j) => updateField('structuredDataJsonLdJson', j)}
        />
      </ProductSeoSettingsCard>

      {/* 9. Shipping & Delivery Offers */}
      <ProductShippingCard>
        <ProductDimensionsInputs
          shippingWeight={formData.shippingWeight}
          dimensions={formData.dimensions}
          isFragile={formData.isFragile}
          onChangeWeight={(w) => updateField('shippingWeight', w)}
          onChangeDimension={(dim, val) =>
            setFormData((prev) => ({
              ...prev,
              dimensions: { ...prev.dimensions, [dim]: val },
            }))
          }
          onToggleFragile={(f) => updateField('isFragile', f)}
        />

        <ProductDeliveryOfferCard
          enabled={formData.deliveryOfferEnabled}
          type={formData.deliveryOfferType}
          badgeText={formData.deliveryOfferBadgeText}
          onToggleEnabled={(e) => updateField('deliveryOfferEnabled', e)}
          onChangeType={(t) => updateField('deliveryOfferType', t)}
          onChangeBadgeText={(b) => updateField('deliveryOfferBadgeText', b)}
        >
          {formData.deliveryOfferType === 'FIXED' && (
            <ProductCityDeliveryRatesInput
              chargeInsideDhaka={formData.deliveryChargeInsideDhaka}
              chargeOutsideDhaka={formData.deliveryChargeOutsideDhaka}
              onChangeInside={(val) => updateField('deliveryChargeInsideDhaka', val)}
              onChangeOutside={(val) => updateField('deliveryChargeOutsideDhaka', val)}
              onApplyPreset={(inside, outside, badge) => {
                updateField('deliveryChargeInsideDhaka', inside);
                updateField('deliveryChargeOutsideDhaka', outside);
                updateField('deliveryOfferBadgeText', badge);
              }}
            />
          )}

          <ProductOfferDateRangePickers
            startDate={formData.deliveryOfferStartDate}
            endDate={formData.deliveryOfferEndDate}
            onChangeStart={(sd) => updateField('deliveryOfferStartDate', sd)}
            onChangeEnd={(ed) => updateField('deliveryOfferEndDate', ed)}
          />
        </ProductDeliveryOfferCard>
      </ProductShippingCard>

      {/* 10. Discount & Policies */}
      <ProductDiscountOffersCard
        discountPercentage={formData.discountPercentage}
        salePrice={formData.salePrice}
        offerStartDate={formData.offerStartDate}
        offerEndDate={formData.offerEndDate}
        onChangeDiscount={handleDiscountChange}
        onChangeSalePrice={(sp) => updateField('salePrice', sp)}
        onChangeStartDate={(sd) => updateField('offerStartDate', sd)}
        onChangeEndDate={(ed) => updateField('offerEndDate', ed)}
      >
        <ProductFlashSaleToggle
          checked={formData.flashSaleEligible}
          onChange={(fse) => updateField('flashSaleEligible', fse)}
        />
      </ProductDiscountOffersCard>

      <ProductPolicyTogglesCard
        returnEligible={formData.returnEligible}
        codAvailable={formData.codAvailable}
        preOrderOption={formData.preOrderOption}
        relatedProducts={formData.relatedProducts}
        onToggleReturn={(r) => updateField('returnEligible', r)}
        onToggleCod={(c) => updateField('codAvailable', c)}
        onTogglePreOrder={(po) => updateField('preOrderOption', po)}
        onChangeRelatedProducts={(rp) => updateField('relatedProducts', rp)}
      />

      {/* 11. Optional Product FAQs */}
      <ProductFaqSection
        faqs={formData.faqs}
        onChange={(faqs) => updateField('faqs', faqs)}
      />

      {/* 12. Floating Sticky Actions Bar */}
      <ProductStickyActionsBar
        isSubmitting={isSubmitting}
        cancelHref="/admin/products"
        onSubmit={handleSubmit}
        submitLabel="Publish Product"
        submittingLabel="Publishing Product..."
      />
    </div>
  );
}
