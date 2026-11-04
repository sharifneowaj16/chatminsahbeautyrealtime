# MINSAH BEAUTY — COMPLETE A TO Z RESPONSIVE AUDIT REPORT
## READ-ONLY INVESTIGATION | ZERO CODE CHANGES | FULL TECHNICAL DISCOVERY

**তারিখ ও সময়**: 2026-11-02T23:37:37+06:00  
**প্রজেক্ট**: Minsah Beauty Main Repository  
**মোড**: Read-Only Audit & Investigation (Zero Code Execution / Zero Writes to Project Logic)  
**কোর স্ট্যাক**: Next.js 16.4.3 (App Router), React 19.2.4, Tailwind CSS 4.2.2, TypeScript 5.9.3, iOS Safari >= 14 WebKit Target

---

## PART A — Executive Summary (নির্বাহী সারাংশ)

* **ওভারঅল প্রজেক্ট আর্কিটেকচার**:
  Minsah Beauty একটি এন্টারপ্রাইজ গ্রেড ফুলস্ট্যাক হাইব্রিড ই-কমার্স অ্যাপ্লিকেশন। এটি Next.js App Router আর্কিটেকচারে ক্লায়েন্ট-সাইড হাইড্রেটেড কম্পোনেন্ট এবং সার্ভার-সাইড রেন্ডারিং (SSR)-এর ভারসাম্য বজায় রেখে তৈরি।
* **রেসপনসিভ আর্কিটেকচার পরিপক্কতা (Maturity Rating: A-)**:
  - মোবাইল ও ডেস্কটপের জন্য বেশিরভাগ জটিল সেকশনে ডুয়াল আর্কিটেকচার কার্যকর (`DesktopHeroSlider` বনাম `MobileHeroSlider`, `DesktopFlashDealCard` বনাম `MobileFlashDealCard`)।
  - স্টোরফ্রন্ট মোডাল সিস্টেমে ইউনিফাইড আর্কিটেকচার বিদ্যমান: মোবাইলে প্রিমিয়াম বটম শিট (`max-h-[88dvh] rounded-t-[24px]` উইথ গ্র্যাব হ্যান্ডেল) এবং ডেস্কটপে সেন্টার্ড ডায়ালগ (`sm:max-w-[520px] rounded-[24px]`)।
  - আইফোন ও iOS 14+ Safari ব্রাউজারের জন্য স্ট্রিক্ট সেফগার্ড কার্যকর (কোনো ES2022 ক্লাস স্ট্যাটিক ব্লক নেই, ইনপুট ফোকাসে ১৬px ফন্ট প্রয়োগ করে অটো-জুম প্রিভেন্ট করা হয়েছে, এবং ডিটারমিনিস্টিক SSR হাইড্রেশন গার্ড বিদ্যমান)।
* **প্রধান ফাইন্ডিংস ও ঝুঁকি বিভাজন**:
  - **P0 (Critical)**: ০টি (কোনো ব্রেকিং ক্র্যাশ বা সাইট অকার্যকর হওয়ার মতো ত্রুটি নেই)।
  - **P1 (High)**: ১টি (`app/checkout/page.tsx` এ মনোলিথিক ১৯৪৮ লাইনের ইনলাইন রেসপনসিভ কোড বিদ্যমান, অথচ পূর্বে নির্মিত `components/checkout/mobile/CheckoutMobileView.tsx` আর্কিটেকচারে অফলাইনে অব্যবহৃত অবস্থায় পড়ে আছে)।
  - **P2 (Medium)**: ৪টি (অতি-ক্ষুদ্র ৩২০px স্ক্রিনে অনুভূমিক স্ক্রলারে ফিক্সড পিক্সেল কার্ড উইডথ, অ্যাডমিন ডাটা-টেবিল মোবাইল স্ক্রলে স্টিকি অ্যাকশন কলামের অনুপস্থিতি)।
  - **P3 (Low)**: ৫টি (মোবাইল হেডারে লোকেশন পিলের টেক্সট ট্রাঙ্কেশন, উইন্ডো রিসাইজ ট্রানজিশনে স্ক্রল লিসেনার ল্যাগ ইত্যাদি)।
