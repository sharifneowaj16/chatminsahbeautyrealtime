import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedAdmin } from '@/lib/auth/admin-request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a senior beauty product marketing specialist and SEO expert for Minsah Beauty (minsahbeauty.cloud) — a beauty e-commerce platform targeting Bangladeshi buyers.

Your job: use the web_search tool to deeply research the Bangladesh beauty market for the given product, then generate a complete, highly optimized product listing.

═══════════════════════════════════════════════════════
RESEARCH STEPS — always do ALL of these before writing:
═══════════════════════════════════════════════════════

1. Search: "{product} daraz bangladesh" — find real pricing, top sellers, review counts
2. Search: "{product} shajgoj" OR "{product} bangladesh beauty blog" — find local reviews, ingredients, skin concerns
3. Search: "{product} বাংলাদেশ" OR "{product} বাংলা" — find how BD buyers search in Bengali
4. Search: "{product} price bangladesh 2024 2025" — find current market price range in BDT
5. Search: "{product} ingredients benefits skincare" — find real ingredient lists

From research extract:
- Real BDT price range (for reference note only — never set as price)
- Actual ingredients used in popular versions of this product
- Top keywords Bangladeshi buyers search (English + Bengali)
- Which skin concerns this product solves for BD climate (hot, humid, polluted)
- Popular brands selling this in BD market
- Competition level on Daraz BD
- Facebook/Instagram marketing angles used in BD

═══════════════════════════════════════════════════════
CONTENT QUALITY RULES:
═══════════════════════════════════════════════════════

DESCRIPTION (most important):
- 5-6 paragraphs, written like a knowledgeable Bangladeshi beauty advisor
- Para 1: Hook — what problem does this solve for BD buyers? (relatable, local context)
- Para 2: Key ingredients + how they work scientifically (but explained simply)
- Para 3: Who is this for? Skin types, age range, skin concerns common in Bangladesh
- Para 4: How to use — step by step, simple language, BD routine context
- Para 5: Why Minsah Beauty? Trust + COD + authentic product angle
- Para 6: Bangladesh climate angle — humidity, heat, pollution, sweat — how this product handles it
- NO generic filler phrases like "this amazing product" or "perfect for everyone"
- Write like you're recommending to a friend, not writing a brochure

BENGALI CONTENT:
- Bengali Product Name: exactly how BD buyers say it on Facebook/Google (colloquial, NOT textbook)
- Bengali Meta Description: written as a Facebook post caption, conversational, includes emoji if natural
- Mix Banglish naturally if that's how BD buyers talk (e.g., "skin এর জন্য best", "একদম natural")

SEO STRATEGY:
- Focus keyword: single most-searched phrase on Google BD for this product (verify from research)
- Tags: 15-20 tags — mix of: product type terms, ingredient terms, concern terms, Bengali phonetic, brand terms, "bangladesh" suffixed terms, Daraz-style search terms
- Meta title: must include focus keyword + "Bangladesh" or "BD" + "Minsah Beauty" within 60 chars
- Meta description: include focus keyword in first 20 words, mention "Bangladesh" or "BD", soft CTA

FACEBOOK AD COPY:
- Headline: Bengali/Banglish, emotional hook, max 40 chars (e.g., "ত্বক উজ্জ্বল হবেই! 🌟")
- Primary text: 3-4 lines Bengali, format: Pain point → "কিন্তু এখন" → Solution → Product name → CTA
- Target audience: specific age/gender/interest targeting for Bangladesh Facebook ads

═══════════════════════════════════════════════════════
STRICT RULES:
═══════════════════════════════════════════════════════
1. price fields ALWAYS empty string "" — never set a price
2. SKU: MSH-{2-letter code}-{SHORT}-{SIZE} → SK=Skincare, HR=Haircare, MK=Makeup, BC=Body Care, FR=Fragrance, TL=Tools, SP=SPA, NL=Nails
3. codAvailable: always true (mandatory for BD market)
4. returnEligible: always true (trust builder)
5. After ALL research is done, respond ONLY with a single valid JSON object — no markdown, no backticks, no explanation outside JSON

═══════════════════════════════════════════════════════
FINAL OUTPUT — valid JSON only:
═══════════════════════════════════════════════════════

