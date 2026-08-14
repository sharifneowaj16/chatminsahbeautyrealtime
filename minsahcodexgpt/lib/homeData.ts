import { DESIGN_TOKEN_VALUES } from '@/lib/design-tokens';
import {
  HomeSection,
  HomeSectionCategory,
  HomeSectionProduct,
  HomeSectionCombo,
  HomeSectionBrand,
  HomeHeroConfig,
  PromotionSlide,
  ComboSlide,
} from '@/types/admin';

// Default Home Sections Configuration
export const defaultHomeSections: HomeSection[] = [
  {
    id: 'section-categories',
    type: 'categories',
    title: 'Category Shortcuts',
    subtitle: 'Find your beauty essentials faster',
    isVisible: true,
    order: 2,
    settings: {
      showViewAll: false,
      itemsToShow: 5,
      layout: 'horizontal-scroll',
      backgroundColor: DESIGN_TOKEN_VALUES.surface.panel,
    },
  },
  {
    id: 'section-promotion',
    type: 'promotion',
    title: 'Discover Authentic Beauty Products Every Day',
    subtitle: 'Shop skincare, makeup, and curated beauty essentials with clear prices, fast delivery options, and cash on delivery support.',
    isVisible: true,
    order: 1,
    settings: {
      showViewAll: false,
      itemsToShow: 2,
      layout: 'horizontal-scroll',
      backgroundColor: DESIGN_TOKEN_VALUES.surface.accent,
    },
  },
  {
    id: 'section-combos',
    type: 'combos',
    title: 'Combo Deals',
    subtitle: 'Curated sets with better value',
    isVisible: true,
    order: 3,
    settings: {
      showViewAll: true,
      itemsToShow: 3,
      layout: 'horizontal-scroll',
      backgroundColor: DESIGN_TOKEN_VALUES.surface.panel,
    },
  },
  {
    id: 'section-flash-sale',
    type: 'flash-sale',
    title: 'Flash Sale',
    isVisible: true,
    order: 4,
    settings: {
      showViewAll: true,
      itemsToShow: 4,
      layout: 'grid-2',
      backgroundColor: DESIGN_TOKEN_VALUES.surface.highlight,
    },
  },
  {
    id: 'section-new-arrivals',
    type: 'new-arrivals',
    title: 'New Arrivals',
    subtitle: 'Freshly added beauty picks',
    isVisible: true,
    order: 5,
    settings: {
      showViewAll: true,
      itemsToShow: 4,
      layout: 'grid-2',
      backgroundColor: DESIGN_TOKEN_VALUES.surface.panel,
    },
  },
  {
    id: 'section-for-you',
    type: 'for-you',
    title: 'Picked For You',
    subtitle: 'Popular picks from our collection',
    isVisible: true,
    order: 6,
    settings: {
      showViewAll: true,
      itemsToShow: 3,
      layout: 'horizontal-scroll',
      backgroundColor: DESIGN_TOKEN_VALUES.surface.accent,
    },
  },
  {
    id: 'section-recommendations',
    type: 'recommendations',
    title: 'Recommended Deals',
    subtitle: 'High-rated products worth checking',
    isVisible: true,
    order: 7,
    settings: {
      showViewAll: true,
      itemsToShow: 6,
      layout: 'grid-3',
      backgroundColor: DESIGN_TOKEN_VALUES.surface.panel,
    },
  },
  {
    id: 'section-favourites',
    type: 'favourites',
    title: 'Customer Favorites',
    subtitle: 'Loved by shoppers',
    isVisible: true,
    order: 8,
    settings: {
      showViewAll: true,
      itemsToShow: 6,
      layout: 'grid-3',
      backgroundColor: DESIGN_TOKEN_VALUES.surface.accent,
    },
  },
  {
    id: 'section-brands',
    type: 'brands',
    title: 'Popular Brands',
    subtitle: 'Shop by trusted beauty brands',
    isVisible: true,
    order: 9,
    settings: {
      showViewAll: true,
      itemsToShow: 4,
      layout: 'grid-4',
      backgroundColor: DESIGN_TOKEN_VALUES.surface.panel,
    },
  },
];