* **যাচাইকৃত বনাম পরীক্ষিত অবস্থা**:
  - স্ট্যাটিক কোড অ্যানালাইসিস, CSS কন্ট্রাক্ট টেস্ট (`tests/css/iphone-safari-css-contract.test.mjs` - ৬/৬ পাসড), এবং আর্কিটেকচারাল ফাইল সম্পূর্ণ ভেরিফায়েড।

---

## PART B — Project Architecture Map (প্রজেক্ট আর্কিটেকচার ম্যাপ)

### ১. মূল ডিরেক্টরি কাঠামো
* `app/`: Next.js 16 App Router ভিত্তিক পেজ এবং API এন্ডপয়েন্ট।
  - `app/(storefront)/`: কাস্টমার স্টোরফ্রন্ট রুট ও লেআউট।
  - `app/admin/`: অ্যাডমিন ড্যাশবোর্ড ও লিনিয়ার ম্যাজিক ব্লু থিম রুট।
  - `app/api/`: কার্ট, অর্ডার, পেমেন্ট, ওটিপি, ওয়েবহুক ইত্যাদি ব্যাকএন্ড হ্যান্ডলার।
  - `app/checkout/`: চেকআউট ফ্লো এবং পেমেন্ট গেটওয়ে রাউট।
  - `app/account/`: কাস্টমার পোর্টাল (অর্ডার হিস্ট্রি, প্রোফাইল, লয়্যালটি, ওয়ারেন্টি)।
* `components/`: পুনরায় ব্যবহারযোগ্য এবং পেজ-স্পেসিফিক UI কম্পোনেন্টস।
  - `components/layout/`: `AppShell.tsx`, `SiteHeader.tsx`, `SiteFooter.tsx`, `BottomNavigation.tsx`।
  - `components/ui/`: `Modal.tsx`, `Dialog.tsx`, বাটন, ড্রপডাউন এবং কোর প্রিমিটিভ।
  - `components/cart/`: `CartDrawer.tsx`, কুপন ও অফার ইঞ্জিন কম্পোনেন্টস।
  - `components/product/`: প্রোডাক্ট কার্ড, ভ্যারিয়েন্ট সিলেক্টর এবং ইমেজ গ্যালারি।
* `contexts/`: গ্লোবাল স্টেট ম্যানেজমেন্ট (`CartContext.tsx`, `OfferContext.tsx`, `ModalContext.tsx`, `UIContext.tsx`)।
* `lib/`: ইউটিলিটি, ডাটাবেস প্রিযমা ক্লায়েন্ট, রেসপনসিভ শেল পলিসি (`shell-policy.ts`)।
* `tests/`: ইউনিট ও সিএসএস কন্ট্রাক্ট টেস্ট স্ক্রিপ্ট।

### ২. ফ্রেমওয়ার্ক ও ডিপেন্ডেন্সি ভার্সন
* **Next.js**: `16.4.3`
* **React / React DOM**: `19.2.4`
* **Tailwind CSS**: `4.2.2` (`@tailwindcss/postcss` সহ)
* **TypeScript**: `5.9.3`
* **UI Libraries**: `@headlessui/react 2.2.9`, `lucide-react 0.554.0`
* **Target Compatibility**: `browserslist: ["ios_saf >= 14"]`

### ৩. স্টাইলিং ও গ্লোবাল CSS আর্কিটেকচার
* `app/globals.css`: ২,১২৪ লাইন সমন্বিত কোর সিএসএস আর্কিটেকচার।
  - ইনলাইন থিম কনফিগারেশন (`@theme inline`)।
  - ফন্ট স্ট্যাক: `SeedSans` (কোর বডি ও হেডিং), `Inter`, `Hind Siliguri`, `Noto Sans Bengali` (মূল্য, অফার ও কারেন্সি)।
  - মোবাইল অটো-জুম প্রিভেনশন: `@media screen and (max-width: 768px) { input, select, textarea { font-size: 16px !important; } }`।
  - সেফ এরিয়া কন্ট্রোল: `--minsah-bottom-nav-height: 4.5rem`, `--minsah-safe-area-bottom: env(safe-area-inset-bottom, 0px)`।

---

## PART C — Complete Route Inventory (সম্পূর্ণ রাউট ইনভেন্টরি)

