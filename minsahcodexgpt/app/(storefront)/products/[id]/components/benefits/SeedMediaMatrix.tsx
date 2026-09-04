"use client";

import React, { useState, useRef, useMemo } from "react";
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  ChevronDown,
  MessageCircle,
  HelpCircle,
  Sparkles,
} from "lucide-react";

export interface BenefitFaqItem {
  id?: string;
  question: string;
  answer: string;
}

export interface SeedMediaMatrixProps {
  videoUrl?: string | null;
  posterUrl?: string;
  captionText?: string;
  faqs?: BenefitFaqItem[];
  productName?: string;
  whatsappNumber?: string;
  className?: string;
}

const DEFAULT_FAQS: BenefitFaqItem[] = [
  {
    id: "faq-1",
    question: "How quickly will I feel and see visible results?",
    answer: "Most users experience immediate barrier soothing and deep hydration in the first 7 days, with sebum balance and pore clarity compounding through weeks 2 to 4 of daily use.",
  },
  {
    id: "faq-2",
    question: "Can I layer this with active Retinol or Vitamin C?",
    answer: "Yes! Apply this barrier-soothing formulation after your active serums or before heavier creams to prevent dryness and buffer reactive sensitivity.",
  },
  {
    id: "faq-3",
    question: "Is it formulated safe for acne-prone & sensitive skin?",
    answer: "100%. Dermatologist-tested, hypoallergenic, and non-comedogenic. Free from synthetic fragrances, harsh drying alcohols, and pore-clogging fillers.",
  },
  {
    id: "faq-4",
    question: "What is the recommended application ritual (AM/PM)?",
    answer: "Dispense 2–3 drops morning and night onto freshly cleansed, slightly damp skin. Gently press with palms until completely absorbed.",
  },
  {
    id: "faq-5",
    question: "How long does a single bottle last with daily use?",
    answer: "With consistent twice-daily application (2–3 drops per ritual), a standard full-size bottle lasts between 30 to 45 days.",
  },
  {
    id: "faq-6",
    question: "Does this formulation require refrigeration?",
    answer: "No refrigeration required. The bio-active botanical complex is sealed with high stability for ambient room temperature storage away from direct sunlight.",
  },
];

/**
 * Phase 3: Seed-Style Media Matrix & Dynamic Capsule FAQ Component
 * 
 * Rules:
 * 1. If videoUrl exists (Media Active):
 *    - Renders 1 Single Full-Width HD Video Player (32px radius, sound toggle, play/pause, live caption pill).
 *    - Directly below the video: Capsule FAQ list.
 *    - On Mobile: Shows top 3 questions cleanly.
 * 
 * 2. If videoUrl does NOT exist (No Video / FAQ Only):
 *    - Displays full-height Capsule FAQ list with top-to-bottom scrollbar.
 *    - On Mobile: Shows 5 questions with smooth top-to-bottom scrollbar to view all.
 * 
 * 3. Capsule Buttons:
 *    - Pill capsule button styling (`rounded-[32px]` / `rounded-full`).
 *    - Hover/Click expands smoothly to reveal the answer.
 * 
 * 4. WhatsApp Inquiry Trigger:
 *    - "Still have questions? Chat with Skincare Expert on WhatsApp" button with pre-filled product inquiry.
 */
