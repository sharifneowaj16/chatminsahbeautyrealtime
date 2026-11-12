'use client';

import React, { useState, useCallback } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, Sparkles, Globe, Image as ImageIcon } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// AI Prompt Template Generator for Minsah Beauty Product Import
// ─────────────────────────────────────────────────────────────────────────────
// This generates a complete prompt that any AI (ChatGPT, Claude, Gemini, etc.)
// can use to research a product and return a ready-to-paste JSON.
// ─────────────────────────────────────────────────────────────────────────────

function buildPromptTemplate(productName: string): string {
  const name = productName.trim() || '[PRODUCT NAME HERE]';
  return `You are a beauty product data specialist. I need you to deeply research the product "${name}" and return a COMPLETE, ACCURATE JSON that I can directly paste into my e-commerce admin import system (Minsah Beauty — minsahbeauty.cloud, Bangladesh market).

═══════════════════════════════════════════════════════
📋 STEP 1: RESEARCH (Do ALL of these before writing JSON)
═══════════════════════════════════════════════════════

Search and find REAL data for "${name}":
1. Search "${name}" — find the official product page, real ingredients, real weight/size, real images
2. Search "${name} price Bangladesh" OR "${name} price Daraz BD" — find real BDT price range
3. Search "${name} review" — find real user reviews, ratings, skin types it works for
4. Search "${name} ingredients list" — find the ACTUAL full ingredient list (not made up)
5. Search "${name} official website" — find the brand's official description, claims, usage instructions
6. Find 4-8 HIGH-QUALITY product images — direct image URLs (.jpg/.png/.webp) from official brand sites, retailer listings, or high-res product photography

═══════════════════════════════════════════════════════
📸 STEP 2: IMAGE SOURCING (CRITICAL — DO NOT SKIP)
═══════════════════════════════════════════════════════

Find REAL product images. For each image provide the direct URL.
Priority order for image sources:
1. Official brand website product images
2. Authorized retailer listings (Sephora, Ulta, Nykaa, YesStyle, Jolse)
3. High-resolution product photography from beauty blogs/reviews
4. Amazon/Daraz product listing images (main product shots only)

Rules:
- Minimum 3 images, ideally 5-8
- Must be DIRECT image URLs ending in .jpg, .png, .webp (not webpage URLs)
- First image = main product hero shot (white/clean background)
- Include: front packaging, back with ingredients, texture/swatch if available, lifestyle shot
- NO watermarked, low-quality, or obviously user-generated selfie images
- Each image needs an SEO-friendly alt text

═══════════════════════════════════════════════════════
📦 STEP 3: JSON OUTPUT FORMAT
═══════════════════════════════════════════════════════

Return ONLY a valid JSON object wrapped in [IMPORT_DATA]...[/IMPORT_DATA] tags.
NO markdown, NO backticks, NO explanation outside the tags.

[IMPORT_DATA]
{
  "name": "Full product name with brand, key feature, and size (60-80 chars)",
  "category": "one of: Make Up | Skin care | Hair care | SPA | Perfume | Nails | Body Care | Combo",
  "subcategory": "specific subcategory (e.g., Moisturizer, Serum, Foundation, Shampoo, Lip Color)",
  "item": "item type if applicable (e.g., Day Cream, Night Serum, Matte Lipstick)",
  "brand": "exact brand name",
  "originCountry": "one of: Bangladesh (Local) | South Korea | Japan | France | USA | UK | Germany | Italy | Thailand | India | China | Taiwan | Australia | Canada",
  "status": "active",
  "featured": true,
  "description": "5-6 rich paragraphs. Para 1: Problem this solves (Bangladesh context — heat, humidity, pollution). Para 2: Key ingredients + how they work (scientific but simple). Para 3: Who is this for? Skin types, age range, concerns. Para 4: How to use — step by step. Para 5: Why buy from Minsah Beauty? (authentic, COD, fast delivery). Para 6: Climate angle — how this handles Bangladesh weather.",
  "shortDescription": "1-2 sentence hook for product cards (max 160 chars)",
  "weight": "numeric only in grams (e.g., '50' for 50g or '200' for 200ml)",
  "ingredients": "REAL full ingredient list from the actual product — comma separated. If you cannot find the exact list, write 'Verify with supplier: ' followed by commonly known ingredients",
  "skinType": ["array of applicable types: Oily, Dry, Combination, Sensitive, Normal, All Skin Types"],
  "shelfLife": "e.g., '24 months' or '36 months'",
  "expiryDate": "",
  "productCondition": "NEW",
  "averageRating": 0,
  "reviewCount": 0,
  "gtin": "real GTIN/EAN/UPC barcode number if available, otherwise empty string",

  "images": [
    {
      "url": "DIRECT image URL (must end with .jpg/.png/.webp)",
      "alt": "SEO-friendly alt text describing the image",
      "title": "Image title for tooltip",
      "sortOrder": 0,
      "isDefault": true
    },
    {
      "url": "second image URL",
      "alt": "descriptive alt text",
      "title": "image title",
      "sortOrder": 1,
      "isDefault": false
    }
  ],

  "variants": [
    {
      "id": "1",
      "size": "most common size in market (e.g., '50ml', '30g', '200ml')",
      "color": "shade name if applicable, otherwise empty string",
      "price": "",
      "stock": "10",
      "sku": "MSH-{XX}-{SHORT}-{SIZE} where XX = SK(Skincare) HR(Haircare) MK(Makeup) BC(BodyCare) FR(Fragrance) TL(Tools) SP(SPA) NL(Nails)"
    }
  ],

  "metaTitle": "max 60 chars — focus keyword + product benefit + Minsah Beauty",
  "metaDescription": "150-160 chars — focus keyword in first 20 words, mention Bangladesh, include soft CTA",
  "urlSlug": "lowercase-hyphenated-seo-friendly-slug",
  "tags": "comma-separated 15-20 tags: English terms, Bengali phonetic terms, concern terms, bangladesh-suffixed terms, ingredient terms",

  "bengaliProductName": "colloquial Bengali — how BD buyers actually say/search this product (NOT textbook Bengali)",
  "bengaliMetaDescription": "conversational Bengali meta description, Facebook caption style, max 540 chars",
  "focusKeyword": "single most-searched phrase on Google Bangladesh for this product (lowercase)",
  "secondaryKeywords": ["array", "of", "4-6", "secondary", "keywords"],
  "bengaliFocusKeyword": "Bengali version of focus keyword (colloquial)",
  "bengaliSecondaryKeywords": ["বাংলা", "কীওয়ার্ড", "তালিকা"],

  "ogTitle": "punchy social sharing title with emotional hook (60 chars max)",
  "ogDescription": "engaging social media description (160 chars max)",
  "ogImageUrl": "same as first product image URL",
  "canonicalUrl": "",
  "pageH1": "SEO H1 — focus keyword + natural variation (e.g., 'Product Name Price in Bangladesh')",
  "seoIntro": "2-3 sentence intro paragraph for SEO — naturally includes focus keyword and location",

  "searchIntent": "one of: Transactional | Informational | Commercial Investigation",
  "targetAudience": "specific audience description (e.g., 'Women 18-35 in Bangladesh with oily/combination skin looking for affordable Korean skincare')",
  "primaryConcern": "main skin/beauty concern this addresses (e.g., Acne, Anti-aging, Hydration, Dark spots)",
  "keyBenefits": ["benefit 1", "benefit 2", "benefit 3", "benefit 4"],
  "buyingIntentKeywords": ["buy product name bangladesh", "product name price bd", "product name original"],
  "searchTags": ["product search tag 1", "search tag 2"],
  "synonyms": ["alternate names buyers might search"],
  "banglaSearchTerms": ["বাংলা সার্চ টার্ম ১", "বাংলা সার্চ টার্ম ২"],
  "reviewKeywords": ["review-related search terms"],
  "entities": ["Brand Name", "Product Category", "Key Ingredient"],
  "usageInstructions": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],

  "descriptionSections": [
    { "title": "Key Ingredients", "content": "detail about main ingredients" },
    { "title": "How to Use", "content": "step by step usage" },
    { "title": "Why Choose This Product", "content": "unique selling points" }
  ],
  "productSpecs": {
    "Type": "e.g., Essence / Serum / Cream",
    "Volume": "e.g., 50ml",
    "Texture": "e.g., Lightweight gel / Rich cream",
    "Finish": "e.g., Matte / Dewy / Natural",
    "Scent": "e.g., Fragrance-free / Light floral"
  },

  "faqs": [
    { "question": "Is this product original?", "answer": "Yes, Minsah Beauty sells 100% authentic products with COD available across Bangladesh." },
    { "question": "relevant FAQ about usage/skin type", "answer": "detailed helpful answer" },
    { "question": "relevant FAQ about ingredients", "answer": "detailed helpful answer" }
  ],
  "faqSchemaReady": true,
  "authenticityNote": "100% Authentic — sourced directly from authorized distributors. Minsah Beauty guarantees original products with batch verification.",
  "ingredientVerificationStatus": "Verified",

  "shippingWeight": "estimated weight with packaging in grams (e.g., '150')",
  "dimensions": {
    "length": "cm estimate",
    "width": "cm estimate",
    "height": "cm estimate"
  },
  "isFragile": false,
  "flashSaleEligible": true,
  "lowStockThreshold": "10",
  "returnEligible": true,
  "codAvailable": true,
  "preOrderOption": false,

  "compareAtPrice": "original MRP/retail price if known (for showing 'was ৳X' strikethrough), otherwise empty string",
  "marketPriceNote": "e.g., 'Daraz BD: ৳350–৳850 | Shajgoj: ৳400–৳900 — set your selling price based on your cost + margin'",
  "competitionNote": "brief note on competition level and differentiation strategy"
}
[/IMPORT_DATA]

═══════════════════════════════════════════════════════
⚠️ CRITICAL RULES:
═══════════════════════════════════════════════════════
1. "price" in variants = ALWAYS empty string "" — I set my own prices
2. All data must be REAL and RESEARCHED — no fabricated ingredients, no made-up descriptions
3. Images must be REAL direct URLs to actual product photos
4. Bengali text must be COLLOQUIAL (how people actually talk), not formal/textbook
5. Output MUST be valid JSON wrapped in [IMPORT_DATA]...[/IMPORT_DATA] — nothing else
6. Description must be RICH, SPECIFIC, and LOCALLY RELEVANT to Bangladesh — no generic marketing fluff
7. If you cannot find exact data for any field, use your best research-backed estimate and mark with "(verify)"`;
}