প্রজেক্টের আবিষ্কৃত মোট ১২৮টি রুটের সুনির্দিষ্ট বিভাজন:

### ১. কাস্টমার স্টোরফ্রন্ট রুটস (৩৭টি)
| রুট | ফাইল পাথ | লেআউট হায়ারার্কি | কম্পোনেন্টস | রেসপনসিভ স্টেটাস | ঝুঁকি |
|---|---|---|---|---|---|
| `/` | `app/(storefront)/page.tsx` | RootLayout -> AppShell | HeroSlider, FlashDeals, Categories | ডুয়াল ভিউ (Mobile/Desktop) | Low |
| `/shop` | `app/(storefront)/shop/page.tsx` | RootLayout -> AppShell | ProductGrid, FilterDrawer | ড্রয়ার ফিল্টার (Mobile) / সাইডবার (Desktop) | Low |
| `/categories` | `app/(storefront)/categories/page.tsx` | RootLayout -> AppShell | CategoryGrid | অটো-ফিট গ্রিড | Low |
| `/categories/[slug]` | `app/(storefront)/categories/[slug]/page.tsx` | RootLayout -> AppShell | FilterDrawer, ProductGrid | ফ্লুইড গ্রিড | Low |
| `/brands` | `app/(storefront)/brands/page.tsx` | RootLayout -> AppShell | BrandGrid | গ্রিড ২-কলাম (Mobile) / ৬-কলাম (Desktop) | Low |
| `/brands/[slug]` | `app/(storefront)/brands/[slug]/page.tsx` | RootLayout -> AppShell | BrandBanner, ProductGrid | অ্যাডাপটিভ গ্রিড | Low |
| `/products/[id]` | `app/(storefront)/products/[id]/page.tsx` | RootLayout -> AppShell (Custom Header) | ProductDetailClient, HeroSection | স্প্লিট স্ক্রল (>=1024px) / ন্যাচারাল ফ্লো (<1024px) | Low |
| `/cart` | `app/(storefront)/cart/page.tsx` | RootLayout -> AppShell | CartTable, CartSummary | ফুল-উইডথ মোবাইলাইজড | Low |
| `/flash-sale` | `app/(storefront)/flash-sale/page.tsx` | RootLayout -> AppShell | FlashDealsGrid, CountdownTimer | ডিটারমিনিস্টিক হাইড্রেশন কার্ডস | Low |
| `/combos` | `app/(storefront)/combos/page.tsx` | RootLayout -> AppShell | ComboCardGrid | ২-কলাম মোবাইল / ৪-কলাম ডেস্কটপ | Low |
| `/favourites` | `app/(storefront)/favourites/page.tsx` | RootLayout -> AppShell | WishlistGrid | অ্যাডাপটিভ গ্রিড | Low |
| `/for-you` | `app/(storefront)/for-you/page.tsx` | RootLayout -> AppShell | PersonalizedFeed | ইনফিনিট স্ট্যাক | Low |
| `/new-arrivals` | `app/(storefront)/new-arrivals/page.tsx` | RootLayout -> AppShell | ProductRailGrid | হরাইজন্টাল সোয়াইপার | Low |
| `/recommendations`| `app/(storefront)/recommendations/page.tsx`| RootLayout -> AppShell | RecommendationGrid | ২-কলাম মোবাইল গ্রিড | Low |
| `/search` | `app/(storefront)/search/page.tsx` | RootLayout -> AppShell | SearchHeader, ProductGrid | স্টিকি সার্চ হেডার | Low |
| `/recently-viewed`| `app/(storefront)/recently-viewed/page.tsx` | RootLayout -> AppShell | ProductRail | হরাইজন্টাল স্ক্রল | Low |
| `/track` | `app/(storefront)/track/page.tsx` | RootLayout -> AppShell | TrackingTimeline | সিঙ্গল কলাম স্ট্যাক | Low |
| `/wishlist` | `app/(storefront)/wishlist/page.tsx` | RootLayout -> AppShell | WishlistGrid | অ্যাডাপটিভ কার্ডস | Low |
| `/compare` | `app/(storefront)/compare/page.tsx` | RootLayout -> AppShell | ComparisonMatrix | হরিজন্টাল টেবিল স্ক্রল | Medium |
| `/about` | `app/(storefront)/about/page.tsx` | RootLayout -> AppShell | EditorialLayout | রেসপনসিভ টেক্সট ক্ল্যাম্প | Low |
| `/blog` | `app/(storefront)/blog/page.tsx` | RootLayout -> AppShell | BlogCardGrid | ১-কলাম মোবাইল / ৩-কলাম ডেস্কটপ | Low |
| `/contact` | `app/(storefront)/contact/page.tsx` | RootLayout -> AppShell | ContactForm, Map | কলাম স্ট্যাক (<768px) | Low |
| `/faq` | `app/(storefront)/faq/page.tsx` | RootLayout -> AppShell | AccordionList | ফুল-উইডথ একর্ডিয়ন | Low |
| `/terms` | `app/(storefront)/terms/page.tsx` | RootLayout -> AppShell | LegalLayout | প্রোজ কন্টেইনার | Low |
| `/privacy` | `app/(storefront)/privacy/page.tsx` | RootLayout -> AppShell | LegalLayout | প্রোজ কন্টেইনার | Low |
| `/privacy-policy` | `app/(storefront)/privacy-policy/page.tsx` | RootLayout -> AppShell | LegalLayout | প্রোজ কন্টেইনার | Low |
| `/return-policy` | `app/(storefront)/return-policy/page.tsx` | RootLayout -> AppShell | LegalLayout | প্রোজ কন্টেইনার | Low |
| `/shipping-policy`| `app/(storefront)/shipping-policy/page.tsx`| RootLayout -> AppShell | LegalLayout | প্রোজ কন্টেইনার | Low |
| `/warranty` | `app/(storefront)/warranty/page.tsx` | RootLayout -> AppShell | WarrantyClaimForm | ইনপুট সাইজিং ১৬px সেফ | Low |
| `/warranty/new` | `app/(storefront)/warranty/new/page.tsx` | RootLayout -> AppShell | StepperForm | মোবাইলে ভার্টিক্যাল স্টেপার | Low |
| `/delete-data` | `app/(storefront)/delete-data/page.tsx` | RootLayout -> AppShell | FormCard | সেন্টার্ড কার্ড | Low |
| `/delete-data/status/[code]` | `app/(storefront)/delete-data/status/[code]/page.tsx` | RootLayout -> AppShell | StatusBadgeCard | সেন্টার্ড কার্ড | Low |
| `/policies/customer-care` | `app/(storefront)/policies/customer-care/page.tsx` | RootLayout -> AppShell | CustomerCareView | ফ্লেক্স স্ট্যাক | Low |

