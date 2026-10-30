'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Sparkles,
  Star,
  Camera,
  Share2,
  MessageCircle,
  Copy,
  ArrowRight,
  Home,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { ReviewCelebrationData } from './types';

interface ReviewRewardSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: ReviewCelebrationData;
}

const DEFAULT_CELEBRATION_DATA: ReviewCelebrationData = {
  orderNumber: 'MB-88294',
  productName: 'Laneige Lip Sleeping Mask Berry',
  productImage: '/images/products/laneige-lip.png',
  rating: 5,
  comment: 'আসল কোরিয়ান প্রোডাক্ট! হলোগ্রাম স্ক্যান করে অথেনটিসিটি চেক করেছি। ঠোঁটের ড্রাইনেস এক রাতেই কমে গেছে।',
  photosCount: 2,
  earnedPoints: 50,
  totalPointsBalance: 900,
  reviewId: '882',
};

export function ReviewRewardSheetModal({
  isOpen,
  onClose,
  data = DEFAULT_CELEBRATION_DATA,
}: ReviewRewardSheetModalProps) {
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Check out my verified review on Minsah Beauty for ${data.productName}!`,
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      alert('রিভিউ লিঙ্ক ক্লিপবোর্ডে কপি হয়েছে!');
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      badge={
        <>
          <Sparkles className="h-3.5 w-3.5 text-[#4b6723]" />
          <span>Minsah Glow Club</span>
        </>
      }
      title={`+${data.earnedPoints} Glow Points অর্জিত হয়েছে!`}
      description={`Order #${data.orderNumber} • নতুন ব্যালেন্স: ${data.totalPointsBalance} Pts`}
      footer={
        <div className="flex flex-col gap-2 w-full">
          <Link
            href="/account/reviews"
            onClick={onClose}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#062402] px-5 font-bold text-white transition hover:bg-[#1c3a13]"
          >
            <span>অন্যান্য অর্ডার রিভিউ করুন (+৫০ Pts)</span>
            <ArrowRight className="h-4 w-4 text-[#D4F6A2]" />
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/"
              onClick={onClose}
              className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#E2DED8] bg-[#F4F3EF] font-bold text-[#062402]"
            >
              <Home className="h-4 w-4" />
              <span>হোম পেজ</span>
            </Link>
            <Link
              href="/account/orders"
              onClick={onClose}
              className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#B5C4BB] bg-[#EAF7D8] font-bold text-[#1c3a13]"
            >
              <Clock className="h-4 w-4" />
              <span>অর্ডার হিস্ট্রি</span>
            </Link>
          </div>
        </div>
      }
    >
      <div className="rounded-2xl border border-[#E2DED8] bg-white p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[#E2DED8] bg-[#FAF9F6]">
              <Image src={data.productImage} alt={data.productName} fill className="object-cover" sizes="40px" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-bold text-[#062402]">{data.productName}</p>
              <div className="flex items-center gap-1 text-[#4b6723]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-[#4b6723]" />
                ))}
              </div>
            </div>
          </div>
          <span className="rounded-full bg-[#EAF7D8] px-2.5 py-0.5 text-xs font-bold text-[#1c3a13]">
            #{data.reviewId}
          </span>
        </div>

        <p className="rounded-xl border border-[#E2DED8] bg-[#FAF9F6] p-3 italic text-[#181C1A]">
          &ldquo;{data.comment}&rdquo;
        </p>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-[#E2DED8] bg-[#FAF9F6] px-2.5 py-0.5 text-xs font-semibold text-[#062402]">
            <Camera className="h-3.5 w-3.5 text-[#4b6723]" />
            {data.photosCount}টি ছবি সংযুক্ত
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF7D8] px-2.5 py-0.5 text-xs font-semibold text-[#1c3a13]">
            <ShieldCheck className="h-3.5 w-3.5" />
            ১০০% আসল প্রোডাক্ট
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-[#E2DED8] bg-white p-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF7D8] text-[#1c3a13]">
            <Share2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[#062402]">কমিউনিটিতে শেয়ার করুন</p>
            <p className="text-xs font-semibold text-[#4b6723]">আরও +১০ Glow Points!</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EAF7D8] text-[#1c3a13]"
            aria-label="Share on WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex h-9 items-center gap-1 rounded-full border border-[#E2DED8] bg-[#FAF9F6] px-3 text-xs font-bold text-[#062402]"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>কপি</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
