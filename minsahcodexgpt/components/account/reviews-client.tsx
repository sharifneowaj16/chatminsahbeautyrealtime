'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Star,
  Edit,
  Trash2,
  Search,
  Plus,
  Eye,
  Heart,
  MessageCircle,
  Check,
  X,
  ShoppingBag,
  Package,
  PenTool,
} from 'lucide-react';
import { Star as StarSolid } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/ToastProvider';
import { productPath } from '@/lib/product-url';
import CatalogProductImage from '@/components/catalog/CatalogProductImage';

function ProductImage({ src, name }: { src: any; name: string }) {
  if (typeof src === 'string' && src.trim()) {
    return (
      <CatalogProductImage
        src={src}
        alt={name ? `${name} product image` : 'Product image'}
        sizes="64px"
        padding="sm"
      />
    );
  }
  if (src && typeof src === 'object') return src;
  return <Package className="h-7 w-7 text-[#828fff]" aria-hidden="true" />;
}

interface ReviewItem {
  id: string;
  productId: string;
  productSlug?: string | null;
  productName: string;
  productImage: string | null;
  rating: number;
  title: string;
  content: string;
  isVerified: boolean;
  helpfulCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface ReviewableProduct {
  id: string;
  slug?: string | null;
  name: string;
  image: string | null;
  orderDate: string | Date;
  canReview: boolean;
}

interface ReviewsClientProps {
  reviews: ReviewItem[];
  reviewableProducts: ReviewableProduct[];
}

export function ReviewsClient({ reviews: initialReviews, reviewableProducts }: ReviewsClientProps) {
  const router = useRouter();
  const { requestConfirmation } = useToast();
  const [reviews, setReviews] = useState(initialReviews);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'my-reviews' | 'write-review'>('my-reviews');
  const [errorMessage, setErrorMessage] = useState('');
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  const tabs = [
    { id: 'my-reviews' as const, name: 'My Reviews', count: reviews.length },
    { id: 'write-review' as const, name: 'Write Review', count: reviewableProducts.length },
  ];

  const filteredReviews = useMemo(() => {
    let filtered = reviews;
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (normalizedSearchTerm) {
      filtered = filtered.filter(
        (review) =>
          review.productName.toLowerCase().includes(normalizedSearchTerm) ||
          review.title.toLowerCase().includes(normalizedSearchTerm)
      );
    }

    if (ratingFilter !== 'all') {
      filtered = filtered.filter((review) => review.rating === Number.parseInt(ratingFilter, 10));
    }

    return filtered;
  }, [reviews, searchTerm, ratingFilter]);

  const handleDeleteReview = async (reviewId: string) => {
    const confirmed = await requestConfirmation({
      title: 'Delete this review?',
      description: 'Are you sure you want to permanently delete this review?',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    setErrorMessage('');
    setDeletingReviewId(reviewId);

    try {
      const response = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete review');
      }

      setReviews((prev) => prev.filter((review) => review.id !== reviewId));
      router.refresh();
    } catch {
      setErrorMessage('Failed to delete review. Please try again.');
    } finally {
      setDeletingReviewId(null);
    }
  };

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) =>
        i < rating ? (
          <StarSolid key={i} className="w-3.5 h-3.5 text-[#f59e0b] fill-[#f59e0b]" />
        ) : (
          <Star key={i} className="w-3.5 h-3.5 text-[#35373e]" />
        )
      )}
    </div>
  );

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#5e6ad2]/15 text-[#828fff] text-[11px] font-semibold border border-[#5e6ad2]/30 mb-2">
            <PenTool className="w-3 h-3 text-[#828fff]" />
            <span>VERIFIED BEAUTY FEEDBACK</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#f7f8f8] tracking-tight">
            Reviews &amp; Ratings
          </h1>
          <p className="text-xs sm:text-sm text-[#8a8f98] mt-0.5">
            Manage your product reviews, ratings, and unreviewed purchases
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-xs sm:text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      {/* ── Linear Segmented Tab Switcher ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-[#0f1011] border border-[#23252a] rounded-2xl shadow-sm">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#5e6ad2] text-white shadow-sm font-semibold'
                  : 'bg-transparent text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#141516]'
              }`}
            >
              <span>{tab.name}</span>
              {tab.count > 0 && (
                <span
                  className={`px-2 py-0.5 text-[11px] font-mono rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#18191a] text-[#8a8f98] border border-[#23252a]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab: My Reviews ───────────────────────────────────────────────────── */}
      {activeTab === 'my-reviews' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-[#0f1011] border border-[#23252a] rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row gap-3 shadow-md">
            <Input
              type="text"
              placeholder="Search your reviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              label="Search reviews"
              hideLabel
              leading={<Search className="w-4 h-4 text-[#8a8f98]" aria-hidden="true" />}
              containerClassName="flex-1"
              className="!bg-[#141516] !text-[#f7f8f8] !border-[#23252a] placeholder-[#62666d] focus:!border-[#5e6ad2]"
            />
            <Select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              label="Filter by rating"
              hideLabel
              containerClassName="sm:w-44"
              className="!bg-[#141516] !text-[#f7f8f8] !border-[#23252a] focus:!border-[#5e6ad2]"
            >
              <option value="all">All Ratings</option>
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r} Stars
                </option>
              ))}
            </Select>
          </div>

          {filteredReviews.length === 0 ? (
            <div className="bg-[#0f1011] border border-[#23252a] rounded-2xl p-10 sm:p-14 text-center shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-[#5e6ad2]/10 border border-[#5e6ad2]/20 text-[#828fff] flex items-center justify-center mx-auto mb-4">
                <Star className="w-7 h-7" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-[#f7f8f8] mb-1.5">No reviews found</h3>
              <p className="text-xs sm:text-sm text-[#8a8f98] max-w-sm mx-auto mb-6">
                You haven&apos;t written any reviews yet. Share your experience with your purchased beauty products!
              </p>
              <Button
                type="button"
                variant="primary"
                onClick={() => setActiveTab('write-review')}
                className="bg-[#5e6ad2] hover:bg-[#828fff] text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
                Write Your First Review
              </Button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredReviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-[#0f1011] border border-[#23252a] hover:border-[#5e6ad2]/40 rounded-2xl p-4 sm:p-5 shadow-xl transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-14 h-14 bg-[#141516] border border-[#23252a] rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                        <ProductImage src={review.productImage} name={review.productName} />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={productPath({ id: review.productId, slug: review.productSlug })}
                          className="text-sm sm:text-base font-semibold text-[#f7f8f8] hover:text-[#828fff] transition-colors truncate block"
                        >
                          {review.productName}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {renderStars(review.rating)}
                          <span className="text-[11px] text-[#8a8f98] font-mono">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                          {review.isVerified && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#27a644]/15 text-[#27a644] border border-[#27a644]/30">
                              <Eye className="w-3 h-3 mr-1" />
                              Verified
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        href={`/account/reviews/write?reviewId=${review.id}`}
                        className="p-2 text-[#8a8f98] hover:text-[#828fff] hover:bg-[#141516] rounded-xl transition"
                        aria-label={`Edit review for ${review.productName}`}
                      >
                        <Edit className="w-4 h-4" aria-hidden="true" />
                      </Link>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteReview(review.id)}
                        disabled={deletingReviewId === review.id}
                        className="h-auto min-h-0 w-auto min-w-0 p-2 text-[#8a8f98] hover:text-red-400 hover:bg-[#141516] rounded-xl transition cursor-pointer"
                        aria-label={`Delete review for ${review.productName}`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <h3 className="font-semibold text-sm text-[#f7f8f8]">{review.title}</h3>
                    <p className="text-xs sm:text-sm text-[#c9cdd4] leading-relaxed">{review.content}</p>
                  </div>

                  <div className="flex items-center gap-4 pt-3 border-t border-[#23252a] text-xs text-[#8a8f98]">
                    <div className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-[#8a8f98]" />
                      <span>{review.helpfulCount} helpful</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5 text-[#8a8f98]" />
                      <span>0 comments</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Write Review ─────────────────────────────────────────────────── */}
      {activeTab === 'write-review' && (
        <div className="space-y-6">
          <div className="bg-[#0f1011] border border-[#23252a] rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-[#f7f8f8]">Products Ready for Review</h2>
              <span className="text-xs text-[#8a8f98] font-mono">{reviewableProducts.length} Items</span>
            </div>

            {reviewableProducts.length === 0 ? (
              <div className="text-center py-10 sm:py-12">
                <div className="w-14 h-14 rounded-2xl bg-[#5e6ad2]/10 border border-[#5e6ad2]/20 text-[#828fff] flex items-center justify-center mx-auto mb-3">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h3 className="text-base font-semibold text-[#f7f8f8] mb-1">No pending reviews</h3>
                <p className="text-xs sm:text-sm text-[#8a8f98] max-w-sm mx-auto mb-5">
                  Once your delivered orders arrive, you can review the products here and earn reward points!
                </p>
                <Link
                  href="/shop"
                  className="inline-flex items-center px-5 py-2.5 bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-semibold rounded-xl transition shadow-sm"
                >
                  Start Shopping
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviewableProducts.map((product) => (
                  <div
                    key={product.id}
                    className="border border-[#23252a] bg-[#141516] hover:border-[#5e6ad2]/40 rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 bg-[#0f1011] border border-[#23252a] rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                        <ProductImage src={product.image} name={product.name} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm text-[#f7f8f8] truncate">{product.name}</h3>
                        <p className="text-xs text-[#8a8f98] mt-0.5">
                          Purchased: {new Date(product.orderDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/account/reviews/write?productId=${product.id}`}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-semibold rounded-xl transition shadow-sm cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Write Review</span>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Review Guidelines */}
          <div className="bg-[#0f1011] border border-[#23252a] rounded-2xl p-5 sm:p-6 shadow-xl space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8a8f98]">Review Guidelines</h3>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#c9cdd4]">
                <Check className="w-4 h-4 text-[#27a644] mt-0.5 shrink-0" />
                <span>Be honest, detailed, and focus on product performance and results.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#c9cdd4]">
                <Check className="w-4 h-4 text-[#27a644] mt-0.5 shrink-0" />
                <span>Mention your skin type, texture preferences, and packaging condition.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#c9cdd4]">
                <X className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <span>Avoid personal details, contact numbers, or unrelated delivery issues.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}