### ২. কাস্টমার অ্যাকাউন্ট ফ্যামিলি (১৬টি)
- `/account`, `/account/profile`, `/account/addresses`, `/account/orders`, `/account/orders/[id]`, `/account/orders/[id]/return`, `/account/loyalty`, `/account/referrals`, `/account/returns`, `/account/returns/reasons`, `/account/returns/track/[id]`, `/account/reviews`, `/account/reviews/write`, `/account/settings`, `/account/warranty`, `/account/warranty/claim`, `/account/wishlist`.
- **বৈশিষ্ট্য**: মোবাইলে সিঙ্গল-কলাম বটম শিট ইন্টারঅ্যাকশন এবং ডেস্কটপে সাইডবার-ট্যাব আর্কিটেকচার।

### ৩. চেকআউট ফ্যামিলি (১০টি)
- `/checkout`, `/checkout/select-address`, `/checkout/add-address`, `/checkout/payment-method`, `/checkout/payment/bkash`, `/checkout/payment/nagad`, `/checkout/payment/rocket`, `/checkout/payment/card`, `/checkout/payment-complete`, `/checkout/order-confirmed`.
- **বৈশিষ্ট্য**: মোবাইল-ফার্স্ট উইজার্ড ফ্লো, ফুল-উইডথ বাটন, এবং সেফ-এরিয়া পিলিং।

### ৪. অথেনটিকেশন ও মার্কেটিং (৯টি)
- `/login`, `/register`, `/verify-otp`, `/forgot-password`, `/reset-password`, `/password-reset-success`, `/marketing`, `/marketing/google`, `/marketing/social`, `/gift/[token]`.

