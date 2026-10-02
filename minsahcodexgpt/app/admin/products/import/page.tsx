'use client';

import { useToast } from '@/components/ui/ToastProvider';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import { adminFetchJson } from '@/lib/adminFetch';
import { DEFAULT_SITE_URL } from '@/lib/seo';
import { Info, AlertCircle } from 'lucide-react';

// Shared Types
import {
  ProductFormData,
  ProductVariant,
} from '@/components/admin/products/types';

// Loop 3: Common & Form & Media
import { ProductFormHeader } from '@/components/admin/products/common/ProductFormHeader';
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

// Loop 7: Shipping
import { ProductShippingCard } from '@/components/admin/products/shipping/ProductShippingCard';
import { ProductDimensionsInputs } from '@/components/admin/products/shipping/ProductDimensionsInputs';
import { ProductDeliveryOfferCard } from '@/components/admin/products/shipping/ProductDeliveryOfferCard';
import { ProductCityDeliveryRatesInput } from '@/components/admin/products/shipping/ProductCityDeliveryRatesInput';
import { ProductOfferDateRangePickers } from '@/components/admin/products/shipping/ProductOfferDateRangePickers';

// Loop 9: Import Primitives
import { ProductImportJsonEditor } from '@/components/admin/products/import/ProductImportJsonEditor';
import { ProductImportStatsBar } from '@/components/admin/products/import/ProductImportStatsBar';
import { ProductImportBatchActions } from '@/components/admin/products/import/ProductImportBatchActions';

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
  variants: [{ id: '1', size: '', color: '', price: '', stock: '10', sku: '' }],
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