{
  "name": "string (descriptive, 60-80 chars)",
  "category": "one of: Make Up | Skin care | Hair care | SPA | Perfume | Nails | Body Care | Combo",
  "subcategory": "string",
  "item": "string",
  "brand": "string (most popular brand for this product in BD market)",
  "originCountry": "one of: Bangladesh (Local) | South Korea | Japan | France | USA | UK | Germany | Italy | Thailand | India | China",
  "status": "active",
  "featured": true,
  "description": "string (5-6 rich paragraphs, BD-focused, no generic filler)",
  "weight": "string (numeric only e.g. '30')",
  "ingredients": "string (real comma-separated list from research, add '(verify with supplier)' if estimated)",
  "skinType": ["Oily | Dry | Combination | Sensitive | Normal | All Skin Types — pick all that apply"],
  "shelfLife": "string (e.g. '24 months')",
  "productCondition": "NEW",
  "averageRating": 0,
  "reviewCount": 0,
  "variants": [
    {
      "id": "1",
      "size": "string (common size in BD market e.g. '30ml')",
      "color": "string (shade name or '')",
      "price": "",
      "stock": "10",
      "sku": "string"
    }
  ],
  "metaTitle": "string (max 60 chars, focus keyword + Minsah Beauty)",
  "metaDescription": "string (150-160 chars, focus keyword in first 20 words, BD hook, soft CTA)",
  "bengaliProductName": "string (colloquial Bengali as BD buyers say it)",
  "bengaliMetaDescription": "string (conversational Bengali, Facebook caption style, max 540 chars)",
  "focusKeyword": "string (most-searched BD phrase, lowercase, verified from research)",
  "ogTitle": "string (punchy social sharing title, emotional hook)",
  "urlSlug": "string (lowercase-hyphenated, no Bengali, no special chars)",
  "tags": "string (comma-separated 15-20 tags: English + Bengali phonetic + concern terms + bd/bangladesh suffixed)",
  "shippingWeight": "string (e.g. '150g' — estimate with packaging)",
  "dimensions": {
    "length": "string (cm)",
    "width": "string (cm)",
    "height": "string (cm)"
  },
  "isFragile": false,
  "flashSaleEligible": true,
  "lowStockThreshold": "10",
  "returnEligible": true,
  "codAvailable": true,
  "preOrderOption": false,
  "marketPriceNote": "string (e.g. 'Daraz BD: ৳350–৳850 | Shajgoj: ৳400–৳900 — set your price accordingly')",
  "competitionNote": "string (e.g. 'High competition on Daraz — differentiate with COD + authenticity guarantee')",
  "facebookAdAngle": {
    "headline": "string (Bengali/Banglish, emotional, max 40 chars)",
    "primaryText": "string (3-4 lines Bengali: pain→solution→product→CTA)",
    "targetAudience": "string (age range, gender, BD-specific interests for Meta ads)"
  }
}`;

// ─── Agentic loop — handles tool use ─────────────────────────────────────────
async function runAgenticGeneration(productName: string, model: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'web-search-2025-03-05',
  };

  const messages: Array<{ role: string; content: unknown }> = [
    {
      role: 'user',
      content: `Research the Bangladesh beauty market and generate a complete optimized product listing for: "${productName}"

First search for this product on Daraz BD, Shajgoj, and in Bengali to understand:
- Real market pricing in BDT
- Popular brands selling this in Bangladesh  
- Top keywords BD buyers use
- Actual ingredients and benefits
- How BD buyers talk about this product on Facebook/Google

Then generate the complete JSON product listing.`,
    },
  ];

  // Agentic loop — max 8 turns to allow multiple web searches
  for (let turn = 0; turn < 8; turn++) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model,
        max_tokens: 6000,
        system: SYSTEM_PROMPT,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
          },
        ],
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error: ${err}`);
    }

    const data = await response.json();
    const { stop_reason, content } = data;

    // Add assistant response to history
    messages.push({ role: 'assistant', content });

    // If done — extract the final text
    if (stop_reason === 'end_turn') {
      const textBlock = content.find((b: { type: string }) => b.type === 'text');
      if (!textBlock?.text) throw new Error('No text in final response');
      return textBlock.text;
    }

    // If tool_use — collect all tool results and continue
    if (stop_reason === 'tool_use') {
      const toolUseBlocks = content.filter((b: { type: string }) => b.type === 'tool_use');
      if (toolUseBlocks.length === 0) break;

      // Build tool results for all tool_use blocks
      const toolResults = toolUseBlocks.map((block: { id: string; input?: { query?: string } }) => ({
        type: 'tool_result',
        tool_use_id: block.id,
        content: `Search completed for: ${block.input?.query || 'unknown query'}`,
      }));

      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    // Unexpected stop reason
    break;
  }

  throw new Error('Agentic loop ended without final response');
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const admin = await getVerifiedAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productName, model } = await request.json();
    if (!productName?.trim()) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    // Whitelist — শুধু valid Anthropic models allow করবো
    const ALLOWED_MODELS = [
      'claude-haiku-4-5-20251001',
      'claude-sonnet-4-20250514',
      'claude-opus-4-20250514',
    ];
    const selectedModel = ALLOWED_MODELS.includes(model)
      ? model
      : 'claude-sonnet-4-20250514';

    const rawText = await runAgenticGeneration(productName.trim(), selectedModel);

    // Strip markdown fences if model accidentally added them
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    // Extract JSON — find first { to last }
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd   = cleaned.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      console.error('No JSON found in response:', rawText.slice(0, 500));
      throw new Error('AI did not return valid JSON');
    }
    const jsonStr = cleaned.slice(jsonStart, jsonEnd + 1);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error('JSON parse failed:', jsonStr.slice(0, 500));
      throw new Error('Failed to parse AI response as JSON');
    }

    return NextResponse.json({ success: true, product: parsed });
  } catch (error) {
    console.error('AI generate error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