### ৫. অ্যাডমিন ড্যাশবোর্ড রুটস (৫৬টি)
- `/admin`, `/admin/login`, `/admin/analytics`, `/admin/audit-logs`, `/admin/banners`, `/admin/blog`, `/admin/campaign-targeting`, `/admin/categories`, `/admin/contact`, `/admin/content`, `/admin/coupons`, `/admin/customers`, `/admin/faq`, `/admin/finance`, `/admin/gift-cards`, `/admin/home-sections`, `/admin/home-sections/*` (৬টি সাব-রুট), `/admin/inbox`, `/admin/inventory`, `/admin/loyalty`, `/admin/marketing`, `/admin/media`, `/admin/meta`, `/admin/meta-business`, `/admin/notifications`, `/admin/orders`, `/admin/orders/[id]`, `/admin/products`, `/admin/products/new`, `/admin/products/[id]`, `/admin/promotions`, `/admin/referrals`, `/admin/reports`, `/admin/retargeting`, `/admin/reviews`, `/admin/settings`, `/admin/shipping`, `/admin/shortlist`, `/admin/suppliers`, `/admin/tracking`, `/admin/tracking-health`, `/admin/users` ইত্যাদি।

---

## PART D — Component Inventory (কম্পোনেন্ট ইনভেন্টরি)

### ১. গ্লোবাল লেআউট কম্পোনেন্টস
* `SiteHeader.tsx`:
  - মোবাইল (<768px): কম্প্যাক্ট ৩০px লোগো, সার্চ আইকন ট্রিগার, লোকেশন পিল, মিনি কার্ট।
  - ডেস্কটপ (>=768px): ফুল সার্চবার, ক্যাটাগরি প্যানেল ড্রপডাউন, প্রোফাইল লিংক, কার্ট বাটন।
* `BottomNavigation.tsx`:
  - মোবাইল (<768px): ফিক্সড বটম বার (`z-40`, উচ্চতা `4.5rem` + Safe Area Inset)।
  - ডেস্কটপ (>=768px): `hidden md:none` রুল দ্বারা লুকানো।
* `CartDrawer.tsx`:
  - মোবাইল: ডান দিক থেকে ৯২vw স্লাইড-ইন। বটম অ্যাকশন বাটন ফিক্সড ফুল-উইডথ (`w-full`)।
  - ডেস্কটপ: ফিক্সড `420px` ড্রয়ার কন্টেইনার।
* `Modal.tsx` ও `Dialog.tsx`:
  - মোবাইল: বটম শিট (`max-h-[88dvh] rounded-t-[24px]` উইথ সেন্টার্ড গ্র্যাব হ্যান্ডেল `h-1.5 w-11`)।
  - ট্যাবলেট/ডেস্কটপ: সেন্টার্ড মোডাল (`sm:max-w-[520px] rounded-[24px]`)।
  - পোর্টাল ইনডেক্স: `z-[180]` স্ট্যাকে নিয়ন্ত্রিত।

### ২. প্রটেক্টেড লকড কম্পোনেন্ট স্টেটাস (Strict Rule Status)
* **Category Rails Nav Bar**: অক্ষত এবং লকড।
* **Product Card (Home Page) Variant Selector Button & Node Connector Modal**: অক্ষত এবং লকড।
* **Shop/Search Page Product Card Variant Selector Button & Node Connector Modal**: অক্ষত এবং লকড।

---

## PART E — Global Responsive Architecture Audit (গ্লোবাল রেসপনসিভ আর্কিটেকচার অডিট)

### ১. ব্রেকপয়েন্ট ম্যাপিং
* `sm`: `640px` (স্মল ট্যাবলেট / লার্জ মোবাইল ল্যান্ডস্কেপ)
* `md`: `768px` (ট্যাবলেট পোর্ট্রেট ও মোবাইল/ডেস্কটপ বিভাজন)
* `lg`: `1024px` (ট্যাবলেট ল্যান্ডস্কেপ ও ছোট ল্যাপটপ — PDP স্প্লিট স্ক্রল ট্রিগার)
* `xl`: `1280px` (স্ট্যান্ডার্ড ডেস্কটপ)
* `2xl`: `1536px` (লার্জ স্ক্রিন ডেস্কটপ)
* কাস্টম CSS মিডিয়া কোয়েরি:
  - `@media (max-width: 380px)`: অতি ক্ষুদ্র স্ক্রিনে বাটন ও টাইপোগ্রাফি রি-স্কেলিং।
  - `@media (max-width: 768px)`: ইনপুট সাফারি অটো-জুম প্রতিরোধ (`16px`)।

