'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import CatalogProductImage from '@/components/catalog/CatalogProductImage';

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
    <div className="flex h-full w-full items-center justify-center bg-minsah-accent text-sm font-medium text-minsah-primary">
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

  const heading = mode === 'edit' ? 'Edit Review' : 'Write a Review';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (rating < 1 || rating > 5) {
      setErrorMessage('Please select a rating.');
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

      router.push('/account/reviews');
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{heading}</h1>
          <p className="text-gray-600">Share your experience with this product</p>
        </div>
        <Link
          href="/account/reviews"
          className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Reviews
        </Link>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
          <div className="h-20 w-20 overflow-hidden rounded-lg bg-gray-100">
            <ProductImage src={product.image} alt={product.name} />
          </div>
          <div>
            <p className="text-sm font-medium text-purple-600">
              {mode === 'edit' ? 'Updating your review for' : 'Reviewing'}
            </p>
            <h2 className="text-xl font-semibold text-gray-900">{product.name}</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pt-6">
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="mb-3 block text-sm font-medium text-gray-700">Your Rating</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setRating(value)}
                  className="hover:scale-105"
                  aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
                >
                  <Star
                    className={`h-7 w-7 ${
                      value <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }`}
                    aria-hidden="true"
                  />
                </Button>
              ))}
              <span className="ml-2 text-sm text-gray-500">
                {rating > 0 ? `${rating} out of 5` : 'Select a rating'}
              </span>
            </div>
          </div>

          <Input
            id="title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Summarize your experience"
            label="Review Title"
            className="focus:ring-purple-500"
          />

          <Textarea
            id="comment"
            rows={6}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="What did you like? How was the quality, packaging, or result?"
            label="Your Review"
            className="focus:ring-purple-500"
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="bg-purple-600 px-6 py-3 hover:bg-purple-700"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {mode === 'edit' ? 'Update Review' : 'Submit Review'}
            </Button>
            <Link
              href="/account/reviews"
              className="inline-flex items-center rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
