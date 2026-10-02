'use client';

import { useToast } from '@/components/ui/ToastProvider';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { ProductCostPriceInput } from '@/components/admin/products/variants/ProductCostPriceInput';
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

const ADMIN_SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
const canonicalProductUrl = (slug: string) => slug.trim() ? `${ADMIN_SITE_URL}/products/${slug.trim()}` : undefined;

const defaultFormData: ProductFormData & { costPrice: string } = {
  name: '',
  category: '',
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
  productCondition: 'NEW',
  gtin: '',
  averageRating: 0,
  reviewCount: 0,
  costPrice: '',
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

export default function EditProductPage() {
  const { pushToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { hasPermission } = useAdminAuth();

  const [formData, setFormData] = useState<ProductFormData & { costPrice: string }>(defaultFormData);
  const [dbProductId, setDbProductId] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      try {
        setIsLoading(true);
        const data = await adminFetchJson<{ product: Record<string, unknown> }>(`/api/admin/products/${productId}`);
        const p = data.product;
        setDbProductId(String(p.id || ''));

        const savedImageAltTexts = Array.isArray(p.imageAltTexts)
          ? (p.imageAltTexts as unknown[]).map(String)
          : [];

        const existingImages: ProductImage[] = ((p.images as Array<Record<string, unknown>>) || []).map(
          (img, i) => ({
            id: String(img.id || 'existing-' + i),
            preview: String(img.url || ''),
            isMain: Boolean(img.isDefault || i === 0),
            file: undefined,
          })
        );

        const rawVariants = (p.variants as Array<Record<string, unknown>>) || [];
        const existingVariants: ProductVariant[] = rawVariants.length > 0
          ? rawVariants.map((v) => {
              const attrs = (v.attributes as Record<string, string>) || {};
              return {
                id: String(v.id || ''),
                size: attrs.size || '',
                color: attrs.color || '',
                price: String(v.price ?? p.price ?? ''),
                stock: String(v.stock ?? v.quantity ?? 0),
                sku: String(v.sku || ''),
              };
            })
          : [{ id: '1', size: '', color: '', price: String(p.price || ''), stock: String(p.stock ?? 0), sku: '' }];

        const dims = (p.dimensions as Record<string, string>) || { length: '', width: '', height: '' };

        setFormData({
          ...defaultFormData,
          name: String(p.name || ''),
          category: String(p.category || ''),
          subcategory: String(p.subcategory || ''),
          item: String(p.item || ''),
          brand: String(p.brand || ''),
          originCountry: String(p.originCountry || 'Bangladesh (Local)'),
          status: (p.status as 'active' | 'inactive' | 'out_of_stock') || 'active',
          featured: Boolean(p.featured || p.isFeatured),
          description: String(p.description || ''),
          images: existingImages,
          imageAltTexts: existingImages.length > 0
            ? existingImages.map((_, idx) => savedImageAltTexts[idx] || '')
            : savedImageAltTexts,
          variants: existingVariants,
          costPrice: p.costPrice != null ? String(p.costPrice) : '',
          weight: p.weight != null ? String(p.weight) : '',
          ingredients: String(p.ingredients || ''),
          skinType: Array.isArray(p.skinType) ? (p.skinType as string[]) : [],
          expiryDate: p.expiryDate ? String(p.expiryDate).slice(0, 10) : '',
          shelfLife: String(p.shelfLife || ''),
          productCondition: (p.condition as 'NEW' | 'USED' | 'REFURBISHED') || 'NEW',
          gtin: String(p.gtin || ''),
          averageRating: Number(p.averageRating) || 0,
          reviewCount: Number(p.reviewCount) || 0,
          metaTitle: String(p.metaTitle || ''),
          metaDescription: String(p.metaDescription || ''),
          urlSlug: String(p.slug || ''),
          tags: String(p.tags || p.metaKeywords || ''),
          bengaliProductName: String(p.bengaliName || p.bengaliProductName || ''),
          bengaliMetaDescription: String(p.bengaliDescription || p.bengaliMetaDescription || ''),
          focusKeyword: String(p.focusKeyword || ''),
          secondaryKeywords: Array.isArray(p.secondaryKeywords) ? (p.secondaryKeywords as string[]) : [],
          bengaliFocusKeyword: String(p.bengaliFocusKeyword || ''),
          ogTitle: String(p.ogTitle || ''),
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
          keyBenefits: Array.isArray(p.keyBenefits) ? (p.keyBenefits as string[]) : [],
          searchTags: Array.isArray(p.searchTags) ? (p.searchTags as string[]) : [],
          shippingWeight: String(p.shippingWeight || ''),
          dimensions: { length: String(dims.length || ''), width: String(dims.width || ''), height: String(dims.height || '') },
          isFragile: Boolean(p.isFragile),
          deliveryOfferEnabled: Boolean(p.deliveryOfferEnabled),
          deliveryOfferType: (p.deliveryOfferType as DeliveryOfferType) || 'DEFAULT',
          deliveryOfferAmount: p.deliveryOfferAmount != null ? String(p.deliveryOfferAmount) : '',
          deliveryChargeInsideDhaka: p.deliveryChargeInsideDhaka != null ? String(p.deliveryChargeInsideDhaka) : '',
          deliveryChargeOutsideDhaka: p.deliveryChargeOutsideDhaka != null ? String(p.deliveryChargeOutsideDhaka) : '',
          deliveryOfferStartDate: p.deliveryOfferStartDate ? String(p.deliveryOfferStartDate).slice(0, 16) : '',
          deliveryOfferEndDate: p.deliveryOfferEndDate ? String(p.deliveryOfferEndDate).slice(0, 16) : '',
          deliveryOfferBadgeText: String(p.deliveryOfferBadgeText || ''),
          discountPercentage: p.discountPercentage != null ? String(p.discountPercentage) : '',
          salePrice: p.salePrice != null ? String(p.salePrice) : '',
          offerStartDate: p.offerStartDate ? String(p.offerStartDate).slice(0, 16) : '',
          offerEndDate: p.offerEndDate ? String(p.offerEndDate).slice(0, 16) : '',
          flashSaleEligible: Boolean(p.flashSaleEligible),
          lowStockThreshold: p.lowStockThreshold != null ? String(p.lowStockThreshold) : '10',
          barcode: String(p.barcode || ''),
          returnEligible: p.returnEligible !== false,
          codAvailable: p.codAvailable !== false,
          preOrderOption: Boolean(p.preOrderOption),
          relatedProducts: String(p.relatedProducts || ''),
          faqs: Array.isArray(p.faqs) ? (p.faqs as ProductFormData['faqs']) : [],
        });
      } catch (err) {
        console.error('Failed to load product for editing:', err);
        setLoadError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setIsLoading(false);
      }
    }

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  if (!hasPermission(PERMISSIONS.PRODUCTS_EDIT)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#8a8f98]">You don&apos;t have permission to edit products.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-xs text-white/50">Loading product data...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center space-y-3">
        <p className="text-rose-400 text-sm">Failed to load product: {loadError}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-1.5 bg-[#5e6ad2] text-white text-xs rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  const updateField = <K extends keyof (ProductFormData & { costPrice: string })>(
    field: K,
    value: (ProductFormData & { costPrice: string })[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Image handlers
  const handleFilesSelected = (files: File[]) => {
    const newImages: ProductImage[] = [];
    files.forEach((file, index) => {
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
      pushToast({ tone: 'danger', description: 'At least one variant is required' });
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
    if (!formData.name.trim()) {
      pushToast({ tone: 'danger', description: 'Product name is required' });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload any newly added images
      const uploadedImages: Array<{ url: string; alt: string; sortOrder: number; isDefault: boolean }> = [];
      for (let i = 0; i < formData.images.length; i++) {
        const img = formData.images[i];
        if (img.file) {
          const uploadData = new FormData();
          uploadData.append('file', img.file);
          uploadData.append('folder', 'products');
          const uploadRes = await fetch('/api/admin/upload', { method: 'POST', body: uploadData, credentials: 'include' });
          if (!uploadRes.ok) throw new Error('Image upload failed');
          const { url } = await uploadRes.json();
          uploadedImages.push({
            url,
            alt: formData.imageAltTexts[i] || formData.name,
            sortOrder: i,
            isDefault: img.isMain,
          });
        } else {
          uploadedImages.push({
            url: img.preview,
            alt: formData.imageAltTexts[i] || formData.name,
            sortOrder: i,
            isDefault: img.isMain,
          });
        }
      }

      // 2. Upload OG Image if changed
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

      const primaryVariant = formData.variants[0];
      const sellingPrice = parseFloat(primaryVariant?.price || '0');
      const originalPrice = formData.discountPercentage && formData.salePrice
        ? sellingPrice
        : undefined;

      const targetId = dbProductId || productId;

      await adminFetchJson(`/api/admin/products/${targetId}`, {
        method: 'PUT',
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
          costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
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

      pushToast({ tone: 'success', description: 'Product updated successfully!' });
      router.push('/admin/products');
    } catch (err) {
      console.error('Failed to update product:', err);
      pushToast({ tone: 'danger', description: err instanceof Error ? err.message : 'Failed to update product' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header */}
      <ProductFormHeader
        title={`Edit: ${formData.name || 'Product'}`}
        subtitle={`Managing catalogue SKU and live parameters for ${formData.urlSlug || productId}`}
        backHref="/admin/products"
      />

      {/* 2. Basic Information */}
      <ProductBasicInfoCard>
        <ProductNameInput
          value={formData.name}
          onChange={(n) => updateField('name', n)}
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

      {/* 3. Product Images */}
      <ProductImageUploaderCard imageCount={formData.images.length}>
        <ProductImageDropzone onFilesSelected={handleFilesSelected} />
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

      {/* 4. Product Variants & Procurement Cost */}
      <ProductVariantMatrixCard
        variantCount={formData.variants.length}
        onAddVariant={handleAddVariant}
      >
        {formData.variants.map((variant, index) => (
          <ProductVariantRowItem
            key={variant.id}
            index={index}
            variant={variant}
            canRemove={formData.variants.length > 1}
            errors={errors}
            onChange={(field, val) => handleUpdateVariant(index, field, val)}
            onRemove={() => handleRemoveVariant(index)}
          />
        ))}

        <ProductCostPriceInput
          costPrice={formData.costPrice}
          sellingPrice={formData.variants[0]?.price}
          onChange={(val) => updateField('costPrice', val)}
        />

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

      {/* 5. Product Specifications */}
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

      {/* 6. Visual Managers */}
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

      {/* 7. SEO & Metadata */}
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

      {/* 8. Shipping & Delivery */}
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

      {/* 9. Discounts & Policies */}
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

      {/* 10. FAQs */}
      <ProductFaqSection
        faqs={formData.faqs}
        onChange={(faqs) => updateField('faqs', faqs)}
      />

      {/* 11. Floating Sticky Actions Bar */}
      <ProductStickyActionsBar
        isSubmitting={isSubmitting}
        cancelHref="/admin/products"
        onSubmit={handleSubmit}
        submitLabel="Update Product"
        submittingLabel="Updating Product..."
      />
    </div>
  );
}
