"use client";

import React, { useState } from "react";
import { OrderBarcodeLabel } from "@/components/order/barcode/OrderBarcodeLabel";
import { Printer, QrCode, Smartphone, Sparkles, ExternalLink, RefreshCw, CheckCircle2 } from "lucide-react";

export default function OrderLabelSamplePage() {
  const [orderId, setOrderId] = useState("00003908");
  const [theme, setTheme] = useState<"metallic" | "thermal" | "minimal">("thermal");
  const [size, setSize] = useState<"standard" | "compact" | "marklife-p15">("marklife-p15");

  const fullUrl = `https://www.minsahbeauty.cloud/order/${orderId}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F8FAF7] text-[#1A1C1A] p-4 sm:p-8 antialiased">
      {/* Print Stylesheet */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-label-area,
          .printable-label-area * {
            visibility: visible;
          }
          .printable-label-area {
            position: fixed;
            left: 0;
            top: 0;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>

      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1 pb-4 border-b border-[#E2DED8]">
          <div className="flex items-center gap-2 text-xs font-bold text-[#4B6723] uppercase tracking-wider">
            <QrCode className="w-4 h-4" />
            <span>Minsah 2D Barcode / QR Label Studio</span>
          </div>
          <h1 className="text-2xl font-black text-[#062402] tracking-tight">
            Order QR Scanner Label (Marklife P15 & Thermal)
          </h1>
          <p className="text-xs text-[#5A615D]">
            Marklife P15 সহ যেকোনো পোর্টেবল ও থার্মাল লেবেল প্রিন্টারের জন্য অপ্টিমাইজড 2D QR কোড লেবেল।
          </p>
        </div>

        {/* Live Sticker Preview Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2DED8] shadow-sm flex flex-col items-center justify-center gap-4">
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-bold text-[#5A615D] uppercase tracking-wider">
              লাইভ প্রিভিউ (মোবাইল ক্যামেরা দিয়ে স্ক্যান টেস্ট করুন)
            </span>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#EAF7D8] text-[#1C3A13] border border-[#D4F6A2]">
              {size === "marklife-p15" ? "Marklife P15 (15mm Slim)" : size === "compact" ? "40×25mm" : "50×30mm"}
            </span>
          </div>

          {/* Printable Label Area */}
          <div className="printable-label-area p-5 bg-[#F2F6F0] rounded-2xl border border-dashed border-[#B0B7BE] flex items-center justify-center min-h-[140px]">
            <OrderBarcodeLabel
              orderId={orderId}
              orderNumber={`MB-${orderId}`}
              theme={theme}
              size={size}
            />
          </div>

          {/* Target URL Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EAF7D8] text-[#1C3A13] text-xs font-medium border border-[#D4F6A2] max-w-full truncate">
            <Smartphone className="w-3.5 h-3.5 text-[#4B6723] shrink-0" />
            <span>স্ক্যান লিংক:</span>
            <code className="font-bold font-mono text-[11px] underline truncate">
              {fullUrl}
            </code>
          </div>
        </div>

        {/* Controls Grid */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2DED8] shadow-xs flex flex-col gap-4">
          <h2 className="text-sm font-bold text-[#062402]">লেবেল কাস্টমাইজেশন ও প্রিন্টার সাইজ</h2>

          {/* Printer / Size Selection */}
          <div>
            <label className="block text-xs font-semibold text-[#5A615D] mb-1.5">
              প্রিন্টার মডেল ও সাইজ (Printer Size)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSize("marklife-p15")}
                className={`p-2.5 rounded-xl border text-left flex flex-col transition-all ${
                  size === "marklife-p15"
                    ? "bg-[#062402] text-white border-[#062402] shadow-sm"
                    : "bg-[#FAF9F6] text-[#1A1C1A] border-[#E2DED8] hover:bg-[#F2F6F0]"
                }`}
              >
                <span className="text-xs font-bold flex items-center gap-1">
                  Marklife P15
                  {size === "marklife-p15" && <CheckCircle2 className="w-3 h-3 text-[#C7EDB5]" />}
                </span>
                <span className={`text-[10px] mt-0.5 ${size === "marklife-p15" ? "text-gray-300" : "text-[#5A615D]"}`}>
                  15mm স্লিম টেপ (15×40mm)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSize("compact")}
                className={`p-2.5 rounded-xl border text-left flex flex-col transition-all ${
                  size === "compact"
                    ? "bg-[#062402] text-white border-[#062402] shadow-sm"
                    : "bg-[#FAF9F6] text-[#1A1C1A] border-[#E2DED8] hover:bg-[#F2F6F0]"
                }`}
              >
                <span className="text-xs font-bold flex items-center gap-1">
                  Compact 40×25
                  {size === "compact" && <CheckCircle2 className="w-3 h-3 text-[#C7EDB5]" />}
                </span>
                <span className={`text-[10px] mt-0.5 ${size === "compact" ? "text-gray-300" : "text-[#5A615D]"}`}>
                  ছোট বক্স ও কসমেটিক্স
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSize("standard")}
                className={`p-2.5 rounded-xl border text-left flex flex-col transition-all ${
                  size === "standard"
                    ? "bg-[#062402] text-white border-[#062402] shadow-sm"
                    : "bg-[#FAF9F6] text-[#1A1C1A] border-[#E2DED8] hover:bg-[#F2F6F0]"
                }`}
              >
                <span className="text-xs font-bold flex items-center gap-1">
                  Standard 50×30
                  {size === "standard" && <CheckCircle2 className="w-3 h-3 text-[#C7EDB5]" />}
                </span>
                <span className={`text-[10px] mt-0.5 ${size === "standard" ? "text-gray-300" : "text-[#5A615D]"}`}>
                  পার্সেল ও কুরিয়ার
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Order ID Input */}
            <div>
              <label className="block text-xs font-semibold text-[#5A615D] mb-1">
                Order ID / Number
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value.trim())}
                  placeholder="e.g. 00003908"
                  className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#E2DED8] rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[#4B6723]"
                />
                <button
                  type="button"
                  onClick={() => setOrderId(String(Math.floor(100000 + Math.random() * 900000)))}
                  title="Random ID"
                  className="px-2.5 py-2 bg-[#F2F6F0] text-[#1C3A13] rounded-xl hover:bg-[#EAF7D8] text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Theme Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#5A615D] mb-1">
                লেবেল থিম (Sticker Finish)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTheme("thermal")}
                  className={`py-2 px-2 text-[11px] font-bold rounded-xl border transition-all ${
                    theme === "thermal"
                      ? "bg-[#062402] text-white border-[#062402]"
                      : "bg-[#FAF9F6] text-[#5A615D] border-[#E2DED8]"
                  }`}
                >
                  থার্মাল সাদা
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("metallic")}
                  className={`py-2 px-2 text-[11px] font-bold rounded-xl border transition-all ${
                    theme === "metallic"
                      ? "bg-[#062402] text-white border-[#062402]"
                      : "bg-[#FAF9F6] text-[#5A615D] border-[#E2DED8]"
                  }`}
                >
                  সিলভার
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("minimal")}
                  className={`py-2 px-2 text-[11px] font-bold rounded-xl border transition-all ${
                    theme === "minimal"
                      ? "bg-[#062402] text-white border-[#062402]"
                      : "bg-[#FAF9F6] text-[#5A615D] border-[#E2DED8]"
                  }`}
                >
                  মিনিমাল
                </button>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-[#E2DED8]">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 py-3 px-4 bg-[#062402] hover:bg-[#1C3A13] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-md"
            >
              <Printer className="w-4 h-4 text-[#C7EDB5]" />
              <span>প্রিন্ট করুন (Print Label)</span>
            </button>
            <a
              href={fullUrl}
              target="_blank"
              rel="noreferrer"
              className="py-3 px-4 bg-[#F2F6F0] hover:bg-[#EAF7D8] text-[#1C3A13] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-[#E2DED8]"
            >
              <span>টেস্ট লিঙ্ক ওপেন করুন</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Marklife P15 Guide Box */}
        <div className="bg-[#FAF9F6] rounded-2xl p-4 border border-[#E2DED8] text-xs text-[#5A615D] space-y-2">
          <div className="font-bold text-[#062402] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#4B6723]" />
            <span>Marklife P15 প্রিন্টারের জন্য গাইড:</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            <strong>হ্যাঁ, Marklife P15-এ ১০০% পারফেক্টভাবে প্রিন্ট হবে!</strong> Marklife P15 হলো ১২-১৫ মিমি স্লিম টেপ প্রিন্টার। এর জন্য আমরা বিশেষ <strong>15mm স্লিম লেআউট</strong> যোগ করেছি—যেখানে বাম পাশে শার্প ১২ মিমি QR কোড এবং ডান পাশে ব্র্যান্ড নাম ও অর্ডার নম্বর পাশাপাশি সেট থাকে।
          </p>
        </div>
      </div>
    </div>
  );
}
