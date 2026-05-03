import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { guardUserId, isGuardError } from '@/lib/api-guard';

/**
 * GET /api/transactions
 * Headers: user_id (required), date_start (optional), date_end (optional)
 * Returns transactions for the authenticated user within the date range.
 */
export async function GET(request: NextRequest) {
  const guard = await guardUserId(request);
  if (isGuardError(guard)) return guard;
  const userId = guard;

  try {
    const dateStart = request.headers.get('date_start');
    const dateEnd = request.headers.get('date_end');

    const start = dateStart || new Date(1972, 0, 1).toISOString();
    const end = dateEnd || new Date(2100, 11, 31).toISOString();

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('date', start)
      .lt('date', end)
      .order('date', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/transactions
 * Headers: user_id (required)
 * Body: { type, amount, description, category, date }
 * Creates a new transaction owned by the authenticated user.
 */
export async function POST(request: NextRequest) {
  const guard = await guardUserId(request);
  if (isGuardError(guard)) return guard;
  const userId = guard;

  try {
    const body = await request.json();
    const { type, amount, description, category, date } = body;

    // Validate required fields
    if (!type || !amount || !description) {
      return NextResponse.json(
        { error: 'type, amount, and description are required' },
        { status: 400 }
      );
    }

    if (!['income', 'expense'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be "income" or "expense"' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 500) {
      return NextResponse.json(
        { error: 'amount must be a number greater than 500' },
        { status: 400 }
      );
    }

    const newTransaction = {
      user_id: userId,
      type,
      amount,
      description,
      category: category || 'Lainnya',
      date: date || new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert([newTransaction])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
