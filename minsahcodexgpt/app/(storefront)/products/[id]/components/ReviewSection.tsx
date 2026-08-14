'use client';

import { useState, type ReactNode } from 'react';
import { CheckCircle, ChevronDown, ShieldCheck, Star } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

interface Review {
  id: string;
  userName: string;
  rating: number;
  title: string;
  content: string;
  verified: boolean;
  createdAt: string;
}

interface RatingData {
  average: number;
  total: number;
  distribution: Record<number, number>;
}

interface ReviewSectionProps {
  reviews: Review[];
  rating: RatingData;
}

function StarRow({ filled, size = 12 }: { filled: boolean; size?: number }) {
  return (
    <Star
      size={size}
      className={filled ? 'fill-minsah-status-warning-text text-minsah-status-warning-text' : 'text-minsah-border-default'}
      aria-hidden="true"
    />
  );
}

function ReviewTrustPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-minsah-border-subtle bg-minsah-surface-panel px-2.5 py-1 text-xs font-semibold text-minsah-text-muted">
      {children}
    </span>
  );
}

export default function ReviewSection({ reviews, rating }: ReviewSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? reviews : reviews.slice(0, 3);
  const verifiedCount = reviews.filter((review) => review.verified).length;
  const positiveCount = (rating.distribution[5] ?? 0) + (rating.distribution[4] ?? 0);
  const positivePct = rating.total > 0 ? Math.round((positiveCount / rating.total) * 100) : 0;

  if (rating.total === 0) {
    return (
      <EmptyState
        title="এই পণ্যে এখনো প্রকাশিত রিভিউ নেই"
        description="নতুন রিভিউ আসার আগে পণ্যের বিবরণ, ভ্যারিয়েন্ট, স্টক, ডেলিভারি ও অরিজিনালিটি তথ্য দেখে সিদ্ধান্ত নিন।"
        icon={<Star className="h-6 w-6" />}
        announce={false}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <ReviewTrustPill>অরিজিনাল পণ্য যাচাই</ReviewTrustPill>
            <ReviewTrustPill>নিরাপদ পেমেন্ট</ReviewTrustPill>
            <ReviewTrustPill>ডেলিভারি সহায়তা</ReviewTrustPill>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-4" lang="bn">
      <section className="minsah-panel overflow-hidden">
        <div className="grid gap-4 p-4 md:grid-cols-[190px_1fr] md:items-center">
          <div className="rounded-2xl bg-minsah-surface-soft p-4 text-center">
            <p className="text-4xl font-black text-minsah-action-primary">{rating.average.toFixed(1)}</p>
            <div className="my-2 flex justify-center gap-0.5" aria-label={`${rating.average.toFixed(1)} রেটিং, ৫-এর মধ্যে`}>
              {[1, 2, 3, 4, 5].map((star) => <StarRow key={star} filled={star <= Math.round(rating.average)} size={14} />)}
            </div>
            <p className="text-xs font-semibold text-minsah-text-muted">{rating.total}টি ক্রেতার রিভিউ</p>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-xl bg-minsah-surface-soft px-3 py-2">
                <p className="text-sm font-black text-minsah-text-primary">{positivePct}%</p>
                <p className="text-xs text-minsah-text-muted">৪★ বা বেশি</p>
              </div>
              <div className="rounded-xl bg-minsah-surface-soft px-3 py-2">
                <p className="text-sm font-black text-minsah-text-primary">{verifiedCount}</p>
                <p className="text-xs text-minsah-text-muted">ভেরিফায়েড ক্রেতা</p>
              </div>
              <div className="col-span-2 rounded-xl bg-minsah-status-success-surface px-3 py-2 sm:col-span-1">
                <p className="flex items-center gap-1 text-sm font-black text-minsah-status-success-text">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" /> যাচাইকৃত
                </p>
                <p className="text-xs text-minsah-status-success-text">রিভিউ অরিজিনালিটি সংকেত</p>
              </div>
            </div>

            <div className="space-y-1.5" aria-label="রেটিং বণ্টন">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = rating.distribution[star] ?? 0;
                const pct = rating.total > 0 ? Math.round((count / rating.total) * 100) : 0;
                return (
                  <div key={star} className="grid grid-cols-[28px_1fr_44px] items-center gap-2">
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-minsah-text-muted">
                      {star}<Star className="h-3 w-3 fill-minsah-status-warning-text text-minsah-status-warning-text" aria-hidden="true" />
                    </span>
                    <div className="h-2 overflow-hidden rounded-full bg-minsah-border-subtle">
                      <div className="h-full rounded-full bg-minsah-status-warning-text transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-right text-xs text-minsah-text-muted">{count}টি</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-3">
        {displayed.map((review) => (
          <article key={review.id} className="minsah-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex gap-0.5" aria-label={`${review.rating} রেটিং, ৫-এর মধ্যে`}>
                  {[1, 2, 3, 4, 5].map((star) => <StarRow key={star} filled={star <= review.rating} />)}
                </div>
                {review.title ? <p className="text-sm font-black leading-snug text-minsah-text-primary">{review.title}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-minsah-surface-soft px-2 py-1">
                <span className="max-w-[120px] truncate text-xs font-black text-minsah-text-primary">{review.userName}</span>
                {review.verified ? <CheckCircle className="h-4 w-4 text-minsah-status-success-text" aria-label="ভেরিফায়েড ক্রেতা" /> : null}
              </div>
            </div>

            {review.content ? <p className="mt-3 text-sm leading-6 text-minsah-text-muted">{review.content}</p> : null}

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-minsah-text-muted">
              {review.verified ? <Badge tone="success">ভেরিফায়েড ক্রয়</Badge> : null}
              <span>{new Date(review.createdAt).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </article>
        ))}
      </div>

      {reviews.length > 3 ? (
        <Button type="button" variant="secondary" fullWidth onClick={() => setShowAll((current) => !current)}>
          {showAll ? 'কম দেখুন' : `সব ${reviews.length}টি রিভিউ দেখুন`}
          <ChevronDown className={`h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`} aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}
