import type { ProductVariantItem } from '@/app/(storefront)/products/[id]/components/hero/SeedHeroVariantDropdown';

export interface FlashDealItem {
  id: string;
  productId: string;
  slug?: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  originalPrice: number;
  salePrice: number;
  discountBadge?: string; // e.g. "৳350 OFF" or "-30%"
  rating?: number; // e.g. 4.9
  ratingCount?: number; // e.g. 840
  stockUrgencyText?: string; // e.g. "Only 3 units left!" or "• Only 3 left!"
  claimedPercentage?: number; // e.g. 91
  order: number;
  isActive: boolean;
  variants?: ProductVariantItem[];
}

export interface FlashDealsConfig {
  isVisible: boolean;
  badgeText: string; // e.g. "HIGH DEMAND BATCH DROP"
  title: string; // "Flash Deals"
  subtitle: string; // "Strict direct import cost subsidies. Strictly 1 unit per client."
  timerLabel: string; // "OFFER CLOSES:"
  endsAt: string; // ISO timestamp string e.g. "2026-10-25T12:00:00.000Z"
  items: FlashDealItem[];
}

export const DEFAULT_FLASH_DEALS_CONFIG: FlashDealsConfig = {
  isVisible: true,
  badgeText: 'HIGH DEMAND BATCH DROP',
  title: 'Flash Deals',
  subtitle: 'Strict direct import cost subsidies. Strictly 1 unit per client.',
  timerLabel: 'OFFER CLOSES:',
  endsAt: new Date(Date.now() + 4 * 3600 * 1000 + 16 * 60 * 1000 + 56 * 1000).toISOString(),
  items: [
    {
      id: 'deal-1',
      productId: 'anua-heartleaf-77-soothing-toner',
      slug: 'anua-heartleaf-77-soothing-toner',
      title: 'Heartleaf 77% Soothing Toner',
      subtitle: 'Pore calming toner for acne-prone skin • 250ml',
      imageUrl: '/images/hero-image.jpg',
      originalPrice: 2450,
      salePrice: 2100,
      discountBadge: '৳350 OFF',
      rating: 4.9,
      ratingCount: 840,
      stockUrgencyText: 'Only 3 units left!',
      claimedPercentage: 91,
      order: 1,
      isActive: true,
      variants: [
        {
          id: 'deal-1-var-250',
          sku: 'ANUA-HL77-250',
          name: 'Standard 250ml',
          price: 2100,
          stock: 12,
          attributes: { size: '250ml' },
          image: '/images/hero-image.jpg',
        },
        {
          id: 'deal-1-var-500',
          sku: 'ANUA-HL77-500',
          name: 'Jumbo 500ml',
          price: 3600,
          stock: 5,
          attributes: { size: '500ml' },
          image: '/images/hero-image.jpg',
        },
      ],
    },
    {
      id: 'deal-2',
      productId: 'arisol-soothing-sun-relief',
      slug: 'arisol-soothing-sun-relief',
      title: 'Soothing Sun Relief SPF50+',
      subtitle: 'Rice & Probiotics lightweight shield • 50ml',
      imageUrl: '/images/banners/minsah-hero-pink-authentic.jpg',
      originalPrice: 1950,
      salePrice: 1650,
      discountBadge: '৳300 OFF',
      rating: 4.93,
      ratingCount: 1210,
      stockUrgencyText: '5 units remaining',
      claimedPercentage: 82,
      order: 2,
      isActive: true,
    },
    {
      id: 'deal-3',
      productId: 'laneige-lip-sleeping-mask-berry',
      slug: 'laneige-lip-sleeping-mask-berry',
      title: 'Lip Sleeping Mask Berry',
      subtitle: 'Vitamin C & antioxidant complex • 20g',
      imageUrl: '/images/hero-image.jpg',
      originalPrice: 2100,
      salePrice: 1720,
      discountBadge: '৳380 OFF',
      rating: 4.98,
      ratingCount: 3400,
      stockUrgencyText: 'Only 2 units left!',
      claimedPercentage: 96,
      order: 3,
      isActive: true,
      variants: [
        {
          id: 'deal-3-var-berry',
          sku: 'LANEIGE-LSM-BERRY',
          name: 'Berry 20g',
          price: 1720,
          stock: 8,
          attributes: { shade: 'Berry', size: '20g' },
          image: '/images/hero-image.jpg',
        },
        {
          id: 'deal-3-var-apple',
          sku: 'LANEIGE-LSM-APPLE',
          name: 'Apple Lime 20g',
          price: 1720,
          stock: 6,
          attributes: { shade: 'Apple Lime', size: '20g' },
          image: '/images/hero-image.jpg',
        },
        {
          id: 'deal-3-var-grapefruit',
          sku: 'LANEIGE-LSM-GRAPEFRUIT',
          name: 'Grapefruit 20g',
          price: 1720,
          stock: 4,
          attributes: { shade: 'Grapefruit', size: '20g' },
          image: '/images/hero-image.jpg',
        },
      ],
    },
    {
      id: 'deal-4',
      productId: 'elixir-vital-glass-skin-serum',
      slug: 'elixir-vital-glass-skin-serum',
      title: 'Elixir Vital Glass Skin Serum',
      subtitle: 'Niacinamide 10% + TXA Brightening • 30ml',
      imageUrl: '/images/banners/minsah-hero-pink-authentic.jpg',
      originalPrice: 2650,
      salePrice: 1890,
      discountBadge: '৳760 OFF',
      rating: 4.91,
      ratingCount: 950,
      stockUrgencyText: '4 units left!',
      claimedPercentage: 88,
      order: 4,
      isActive: true,
    },
    {
      id: 'deal-5',
      productId: 'cosrx-advanced-snail-96-mucin-power-essence',
      slug: 'cosrx-advanced-snail-96-mucin-power-essence',
      title: 'Advanced Snail 96 Mucin Power Essence',
      subtitle: 'Filtered snail mucin for repair & glow • 100ml',
      imageUrl: '/images/hero-image.jpg',
      originalPrice: 2200,
      salePrice: 1750,
      discountBadge: '৳450 OFF',
      rating: 4.95,
      ratingCount: 4200,
      stockUrgencyText: 'Only 1 unit left!',
      claimedPercentage: 98,
      order: 5,
      isActive: true,
    },
  ],
};
