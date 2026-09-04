"use client";

/* eslint-disable react-hooks/preserve-manual-memoization */

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CheckCircle,
  ShoppingBag,
} from "lucide-react";
import ProductStickyHeader from "./ProductStickyHeader";
import SeedProductHero from "./hero/SeedProductHero";
import SeedMorphingStickyBar from "./hero/SeedMorphingStickyBar";
import SeedBenefitsSection from "./benefits/SeedBenefitsSection";
import SeedMemberReviewsSection from "./reviews/SeedMemberReviewsSection";
import SeedClinicalStatStrip from "./SeedClinicalStatStrip";
import SeedDeliveryTechnology from "./SeedDeliveryTechnology";
import SeedFormulationMatrix from "./SeedFormulationMatrix";
import SeedClinicalTrialData from "./SeedClinicalTrialData";
import SeedWholeBodyExplorer from "./SeedWholeBodyExplorer";
import SeedRefillRitual from "./SeedRefillRitual";
import {
  trackAddToCartBundle,
  trackProductView,
} from "@/lib/tracking/ecommerce";
import { useCart, type CartItem } from "@/contexts/CartContext";
import { useCartDrawer } from "@/contexts/CartDrawerContext";
import { productPath } from "@/lib/product-url";
import CatalogProductImage from "@/components/catalog/CatalogProductImage";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";

interface ImageItem {
  url: string;
  alt?: string;
  isDefault?: boolean;
}

interface Variant {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  attributes: Record<string, string> | null;
  image?: string;
  weight?: number | null;
}

interface Review {
  id: string;
  userName: string;
  rating: number;
  title: string;
  content: string;
  verified: boolean;
  createdAt: string;
}

interface RatingData {
  average: number;
  total: number;
  distribution: Record<number, number>;
}