export const defaultHomeHeroConfig: HomeHeroConfig = {
  isVisible: true,
  eyebrow: 'Beauty Deals You Can Trust',
  title: 'Discover Authentic Beauty Products Every Day',
  subtitle: 'Shop skincare, makeup, and curated beauty essentials with clear prices, fast delivery options, and cash on delivery support.',
  primaryCtaText: 'Shop Now',
  primaryCtaHref: '/shop',
  secondaryCtaText: 'Today’s Offers',
  secondaryCtaHref: '/flash-sale',
  badgeOne: 'Authentic Products',
  badgeTwo: 'Cash on Delivery',
  backgroundClass: 'from-minsah-light via-white to-minsah-accent/70',
};

// Default Categories
export const defaultCategories: HomeSectionCategory[] = [
  { id: 'cat-1', name: 'Makeup', slug: 'makeup', icon: 'MAKEUP', color: 'bg-pink-100', isVisible: true, order: 1, productCount: 156 },
  { id: 'cat-2', name: 'Skincare', slug: 'skincare', icon: 'SKIN', color: 'bg-blue-100', isVisible: true, order: 2, productCount: 203 },
  { id: 'cat-3', name: 'Hair Care', slug: 'hair-care', icon: 'HAIR', color: 'bg-purple-100', isVisible: true, order: 3, productCount: 89 },
  { id: 'cat-4', name: 'Fragrance', slug: 'fragrance', icon: 'FRAG', color: 'bg-yellow-100', isVisible: true, order: 4, productCount: 67 },
  { id: 'cat-5', name: 'Tools', slug: 'tools', icon: 'TOOL', color: 'bg-green-100', isVisible: true, order: 5, productCount: 45 },
];

// Default Brands
export const defaultBrands: HomeSectionBrand[] = [
  { id: 'brand-1', name: 'MAC', slug: 'mac', logo: 'MAC', productCount: 312, isVisible: true, order: 1 },
  { id: 'brand-2', name: 'Dior', slug: 'dior', logo: 'Dior', productCount: 234, isVisible: true, order: 2 },
  { id: 'brand-3', name: 'Fenty Beauty', slug: 'fenty-beauty', logo: 'FENTY\nBEAUTY', productCount: 145, isVisible: true, order: 3 },
  { id: 'brand-4', name: 'Chanel', slug: 'chanel', logo: 'CHANEL', productCount: 289, isVisible: true, order: 4 },
];

// Default Promotion Slides
export const defaultPromotionSlides: PromotionSlide[] = [
  {
    id: 'promo-1',
    title: 'Beauty Deals\nMade\nSimple',
    gradient: 'from-pink-500 via-pink-400 to-orange-400',
    isVisible: true,
    order: 1,
  },
  {
    id: 'promo-2',
    title: 'Fresh Glow\nBeauty\nPicks',
    gradient: 'from-blue-500 via-cyan-400 to-teal-400',
    isVisible: true,
    order: 2,
  },
];

// Default Combo Slides
export const defaultComboSlides: ComboSlide[] = [
  {
    id: 'combo-slide-1',
    title: 'Best Value Combos',
    description: 'Save More with Our Curated Sets',
    gradient: 'from-minsah-primary via-minsah-secondary to-minsah-dark',
    image: 'COMBO',
    isVisible: true,
    order: 1,
  },
  {
    id: 'combo-slide-2',
    title: 'Curated Combo Deals',
    description: 'Better Value on Beauty Sets',
    gradient: 'from-purple-600 via-pink-500 to-orange-400',
    image: 'COMBO',
    isVisible: true,
    order: 2,
  },
  {
    id: 'combo-slide-3',
    title: 'Complete Care Sets',
    description: 'Everything You Need in One Box',
    gradient: 'from-blue-500 via-teal-400 to-green-400',
    image: 'COMBO',
    isVisible: true,
    order: 3,
  },
];

// Default Products - populated from database
export const defaultProducts: HomeSectionProduct[] = [];

// Default Combos - populated from database
export const defaultCombos: HomeSectionCombo[] = [];
