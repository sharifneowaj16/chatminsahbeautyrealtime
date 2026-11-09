# Gemini Project Instructions

Read `AGENTS.md` first and run:

```bash
npm run ai:fast-start
```

Trust `.ai/project-state.json` and `.ai/phase31-execution-manifest.json` over historical chat. Current verified checkpoint: Phase 31 Layer 6. Current item: **9.8 — Final runtime and release gate**. Do not restart Layers 1-6; use sequential item gates and package only after the full Layer 7 gate.

## Mandatory User Communication Preference
- **Language**: সর্বদা ব্যবহারকারীকে সবকিছু **বাংলায়** বোঝাতে হবে।
- **Length**: ব্যাখ্যা সব সময় **খুব ছোট, টু-দ্য-পয়েন্ট ও সংক্ষেপে** হতে হবে। অপ্রয়োজনীয় বড় লেখা পরিহার করতে হবে।

## Protected Components & Layout Rule (STRICT)
- **UNLOCKED for Upgrade & Redesign**:
  1. **Site Header** (`components/layout/SiteHeader.tsx`) — সম্পূর্ণ আনলকড
  2. **Site Footer** (`components/layout/SiteFooter.tsx` ও সংশ্লিষ্ট ফুটার কম্পোনেন্ট) — সম্পূর্ণ আনলকড
  3. **Mobile Bottom Bar** (`BottomNavigation.tsx`) — সম্পূর্ণ আনলকড
  4. **Floating Chat Button** (`SocialFloatingButtons.tsx`) — সম্পূর্ণ আনলকড
  5. **Home Layout & Global Shell** (`AppShell.tsx`) — সম্পূর্ণ আনলকড
  6. **Cart Drawer** (`CartDrawer.tsx`) — সম্পূর্ণ আনলকড (Universal Offer Engine ও dynamic কুপন ইন্টিগ্রেশনের জন্য)
  7. **Product Page Internal Core** (`app/(storefront)/products/[id]/`) — সম্পূর্ণ আনলকড (OfferSlot ও ইংলিশ ইউনিফিকেশনের জন্য)
  8. **Universal Offer Engine & Promotion Center** — সম্পূর্ণ আনলকড (অ্যাডমিন-নিয়ন্ত্রিত জিরো-হার্ডকোডিং আর্কিটেকচারের জন্য)
- **STILL LOCKED (কোনো প্রকার হাত দেওয়া, এডিট বা পরিবর্তন সম্পূর্ণ নিষিদ্ধ)**:
  1. **Category Rails Nav Bar**
  2. **Product Card (Home Page): Variant Selector Button & Node Connector Popup Modal**
  3. **Shop / Search Page: Product Card Variant Selector Button & Node Connector Popup Modal**
- লক করা এই ৩টি কম্পোনেন্ট ছাড়া বাকি সব কম্পোনেন্ট এখন আপগ্রেডের জন্য উন্মুক্ত।

## Mandatory Mobile UI & Logic Rules
- **Full Width Add to Cart & Variant Selector**: মোবাইল ভিউতে Add to Cart বাটন এবং ভ্যারিয়েন্ট সিলেক্টর সবসময় **Full Width (`w-full`)** হতে হবে।
- **Logic Shift Tracking**: প্রজেক্টের কোনো পূর্ববর্তী লজিক বা ভ্যালিডেশন পরিবর্তন বা মিস হলে তা ফাইনাল রিপোর্টে বিস্তারিতভাবে ব্যবহারকারীকে জানাতে হবে।

## Unified Storefront Modal Design Architecture (Responsive & Standardized)
- **Exclusion (STILL LOCKED)**: প্রোডাক্ট কার্ডের ভ্যারিয়েন্ট সিলেক্টর মোডাল (`Variant Selector Button & Node Connector Popup Modal`) সম্পূর্ণ লকড এবং অপরিবর্তিত থাকবে।
- **Mobile View (Bottom Sheet)**:
  1. মোবাইলে মোডাল নিচ থেকে উঠে আসা প্রিমিয়াম বটম শিট (`max-h-[88dvh] rounded-t-[24px]`) হিসেবে রেন্ডার হবে এবং শীর্ষে গ্র্যাব হ্যান্ডেল বার থাকবে।
  2. একহাতে সহজে ব্যবহারের জন্য ফুল-হাইট না হয়ে স্ক্রিনের নিচের এজে সুন্দরভাবে বসবে।