interface ActiveDeliveryOffer {
  type: "FREE" | "FIXED" | "DEFAULT" | string;
  amount: number | null;
  badgeText: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

interface RelatedProduct {
  id: string;
  name: string;
  price: number;
  originalPrice: number | null;
  image: string;
  slug: string;
  stock: number;
  hasVariants: boolean;
}

interface FrequentlyBoughtProduct {
  id: string;
  sku: string;
  name: string;
  slug: string;
  price: number;
  originalPrice: number | null;
  image: string;
  stock: number;
  hasVariants: boolean;
  orderCount: number;
  totalUnits: number;
}

interface RecentlyViewedProduct {
  id: string;
  slug?: string | null;
  name: string;
  price: number;
  originalPrice: number | null;
  image: string;
  stock: number;
  hasVariants: boolean;
}

interface ProductClientProps {
  product: {
    id: string;
    name: string;
    slug: string;
    pageH1?: string;
    bengaliName?: string;
    description: string;
    shortDescription: string;
    seoIntro?: string;
    bengaliDescription?: string;
    price: number;
    salePrice?: number | null;
    discountPercentage?: number | null;
    originalPrice: number | null;
    image: string;
    images: ImageItem[] | string[];
    sku: string;
    stock: number;
    category: string;
    categorySlug?: string;
    brand: string;
    rating: number;
    reviews: number;
    inStock: boolean;
    isNew: boolean;
    ingredients?: string;
    skinType?: string[];
    codAvailable?: boolean;
    returnEligible?: boolean;
    weight?: number | null;
    lowStockThreshold?: number;
    allowBackorder?: boolean;
    preOrderOption?: boolean;
    authenticityNote?: string;
    ingredientVerificationStatus?: string;
    activeDeliveryOffer?: ActiveDeliveryOffer | null;
    keyBenefits?: string[];
    usageInstructions?: string[];
    descriptionSections?: unknown;
    productSpecs?: unknown;
    productAttributes?: unknown;
    shadeOptions?: unknown;
    variantPriceTable?: unknown;
    variantComparisonTable?: unknown;
    internalLinks?: unknown;
    targetAudience?: string;
    primaryConcern?: string;
    gender?: string;
    flashSaleEligible?: boolean;
    offerStartDate?: string | null;
    offerEndDate?: string | null;
    shelfLife?: string;
    expiryDate?: string | null;
    shippingWeight?: string;
    originCountry?: string;
    isFragile?: boolean;
    length?: number | null;
    width?: number | null;
    height?: number | null;
    dimensions?: {
      length?: number | null;
      width?: number | null;
      height?: number | null;
    } | null;
    barcode?: string;
    condition?: string;
    gtin?: string;
    variants: Variant[];
  };
  reviews: Review[];
  rating: RatingData;
  relatedProducts: RelatedProduct[];
  frequentlyBoughtTogether: FrequentlyBoughtProduct[];
  productUrl: string;
}

function humanizeKey(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

function getAttributeValue(
  attributes: Record<string, string> | null | undefined,
  keys: string[],
) {
  if (!attributes) return null;

  for (const key of keys) {
    const exact = attributes[key];
    if (exact) return exact;
  }

  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
  for (const [key, value] of Object.entries(attributes)) {
    if (normalizedKeys.has(key.toLowerCase()) && value) return value;
  }

  return null;
}

function getAdditionalVariantAttributes(
  attributes: Record<string, string> | null | undefined,
) {
  if (!attributes) return [];
  const handledKeys = new Set(["size", "color", "shade"]);

  return Object.entries(attributes)
    .filter(([key, value]) => value && !handledKeys.has(key.toLowerCase()))
    .map(([key, value]) => `${humanizeKey(key)}: ${value}`);
}

function getVariantDisplayLabel(variant: Variant) {
  const size = getAttributeValue(variant.attributes, ["size", "Size"]);
  const color = getAttributeValue(variant.attributes, [
    "color",
    "Color",
    "shade",
    "Shade",
  ]);
  const extras = getAdditionalVariantAttributes(variant.attributes);
  const attributeLabel = [size, color, ...extras].filter(Boolean).join(" / ");

  return attributeLabel || variant.name;
}

type BundleStatus = {
  type: "success" | "error" | "info";
  message: string;
} | null;

export default function ProductClient({
  product,
  reviews,
  rating,
  relatedProducts,
  frequentlyBoughtTogether,
}: ProductClientProps) {
  const initialVariant =
    product.variants.length === 1 ? product.variants[0] : null;
  const [selectedVariantId] = useState<string | null>(
    initialVariant?.id ?? null,
  );
  const baseDisplayPrice =
    product.salePrice && product.salePrice > 0
      ? product.salePrice
      : product.price;
  const [currentPrice] = useState(
    initialVariant?.price ?? baseDisplayPrice,
  );
  const [quantity] = useState(1);
  const [variantImageOverride] = useState<string | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedProduct[]>(
    [],
  );
  const [selectedBundleProductIds, setSelectedBundleProductIds] = useState<
    string[]
  >([]);
  const [bundleStatus, setBundleStatus] = useState<BundleStatus>(null);

  const viewedProductKeysRef = useRef<Set<string>>(new Set());
  const { addItem } = useCart();
  const { registerAddIntent, openForSuccessfulAdd } = useCartDrawer();

  const selectedVariantObj =
    product.variants.find((variant) => variant.id === selectedVariantId) ??
    null;
  const requiresVariantSelection =
    product.variants.length > 0 && !selectedVariantId;
  const activeStock = selectedVariantObj
    ? selectedVariantObj.stock
    : product.stock;
  const activeInStock = selectedVariantObj
    ? selectedVariantObj.stock > 0
    : product.inStock;

  const comparePrice =
    product.originalPrice && product.originalPrice > currentPrice
      ? product.originalPrice
      : null;

  const variantNameLabel = selectedVariantObj
    ? getVariantDisplayLabel(selectedVariantObj)
    : null;
  const variantSize = selectedVariantObj
    ? getAttributeValue(selectedVariantObj.attributes, ["size", "Size"])
    : null;
  const variantColor = selectedVariantObj
    ? getAttributeValue(selectedVariantObj.attributes, [
        "color",
        "Color",
        "shade",
        "Shade",
      ])
    : null;
  const variantImage = selectedVariantObj?.image ?? null;

  const bundleProducts = useMemo(
    () => frequentlyBoughtTogether.slice(0, 4),
    [frequentlyBoughtTogether],
  );
  const selectableBundleProducts = useMemo(
    () =>
      bundleProducts.filter(
        (bundleProduct) =>
          bundleProduct.stock > 0 && !bundleProduct.hasVariants,
      ),
    [bundleProducts],
  );
  const selectedBundleProducts = useMemo(
    () =>
      selectableBundleProducts.filter((bundleProduct) =>
        selectedBundleProductIds.includes(bundleProduct.id),
      ),
    [selectableBundleProducts, selectedBundleProductIds],
  );
  const bundleAddOnsTotal = selectedBundleProducts.reduce(
    (sum, bundleProduct) => sum + bundleProduct.price,
    0,
  );
  const bundleCurrentProductTotal = currentPrice * quantity;
  const bundleTotal = bundleCurrentProductTotal + bundleAddOnsTotal;
  const bundleCompareTotal =
    (comparePrice && comparePrice > currentPrice
      ? comparePrice
      : currentPrice) *
      quantity +
    selectedBundleProducts.reduce(
      (sum, bundleProduct) =>
        sum +
        (bundleProduct.originalPrice &&
        bundleProduct.originalPrice > bundleProduct.price
          ? bundleProduct.originalPrice
          : bundleProduct.price),
      0,
    );
  const bundleSavings = Math.max(0, bundleCompareTotal - bundleTotal);
  const galleryImages = (
    product.images as Array<string | { url: string; alt?: string }>
  ).map((img) =>
    typeof img === "string" ? { url: img, alt: product.name } : img,
  );

  useEffect(() => {
    setSelectedBundleProductIds((previousIds) => {
      const selectableIds = new Set(
        selectableBundleProducts.map((bundleProduct) => bundleProduct.id),
      );
      const keptIds = previousIds.filter((id) => selectableIds.has(id));
      if (keptIds.length > 0 || selectableBundleProducts.length === 0)
        return keptIds;
      return selectableBundleProducts
        .slice(0, 2)
        .map((bundleProduct) => bundleProduct.id);
    });
  }, [selectableBundleProducts]);

  const toggleBundleProduct = useCallback((productId: string) => {
    setBundleStatus(null);
    setSelectedBundleProductIds((previousIds) =>
      previousIds.includes(productId)
        ? previousIds.filter((id) => id !== productId)
        : [...previousIds, productId],
    );
  }, []);

  const handleAddBundleToCart = useCallback(async () => {
    if (requiresVariantSelection) {
      setBundleStatus({
        type: "error",
        message:
          "বান্ডেল কার্টে যোগ করার আগে এই পণ্যের সাইজ/শেড/ভ্যারিয়েন্ট নির্বাচন করুন।",
      });
      document
        .getElementById("product-variant-selector")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!activeInStock) {
      setBundleStatus({
        type: "error",
        message: "মূল পণ্যের স্টক না থাকায় বান্ডেল যোগ করা যাবে না।",
      });
      return;
    }

    if (selectedBundleProducts.length === 0) {
      setBundleStatus({
        type: "info",
        message: "বান্ডেল তৈরি করতে অন্তত ১টি add-on নির্বাচন করুন।",
      });
      return;
    }

    const mainCartKey = selectedVariantObj?.id ?? product.id;
    const bundleCartItems: CartItem[] = [
      {
        id: mainCartKey,
        productId: product.id,
        variantId: selectedVariantObj?.id ?? null,
        variantName: variantNameLabel ?? null,
        sku: selectedVariantObj?.sku ?? product.sku ?? undefined,
        productSku: product.sku ?? undefined,
        variantSku: selectedVariantObj?.sku ?? null,
        size: variantSize ?? null,
        color: variantColor ?? null,
        variantImage: variantImage ?? null,
        name: product.name,
        price: currentPrice,
        quantity,
        image: variantImageOverride || variantImage || product.image,
        weight: selectedVariantObj?.weight ?? product.weight ?? null,
        stock: activeStock,
        maxQuantity: product.allowBackorder ? null : activeStock,
      },
      ...selectedBundleProducts.map((bundleProduct) => ({
        id: bundleProduct.id,
        productId: bundleProduct.id,
        variantId: null,
        variantName: null,
        sku: bundleProduct.sku,
        productSku: bundleProduct.sku,
        variantSku: null,
        name: bundleProduct.name,
        price: bundleProduct.price,
        quantity: 1,
        image: bundleProduct.image,
        stock: bundleProduct.stock,
        maxQuantity: bundleProduct.stock,
      })),
    ];

    try {
      const intentId = registerAddIntent();
      bundleCartItems.forEach((cartItem) => {
        addItem(cartItem, { track: false });
      });

      trackAddToCartBundle(bundleCartItems, `${product.name} বান্ডেল`);

      openForSuccessfulAdd(
        intentId,
        bundleCartItems[0],
        bundleCartItems[0].quantity,
      );

      setBundleStatus({
        type: "success",
        message: `${selectedBundleProducts.length + 1}টি আইটেম কার্টে যোগ হয়েছে।`,
      });
    } catch {
      setBundleStatus({
        type: "error",
        message: "বান্ডেল কার্টে যোগ করা যায়নি। আবার চেষ্টা করুন।",
      });
    }
  }, [
    activeInStock,
    addItem,
    openForSuccessfulAdd,
    registerAddIntent,
    currentPrice,
    product.id,
    product.image,
    product.name,
    product.sku,
    product.allowBackorder,
    product.weight,
    quantity,
    requiresVariantSelection,
    selectedBundleProducts,
    selectedVariantObj,
    variantColor,
    variantImage,
    variantImageOverride,
    variantNameLabel,
    variantSize,
    activeStock,
  ]);

  useEffect(() => {
    const viewKey = selectedVariantObj?.id ? `${product.id}:${selectedVariantObj.id}` : `${product.id}:group`;
    if (viewedProductKeysRef.current.has(viewKey)) return;
    viewedProductKeysRef.current.add(viewKey);

    trackProductView({
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: product.price,
      salePrice: product.salePrice,
      category: product.category,
      brand: product.brand,
      variants: product.variants,
      selectedVariantId: selectedVariantObj?.id ?? null,
    });
  }, [
    product.id,
    product.sku,
    product.name,
    product.price,
    product.salePrice,
    product.category,
    product.brand,
    product.variants,
    selectedVariantObj,
  ]);

  const displayTitle = product.pageH1 || product.name;

  useEffect(() => {
    const storageKey = "minsah_recently_viewed_products";

    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved
        ? (JSON.parse(saved) as RecentlyViewedProduct[])
        : [];
      const filtered = parsed.filter((item) => item.id !== product.id);
      setRecentlyViewed(filtered.slice(0, 8));

      const currentProduct: RecentlyViewedProduct = {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: baseDisplayPrice,
        originalPrice: product.originalPrice,
        image: product.image,
        stock: product.stock,
        hasVariants: product.variants.length > 0,
      };

      localStorage.setItem(
        storageKey,
        JSON.stringify([currentProduct, ...filtered].slice(0, 12)),
      );
    } catch {
      setRecentlyViewed([]);
    }
  }, [
    product.id,
    product.slug,
    product.name,
    product.price,
    product.salePrice,
    baseDisplayPrice,
    product.originalPrice,
    product.image,
    product.stock,
    product.variants.length,
  ]);

  return (
    <>
      <ProductStickyHeader
        productName={displayTitle}
        price={currentPrice}
        variantName={variantNameLabel}
        requiresVariantSelection={requiresVariantSelection}
        stock={activeStock}
        inStock={activeInStock}
        relatedProducts={
          relatedProducts && relatedProducts.length > 0
            ? relatedProducts.map((p) => ({
                id: p.id,
                name: p.name,
                slug: p.slug,
                price: p.price,
                originalPrice: p.originalPrice,
                image: p.image,
                category: product.category || 'Formulation',
              }))
            : undefined
        }
      />

      {/* ========================================================================= */}
      {/* SEED & DIEUX-INSPIRED MODULAR 7-PHASE MASTER HERO ARCHITECTURE             */}
      {/* ========================================================================= */}
      <SeedProductHero
        product={{
          id: product.id,
          name: displayTitle,
          sku: product.sku || 'DS-01®',
          price: baseDisplayPrice,
          compareAtPrice: comparePrice,
          costPrice: (product as any).costPrice,
          image: product.image,
          images: galleryImages,
          shortDescription: product.shortDescription,
          keyBenefits: product.keyBenefits,
          ingredients: product.ingredients,
          skinType: (product as any).skinType,
          shelfLife: (product as any).shelfLife,
          originCountry: (product as any).originCountry,
          deliveryOfferEnabled: Boolean(product.activeDeliveryOffer),
          productSpecs: (product as any).productSpecs,
          productAttributes: (product as any).productAttributes,
          descriptionSections: product.descriptionSections as any,
          relatedProducts: (product as any).relatedProducts,
        }}
        variants={product.variants as any}
        relatedProductsList={
          relatedProducts && relatedProducts.length > 0
            ? relatedProducts.map((p) => ({
                id: p.id,
                name: p.name,
                price: p.price,
                costPrice: (p as any).costPrice,
                image: p.image,
                stock: p.stock,
                hasFreeDelivery: true,
                category: product.category || 'Skincare',
              }))
            : undefined
        }
      />

      {/* ========================================================================= */}
      {/* SEED-STYLE "BENEFITS THAT BUILD OVER TIME" CLINICAL TIMELINE & FAQ MATRIX  */}
      {/* ========================================================================= */}
      <SeedBenefitsSection
        product={product as any}
      />

      {/* 01. Clinical Metric Ticker */}
      <SeedClinicalStatStrip />

      {/* 02. Dermal Delivery Technology */}
      <SeedDeliveryTechnology />

      {/* 03. Bio-Active Formulation Matrix */}
      <SeedFormulationMatrix />

      {/* 04. Human Clinical Trial Evidence */}
      <SeedClinicalTrialData />

      {/* 05. 4-System Whole-Dermal Explorer */}
      <SeedWholeBodyExplorer />

      {/* 06. Sustainable Vessel & Refill Ritual */}
      <SeedRefillRitual />

      {/* ========================================================================= */}
      {/* SEED.COM MEMBER REVIEWS & VERIFIED BUYER PHOTO MATRIX                    */}
      {/* ========================================================================= */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-14 -mx-4 sm:-mx-6 lg:-mx-8">
          <SeedMemberReviewsSection
            product={product as any}
            ratingData={{
              average: rating?.average || product.rating || 4.8,
              total: rating?.total || product.reviews || 15307,
              distribution: rating?.distribution || { 5: 13486, 4: 1256, 3: 338, 2: 102, 1: 125 },
            }}
          />
        </div>

        {/* Frequently Bought Together: Bundle Section */}
        {bundleProducts.length > 0 && (
          <section
            className="mt-16 rounded-2xl border border-stone-200 bg-[#FCFCF7] p-6 sm:p-8 shadow-xs"
            aria-labelledby="frequently-bought-together-heading"
          >
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p
                  id="frequently-bought-together-heading"
                  className="text-xs font-bold uppercase tracking-[0.16em] text-[#1C3A13]"
                >
                  স্মার্ট বান্ডেল ও কম্বো অফার
                </p>
                <h3 className="mt-1 text-xl font-bold tracking-tight text-[#1C3A13] sm:text-2xl">
                  একসাথে বেশি কেনা হয় (Frequently Bought Together)
                </h3>
              </div>
              <span className="rounded-full bg-[#1C3A13] px-3.5 py-1 text-xs font-semibold text-[#FCFCF7] shadow-xs">
                বান্ডেল সেভিংস
              </span>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-center">
              {/* Left: Bundle Items List */}
              <div className="space-y-3">
                {/* Main Product Card */}
                <div className="flex items-center gap-3.5 rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-50 border border-stone-200">
                    <CatalogProductImage
                      src={variantImageOverride || variantImage || product.image}
                      alt={product.name}
                      sizes="56px"
                      padding="none"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                      <CheckCircle size={10} /> এই পণ্য
                    </span>
                    <p className="truncate text-xs font-bold text-[#1C3A13] mt-0.5">
                      {product.name}
                    </p>
                    <p className="text-xs font-bold text-[#1C3A13]">
                      ৳{bundleCurrentProductTotal.toLocaleString("bn-BD")}
                    </p>
                  </div>
                </div>

                {/* Bundle Addons */}
                {bundleProducts.map((bundleProduct) => {
                  const isSelectable =
                    bundleProduct.stock > 0 && !bundleProduct.hasVariants;
                  const isSelected = selectedBundleProductIds.includes(
                    bundleProduct.id,
                  );

                  return (
                    <div
                      key={bundleProduct.id}
                      className={`flex items-center gap-3.5 rounded-xl border p-3.5 transition-all ${
                        isSelected && isSelectable
                          ? "border-[#1C3A13] bg-white shadow-xs"
                          : "border-stone-200 bg-white/70 opacity-85 hover:opacity-100"
                      }`}
                    >
                      <Checkbox
                        label={<span className="sr-only">{bundleProduct.name} নির্বাচন করুন</span>}
                        checked={isSelected && isSelectable}
                        disabled={!isSelectable}
                        onChange={() => toggleBundleProduct(bundleProduct.id)}
                      />

                      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-50 border border-stone-200">
                        <CatalogProductImage
                          src={bundleProduct.image}
                          alt={bundleProduct.name}
                          sizes="56px"
                          padding="none"
                        />
                      </span>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={productPath(bundleProduct)}
                          className="truncate block text-xs font-bold text-[#1C3A13] hover:text-emerald-800 transition"
                        >
                          {bundleProduct.name}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-bold text-[#1C3A13]">
                            ৳{bundleProduct.price.toLocaleString("bn-BD")}
                          </span>
                          {bundleProduct.originalPrice &&
                            bundleProduct.originalPrice > bundleProduct.price && (
                              <span className="text-[11px] text-stone-400 line-through">
                                ৳{bundleProduct.originalPrice.toLocaleString("bn-BD")}
                              </span>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right: Bundle CTA Card */}
              <div className="rounded-xl border border-stone-200 bg-white p-6 text-center space-y-3 shadow-xs">
                <p className="text-xs font-semibold text-stone-500">
                  সর্বমোট মূল্য ({selectedBundleProducts.length + 1}টি আইটেম)
                </p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-2xl font-bold text-[#1C3A13]">
                    ৳{bundleTotal.toLocaleString("bn-BD")}
                  </span>
                  {bundleSavings > 0 && (
                    <span className="text-xs text-stone-400 line-through">
                      ৳{bundleCompareTotal.toLocaleString("bn-BD")}
                    </span>
                  )}
                </div>

                {bundleSavings > 0 && (
                  <span className="inline-block rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-0.5 text-xs font-semibold">
                    মোট সাশ্রয় ৳{bundleSavings.toLocaleString("bn-BD")}
                  </span>
                )}

                <Button
                  type="button"
                  fullWidth
                  onClick={handleAddBundleToCart}
                  disabled={!activeInStock}
                  className="rounded-full h-11 bg-[#1C3A13] hover:bg-[#28521c] text-white font-semibold shadow-xs"
                >
                  <ShoppingBag size={16} className="mr-1.5" />
                  বান্ডেল কার্টে যোগ করুন
                </Button>

                {bundleStatus && (
                  <p
                    className={`text-xs font-bold ${
                      bundleStatus.type === "success"
                        ? "text-emerald-700"
                        : "text-red-600"
                    }`}
                  >
                    {bundleStatus.message}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Related Products Carousel */}
        {relatedProducts.length > 0 && (
          <section className="mt-16 rounded-2xl border border-stone-200 bg-[#FCFCF7] p-6 sm:p-8 shadow-xs">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1C3A13]">
                  আপনার পছন্দ হতে পারে
                </p>
                <h3 className="text-xl font-bold tracking-tight text-[#1C3A13] sm:text-2xl">
                  সম্পর্কিত পণ্যসমূহ (Related Products)
                </h3>
              </div>
              <Link
                href="/shop"
                className="text-xs font-bold text-[#1C3A13] hover:underline"
              >
                সব দেখুন →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {relatedProducts.slice(0, 4).map((relatedProduct) => {
                const relatedDiscount =
                  relatedProduct.originalPrice &&
                  relatedProduct.originalPrice > relatedProduct.price
                    ? Math.round(
                        ((relatedProduct.originalPrice -
                          relatedProduct.price) /
                          relatedProduct.originalPrice) *
                          100,
                      )
                    : null;

                return (
                  <Link
                    key={relatedProduct.id}
                    href={productPath(relatedProduct)}
                    className="group flex h-full flex-col overflow-hidden rounded-xl border border-stone-200 bg-white transition-all hover:border-stone-400 hover:shadow-xs"
                  >
                    <div className="relative aspect-square bg-stone-50 p-2">
                      <CatalogProductImage
                        src={relatedProduct.image}
                        alt={relatedProduct.name}
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="group-hover:scale-105 transition-transform duration-300"
                      />
                      {relatedDiscount && (
                        <span className="absolute right-2.5 top-2.5 rounded-full bg-[#1C3A13] px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                          -{relatedDiscount}%
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-3.5">
                      <p className="line-clamp-2 text-xs font-semibold text-stone-900 group-hover:text-[#1C3A13] transition">
                        {relatedProduct.name}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[#1C3A13]">
                          ৳{relatedProduct.price.toLocaleString("bn-BD")}
                        </span>
                        {relatedProduct.originalPrice &&
                          relatedProduct.originalPrice > relatedProduct.price && (
                            <span className="text-xs text-stone-400 line-through">
                              ৳{relatedProduct.originalPrice.toLocaleString("bn-BD")}
                            </span>
                          )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Recently Viewed Products */}
        {recentlyViewed.length > 0 && (
          <section className="mt-16 mb-20 rounded-2xl border border-stone-200 bg-[#FCFCF7] p-6 sm:p-8 shadow-xs">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1C3A13]">
                সম্প্রতি দেখা হয়েছে
              </p>
              <h3 className="text-xl font-bold tracking-tight text-[#1C3A13] sm:text-2xl">
                Recently Viewed Products
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {recentlyViewed.slice(0, 6).map((item) => (
                <Link
                  key={item.id}
                  href={`/products/${item.slug || item.id}`}
                  className="group block overflow-hidden rounded-xl border border-stone-200 bg-white p-2.5 transition hover:border-stone-400 hover:shadow-xs"
                >
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-stone-50">
                    <CatalogProductImage
                      src={item.image}
                      alt={item.name}
                      sizes="120px"
                      className="group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <p className="mt-2 line-clamp-1 text-xs font-semibold text-stone-900 group-hover:text-[#1C3A13] transition">
                    {item.name}
                  </p>
                  <p className="text-xs font-bold text-[#1C3A13]">
                    ৳{item.price.toLocaleString("bn-BD")}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Seed.com-Inspired Dynamic Scroll-Morphing Sticky Capsule Bar */}
      <SeedMorphingStickyBar
        productId={product.id}
        productName={displayTitle}
        productImage={variantImageOverride || variantImage || product.image}
        price={currentPrice}
        compareAtPrice={comparePrice}
        sku={selectedVariantObj?.sku ?? product.sku}
        variantId={selectedVariantId}
        variantName={variantNameLabel}
        inStock={activeInStock}
      />
    </>
  );
}
