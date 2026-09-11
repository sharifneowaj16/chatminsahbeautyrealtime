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
import { safeImageUrl } from "@/lib/safe-image";
import SeedProductHero from "./hero/SeedProductHero";
import SeedMorphingStickyBar from "./hero/SeedMorphingStickyBar";
import { cleanProductName } from "./hero/cleanProductName";
import SeedBenefitsSection from "./benefits/SeedBenefitsSection";
import SeedMemberReviewsSection from "./reviews/SeedMemberReviewsSection";
import {
  trackAddToCartBundle,
  trackProductView,
} from "@/lib/tracking/ecommerce";
import { useCart, type CartItem } from "@/contexts/CartContext";
import { useCartDrawer } from "@/contexts/CartDrawerContext";
import { createBundleCartItem, findStandaloneCartItems } from "@/utils/cartItemHelper";
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
  insideDhakaAmount?: number | null;
  outsideDhakaAmount?: number | null;
  badgeText: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

interface RelatedProduct {
  id: string;
  name: string;
  price: number;
  costPrice?: number | null;
  weight?: number | null;
  shippingWeight?: string | null;
  deliveryOfferEnabled?: boolean | null;
  deliveryOfferType?: string | null;
  deliveryOfferAmount?: number | null;
  deliveryChargeInsideDhaka?: number | null;
  deliveryChargeOutsideDhaka?: number | null;
  originalPrice: number | null;
  image: string;
  slug: string;
  stock: number;
  hasVariants: boolean;
  variants?: Variant[];
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
  variants?: Variant[];
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
    deliveryChargeInsideDhaka?: number | null;
    deliveryChargeOutsideDhaka?: number | null;
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
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    initialVariant?.id ?? null,
  );
  const baseDisplayPrice =
    product.salePrice && product.salePrice > 0
      ? product.salePrice
      : product.price;
  const [currentPrice, setCurrentPrice] = useState(
    initialVariant?.price ?? baseDisplayPrice,
  );
  const [quantity, setQuantity] = useState(1);
  const [variantImageOverride, setVariantImageOverride] = useState<string | null>(null);

  const handleVariantChange = useCallback(
    (variantId: string | null, newPrice: number) => {
      setSelectedVariantId(variantId);
      setCurrentPrice(newPrice);
    },
    [],
  );

  const handleImageChange = useCallback((imageUrl: string | null) => {
    setVariantImageOverride(imageUrl);
  }, []);

  const handleQuantityChange = useCallback((newQty: number) => {
    setQuantity(newQty);
  }, []);

  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedProduct[]>(
    [],
  );
  const [selectedBundleProductIds, setSelectedBundleProductIds] = useState<
    string[]
  >([]);
  const [selectedCompanionVariantIds, setSelectedCompanionVariantIds] = useState<
    Record<string, string>
  >({});
  const [bundleStatus, setBundleStatus] = useState<BundleStatus>(null);

  const handleCompanionVariantChange = useCallback((productId: string, variantId: string) => {
    setSelectedCompanionVariantIds((prev) => ({
      ...prev,
      [productId]: variantId,
    }));
  }, []);

  const viewedProductKeysRef = useRef<Set<string>>(new Set());
  const { items, addItem, removeItem } = useCart();
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
          bundleProduct.stock > 0 || (bundleProduct.variants && bundleProduct.variants.some((v) => v.stock > 0)),
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
    (sum, bundleProduct) => {
      const chosenVar = bundleProduct.variants?.find((v) => v.id === selectedCompanionVariantIds[bundleProduct.id]);
      const pPrice = chosenVar ? chosenVar.price : bundleProduct.price;
      return sum + pPrice;
    },
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
      (sum, bundleProduct) => {
        const chosenVar = bundleProduct.variants?.find((v) => v.id === selectedCompanionVariantIds[bundleProduct.id]);
        const pPrice = chosenVar ? chosenVar.price : bundleProduct.price;
        const pOrigPrice = bundleProduct.originalPrice;
        return sum + (pOrigPrice && pOrigPrice > pPrice ? pOrigPrice : pPrice);
      },
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

    const bundleGroupId = `fbt-${product.id}-${selectedBundleProducts.map((p) => p.id).sort().join('-')}`;
    const bundleCartItems: CartItem[] = [
      createBundleCartItem({
        product: {
          id: product.id,
          name: product.name,
          price: currentPrice,
          image: variantImageOverride || variantImage || product.image,
          sku: product.sku,
          stock: activeStock,
          trackInventory: (product as any).trackInventory ?? null,
          allowBackorder: product.allowBackorder ?? null,
          weight: selectedVariantObj?.weight ?? product.weight ?? null,
          shippingWeight: product.shippingWeight ?? null,
        },
        variant: selectedVariantObj
          ? {
              id: selectedVariantObj.id,
              name: variantNameLabel,
              price: currentPrice,
              image: variantImageOverride || variantImage || product.image,
              sku: selectedVariantObj.sku,
              stock: activeStock,
              attributes: selectedVariantObj.attributes,
            }
          : null,
        bundleId: bundleGroupId,
        bundleName: 'Frequently Bought Together',
        discountRatio: 1,
        quantity,
      }),
      ...selectedBundleProducts.map((bundleProduct) => {
        const selectedVar =
          bundleProduct.variants?.find((v) => v.id === selectedCompanionVariantIds[bundleProduct.id]) ||
          (bundleProduct.variants && bundleProduct.variants.length > 0 ? bundleProduct.variants[0] : null);
        const effectivePrice = selectedVar ? selectedVar.price : bundleProduct.price;
        const effectiveImage = selectedVar?.image || bundleProduct.image;
        const effectiveStock = selectedVar ? selectedVar.stock : bundleProduct.stock;
        return createBundleCartItem({
          product: {
            id: bundleProduct.id,
            name: bundleProduct.name,
            price: effectivePrice,
            image: effectiveImage,
            sku: selectedVar?.sku || bundleProduct.sku,
            stock: effectiveStock,
          },
          variant: selectedVar
            ? {
                id: selectedVar.id,
                name: selectedVar.name,
                price: effectivePrice,
                image: effectiveImage,
                sku: selectedVar.sku,
                stock: effectiveStock,
                attributes: selectedVar.attributes,
              }
            : null,
          bundleId: bundleGroupId,
          bundleName: 'Frequently Bought Together',
          discountRatio: 1,
          quantity: 1,
        });
      }),
    ];

    try {
      // Smart Auto-Upgrade: Remove existing standalone (non-bundle) single items to prevent duplicate rows
      const targetProductIds = [product.id, ...selectedBundleProducts.map((p) => p.id)];
      const standaloneItems = findStandaloneCartItems(items, targetProductIds);
      if (standaloneItems.length > 0) {
        standaloneItems.forEach((item) => removeItem(item.id));
      }

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
        message:
          standaloneItems.length > 0
            ? `বান্ডেলে আপগ্রেড করা হয়েছে এবং ${selectedBundleProducts.length + 1}টি আইটেম কার্টে যোগ হয়েছে।`
            : `${selectedBundleProducts.length + 1}টি আইটেম কার্টে যোগ হয়েছে।`,
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
    items,
    removeItem,
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

  const displayTitle = cleanProductName(product.pageH1 || product.name);

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
          relatedProducts && Array.isArray(relatedProducts) && relatedProducts.length > 0
            ? relatedProducts.map((p) => ({
                id: p.id,
                name: p.name,
                slug: p.slug,
                price: p.price,
                originalPrice: p.originalPrice,
                image: safeImageUrl(p?.image),
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
          image: product.image || '/images/categories/Skincare.png',
          images: galleryImages,
          shortDescription: product.shortDescription,
          keyBenefits: product.keyBenefits,
          ingredients: product.ingredients,
          skinType: (product as any).skinType,
          shelfLife: (product as any).shelfLife,
          originCountry: (product as any).originCountry,
          weight: product.weight,
          shippingWeight: product.shippingWeight,
          deliveryOfferEnabled: Boolean(product.activeDeliveryOffer),
          deliveryOfferType: product.activeDeliveryOffer?.type || null,
          deliveryOfferAmount: product.activeDeliveryOffer?.amount != null ? Number(product.activeDeliveryOffer.amount) : null,
          deliveryChargeInsideDhaka: product.activeDeliveryOffer?.insideDhakaAmount != null ? Number(product.activeDeliveryOffer.insideDhakaAmount) : ((product as any).deliveryChargeInsideDhaka != null ? Number((product as any).deliveryChargeInsideDhaka) : null),
          deliveryChargeOutsideDhaka: product.activeDeliveryOffer?.outsideDhakaAmount != null ? Number(product.activeDeliveryOffer.outsideDhakaAmount) : ((product as any).deliveryChargeOutsideDhaka != null ? Number((product as any).deliveryChargeOutsideDhaka) : null),
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
                costPrice: p.costPrice ?? null,
                image: p.image || '/images/categories/Skincare.png',
                stock: p.stock,
                hasFreeDelivery: Boolean(p.deliveryOfferType === 'FREE' || p.deliveryOfferEnabled),
                weight: p.weight ?? null,
                shippingWeight: p.shippingWeight ?? null,
                deliveryOfferType: p.deliveryOfferType ?? null,
                deliveryOfferAmount: p.deliveryOfferAmount ?? null,
                deliveryChargeInsideDhaka: p.deliveryChargeInsideDhaka ?? null,
                deliveryChargeOutsideDhaka: p.deliveryChargeOutsideDhaka ?? null,
                category: product.category || 'Skincare',
                variants: (p.variants as any) || [],
              }))
            : undefined
        }
        onVariantChange={handleVariantChange}
        onImageChange={handleImageChange}
        onQuantityChange={handleQuantityChange}
      />

      {/* ========================================================================= */}
      {/* SEED-STYLE "BENEFITS THAT BUILD OVER TIME" CLINICAL TIMELINE & FAQ MATRIX  */}
      {/* ========================================================================= */}
      <SeedBenefitsSection
        product={product as any}
      />

      {/* ========================================================================= */}
      {/* SEED.COM MEMBER REVIEWS & VERIFIED BUYER PHOTO MATRIX                    */}
      {/* ========================================================================= */}
      <div className="mx-auto w-full px-4 sm:px-6 lg:px-8">
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
                    <p className="text-xs font-inter font-bold text-[#1C3A13]">
                      ৳{Math.round(bundleCurrentProductTotal)}
                    </p>
                  </div>
                </div>

                {/* Bundle Addons */}
                {bundleProducts.map((bundleProduct) => {
                  const hasStock =
                    bundleProduct.stock > 0 ||
                    (bundleProduct.variants && bundleProduct.variants.some((v) => v.stock > 0));
                  const isSelectable = Boolean(hasStock);
                  const isSelected = selectedBundleProductIds.includes(
                    bundleProduct.id,
                  );
                  const chosenVar =
                    bundleProduct.variants?.find((v) => v.id === selectedCompanionVariantIds[bundleProduct.id]) ||
                    (bundleProduct.variants && bundleProduct.variants.length > 0 ? bundleProduct.variants[0] : null);
                  const effectivePrice = chosenVar ? chosenVar.price : bundleProduct.price;
                  const effectiveImage = chosenVar?.image || bundleProduct.image;

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
                          src={effectiveImage}
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

                        {/* Variant selector dropdown for companion product */}
                        {bundleProduct.variants && bundleProduct.variants.length > 1 && (
                          <div className="mt-1">
                            <select
                              value={chosenVar?.id || ''}
                              onChange={(e) => handleCompanionVariantChange(bundleProduct.id, e.target.value)}
                              aria-label={`Select variant for ${bundleProduct.name}`}
                              className="text-[11px] font-medium bg-stone-100 dark:bg-zinc-800 border border-stone-300 rounded px-1.5 py-0.5 text-[#1C3A13] focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[220px] truncate cursor-pointer"
                            >
                              {bundleProduct.variants.map((v) => (
                                <option key={`fbt-v-${v.id}`} value={v.id}>
                                  {v.name} {v.price ? `(৳${Math.round(v.price)})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-inter font-bold text-[#1C3A13]">
                            ৳{Math.round(effectivePrice)}
                          </span>
                          {bundleProduct.originalPrice &&
                            bundleProduct.originalPrice > effectivePrice && (
                              <span className="text-[11px] font-inter text-stone-400 line-through">
                                ৳{Math.round(bundleProduct.originalPrice)}
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
                  <span className="text-2xl font-inter font-bold text-[#1C3A13]">
                    ৳{Math.round(bundleTotal)}
                  </span>
                  {bundleSavings > 0 && (
                    <span className="text-xs font-inter text-stone-400 line-through">
                      ৳{Math.round(bundleCompareTotal)}
                    </span>
                  )}
                </div>

                {bundleSavings > 0 && (
                  <span className="inline-block rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-0.5 text-xs font-semibold font-inter">
                    মোট সাশ্রয় ৳{Math.round(bundleSavings)}
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
                        <span className="text-sm font-inter font-bold text-[#1C3A13]">
                          ৳{Math.round(relatedProduct.price)}
                        </span>
                        {relatedProduct.originalPrice &&
                          relatedProduct.originalPrice > relatedProduct.price && (
                            <span className="text-xs font-inter text-stone-400 line-through">
                              ৳{Math.round(relatedProduct.originalPrice)}
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
              {recentlyViewed.slice(0, 6).map((recentProduct) => (
                <Link
                  key={recentProduct.id}
                  href={productPath(recentProduct)}
                  className="group block overflow-hidden rounded-xl border border-stone-200 bg-white p-2.5 transition hover:border-stone-400 hover:shadow-xs"
                >
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-stone-50">
                    <CatalogProductImage
                      src={recentProduct.image}
                      alt={recentProduct.name}
                      sizes="120px"
                      className="group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <p className="mt-2 line-clamp-1 text-xs font-semibold text-stone-900 group-hover:text-[#1C3A13] transition">
                    {recentProduct.name}
                  </p>
                  <p className="text-xs font-inter font-bold text-[#1C3A13]">
                    ৳{Math.round(recentProduct.price)}
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
        quantity={quantity}
      />
    </>
  );
}