- **Tablet / Desktop View (Centered Dialog)**:
  1. ট্যাবলেট ও ডেস্কটপে স্ক্রিনের ঠিক মাঝখানে সেন্টারে ভাসবে (`sm:max-w-[520px] sm:max-h-[85dvh] sm:rounded-[24px]`)।
  2. চারপাশে ব্যালেন্সড প্যাডিং (`p-4 sm:p-6 md:p-8`) থাকবে।
- **Universal Rules for All Modals**:
  1. **No Left-Right Scroll**: কোনো মোডালেই কখনো অনুভূমিক স্ক্রলবার থাকবে না (`overflow-x-hidden no-scrollbar`).
  2. **Font & Sizing Hierarchy**: Title `18px`, Body `14px`, Badge/Caption `12px`, এবং মোবাইলে ইনপুট ফিল্ড সবসময় `16px` (সাফারি অটো-জুম প্রিভেনশন)।
  3. **Z-Index Layering**: সব মোডাল `z-[180]` স্ট্যাকে থাকবে (হেডারের `z-100`-এর উপরে এবং টোস্টের `z-[200]`-এর নিচে)।

## Mandatory iPhone & iOS WebKit Compatibility Rules (STRICT)
ভবিষ্যতে যেকোনো নতুন ফিচার, কম্পোনেন্ট বা কোড আপডেট করার সময় আইফোনের জন্য এই নিয়মগুলো কঠোরভাবে মেনে চলতে হবে:
1. **No ES2022 Class Static Properties/Blocks (Syntax Error প্রিভেনশন)**:
   - iOS 15.x – 16.3 WebKit-এ `static { ... }` বা ক্লাস স্ট্যাটিক ইনিশিয়ালাইজার সাপোর্ট করে না। এগুলো থাকলে বান্ডেলে `SyntaxError: Unexpected token '{'` দিয়ে রিঅ্যাক্ট বুট হওয়াই বন্ধ হয়ে যাবে।
   - ক্লাসের ভেতরে কখনো স্ট্যাটিক ফিল্ড ইনিশিয়ালাইজার (`static x = ...`) বা স্ট্যাটিক ব্লক ব্যবহার করা যাবে না; সর্বদা মডিউল-লেভেল ভ্যারিয়েবল (`let` / `const`) অথবা সাধারণ ফাংশন ব্যবহার করতে হবে।