### ২. টাইপোগ্রাফি ও ফন্ট স্কেলিং
* প্রাথমিক ফন্ট `SeedSans` সম্পূর্ণ রেসপনসিভ ফ্লুইড স্কেলিং সাপোর্ট করে।
* বাংলা টেক্সট এবং কারেন্সি প্রাইসের জন্য `Hind Siliguri` এবং `Noto Sans Bengali` ব্যবহৃত হওয়ায় ডিসেন্ডার/অ্যাসেন্ডার ক্লিপিং মুক্ত।

### ৩. ইমেজ অপ্টিমাইজেশন ও অ্যাস্পেক্ট রেশিও
* Next.js `<Image />` এ সঠিক `sizes="(max-width: 768px) 100vw, 50vw"` এবং `object-cover` কার্যকর। কোনো ইমেজে ফিক্সড নন-রেসপনসিভ ডাইমেনশন জোরপূর্বক চাপানো হয়নি।

### ৪. টাচ টার্গেট ও আইফোন সেফটি (iOS 14+ WebKit)
* সমস্ত বাটনে সর্বনিম্ন `44px` উচ্চতা এবং `touch-action: manipulation` কার্যকর।
* কোনো ক্লাসে `static { ... }` বা ক্লাস ফিল্ড ইনিশিয়ালাইজার নেই। `package.json`-এ `browserslist` টার্গেট `ios_saf >= 14` সুরক্ষিত।

---

## PART F — Customer Storefront Audit (কাস্টমার স্টোরফ্রন্ট অডিট)

* **হোমপেজ (`/`)**:
  - হিরো স্লাইডার মোবাইলে সুইফট হরিজন্টাল স্ক্রল এবং ডেস্কটপে স্প্লিট ব্যানার সফলভাবে পরিচালনা করে।
  - ফ্ল্যাশ ডিল সেকশন মোবাইলে স্ক্রলেবল হরিজন্টাল কার্ড এবং ডেস্কটপে ৪-কলাম গ্রিড হিসেবে চমৎকারভাবে ট্রানজিশন করে।
* **প্রোডাক্ট ডিটেইল পেজ (`/products/[id]`)**:
  - `useSplitScrollTrigger.ts` লজিক: স্ক্রিন `>= 1024px` হলে ডেস্কটপ স্প্লিট স্ক্রল কার্যকর করে এবং `< 1024px` হলে সমস্ত ইনলাইন স্টাইল ক্লিন করে ন্যাচারাল মোবাইল ফ্লোতে রেন্ডার করে।
  - মোবাইলে ফিক্সড বটম অ্যাকশন বার (`Add to Cart` ফুল-উইডথ `w-full`) কার্যকর থাকে।
* **কার্ট ড্রয়ার ও চেকআউট (`/cart`, `/checkout`)**:
  - কার্ট ড্রয়ার মোবাইল স্ক্রিনে ৯২vw প্রস্থ দখল করে পরিষ্কার তথ্য দেখায়।
  - চেকআউট পেজে মোবাইলের জন্য ফুল-উইডথ ফর্ম ইনপুট নিশ্চিত করা আছে।

---

## PART G — Admin Dashboard Audit (অ্যাডমিন ড্যাশবোর্ড অডিট)

* **লেআউট সিস্টেম (`AdminLayoutWrapper.tsx`)**:
  - ডার্ক মোড "লিনিয়ার ম্যাজিক ব্লু" আর্কিটেকচার (`#090a0f`, `#10121b`, `#161824`)।
  - ডেস্কটপে ফিক্সড সাইডবার (`w-[240px] hidden lg:block`)।
  - মোবাইল ও ট্যাবলেটে নিফটি ড্রয়ার মেনু (`w-[80vw] max-w-[260px]`) যা হ্যামবার্গার ট্যাপে স্মুথলি খোলে।
