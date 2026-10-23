export interface TestimonialReview {
  id: string;
  reviewerName: string;
  reviewerLocation: string;
  initials: string;
  initialsBgColor?: string;
  verifiedAgo: string;
  rating: number;
  comment: string;
  product: {
    name: string;
    batchNumber: string;
    image: string;
  };
}

export interface ReviewCelebrationData {
  orderNumber: string;
  productName: string;
  productImage: string;
  rating: number;
  comment: string;
  photosCount: number;
  earnedPoints: number;
  totalPointsBalance: number;
  reviewId: string;
}
