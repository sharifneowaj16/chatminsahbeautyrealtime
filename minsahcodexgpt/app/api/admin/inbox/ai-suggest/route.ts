import { adminUnauthorizedResponse, getVerifiedAdmin } from '@/app/api/admin/_utils';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AiSuggestMessage {
  role: 'user' | 'assistant';
  content: string;
}

const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

export async function POST(request: NextRequest) {
  const admin = await getVerifiedAdmin(request);
  if (!admin) {
    return adminUnauthorizedResponse();
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI suggestion is not configured' },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as {
      messages?: AiSuggestMessage[];
    };

    const messages = Array.isArray(body.messages)
      ? body.messages
          .filter(
            (message): message is AiSuggestMessage =>
              Boolean(message) &&
              (message.role === 'user' || message.role === 'assistant') &&
              typeof message.content === 'string' &&
              message.content.trim().length > 0
          )
          .slice(-10)
      : [];

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'Conversation history is required' },
        { status: 400 }
      );
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL,
        max_tokens: 1000,
        system: `You are a friendly and helpful customer service representative for Minsah Beauty -
a premium beauty product e-commerce brand based in Bangladesh.
Respond warmly, professionally, in the same language as the customer (Bangla, English, or mixed Banglish).
Keep replies concise (2-4 sentences). Address their question directly.
Never mention you are an AI. Sign off as "Minsah Beauty Team" if needed.`,
        messages,
      }),
      cache: 'no-store',
    });

    const json = (await response.json().catch(() => null)) as
      | {
          error?: { message?: string };
          content?: Array<{ type: string; text?: string }>;
        }
      | null;

    if (!response.ok) {
      return NextResponse.json(
        { error: json?.error?.message || 'AI suggestion failed' },
        { status: response.status }
      );
    }

    const suggestion = json?.content?.find((block) => block.type === 'text')?.text?.trim();
    if (!suggestion) {
      return NextResponse.json(
        { error: 'AI suggestion was empty' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      suggestion,
      adminId: admin.adminId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'AI suggestion failed',
      },
      { status: 500 }
    );
  }
}
