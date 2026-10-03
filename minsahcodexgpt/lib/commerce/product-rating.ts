export type ProductRatingSnapshot = {
  hasReviews: boolean;
  average: number | null;
  total: number;
  distribution: Record<number, number>;
};

export function resolveProductRating(input: {
  reviews?: Array<{ rating?: number | null }> | null;
  ratingValue?: number | null;
  reviewCount?: number | null;
}): ProductRatingSnapshot {
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const rawReviews = Array.isArray(input.reviews) ? input.reviews : [];

  if (rawReviews.length > 0) {
    let sum = 0;
    let count = 0;

    for (const r of rawReviews) {
      const score = Math.round(Number(r?.rating ?? 0));
      if (score >= 1 && score <= 5) {
        distribution[score] = (distribution[score] || 0) + 1;
        sum += score;
        count++;
      }
    }

    if (count > 0) {
      const average = Math.round((sum / count) * 10) / 10;
      return {
        hasReviews: true,
        average,
        total: count,
        distribution,
      };
    }
  }

  // If no review objects array, check numeric fields without inventing defaults
  const total = Number(input.reviewCount ?? 0);
  const avg = input.ratingValue != null ? Number(input.ratingValue) : null;

  if (total > 0 && avg != null && avg > 0) {
    return {
      hasReviews: true,
      average: Math.min(5, Math.max(1, Math.round(avg * 10) / 10)),
      total,
      distribution,
    };
  }

  // Authentic zero-review state
  return {
    hasReviews: false,
    average: null,
    total: 0,
    distribution,
  };
}
