'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Sparkles,
  Star,
  FileText,
  Camera,
  Share2,
  MessageCircle,
  Copy,
  ArrowRight,
  Home,
  Clock,
  ShieldCheck,
} from 'lucide-react';
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
  if (!isOpen) return null;

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Check out my verified review on Minsah Beauty for ${data.productName}!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      alert('রিভিউ লিঙ্ক ক্লিপবোর্ডে কপি হয়েছে!');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[150] bg-[#062402]/50 backdrop-blur-md flex items-end justify-center animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-[32px] max-h-[85vh] overflow-y-auto no-scrollbar p-4 flex flex-col gap-3.5 shadow-2xl border-t border-[#E2DED8]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tactile Grab Handle */}
        <div className="flex justify-center pt-1 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-[#e3e2e0]" />
        </div>

        {/* Glowing Reward Earned Bento Card */}
        <div className="relative rounded-2xl bg-[#EAF7D8] text-[#1c3a13] p-4 overflow-hidden shadow-sm flex flex-col gap-2 border border-[#ccee9b]/50">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-[#4b6723]/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 text-[#4b6723] backdrop-blur-sm text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Minsah Glow Club</span>
            </div>
            <span className="text-xs font-bold text-[#516d29]">ইনস্ট্যান্ট রিওয়ার্ড</span>
          </div>

          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-3xl font-extrabold text-[#062402] leading-none">
              +{data.earnedPoints}
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[#062402] leading-tight">
                Glow Points অর্জিত হয়েছে!
              </span>
              <span className="text-xs text-[#516d29]">
                আপনার ওয়ালেটে নতুন রিওয়ার্ড যোগ হয়েছে
              </span>
            </div>
          </div>

          {/* Point Breakdown Ledger */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="p-2 rounded-xl bg-white/70 backdrop-blur-sm flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-[#062402] font-semibold">
                <Star className="w-3.5 h-3.5 fill-[#4b6723] text-[#4b6723]" />
                <span>রেটিং (৫★)</span>
              </div>
              <span className="font-bold text-[#4b6723]">+১০ Pts</span>
            </div>

            <div className="p-2 rounded-xl bg-white/70 backdrop-blur-sm flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-[#062402] font-semibold">
                <FileText className="w-3.5 h-3.5 text-[#4b6723]" />
                <span>টেক্সট রিভিউ</span>
              </div>
              <span className="font-bold text-[#4b6723]">+২০ Pts</span>
            </div>

            <div className="p-2 rounded-xl bg-white/70 backdrop-blur-sm flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-[#062402] font-semibold">
                <Camera className="w-3.5 h-3.5 text-[#4b6723]" />
                <span>ফটো বোনাস</span>
              </div>
              <span className="font-bold text-[#4b6723]">+২০ Pts</span>
            </div>

            <div className="p-2 rounded-xl bg-[#062402] text-white flex items-center justify-between text-xs font-bold shadow-sm">
              <span>নতুন ব্যালেন্স:</span>
              <span className="text-[#ccee9b]">{data.totalPointsBalance} Pts</span>
            </div>
          </div>
        </div>

        {/* Review Snapshot Preview Card */}
        <div className="rounded-2xl bg-[#F8FAF7] p-3.5 flex flex-col gap-2 border border-[#E2DED8]/60 shadow-sm">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white shrink-0 relative border border-[#E2DED8]">
                <Image
                  src={data.productImage}
                  alt={data.productName}
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-[#062402] truncate">
                  {data.productName}
                </span>
                <div className="flex items-center gap-1 text-[#4b6723]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-[#4b6723]" />
                  ))}
                  <span className="text-[10px] text-[#43483f] font-semibold ml-1">
                    ৫.০ • ভেরিফাইড বায়ার
                  </span>
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#EAF7D8] text-[#516d29] text-[9px] font-bold shrink-0">
              #{data.reviewId}
            </span>
          </div>

          <div className="rounded-xl bg-white p-2.5 border border-[#E2DED8]/40">
            <p className="text-xs text-[#062402] leading-relaxed italic">
              &ldquo;{data.comment}&rdquo;
            </p>
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-[#062402] text-[10px] font-bold border border-[#E2DED8]/40">
              <Camera className="w-3 h-3 text-[#4b6723]" />
              <span>{data.photosCount}টি ছবি সংযুক্ত</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EAF7D8] text-[#516d29] text-[10px] font-bold">
              <ShieldCheck className="w-3 h-3" />
              <span>১০০% আসল প্রোডাক্ট</span>
            </div>
          </div>
        </div>

        {/* Community Share Incentive */}
        <div className="rounded-2xl bg-[#F8FAF7] p-3 flex items-center justify-between border border-[#E2DED8]/60 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#EAF7D8] text-[#516d29] flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-[#062402]">কমিউনিটিতে শেয়ার করুন</span>
              <span className="text-[11px] text-[#4b6723] font-bold">
                শেয়ার করলেই আরও +১০ Glow Points!
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="w-8 h-8 rounded-full bg-[#EAF7D8] text-[#516d29] flex items-center justify-center active:scale-95 transition-all shadow-xs"
              title="WhatsApp Share"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-2.5 py-1.5 rounded-full bg-white border border-[#E2DED8] text-[#062402] text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all shadow-xs"
              title="Copy Link"
            >
              <Copy className="w-3 h-3" />
              <span>কপি</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <Link
            href="/account/reviews"
            onClick={onClose}
            className="w-full inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-[#062402] hover:bg-[#1c3a13] text-white text-xs font-bold tracking-wide active:scale-95 transition-all shadow-md border border-[#ccee9b]/20 cursor-pointer"
          >
            <span>অন্যান্য অর্ডার রিভিউ করুন (+৫০ Pts)</span>
            <ArrowRight className="w-4 h-4 text-[#D4F6A2]" />
          </Link>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/"
              onClick={onClose}
              className="w-full inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-full bg-[#F2F6F0] hover:bg-[#e9e8e5] text-[#062402] text-xs font-bold active:scale-95 transition-all border border-[#E2DED8]/60 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>হোম পেজ</span>
            </Link>
            <Link
              href="/account/orders"
              onClick={onClose}
              className="w-full inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-full bg-[#EAF7D8] text-[#516d29] hover:bg-[#ccee9b] text-xs font-bold active:scale-95 transition-all cursor-pointer border border-[#4b6723]/20"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>অর্ডার হিস্ট্রি</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
