// Admin Panel TypeScript Interfaces
// Next.js 16 + React 19 + TypeScript + Tailwind CSS 4

export interface AdminDashboardStats {
  revenue: {
    total: number;
    change: number;
    chartData: Array<{ date: string; revenue: number; orders: number }>;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
    change: number;
    recentOrders: Array<{
      id: string;
      customer: string;
      amount: number;
      status: string;
      date: string;
    }>;
  };
  customers: {
    total: number;
    new: number;
    active: number;
    vip: number;
    change: number;
  };
  products: {
    total: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
    topProducts: Array<{
      id: string;
      name: string;
      sales: number;
      revenue: number;
      trend: 'up' | 'down' | 'stable';
    }>;
  };
  traffic: {
    visitors: number;
    pageViews: number;
    bounceRate: number;
    avgSession: number;
    sources: Array<{
      source: string;
      visitors: number;
      percentage: number;
    }>;
  };
  lowStockAlerts: Array<{
    id: string;
    name: string;
    currentStock: number;
    minStock: number;
    salesRate: number;
  }>;
}

export interface AdminProduct {
  id: string;
  name: string;
  description: string;
  sku: string;
  barcode?: string;
  price: number;
  comparePrice?: number;
  cost: number;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  category: {
    id: string;
    name: string;
    subcategory?: string;
  };
  brand: string;
  tags: string[];
  variants: AdminProductVariant[];
  images: AdminProductImage[];
  seo: {
    title: string;
    description: string;
    keywords: string[];
    slug: string;
  };
  inventory: {
    quantity: number;
    lowStockThreshold: number;
    trackQuantity: boolean;
    allowBackorder: boolean;
    location?: string;
  };
  shipping: {
    requiresShipping: boolean;
    weightUnit: string;
    originCountry: string;
  };
  status: 'active' | 'draft' | 'archived';
  createdAt: string;
  updatedAt: string;
  sales: number;
  views: number;
  rating: number;
  reviews: number;
}

export interface AdminProductVariant {
  id: string;
  name: string;
  options: Record<string, string>;
  price: number;
  sku: string;
  barcode?: string;
  inventory: {
    quantity: number;
    trackQuantity: boolean;
  };
  image?: string;
  weight?: number;
}

