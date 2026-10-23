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
- **STILL LOCKED (কোনো প্রকার হাত দেওয়া, এডিট বা পরিবর্তন সম্পূর্ণ নিষিদ্ধ)**:
  1. **Category Rails Nav Bar**
  2. **Cart Drawer** (`CartDrawer.tsx`)
  3. **Product Card (Home Page): Variant Selector Button & Node Connector Popup Modal**
  4. **Shop / Search Page: Product Card Variant Selector Button & Node Connector Popup Modal**
  5. **Product Page Internal Core** (`app/(storefront)/products/[id]/` — ইমেজ গ্যালারি, ভ্যারিয়েন্ট সিলেক্টর, প্রাইসিং, অ্যাড-টু-কার্ট, ডিটেইলস ও স্পেসিফিকেশন সম্পূর্ণ লকড; শুধুমাত্র শেয়ার্ড সাইট হেডার, ফুটার ও মোবাইল বটম বার আনলকড)
  6. **Offer Engine & Calculation Logic** (টোটাল লকড — স্টিচের কোনো ডামি অফার যুক্ত করা যাবে না; মিনসাহ বিউটির নিজস্ব অফার ইঞ্জিন অপরিবর্তিত থাকবে)
- লক করা এই কম্পোনেন্টগুলো সম্পূর্ণ অপরিবর্তিত এবং সুরক্ষিত থাকবে।

## Mandatory Mobile UI & Logic Rules
- **Full Width Add to Cart & Variant Selector**: মোবাইল ভিউতে Add to Cart বাটন এবং ভ্যারিয়েন্ট সিলেক্টর সবসময় **Full Width (`w-full`)** হতে হবে।
- **Logic Shift Tracking**: প্রজেক্টের কোনো পূর্ববর্তী লজিক বা ভ্যালিডেশন পরিবর্তন বা মিস হলে তা ফাইনাল রিপোর্টে বিস্তারিতভাবে ব্যবহারকারীকে জানাতে হবে।

## Strict Popup Modal Spacing & Centering Rule (STRICT)
- **Exclusion (STILL LOCKED)**: প্রোডাক্ট কার্ডের ভ্যারিয়েন্ট সিলেক্টর মোডাল (`Variant Selector Button & Node Connector Popup Modal`) সম্পূর্ণ লকড এবং অপরিবর্তিত থাকবে।
- **All Other Popup Modals (Mandatory 4-Sided Space & Centering)**:
  1. **Top Space**: মোডাল কখনো সাইট হেডার বা স্ক্রিনের টপ এজে লেগে থাকবে না; উপরে সুস্পষ্ট ব্যালেন্সড ফাঁকা জায়গা (যেমন `p-4 sm:p-6 md:p-8`) থাকবে।
  2. **Bottom Space**: স্ক্রিনের নিচের বর্ডারে ঠেকে যাবে না; নিচেও সমপরিমাণ মার্জিন থাকবে।
  3. **Left & Right Space**: দুই পাশে পর্যাপ্ত ফাঁকা জায়গা বজায় রেখে স্ক্রিনের ঠিক মাঝখানে সেন্টারে ভাসবে।
  4. **Compact Dimensions**: স্ক্রিন জুড়ে ফুল-হাইট না হয়ে একটি সুন্দর কম্প্যাক্ট প্রিমিয়াম কার্ডের মতো দেখাবে (যেমন `max-h-[min(85vh, 620px)]` ও `w-full max-w-[...]`).
  5. **No Left-Right Scroll**: কোনো মোডালেই কখনো লেফট-রাইট / অনুভূমিক স্ক্রলবার থাকবে না (`overflow-x-hidden no-scrollbar`).


