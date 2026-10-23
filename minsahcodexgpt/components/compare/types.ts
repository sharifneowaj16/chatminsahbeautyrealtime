export interface ComparisonProduct {
  id: string;
  name: string;
  subtitle: string;
  brand: string;
  image: string;
  size: string;
  price: number;
  originalPrice: number;
  discountPercentage: number;
  rating: number;
  reviewCount: number;
  routineStep: string;
  bestFor: string;
  targetSkinTypes: string[];
  targetSkinNote: string;
  coreBenefit: string;
  heroActiveName: string;
  heroActiveDesc: string;
  cleanBadges: string[];
  cleanDesc: string;
  comedogenicRating: string;
  textureName: string;
  textureDesc: string;
  humidityScore: number;
  humidityNote: string;
  pillingNote: string;
  bottleType: string;
  bottleDesc: string;
}

export type CompareFilterCategory = 'all' | 'actives' | 'skin' | 'climate';