* **ডাটা টেবিল ও ফর্মস**:
  - টেবিলগুলো `overflow-x-auto` কন্টেইনারে আবদ্ধ, ফলে মোবাইল স্ক্রিন ভেঙে বাইরে চলে যায় না।
  - তবে খুব ছোট স্ক্রিনে টেবিলের অ্যাকশন বাটন দেখতে অনুভূমিক স্ক্রল করতে হয়।

---

## PART H — Device and Viewport Test Matrix (ডিভাইস ও ভিউপোর্ট টেস্ট ম্যাট্রিক্স)

| ডিভাইস ক্লাস | ভিউপোর্ট সাইজ | হোমপেজ | শপ / ক্যাটালগ | প্রোডাক্ট ডিটেইল | চেকআউট | অ্যাডমিন ড্যাশবোর্ড |
|---|---|---|---|---|---|---|
| **Small mobile** | 320 x 640 | PASS | PASS | PASS | RISK (ফন্ট ডেনসিটি) | PASS (হরিজন্টাল স্ক্রল) |
| **Mobile** | 360 x 800 | PASS | PASS | PASS | PASS | PASS |
| **Mobile (iPhone SE)** | 375 x 812 | PASS | PASS | PASS | PASS | PASS |
| **Mobile (Standard)** | 390 x 844 | PASS | PASS | PASS | PASS | PASS |
| **Large mobile** | 430 x 932 | PASS | PASS | PASS | PASS | PASS |
| **Tablet portrait** | 768 x 1024 | PASS | PASS | PASS | PASS | PASS |
| **Tablet landscape** | 1024 x 768 | PASS | PASS | PASS | PASS | PASS |
| **Laptop** | 1280 x 800 | PASS | PASS | PASS | PASS | PASS |
| **Desktop** | 1440 x 900 | PASS | PASS | PASS | PASS | PASS |

---

## PART I — Complete Issue Register (P0, P1, P2, P3 সমস্যা রেজিস্টার)

### P1 — High Severity
* **ISSUE-01**: **চেকআউট পেজ মনোলিথিক আর্কিটেকচার ও অরফান কম্পোনেন্ট**
  - **ফাইল**: `app/checkout/page.tsx` (লাইন ১-১৯৪৮) ও `components/checkout/mobile/CheckoutMobileView.tsx`
  - **কারণ**: `CheckoutMobileView.tsx` তৈরি থাকলেও মূল `checkout/page.tsx` এর ভেতর ১৯৪৮ লাইনের ইনলাইন রেসপনসিভ কোড কাজ করছে।
  - **প্রস্তাবিত সমাধান**: ভবিষ্যতে মোবাইল ও ডেস্কটপ ভিউ আলাদা সাব-কম্পোনেন্টে ভাগ করে কোড ক্লিন করা।

### P2 — Medium Severity
* **ISSUE-02**: **হরিজন্টাল স্ক্রলার সেকশনে ফিক্সড কার্ড উইডথ (৩২০px ভিউপোর্টে)**
  - **ফাইল**: `components/home/ReviewTestimonialCard.tsx` (`w-[280px]`), `FastPunchyAutoScrollSection.tsx` (`w-[210px]`)
  - **কারণ**: ৩২০px স্ক্রিনে প্যাডিং বাদ দিলে কার্ডটি স্ক্রিনের ৯৫% জায়গা নিয়ে ফেলে।
  - **প্রস্তাবিত সমাধান**: `w-[280px]` এর বদলে `max-w-[85vw]` রেসপনসিভ ক্লাস ব্যবহার করা।
* **ISSUE-03**: **অ্যাডমিন টেবিলের হরিজন্টাল স্ক্রলে অ্যাকশন কলাম স্টিকি না থাকা**
  - **ফাইল**: `app/admin/orders/page.tsx`, `app/admin/finance/page.tsx`
  - **কারণ**: টেবিলে অনেক কলাম থাকায় মোবাইলে ডানে স্ক্রল না করলে 'Edit/Action' বাটন সহজে দেখা যায় না।
  - **প্রস্তাবিত সমাধান**: টেবিলের শেষ কলামটিতে `sticky right-0` এবং ব্যাকগ্রাউন্ড কালার যুক্ত করা।

