"use client";

import React from "react";

export function TermsSectionList() {
  return (
    <div className="px-4 sm:px-6 py-6 space-y-6">
      {/* 1. General Terms */}
      <section id="sec-1" className="scroll-mt-32 rounded-2xl bg-white p-5 border border-[#E5EADF] shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center font-bold text-xs">
            ১
          </span>
          <h3 className="font-bold text-base text-[#181C1A]">সাধারণ শর্তাবলী (General Terms)</h3>
        </div>
        <p className="text-xs text-[#5C645F] leading-relaxed">
          Minsah Beauty-এর ওয়েবসাইট, অ্যাপ বা সোশ্যাল চ্যানেল ব্যবহারের মাধ্যমে আপনি এই সকল শর্তাবলী মেনে নিতে সম্মত হচ্ছেন। আমরা প্রয়োজনবোধে যেকোনো সময় এই শর্তাবলী হালনাগাদ করার অধিকার সংরক্ষণ করি।
        </p>
        <p className="text-[11px] text-[#5C645F]/90 leading-relaxed italic">
          By accessing or purchasing through Minsah Beauty, you agree to comply with and be bound by these legal terms and regulations in Bangladesh.
        </p>
      </section>

      {/* 2. Authenticity Guarantee */}
      <section id="sec-2" className="scroll-mt-32 rounded-2xl bg-white p-5 border border-[#E5EADF] shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center font-bold text-xs">
            ২
          </span>
          <h3 className="font-bold text-base text-[#181C1A]">১০০% খাঁটি পণ্যের নিশ্চয়তা ও হলোগ্রাম (Authenticity Guarantee)</h3>
        </div>
        <p className="text-xs text-[#5C645F] leading-relaxed">
          Minsah Beauty আমেরিকা, যুক্তরাজ্য, কোরিয়া, জাপানসহ বিশ্বের শীর্ষস্থানীয় অথেনটিক ব্র্যান্ড ও অনুমোদিত ডিস্ট্রিবিউটরদের থেকে সরাসরি পণ্য আমদানি করে পুরো বাংলাদেশে সরবরাহ করে। প্রতিটি পণ্যের গায়ে ইউনিক অথেনটিক সিল এবং ব্যাচ নম্বর সংযুক্ত থাকে।
        </p>
        <div className="rounded-xl bg-[#EAF7D8]/60 p-3 border border-[#4b6723]/20 flex items-center gap-2 text-xs text-[#1c3a13] font-semibold">
          <span className="material-symbols-outlined text-[18px] text-[#4b6723]">verified</span>
          <span>১০ গুণ মানিব্যাক নিশ্চয়তা: কোনো পণ্য অননুমোদিত বা নকল প্রমাণিত হলে ১০ গুণ মূল্য ফেরতযোগ্য।</span>
        </div>
      </section>

      {/* 3. Orders & Pricing */}
      <section id="sec-3" className="scroll-mt-32 rounded-2xl bg-white p-5 border border-[#E5EADF] shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center font-bold text-xs">
            ৩
          </span>
          <h3 className="font-bold text-base text-[#181C1A]">অর্ডার প্রক্রিয়া ও মূল্য নির্ধারণ (Orders &amp; Pricing)</h3>
        </div>
        <p className="text-xs text-[#5C645F] leading-relaxed">
          আমাদের সাইটে প্রদর্শিত সকল মূল্য বাংলাদেশি টাকায় (BDT) উল্লিখিত এবং এতে প্রযোজ্য ভ্যাট অন্তর্ভুক্ত রয়েছে। আন্তর্জাতিক মুদ্রা বিনিময় হারের পরিবর্তনের কারণে মূল্যে সাময়িক সমন্বয় হতে পারে।
        </p>
      </section>

      {/* 4. Shipping & Delivery */}
      <section id="sec-4" className="scroll-mt-32 rounded-2xl bg-white p-5 border border-[#E5EADF] shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center font-bold text-xs">
            ৪
          </span>
          <h3 className="font-bold text-base text-[#181C1A]">ডেলিভারি ও হ্যান্ডলিং পলিসি (Shipping &amp; Transit Timelines)</h3>
        </div>
        <p className="text-xs text-[#5C645F] leading-relaxed">
          ঢাকার ভেতরে ২৪ ঘণ্টার মধ্যে এবং ঢাকার বাইরে সারা বাংলাদেশে ৪৮-৭২ ঘণ্টার মধ্যে পাঠাও ও স্টেডফাস্ট কুরিয়ারের মাধ্যমে নিরাপদ ও দ্রুত ডেলিভারি করা হয়। সব পার্সেল সুরক্ষিত প্যাকেজিংয়ে পাঠানো হয়।
        </p>
      </section>

      {/* 5. Payments & COD */}
      <section id="sec-5" className="scroll-mt-32 rounded-2xl bg-white p-5 border border-[#E5EADF] shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center font-bold text-xs">
            ৫
          </span>
          <h3 className="font-bold text-base text-[#181C1A]">ক্যাশ অন ডেলিভারি (COD) ও পেমেন্ট সিকিউরিটি (Payment Methods)</h3>
        </div>
        <p className="text-xs text-[#5C645F] leading-relaxed">
          সারাদেশের ৬৪ জেলায় ক্যাশ অন ডেলিভারি উপলব্ধ। এছাড়াও bKash, Nagad এবং ডেবিট/ক্রেডিট কার্ডের মাধ্যমে PCI-DSS সার্টিফাইড সুরক্ষিত পেমেন্ট গেটওয়েতে লেনদেন সম্পন্ন করা যায়।
        </p>
      </section>

      {/* 6. Returns & Refunds */}
      <section id="sec-6" className="scroll-mt-32 rounded-2xl bg-white p-5 border border-[#E5EADF] shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center font-bold text-xs">
            ৬
          </span>
          <h3 className="font-bold text-base text-[#181C1A]">রিটার্ন, রিফান্ড ও রিপ্লেসমেন্ট (14-Day Return &amp; Refunds)</h3>
        </div>
        <p className="text-xs text-[#5C645F] leading-relaxed">
          সিল অক্ষত এবং অব্যবহৃত পণ্যে ১৪ দিনের মধ্যে সহজ রিটার্ন ও রিফান্ড সুবিধা রয়েছে। ডেলিভারির সময় পার্সেল ক্ষতিগ্রস্ত পেলে ৪৮ ঘণ্টার মধ্যে আনবক্সিং প্রমাণসহ জানাতে হবে।
        </p>
      </section>

      {/* 7. Data Protection */}
      <section id="sec-7" className="scroll-mt-32 rounded-2xl bg-white p-5 border border-[#E5EADF] shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center font-bold text-xs">
            ৭
          </span>
          <h3 className="font-bold text-base text-[#181C1A]">কাস্টমার অ্যাকাউন্ট ও ডেটা প্রটেকশন (Data Privacy)</h3>
        </div>
        <p className="text-xs text-[#5C645F] leading-relaxed">
          গ্রাহকের ব্যক্তিগত তথ্য সম্পূর্ণ এনক্রিপ্ট করে সংরক্ষণ করা হয়। কোনো প্রকার আর্থিক তথ্য বা ব্যাংক পাসওয়ার্ড আমাদের সার্ভারে জমা রাখা হয় না। গ্রাহক যেকোনো সময় তথ্য মুছে ফেলার অনুরোধ করতে পারেন।
        </p>
      </section>

      {/* 8. Skin Reaction Policy */}
      <section id="sec-8" className="scroll-mt-32 rounded-2xl bg-white p-5 border border-[#E5EADF] shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center font-bold text-xs">
            ৮
          </span>
          <h3 className="font-bold text-base text-[#181C1A]">পণ্য ব্যবহার ও স্কিন রিঅ্যাকশন সতর্কতা (Cosmetic Usage Care)</h3>
        </div>
        <p className="text-xs text-[#5C645F] leading-relaxed">
          নতুন স্কিনকেয়ার ব্যবহারের পূর্বে প্যাচ টেস্ট (Patch Test) করার জোরালো সুপারিশ করা হয়। বিরূপ প্রতিক্রিয়ার ক্ষেত্রে ৭ দিনের মধ্যে আমাদের চর্মরোগ বিশেষজ্ঞ ও কনসিয়ার্জ টিমের পরামর্শ নিন।
        </p>
      </section>

      {/* 9. Intellectual Property */}
      <section id="sec-9" className="scroll-mt-32 rounded-2xl bg-white p-5 border border-[#E5EADF] shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center font-bold text-xs">
            ৯
          </span>
          <h3 className="font-bold text-base text-[#181C1A]">মেধাসম্পদ ও ট্রেডমার্ক (Intellectual Property)</h3>
        </div>
        <p className="text-xs text-[#5C645F] leading-relaxed">
          Minsah Beauty-এর লোগো, কনটেন্ট, ডিজাইন ও ট্রেডমার্ক সম্পূর্ণভাবে সংরক্ষিত। অনুমতি ছাড়া বাণিজ্যিক ব্যবহার আইনত দণ্ডনীয়।
        </p>
      </section>

      {/* 10. Limitation of Liability */}
      <section id="sec-10" className="scroll-mt-32 rounded-2xl bg-white p-5 border border-[#E5EADF] shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center font-bold text-xs">
            ১০
          </span>
          <h3 className="font-bold text-base text-[#181C1A]">দায়মুক্তি ও সীমাবদ্ধতা (Limitation of Liability)</h3>
        </div>
        <p className="text-xs text-[#5C645F] leading-relaxed">
          প্রাকৃতিক দুর্যোগ, কুরিয়ার ধর্মঘট বা অনিবার্য কারণে ডেলিভারিতে বিলম্বের জন্য গ্রাহককে সার্বক্ষণিক আপডেট দেওয়া হবে এবং ক্ষতিপূরণ বা রিফান্ডের নিশ্চয়তা থাকবে।
        </p>
      </section>

      {/* 11. Governing Law */}
      <section id="sec-11" className="scroll-mt-32 rounded-2xl bg-white p-5 border border-[#E5EADF] shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center font-bold text-xs">
            ১১
          </span>
          <h3 className="font-bold text-base text-[#181C1A]">প্রযোজ্য আইন ও বিরোধ নিষ্পত্তি (Governing Law &amp; Jurisdiction)</h3>
        </div>
        <p className="text-xs text-[#5C645F] leading-relaxed">
          এই শর্তাবলী গণপ্রজাতন্ত্রী বাংলাদেশের ভোক্তা অধিকার সংরক্ষণ আইন ২০০৯ (আইন নং ২৬) এবং ডিজিটাল নিরাপত্তা আইন অনুযায়ী পরিচালিত ও নিষ্পত্তিযোগ্য।
        </p>
      </section>
    </div>
  );
}
