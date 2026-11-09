'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Star, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import CatalogProductImage from '@/components/catalog/CatalogProductImage';
import { ReviewSuccessModalCoordinator } from '@/components/reviews/mobile/ReviewSuccessModalCoordinator';

interface ReviewFormClientProps {
  mode: 'create' | 'edit';
  product: {
    id: string;
    name: string;
    image: string | null;
  };
  initialValues: {
    rating: number;
    title: string;
    comment: string;
  };
  reviewId?: string;
}

function ProductImage({ src, alt }: { src: string | null; alt: string }) {
  if (src) {
    return <CatalogProductImage src={src} alt={alt || 'Product image'} sizes="80px" padding="sm" />;
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#141516] text-sm font-semibold text-[#828fff]">
      {alt.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function ReviewFormClient({
  mode,
  product,
  initialValues,
  reviewId,
}: ReviewFormClientProps) {
  const router = useRouter();
  const [rating, setRating] = useState(initialValues.rating);
  const [title, setTitle] = useState(initialValues.title);
  const [comment, setComment] = useState(initialValues.comment);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    orderNumber: string;
    productName: string;
    productImage: string;
    rating: number;
    comment: string;
    photosCount: number;
    earnedPoints: number;
    totalPointsBalance: number;
    reviewId: string;
  } | null>(null);

  const heading = mode === 'edit' ? 'Edit Review' : 'Write a Review';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (rating < 1 || rating > 5) {
      setErrorMessage('Please select a rating between 1 and 5 stars.');
      return;
    }

    if (!comment.trim()) {
      setErrorMessage('Please write a short review before submitting.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const response = await fetch(
        mode === 'edit' && reviewId ? `/api/reviews/${reviewId}` : '/api/reviews',
        {
          method: mode === 'edit' ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.id,
            rating,
            title: title.trim(),
            comment: comment.trim(),
          }),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save review');
      }

      setSubmittedData({
        orderNumber: 'MB-88294',
        productName: product.name,
        productImage: product.image || '/images/products/laneige-lip.png',
        rating,
        comment: comment.trim(),
        photosCount: 2,
        earnedPoints: 50,
        totalPointsBalance: 900,
        reviewId: String(data.id || reviewId || '882'),
      });
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 overflow-x-hidden">
      {submittedData && (
        <ReviewSuccessModalCoordinator initialOpen={true} data={submittedData} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#5e6ad2]/15 text-[#828fff] text-[11px] font-semibold border border-[#5e6ad2]/30 mb-2">
            <PenTool className="w-3 h-3 text-[#828fff]" />
            <span>AUTHENTIC VERIFICATION</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#f7f8f8] tracking-tight">{heading}</h1>
          <p className="text-xs sm:text-sm text-[#8a8f98] mt-0.5">Share your experience with this luxury beauty product</p>
        </div>
        <Link
          href="/account/reviews"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#23252a] bg-[#141516] px-4 py-2 text-xs font-medium text-[#f7f8f8] hover:bg-[#18191a] transition self-start sm:self-auto cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 text-[#8a8f98]" />
          <span>Back to Reviews</span>
        </Link>
      </div>

      {/* Card Form */}
      <div className="rounded-2xl bg-[#0f1011] border border-[#23252a] p-5 sm:p-6 shadow-xl space-y-6">
        {/* Product preview */}
        <div className="flex items-center gap-4 border-b border-[#23252a] pb-5">
          <div className="h-16 w-16 overflow-hidden rounded-xl bg-[#141516] border border-[#23252a] shrink-0">
            <ProductImage src={product.image} alt={product.name} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#828fff] tracking-wide uppercase">
              {mode === 'edit' ? 'Updating review for' : 'Reviewing product'}
            </p>
            <h2 className="text-base sm:text-lg font-semibold text-[#f7f8f8] truncate">{product.name}</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMessage && (
            <div className="rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-xs sm:text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">
              Your Rating
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className="p-1.5 hover:scale-110 transition-transform cursor-pointer"
                  aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
                >
                  <Star
                    className={`h-6 w-6 ${
                      value <= rating ? 'fill-[#f59e0b] text-[#f59e0b]' : 'text-[#35373e]'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              ))}
              <span className="ml-2 text-xs font-medium text-[#8a8f98] font-mono">
                {rating > 0 ? `${rating} / 5 Stars` : 'Select a rating'}
              </span>
            </div>
          </div>

          <Input
            id="title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Summarize your experience (e.g., Amazing hydration!)"
            label="Review Title"
            className="!bg-[#141516] !text-[#f7f8f8] !border-[#23252a] placeholder-[#62666d] focus:!border-[#5e6ad2]"
          />

          <Textarea
            id="comment"
            rows={5}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="What did you like? How was the texture, packaging, absorption, or result?"
            label="Your Review"
            className="!bg-[#141516] !text-[#f7f8f8] !border-[#23252a] placeholder-[#62666d] focus:!border-[#5e6ad2]"
          />

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="bg-[#5e6ad2] hover:bg-[#828fff] text-white px-6 py-2.5 rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" aria-hidden="true" />}
              {mode === 'edit' ? 'Update Review' : 'Submit Review'}
            </Button>
            <Link
              href="/account/reviews"
              className="inline-flex items-center rounded-xl border border-[#23252a] bg-[#141516] px-5 py-2.5 text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#18191a] transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}