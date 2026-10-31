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
  endsAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  items: [],
};
