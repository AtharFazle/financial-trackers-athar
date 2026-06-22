import { NextRequest, NextResponse } from 'next/server';
import { guardUserId, isGuardError } from '@/lib/api-guard';
// import { parseTransactionText } from '@/lib/gemini';
// import { parseTransactionText } from '@/lib/claude';
import { parseTransactionText } from '@/lib/cloudflare';

/**
 * POST /api/transactions/parse
 * Headers: user_id (required)
 * Body: { text: string }
 * Uses Gemini AI to parse unstructured text into structured transaction data.
 */
export async function POST(request: NextRequest) {
  const guard = await guardUserId(request);
  if (isGuardError(guard)) return guard;

  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Text terlalu panjang (maksimal 5000 karakter)' },
        { status: 400 }
      );
    }

    const transactions = await parseTransactionText(text.trim());

    return NextResponse.json(
      {
        transactions,
        raw_text: text.trim(),
        count: transactions.length,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Parse error:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal memproses teks' },
      { status: 500 }
    );
  }
}