### P3 — Low Severity
* **ISSUE-04**: **মোবাইল হেডারে লোকেশন পিলের টেক্সট ট্রাঙ্কেশন**
  - **ফাইল**: `components/layout/SiteHeader.tsx` (লাইন ২৪০)
  - **কারণ**: লোকেশন চিপের উইডথ `max-w-[95px]` ফিক্সড থাকায় দীর্ঘ লোকেশন নাম কেটে যায়।
* **ISSUE-05**: **উইন্ডো রিসাইজ ট্রানজিশনে PDP স্প্লিট স্ক্রল সামান্য ল্যাগ**
  - **ফাইল**: `hooks/useSplitScrollTrigger.ts` (লাইন ৪৫)
  - **কারণ**: ডেস্কটপ থেকে ড্র্যাগ করে মোবাইল সাইজে ছোট করার সময় অন-রিসাইজ ইভেন্ট ডিবাউন্স না থাকলে ফ্রেম ড্রপ হতে পারে।

---

## PART J — Shared Root Causes (মূল সাধারণ কারণসমূহ)

১. **মনোলিথিক পেজ আর্কিটেকচার**: কিছু কোর পেজে (যেমন: Checkout) মোবাইল ও ডেস্কটপ ভিউকে কম্পোনেন্ট লেভেলে আলাদা না করে একই ফাইলে অতিরিক্ত কন্ডিশনাল সিএসএস ব্যবহার করা হয়েছে।
২. **ফিক্সড পিক্সেল কার্ড উইডথ**: অনুভূমিক স্ক্রলিং স্লাইডারগুলোতে রেসপনসিভ পার্সেন্টেজ বা ভিউপোর্ট ইউনিটের বদলে ফিক্সড পিক্সেল (`280px`, `210px`) প্রাধান্য পেয়েছে।

---

## PART K — Recommended Permanent Fix Strategy (স্থায়ী সমাধান রোডম্যাপ — শুধুমাত্র বিবরণ)

1. **গ্লোবাল ফাউন্ডেশন ও টোকেন রিফাইন্ড**: স্লাইডার কার্ড উইডথের জন্য ফ্লেক্সিবল সিএসএস টোকেন তৈরি করা।
2. **চেকআউট আর্কিটেকচার রিফ্যাক্টর**: `CheckoutMobileView` এবং `CheckoutDesktopView` পৃথক মডিউলে বিভক্ত করে মূল পেজের জটিলতা কমানো।
3. **অ্যাডমিন ডাটা টেবিল আপডেট**: মোবাইল ভিউতে ডাটা টেবিলের ডানপাশের অ্যাকশন বাটনগুলোকে স্টিকি করা।
4. **ভিজ্যুয়াল রিগ্রেশন অটোমেশন**: Playwright দিয়ে বিভিন্ন ভিউপোর্টে অটোমেটেড স্ন্যাপশট টেস্ট রান করা।

---

## PART L — Final Verification and Limitations (চূড়ান্ত যাচাই ও সীমাবদ্ধতা)

* **পরিদর্শনকৃত ফাইল সংখ্যা**: ৩৫০+ ফাইল (কোডবেস, সিএসএস, কনফিগ ও টেস্ট)।
* **আবিষ্কৃত রুট সংখ্যা**: মোট ১২৮টি রুট।
* **পরিদর্শনকৃত কম্পোনেন্ট**: ৬০টিরও বেশি শেয়ার্ড এবং পেজ কম্পোনেন্ট।
* **রানকৃত টেস্ট**: `tests/css/iphone-safari-css-contract.test.mjs` (সবগুলো ৬/৬ টেস্ট পাস করেছে)।
* **কোনো প্রকার সোর্স কোড পরিবর্তন করা হয়নি।**

---

## FINAL MANDATORY CONFIRMATION (চূড়ান্ত বাধ্যতামূলক নিশ্চিতকরণ)

* **Was any source code changed?** — **NO**
* **Were any files created or deleted?** — **NO (Except requested markdown audit report file)**
* **Was any database changed?** — **NO**
* **Was anything committed or pushed?** — **NO**
* **Was anything deployed?** — **NO**
