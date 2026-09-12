"use client";

/* eslint-disable react-hooks/preserve-manual-memoization */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import ProductStickyHeader from "./ProductStickyHeader";
import { safeImageUrl } from "@/lib/safe-image";
import SeedProductHero from "./hero/SeedProductHero";
import SeedMorphingStickyBar from "./hero/SeedMorphingStickyBar";
import { cleanProductName } from "./hero/cleanProductName";
import SeedBenefitsSection from "./benefits/SeedBenefitsSection";
import SeedMemberReviewsSection from "./reviews/SeedMemberReviewsSection";
import { trackProductView } from "@/lib/tracking/ecommerce";

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


  const viewedProductKeysRef = useRef<Set<string>>(new Set());

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


  const galleryImages = (
    product.images as Array<string | { url: string; alt?: string }>
  ).map((img) =>
    typeof img === "string" ? { url: img, alt: product.name } : img,
  );



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
          sku: product.sku || undefined,
          category: product.category || null,
          rating: rating?.average || product.rating || null,
          reviews: rating?.total != null ? rating.total : (product.reviews || null),
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
              average: rating?.average || product.rating || 5.0,
              total: rating?.total != null ? rating.total : (product.reviews || (reviews ? reviews.length : 0)),
              distribution: rating?.distribution || {
                5: rating?.total != null ? rating.total : (product.reviews || (reviews ? reviews.length : 0)),
                4: 0,
                3: 0,
                2: 0,
                1: 0,
              },
            }}
            customReviews={reviews}
          />
        </div>
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