export function SeedMediaMatrix({
  videoUrl,
  posterUrl = "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80",
  captionText = "Biologically engineered for rapid barrier penetration and cellular calm...",
  faqs = DEFAULT_FAQS,
  productName = "this product",
  whatsappNumber,
  className = "",
}: SeedMediaMatrixProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);
  const [hoveredFaqId, setHoveredFaqId] = useState<string | null>(null);
  const [showAllMobileFaqs, setShowAllMobileFaqs] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const hasVideo = Boolean(videoUrl && videoUrl.trim().length > 0);
  const displayFaqs = faqs && faqs.length > 0 ? faqs : DEFAULT_FAQS;

  // Toggle Video Sound
  const handleToggleAudio = () => {
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  // Toggle Video Play / Pause
  const handleTogglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Toggle FAQ Accordion
  const handleFaqClick = (id: string) => {
    setExpandedFaqId((prev) => (prev === id ? null : id));
  };

  // Build WhatsApp URL
  const targetWhatsappNumber = whatsappNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "8801700000000";
  const whatsappQueryUrl = useMemo(() => {
    const cleanNumber = targetWhatsappNumber.replace(/[^0-9]/g, "");
    const msg = `Hello Minsah Beauty, I have a question regarding the routine & benefits of: ${productName}`;
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`;
  }, [targetWhatsappNumber, productName]);

  // Mobile Question Limit Logic
  // When video is active: show 3 items on mobile (unless expanded)
  // When video is NOT active: show 5 items on mobile with scroll
  const mobileLimit = hasVideo ? 3 : 5;

  return (
    <div className={`w-full flex flex-col space-y-5 ${className}`}>
      
      {/* ─────────────────────────────────────────────────────────────
          1. FULL-WIDTH SINGLE HD VIDEO PLAYER (When Video is Active)
          ───────────────────────────────────────────────────────────── */}
      {hasVideo && (
        <div className="relative w-full aspect-[16/9.5] sm:aspect-[16/9] rounded-[24px] sm:rounded-[32px] overflow-hidden bg-[#111A10] shadow-[0_16px_36px_-8px_rgba(28,58,19,0.22)] group">
          {/* HTML5 Video */}
          <video
            ref={videoRef}
            src={videoUrl && videoUrl.trim() !== '' ? videoUrl.trim() : undefined}
            poster={posterUrl && posterUrl.trim() !== '' ? posterUrl.trim() : undefined}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover block"
          />

          {/* Subtle Ambient Shadow Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/15 pointer-events-none" />

          {/* Floating Subtitle Caption Pill */}
          {captionText && (
            <div className="absolute bottom-3.5 left-3.5 right-14 sm:bottom-5 sm:left-5 sm:right-16 bg-[#121813]/85 backdrop-blur-md border border-white/15 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full flex items-center gap-2.5 text-white shadow-lg pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-[#4ADE80] shadow-[0_0_8px_#4ADE80] shrink-0 animate-pulse" />
              <p className="text-[11px] sm:text-[12.5px] font-medium leading-tight truncate">
                {captionText}
              </p>
            </div>
          )}

          {/* Sound Control Button (Mute / Unmute) */}
          <button
            type="button"
            onClick={handleToggleAudio}
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
            aria-label={isMuted ? "Unmute Video Audio" : "Mute Video Audio"}
            className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#121813]/85 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-[#1C3A13] hover:border-[#4ADE80] hover:scale-105 active:scale-95 transition-all shadow-md z-10"
          >
            {isMuted ? <VolumeX className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> : <Volume2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#4ADE80]" />}
          </button>

          {/* Play / Pause Toggle Button */}
          <button
            type="button"
            onClick={handleTogglePlayPause}
            title={isPlaying ? "Pause Video" : "Play Video"}
            aria-label={isPlaying ? "Pause Video" : "Play Video"}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 rounded-full bg-[#121813]/70 backdrop-blur-md border border-white/15 text-white/90 flex items-center justify-center hover:bg-[#1C3A13] hover:text-white hover:scale-105 transition-all z-10"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. CAPSULE FAQ SECTION (Top-to-Bottom Scroll & Hover Reveal)
          ───────────────────────────────────────────────────────────── */}
      <div className="w-full flex flex-col space-y-3 pt-1">
        
        {/* Section Mini Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1C3A13]" />
            <h4 className="text-[13px] sm:text-[14px] font-bold text-[#1C3A13] tracking-wide uppercase">
              Routine &amp; Science FAQ
            </h4>
          </div>
          <span className="text-[11px] font-medium text-[#163020]/60">
            {displayFaqs.length} Questions
          </span>
        </div>

        {/* Scrollable Capsule FAQ List */}
        <div
          className={`w-full flex flex-col space-y-2.5 overflow-y-auto pr-1 transition-all ${
            hasVideo
              ? "max-h-[320px] sm:max-h-[360px]"
              : "max-h-[460px] sm:max-h-[520px]"
          } scrollbar-thin scrollbar-thumb-[#1C3A13]/20 scrollbar-track-transparent`}
        >
          {displayFaqs.map((faq, index) => {
            const faqId = faq.id || `faq-${index}`;
            const isExpanded = expandedFaqId === faqId || hoveredFaqId === faqId;
            const isHiddenOnMobile = !showAllMobileFaqs && index >= mobileLimit;

            return (
              <div
                key={faqId}
                onMouseEnter={() => setHoveredFaqId(faqId)}
                onMouseLeave={() => setHoveredFaqId(null)}
                onClick={() => handleFaqClick(faqId)}
                className={`group w-full transition-all duration-300 rounded-[20px] sm:rounded-[32px] border cursor-pointer select-none overflow-hidden ${
                  isHiddenOnMobile ? "hidden sm:block" : "block"
                } ${
                  isExpanded
                    ? "bg-[#EEEDE6] border-[#1C3A13]/30 shadow-xs"
                    : "bg-white/80 hover:bg-[#EEEDE6]/60 border-[#1C3A13]/12"
                }`}
              >
                {/* Capsule Button Header */}
                <div className="px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                        isExpanded
                          ? "bg-[#1C3A13] text-[#FCFCF7]"
                          : "bg-[#1C3A13]/10 text-[#1C3A13] group-hover:bg-[#1C3A13] group-hover:text-[#FCFCF7]"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="text-[13.5px] sm:text-[15px] font-medium text-[#1C3A13] leading-snug tracking-tight">
                      {faq.question}
                    </span>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${
                      isExpanded
                        ? "rotate-180 bg-[#1C3A13] text-white"
                        : "bg-[#1C3A13]/8 text-[#1C3A13] group-hover:bg-[#1C3A13]/15"
                    }`}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Animated Answer Body (Hover / Click Reveal) */}
                <div
                  className={`transition-all duration-300 ease-in-out px-4 sm:px-5 overflow-hidden ${
                    isExpanded ? "max-h-48 pb-3.5 sm:pb-4 opacity-100" : "max-h-0 pb-0 opacity-0"
                  }`}
                >
                  <p className="text-[12.5px] sm:text-[13.5px] text-[#163020]/80 leading-relaxed pl-7 sm:pl-8 border-t border-[#1C3A13]/8 pt-2.5">
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile "View All Questions" Toggle (If items exceed mobileLimit) */}
        {displayFaqs.length > mobileLimit && (
          <div className="block sm:hidden text-center pt-1">
            <button
              type="button"
              onClick={() => setShowAllMobileFaqs(!showAllMobileFaqs)}
              className="text-xs font-bold text-[#1C3A13] underline underline-offset-4 hover:text-[#2F6D20]"
            >
              {showAllMobileFaqs
                ? "Show Less Questions"
                : `View All ${displayFaqs.length} Questions (${displayFaqs.length - mobileLimit} more)`}
            </button>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            3. WHATSAPP INQUIRY TRIGGER BUTTON
            ───────────────────────────────────────────────────────────── */}
        <div className="pt-2">
          <a
            href={whatsappQueryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between gap-3 bg-[#EEEDE6] hover:bg-[#E4E3DB] border border-[#1C3A13]/15 hover:border-[#1C3A13]/30 px-4 py-3 sm:px-5 sm:py-3.5 rounded-[20px] sm:rounded-[32px] transition-all group shadow-xs text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
                <MessageCircle className="w-4 h-4 fill-white" />
              </div>
              <div>
                <div className="text-[12.5px] sm:text-[13.5px] font-bold text-[#1C3A13] group-hover:text-[#0E160C]">
                  Still have questions about this routine?
                </div>
                <div className="text-[11px] sm:text-[11.5px] text-[#163020]/70">
                  Chat directly with our skincare specialist on WhatsApp
                </div>
              </div>
            </div>

            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#1C3A13] group-hover:translate-x-1 transition-transform">
              Ask Now ➔
            </span>
          </a>
        </div>

      </div>

    </div>
  );
}

export default SeedMediaMatrix;