export default function ImportPage() {
  const { pushToast } = useToast();
  const router = useRouter();
  const { hasPermission } = useAdminAuth();

  const [step, setStep] = useState<'paste' | 'review'>('paste');
  const [pasteText, setPasteText] = useState('');
  const [parseError, setParseError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<ProductFormData>(defaultForm);
  const [ownerFillRequired, setOwnerFillRequired] = useState<string[]>([]);
  const [marketPriceNote, setMarketPriceNote] = useState('');

  if (!hasPermission(PERMISSIONS.PRODUCTS_CREATE)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#8a8f98]">You don&apos;t have permission to import products.</p>
      </div>
    );
  }

  const handleParse = () => {
    if (!pasteText.trim()) return;
    setIsParsing(true);
    setParseError('');

    try {
      let rawText = pasteText.trim();
      const match = rawText.match(/\[IMPORT_DATA\]([\s\S]*?)\[\/IMPORT_DATA\]/);
      if (match) {
        rawText = match[1].trim();
      }

      const p = JSON.parse(rawText) as Record<string, unknown>;

      const variants: ProductVariant[] = Array.isArray(p.variants) && (p.variants as unknown[]).length > 0
        ? (p.variants as Array<Record<string, unknown>>).map((v, i) => ({
            id: String(v.id || Date.now() + i),
            size: String(v.size || ''),
            color: String(v.color || ''),
            price: String(v.price ?? ''),
            stock: String(v.stock ?? '10'),
            sku: String(v.sku || `SKU-${Date.now() + i}`),
          }))
        : defaultForm.variants;

      const dims = (p.dimensions as Record<string, string>) || { length: '', width: '', height: '' };

      const fillRequired: string[] = [];
      if (!p.price && (!p.variants || (p.variants as unknown[]).length === 0)) fillRequired.push('Price (sellingPrice)');
      if (!p.stock) fillRequired.push('Inventory stock count');
      if (!p.sku) fillRequired.push('Primary SKU identifier');

      setOwnerFillRequired(fillRequired);
      if (p.marketPriceNote) setMarketPriceNote(String(p.marketPriceNote));

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
        expiryDate: String(p.expiryDate || ''),
        variants,
        metaTitle: String(p.metaTitle || ''),
        metaDescription: String(p.metaDescription || ''),
        urlSlug: String(p.urlSlug || p.slug || ''),
        tags: String(p.tags || ''),
        bengaliProductName: String(p.bengaliProductName || p.bengaliName || ''),
        bengaliMetaDescription: String(p.bengaliMetaDescription || p.bengaliDescription || ''),
        focusKeyword: String(p.focusKeyword || ''),
        secondaryKeywords: Array.isArray(p.secondaryKeywords) ? (p.secondaryKeywords as string[]).map(String) : [],
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
        keyBenefits: Array.isArray(p.keyBenefits) ? (p.keyBenefits as string[]).map(String) : [],
        searchTags: Array.isArray(p.searchTags) ? (p.searchTags as string[]).map(String) : [],
        shippingWeight: String(p.shippingWeight || ''),
        dimensions: { length: String(dims.length || ''), width: String(dims.width || ''), height: String(dims.height || '') },
        isFragile: Boolean(p.isFragile),
      }));

      setStep('review');
      pushToast({ tone: 'success', description: 'Parsed JSON payload successfully' });
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Invalid JSON format. Check syntax and commas.');
    } finally {
      setIsParsing(false);
    }
  };

  const updateField = <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveImport = async () => {
    if (!formData.name.trim()) {
      pushToast({ tone: 'danger', description: 'Product name is required' });
      return;
    }

    setIsSaving(true);
    try {
      const primaryVariant = formData.variants[0];
      const sellingPrice = parseFloat(primaryVariant?.price || '0');

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
          weight: formData.weight || undefined,
          ingredients: formData.ingredients || undefined,
          skinType: formData.skinType,
          shelfLife: formData.shelfLife || undefined,
          expiryDate: formData.expiryDate || undefined,
          variants: formData.variants.map((v) => ({
            size: v.size || undefined,
            color: v.color || undefined,
            price: parseFloat(v.price || '0'),
            stock: parseInt(v.stock, 10) || 0,
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
          ogTitle: formData.ogTitle || undefined,
          ogDescription: formData.ogDescription || undefined,
          ogImageUrl: formData.ogImageUrl || undefined,
          canonicalUrl: formData.canonicalUrl || canonicalProductUrl(formData.urlSlug),
          pageH1: formData.pageH1 || undefined,
          seoIntro: formData.seoIntro || undefined,
          searchIntent: formData.searchIntent || undefined,
          targetAudience: formData.targetAudience || undefined,
          primaryConcern: formData.primaryConcern || undefined,
          keyBenefits: formData.keyBenefits,
          searchTags: formData.searchTags,
          condition: formData.productCondition,
          shippingWeight: formData.shippingWeight || undefined,
          dimensions: formData.dimensions.length ? formData.dimensions : undefined,
          isFragile: formData.isFragile,
          deliveryOfferEnabled: formData.deliveryOfferEnabled && formData.deliveryOfferType !== 'DEFAULT',
          deliveryOfferType: formData.deliveryOfferType,
          deliveryChargeInsideDhaka: formData.deliveryOfferEnabled ? formData.deliveryChargeInsideDhaka : undefined,
          deliveryChargeOutsideDhaka: formData.deliveryOfferEnabled ? formData.deliveryChargeOutsideDhaka : undefined,
          deliveryOfferBadgeText: formData.deliveryOfferBadgeText || undefined,
          lowStockThreshold: formData.lowStockThreshold ? parseInt(formData.lowStockThreshold, 10) : 10,
          barcode: formData.barcode || undefined,
          returnEligible: formData.returnEligible,
          codAvailable: formData.codAvailable,
          preOrderOption: formData.preOrderOption,
          relatedProducts: formData.relatedProducts || undefined,
        },
      });

      pushToast({ tone: 'success', description: 'Product successfully imported!' });
      router.push('/admin/products');
    } catch (err) {
      console.error('Failed to save imported product:', err);
      pushToast({ tone: 'danger', description: err instanceof Error ? err.message : 'Import failed' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header */}
      <ProductFormHeader
        title="Product Import — JSON & Claude SEO Ready"
        subtitle="Paste an [IMPORT_DATA] block or flat JSON to auto-fill and import catalogue products"
        backHref="/admin/products"
      />

      <div className="bg-[#5e6ad2]/10 border border-[#5e6ad2]/20 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#5e6ad2] shrink-0 mt-0.5" />
        <div className="text-xs text-[#f7f8f8] space-y-1">
          <p className="font-semibold">How to use this importer:</p>
          <p>1. Paste raw JSON or Claude generated <code className="bg-[#5e6ad2]/20 px-1 py-0.5 rounded font-mono">[IMPORT_DATA]...[/IMPORT_DATA]</code> block.</p>
          <p>2. Click <strong>Parse JSON</strong> to populate the atomic form cards.</p>
          <p>3. Review stock, prices, and SEO parameters before clicking <strong>Save & Import Product</strong>.</p>
        </div>
      </div>

      {step === 'paste' ? (
        <div className="bg-[#161824] rounded-xl border border-[#232636] p-6 shadow-sm space-y-4">
          <ProductImportJsonEditor
            value={pasteText}
            onChange={(val) => {
              setPasteText(val);
              setParseError('');
            }}
            error={parseError}
            rows={16}
          />

          <ProductImportBatchActions
            step="paste"
            isParsing={isParsing}
            canParse={Boolean(pasteText.trim())}
            onParse={handleParse}
            onClear={() => {
              setPasteText('');
              setParseError('');
            }}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <ProductImportStatsBar
            isParsed={true}
            marketNote={marketPriceNote}
            blockersCount={ownerFillRequired.length}
          />

          {ownerFillRequired.length > 0 && (
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 space-y-2">
              <h4 className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Action Items to Verify Before Saving:
              </h4>
              <ul className="list-disc pl-5 text-xs text-white/80 space-y-1">
                {ownerFillRequired.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Form Cards In-Place Review */}
          <ProductBasicInfoCard>
            <ProductNameInput
              value={formData.name}
              onChange={(n) => updateField('name', n)}
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
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ProductBrandSelector
                value={formData.brand}
                onChange={(b) => updateField('brand', b)}
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
            />
          </ProductBasicInfoCard>

          {/* Variants */}
          <ProductVariantMatrixCard
            variantCount={formData.variants.length}
            onAddVariant={() =>
              updateField('variants', [
                ...formData.variants,
                { id: Date.now().toString(), size: '', color: '', price: '', stock: '10', sku: `SKU-${Date.now()}` },
              ])
            }
          >
            {formData.variants.map((v, i) => (
              <ProductVariantRowItem
                key={v.id}
                index={i}
                variant={v}
                canRemove={formData.variants.length > 1}
                onChange={(f, val) => {
                  const copy = [...formData.variants];
                  copy[i] = { ...copy[i], [f]: val };
                  updateField('variants', copy);
                }}
                onRemove={() =>
                  updateField('variants', formData.variants.filter((_, idx) => idx !== i))
                }
              />
            ))}
          </ProductVariantMatrixCard>

          {/* Specifications */}
          <ProductSpecificationsCard>
            <ProductSkinTypePills
              selected={formData.skinType}
              onToggle={(t) =>
                updateField(
                  'skinType',
                  formData.skinType.includes(t)
                    ? formData.skinType.filter((type) => type !== t)
                    : [...formData.skinType, t]
                )
              }
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
            <ProductIngredientsTextarea
              ingredients={formData.ingredients}
              verificationStatus={formData.ingredientVerificationStatus}
              onChangeIngredients={(ing) => updateField('ingredients', ing)}
              onChangeStatus={(st) => updateField('ingredientVerificationStatus', st)}
            />
          </ProductSpecificationsCard>

          {/* SEO */}
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
          </ProductSeoSettingsCard>

          {/* Shipping & Delivery */}
          <ProductShippingCard>
            <ProductDimensionsInputs
              shippingWeight={formData.shippingWeight}
              dimensions={formData.dimensions}
              isFragile={formData.isFragile}
              onChangeWeight={(w) => updateField('shippingWeight', w)}
              onChangeDimension={(dim, val) =>
                updateField('dimensions', { ...formData.dimensions, [dim]: val })
              }
              onToggleFragile={(f) => updateField('isFragile', f)}
            />
            <ProductDeliveryOfferCard
              enabled={formData.deliveryOfferEnabled}
              type={formData.deliveryOfferType}
              badgeText={formData.deliveryOfferBadgeText}
              onToggleEnabled={(en) => updateField('deliveryOfferEnabled', en)}
              onChangeType={(tp) => updateField('deliveryOfferType', tp)}
              onChangeBadgeText={(bt) => updateField('deliveryOfferBadgeText', bt)}
            />
          </ProductShippingCard>

          {/* Sticky Actions */}
          <ProductImportBatchActions
            step="review"
            isSaving={isSaving}
            onParse={handleParse}
            onClear={() => setStep('paste')}
            onBackToPaste={() => setStep('paste')}
            onSave={handleSaveImport}
          />
        </div>
      )}
    </div>
  );
}
