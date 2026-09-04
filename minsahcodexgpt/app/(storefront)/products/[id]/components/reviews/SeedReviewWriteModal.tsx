"use client";

import React, { useState, useEffect } from "react";
import { Star, X, Upload, CheckCircle2, Loader2, Camera } from "lucide-react";

export interface NewReviewSubmission {
  userName: string;
  userEmail: string;
  rating: number;
  title: string;
  content: string;
  photoUrls?: string[];
}

export interface SeedReviewWriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  onSubmitReview?: (review: NewReviewSubmission) => Promise<boolean | void> | boolean | void;
}

/**
 * Phase 4: Seed.com Luxury Review Submission Modal
 */
export function SeedReviewWriteModal({
  isOpen,
  onClose,
  productName,
  onSubmitReview,
}: SeedReviewWriteModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photosList, setPhotosList] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ESC key listener & body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
      setIsSuccess(false);
      setErrorMsg("");
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddPhoto = () => {
    if (!photoUrl.trim()) return;
    setPhotosList((prev) => [...prev, photoUrl.trim()]);
    setPhotoUrl("");
  };

  const handleRemovePhoto = (index: number) => {
    setPhotosList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !content.trim()) {
      setErrorMsg("Please provide your name and review details.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const submission: NewReviewSubmission = {
        userName: userName.trim(),
        userEmail: userEmail.trim(),
        rating,
        title: title.trim(),
        content: content.trim(),
        photoUrls: photosList,
      };

      if (onSubmitReview) {
        await onSubmitReview(submission);
      }

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-[#0E160C]/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[560px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden my-8 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-[#F8F9F7]">
          <div>
            <span className="text-[11px] font-bold text-[#2F6D20] tracking-wider uppercase">
              Verified Member Review
            </span>
            <h3 className="text-[18px] font-extrabold text-[#1C3A13] tracking-tight">
              Review {productName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-black hover:rotate-90 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success State */}
        {isSuccess ? (
          <div className="p-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#2F6D20]/10 text-[#2F6D20] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-bold text-[#1C3A13]">
              Thank you for your review!
            </h4>
            <p className="text-sm text-gray-600 max-w-sm mx-auto">
              Your feedback has been submitted and helps our community make informed skincare choices.
            </p>
          </div>
        ) : (
          /* Submission Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            
            {/* 1. Star Rating Selector */}
            <div className="text-center space-y-2 pb-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Overall Rating
              </label>
              <div className="flex items-center justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled =
                    hoverRating !== null ? star <= hoverRating : star <= rating;

                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-110 active:scale-95"
                    >
                      <Star
                        className={`w-7 h-7 sm:w-8 sm:h-8 ${
                          isFilled
                            ? "fill-[#D18E34] text-[#D18E34]"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-semibold text-[#1C3A13]">
                {rating === 5 && "⭐ 5 - Excellent (Highly Recommend)"}
                {rating === 4 && "⭐ 4 - Very Good"}
                {rating === 3 && "⭐ 3 - Average"}
                {rating === 2 && "⭐ 2 - Below Expectations"}
                {rating === 1 && "⭐ 1 - Poor"}
              </span>
            </div>

            {/* 2. User Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Sarah K."
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1C3A13] focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Email Address (Private)
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1C3A13] focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* 3. Review Headline */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Review Headline (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Transformed my skin barrier in 2 weeks!"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1C3A13] focus:border-transparent outline-none"
              />
            </div>

            {/* 4. Review Body */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Your Detailed Experience &amp; Results *
              </label>
              <textarea
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="How did this product feel? When did you first notice changes in hydration, glow, or redness? Would you repurchase?"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1C3A13] focus:border-transparent outline-none resize-none"
              />
            </div>

            {/* 5. Photo URL Attachment */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">
                Attach Customer Photo URL (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or image link"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#1C3A13]"
                />
                <button
                  type="button"
                  onClick={handleAddPhoto}
                  className="px-4 py-2 bg-[#EEEDE6] hover:bg-[#1C3A13] hover:text-white text-[#1C3A13] rounded-lg text-xs font-bold transition-colors shrink-0"
                >
                  + Add
                </button>
              </div>

              {photosList.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {photosList.map((url, i) => (
                    <div key={i} className="relative w-12 h-12 rounded-md overflow-hidden border border-gray-200">
                      <img src={url} alt="Attached" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(i)}
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {errorMsg && (
              <p className="text-xs text-red-600 font-semibold">{errorMsg}</p>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-[#1C3A13] hover:bg-[#12280C] text-[#FCFCF7] font-bold text-sm uppercase tracking-wider rounded-[2px] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Review...</span>
                  </>
                ) : (
                  <span>Submit Verified Review</span>
                )}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}

export default SeedReviewWriteModal;