export interface AdminProductImage {
  id: string;
  url: string;
  alt: string;
  position: number;
  isMain: boolean;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  image?: string;
  parent?: string;
  children: string[];
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  productCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone?: string;
  };
  billingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  items: Array<{
    id: string;
    productId: string;
    name: string;
    sku: string;
    variant?: string;
    quantity: number;
    price: number;
    total: number;
    image?: string;
  }>;
  pricing: {
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
    currency: string;
  };
  shipping: {
    method: string;
    tracking?: string;
    carrier?: string;
    cost: number;
    estimatedDelivery?: string;
  };
  payment: {
    method: string;
    transactionId?: string;
    gateway: string;
    paidAt?: string;
  };
  notes?: string;
  internalNotes?: string;
  timeline: Array<{
    timestamp: string;
    status: string;
    note: string;
    actor: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  addresses: Array<{
    id: string;
    type: 'shipping' | 'billing';
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    isDefault: boolean;
  }>;
  preferences: {
    language: string;
    currency: string;
    marketing: boolean;
    sms: boolean;
    email: boolean;
  };
  stats: {
    totalOrders: number;
    totalSpent: number;
    avgOrderValue: number;
    firstOrderDate: string;
    lastOrderDate: string;
    itemsPurchased: number;
  };
  rfm: {
    recency: number;
    frequency: number;
    monetary: number;
    score: 'vip' | 'loyal' | 'at-risk' | 'lost' | 'new';
    segment: string;
  };
  tags: string[];
  notes?: string;
  isVip: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SocialMediaPost {
  id: string;
  platform: 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'pinterest' | 'twitter' | 'linkedin';
  type: 'post' | 'story' | 'reel' | 'video' | 'pin' | 'tweet';
  content: {
    text: string;
    media?: Array<{
      type: 'image' | 'video';
      url: string;
      thumbnail?: string;
    }>;
    hashtags: string[];
    mentions: string[];
  };
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduledAt?: string;
  publishedAt?: string;
  metrics?: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
    engagement: number;
    reach: number;
  };
  targeting?: {
    ageRange: [number, number];
    gender: string[];
    locations: string[];
    interests: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface SocialMediaAccount {
  id: string;
  platform: string;
  accountName: string;
  accountId: string;
  pageId?: string;
  accessToken: string;
  refreshToken?: string;
  isConnected: boolean;
  lastSync?: string;
  metrics: {
    followers: number;
    posts: number;
    engagement: number;
    reach: number;
  };
  settings: {
    autoPublish: boolean;
    defaultHashtags: string[];
    postingSchedule: Array<{
      day: string;
      time: string;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  type: 'email' | 'social' | 'ads' | 'sms' | 'push';
  status: 'draft' | 'active' | 'paused' | 'completed';
  budget?: number;
  spent?: number;
  duration: {
    start: string;
    end?: string;
  };
  targetAudience: {
    segments: string[];
    criteria: Record<string, any>;
  };
  content: {
    subject?: string;
    body: string;
    media?: Array<{
      type: string;
      url: string;
    }>;
    cta?: {
      text: string;
      url: string;
    };
  };
  metrics: {
    sent?: number;
    delivered?: number;
    opened?: number;
    clicked?: number;
    converted?: number;
    cost?: number;
    roas?: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Mock data generators
export function generateMockAdminStats(): AdminDashboardStats {
  return {
    revenue: { total: 0, change: 0, chartData: [] },
    orders: { total: 0, pending: 0, completed: 0, change: 0, recentOrders: [] },
    customers: { total: 0, new: 0, active: 0, vip: 0, change: 0 },
    products: { total: 0, inStock: 0, lowStock: 0, outOfStock: 0, topProducts: [] },
    traffic: { visitors: 0, pageViews: 0, bounceRate: 0, avgSession: 0, sources: [] },
    lowStockAlerts: [],
  };
}

export function generateMockProducts(): AdminProduct[] {
  return [];
}

export function generateMockCustomers(): AdminCustomer[] {
  return [];
}

// ======================
// HOME SECTION MANAGEMENT TYPES
// ======================

export type SectionType =
  | 'categories'
  | 'promotion'
  | 'combos'
  | 'flash-sale'
  | 'new-arrivals'
  | 'for-you'
  | 'recommendations'
  | 'favourites'
  | 'brands';

export interface HomeSection {
  id: string;
  type: SectionType;
  title: string;
  subtitle?: string;
  isVisible: boolean;
  order: number;
  settings: {
    showViewAll?: boolean;
    itemsToShow?: number;
    layout?: 'grid-2' | 'grid-3' | 'grid-4' | 'horizontal-scroll';
    backgroundColor?: string;
    viewAllHref?: string;
    ctaText?: string;
    ctaHref?: string;
    selectedProductIds?: string[];
    selectedCategoryIds?: string[];
    selectedBrandIds?: string[];
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface HeroSlide {
  id: string;
  imageUrl: string;
  mobileImageUrl?: string;
  title?: string;
  subtitle?: string;
  linkHref?: string;
  order: number;
  isActive: boolean;
}

export interface HomeHeroConfig {
  isVisible: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText: string;
  secondaryCtaHref: string;
  imageUrl?: string;
  featuredProductName?: string;
  badgeOne?: string;
  badgeTwo?: string;
  backgroundClass?: string;
  slides?: HeroSlide[];
}

export interface HomeSectionCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  isVisible: boolean;
  order: number;
  productCount?: number;
}

export interface HomeSectionProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  sku?: string;
  stock: number;
  category: string;
  rating?: number;
  reviews?: number;
  isVisible: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  isFlashSale: boolean;
  isFavourite: boolean;
  isRecommended: boolean;
  isForYou: boolean;
  order?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface HomeSectionCombo {
  id: string;
  name: string;
  price: number;
  priceRange: string;
  image: string;
  description?: string;
  items?: string[];
  isVisible: boolean;
  order: number;
  category: 'makeup' | 'skincare' | 'haircare' | 'bodycare' | 'spa' | 'luxury';
  createdAt?: string;
  updatedAt?: string;
}

export interface HomeSectionBrand {
  id: string;
  name: string;
  slug: string;
  logo: string;
  productCount: number;
  isVisible: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromotionSlide {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  gradient: string;
  link?: string;
  isVisible: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ComboSlide {
  id: string;
  title: string;
  description: string;
  gradient: string;
  image: string;
  isVisible: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

// Settings
export interface SiteSettings {
  siteName: string;
  siteDescription: string;
  currency: string;
  freeShippingThreshold: number;
  taxRate: number;
  allowGuestCheckout: boolean;
  maintenanceMode: boolean;
  logo?: string;
  favicon?: string;
  contactEmail: string;
  contactPhone: string;
  address?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
  };
}