export interface ProductImportAIPromptTemplateProps {
  onInsertResponse?: (json: string) => void;
}

export function ProductImportAIPromptTemplate({ onInsertResponse }: ProductImportAIPromptTemplateProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [productName, setProductName] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedGeneric, setCopiedGeneric] = useState(false);

  const handleCopy = useCallback(async (withName: boolean) => {
    const prompt = buildPromptTemplate(withName ? productName : '');
    try {
      await navigator.clipboard.writeText(prompt);
      if (withName) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        setCopiedGeneric(true);
        setTimeout(() => setCopiedGeneric(false), 2500);
      }
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = prompt;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      if (withName) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        setCopiedGeneric(true);
        setTimeout(() => setCopiedGeneric(false), 2500);
      }
    }
  }, [productName]);

  return (
    <div className="bg-gradient-to-br from-[#1a1d2e] to-[#161824] rounded-xl border border-[#2a2d42] overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-violet-400" />
          </div>
          <div className="text-left">
            <h3 className="text-[13px] font-semibold text-[#f7f8f8]">
              🪄 AI Prompt Template — যেকোনো AI-তে কপি-পেস্ট করুন
            </h3>
            <p className="text-[11px] text-[#8a8f98] mt-0.5">
              ChatGPT, Claude, Gemini — যেকোনোটায় দিন, সে রিয়েল ডেটা + ইমেজ সহ পুরো JSON ফেরত দেবে
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[#8a8f98]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#8a8f98]" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-[#232636]">
          {/* How it works */}
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-emerald-400">1</span>
              </div>
              <div>
                <p className="text-[11px] font-medium text-emerald-300">প্রোডাক্ট নাম লিখুন</p>
                <p className="text-[10px] text-[#8a8f98] mt-0.5">নিচে প্রোডাক্টের নাম লিখে Copy করুন</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-blue-400">2</span>
              </div>
              <div>
                <p className="text-[11px] font-medium text-blue-300">AI-তে পেস্ট করুন</p>
                <p className="text-[10px] text-[#8a8f98] mt-0.5">ChatGPT / Claude / Gemini — যেকোনোটায়</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
              <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-violet-400">3</span>
              </div>
              <div>
                <p className="text-[11px] font-medium text-violet-300">JSON পেস্ট করুন</p>
                <p className="text-[10px] text-[#8a8f98] mt-0.5">AI-এর আউটপুট উপরের বক্সে পেস্ট করে Parse করুন</p>
              </div>
            </div>
          </div>

          {/* Product name input + copy buttons */}
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="প্রোডাক্টের নাম লিখুন... (e.g., COSRX Snail Mucin Essence)"
                className="w-full px-4 py-3 pl-10 border border-[#2a2d42] bg-[#10121b] rounded-lg text-sm text-[#f7f8f8] placeholder:text-white/25 focus:ring-1 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all"
              />
              <Globe className="w-4 h-4 text-[#5e6ad2] absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {/* Copy with product name */}
              <button
                type="button"
                onClick={() => handleCopy(true)}
                disabled={!productName.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    কপি হয়ে গেছে! ✓
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    🪄 প্রোডাক্ট সহ Prompt কপি করুন
                  </>
                )}
              </button>

              {/* Copy generic template */}
              <button
                type="button"
                onClick={() => handleCopy(false)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#10121b] border border-[#2a2d42] hover:bg-[#1b1e2c] hover:border-[#3a3d52] text-white/70 hover:text-white text-xs font-medium rounded-lg active:scale-[0.98] transition-all"
              >
                {copiedGeneric ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    কপি হয়েছে! ✓
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Blank Template কপি
                  </>
                )}
              </button>
            </div>
          </div>

          {/* What AI will return */}
          <div className="p-3 rounded-lg bg-[#10121b] border border-[#232636]">
            <p className="text-[11px] font-medium text-[#d0d6e0] mb-2">🎯 AI যা যা ফেরত দেবে:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { icon: '📝', label: 'নাম, ব্র্যান্ড, ক্যাটেগরি' },
                { icon: '📸', label: 'রিয়েল প্রোডাক্ট ইমেজ URLs' },
                { icon: '🧪', label: 'আসল Ingredients তালিকা' },
                { icon: '📊', label: 'SEO: Meta, Keywords, Slug' },
                { icon: '🇧🇩', label: 'বাংলা নাম ও বিবরণ' },
                { icon: '💰', label: 'বাজার মূল্য রেফারেন্স' },
                { icon: '📦', label: 'ওজন, মাপ, শিপিং তথ্য' },
                { icon: '❓', label: 'FAQ Schema (Google Rich)' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-[10px] text-[#8a8f98]">
                  <span>{icon}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pro tips */}
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <p className="text-[11px] font-medium text-amber-300 mb-1.5">💡 Pro Tips:</p>
            <ul className="space-y-1 text-[10px] text-[#8a8f98]">
              <li>• <strong className="text-amber-200/80">ChatGPT Plus</strong> — ভালো ইমেজ URL দেয়, web browsing ON রাখুন</li>
              <li>• <strong className="text-amber-200/80">Claude</strong> — সবচেয়ে accurate ingredients ও description দেয়</li>
              <li>• <strong className="text-amber-200/80">Gemini</strong> — বাংলা কন্টেন্ট ও BD market research-এ সেরা</li>
              <li>• Price ফিল্ড ইচ্ছাকৃতভাবে খালি — আপনি নিজের দাম সেট করবেন</li>
              <li>• AI-এর JSON পেস্ট করার পর <code className="bg-white/5 px-1 rounded">Parse JSON</code> চাপুন, রিভিউ করুন, তারপর Save করুন</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