2. **Deterministic SSR Hydration (Error #418 প্রিভেনশন)**:
   - কাউন্টডাউন টাইমার, ফ্ল্যাশ ডিল, ব্যাজ বা অফার এক্সপায়ারেশন লজিকে সরাসরি রেন্ডারের ভেতরে `Date.now()` বা নন-ডিটারমিনিস্টিক টাইম চেক নিষিদ্ধ।
   - সার্ভার (Node.js) এবং ক্লায়েন্ট (আইফোন)-এর প্রাথমিক রেন্ডার যাতে হুবহু একই থাকে, তার জন্য সর্বদা `const [mounted, setMounted] = useState(false)` প্যাটার্ন ব্যবহার করতে হবে। মাউন্ট হওয়ার আগ পর্যন্ত একই স্ট্যাটিক প্লেসহোল্ডার রেন্ডার করতে হবে।
3. **Preserve Browserslist & Transpilation**:
   - `package.json`-এ `"browserslist": ["ios_saf >= 14", ...]` সবসময় বজায় রাখতে হবে, কোনো অবস্থাতেই সরানো যাবে না।
   - নতুন কোনো এক্সটার্নাল প্যাকেজ যোগ করলে তা পুরনো WebKit সাপোর্ট করে কি না যাচাই করতে হবে এবং প্রয়োজনে `next.config.ts`-এ `transpilePackages`-এ অন্তর্ভুক্ত করতে হবে।
4. **Touch & Tap Safety**:
   - স্ক্রিনের ওপরে কোনো স্থায়ী বা অদৃশ্য ওভারলে (`fixed`, উচ্চ `z-index`) রাখা যাবে না যা আইফোনের হেডার, সার্চবার বা মোডাল বাটন ট্যাপ আটকে দেয়।
   - মোবাইল ইন্টারঅ্যাকশনে `touch-action: manipulation` বজায় রাখতে হবে যাতে ডাবল-ট্যাপ ডিলে ছাড়া দ্রুত রেসপন্স করে।

## Mandatory Audit, Planning & Goal Execution Rules (STRICT)
1. **Audit Mode (No-Code First)**:
   - ব্যবহারকারী "Audit করো" বা "Audit" নির্দেশ দিলে কোনো অবস্থাতেই কোড পরিবর্তন বা ফাইল এডিট করা যাবে না।
   - অডিটের সমস্ত ফলাফল পরিষ্কার **টেবিল আকারে (Table Format)** সাজিয়ে রিপোর্ট দিতে হবে।
   - একই সাথে সমস্যাগুলো সমাধানের জন্য একটি সুনির্দিষ্ট **ফেজভিত্তিক বাস্তবায়ন পরিকল্পনা (Phase Plan)** উপস্থাপন করতে হবে।
2. **Audit Autonomous Screening Permission**:
   - অডিট ও ইনস্পেকশন চলাকালীন ফাইল রিড, সার্চ বা সিস্টেম যাচাইয়ের জন্য সম্পূর্ণ অনুমতি কার্যকর থাকবে; কোনো পারমিশন চেয়ে সময় নষ্ট করা যাবে না।
3. **Phase Structure (Audit, Test, Fix)**:
   - প্রতিটি ফেজের পরিকল্পনায় বাধ্যতামূলকভাবে ৩টি স্পষ্ট ধাপ অন্তর্ভুক্ত থাকতে হবে: **Audit (কী পাওয়া গেল), Test (কীভাবে পরীক্ষা হবে), এবং Fix (কী কী কোড পরিবর্তন হবে)**।
4. **10+ Phases & /goal Command Prompting**:
   - কাজের পরিধি যদি ১০টি বা তার অধিক ফেজের হয়, তবে ব্যবহারকারীকে একটি স্বয়ংসম্পূর্ণ `/goal` কমান্ড টেক্সট তৈরি করার অপশন অফার করতে হবে।
5. **Comprehensive Goal Scope**:
   - জেনারেট করা `/goal` কমান্ডের টেক্সটে প্রতিটি ফেজের পুঙ্খানুপুঙ্খ বিবরণ স্পষ্টভাবে সন্নিবেশিত থাকতে হবে।
6. **Zero-Interruption Full Autonomy in /goal**:
   - `/goal` টেক্সটে কোড এডিট, টেস্ট এক্সিকিউশন, গিট কমিট ও পুশের **আগাম পূর্ণ স্বায়ত্তশাসিত অনুমতি (Pre-approved autonomous permission)** যুক্ত থাকবে—যাতে গোল চলাকালীন একবারের জন্যও ব্যবহারকারীর অনুমতির অপেক্ষা না করে সম্পূর্ণ কাজ শেষ করে চূড়ান্ত রিপোর্ট দেওয়া হয়।
7. **Problem-First Root Cause Resolution (শুধু কোড নয়, মূল সমস্যার শতভাগ সমাধান)**:
   - গোলের মূল লক্ষ্য কেবল কোড এডিট বা শর্টকাট প্যাচ দেওয়া নয়; ব্যবহারকারী যে সমস্যার কথা জানিয়েছেন তার মূল কারণ (Root Cause) চিহ্নিত করে তা সম্পূর্ণ নির্মূল করতে হবে।
8. **Continuous Closed-Loop Process (Audit ➔ Test ➔ Review ➔ Fix ➔ Re-Audit Loop)**:
   - গোলের পুরো কাজ একটি নিরবচ্ছিন্ন ক্লোজড-লুপে চলবে:
     `[Audit ➔ Test ➔ Review ➔ Fix ➔ Re-Audit ➔ Re-Test ➔ Re-Review]`
   - প্রতিটি পরিবর্তনের পর পুনরায় অডিট ও টেস্ট চালিয়ে ১০০% নিশ্চিত হতে হবে যে মূল সমস্যাটি মিটেছে এবং অন্য কোথাও কোনো নতুন ত্রুটি বা রিগ্রেশন তৈরি হয়নি।



