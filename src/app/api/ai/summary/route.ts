import { NextRequest, NextResponse } from 'next/server';
import { guardUserId, isGuardError } from '@/lib/api-guard';
import { generateAISummary, CategorySummary } from '@/lib/ai-summary';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/ai/summary
 * Headers: user_id (required)
 * Body: { startDate: string, endDate: string }
 */
export async function POST(request: NextRequest) {
  const guard = await guardUserId(request);
  if (isGuardError(guard)) return guard;
  const userId = guard;

  try {
    const body = await request.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate dan endDate wajib diisi' },
        { status: 400 }
      );
    }

    // Fetch transactions directly from Supabase for security and accuracy
    const startIso = new Date(startDate).toISOString();
    // Include the entire end date until end of day (23:59:59.999)
    const endObj = new Date(endDate);
    endObj.setHours(23, 59, 59, 999);
    const endIso = endObj.toISOString();

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .is('deleted_at', null)
      .gte('date', startIso)
      .lte('date', endIso)
      .order('date', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const expensesList = transactions || [];

    if (expensesList.length === 0) {
      return NextResponse.json({
        summary: "Tidak ada transaksi pengeluaran ditemukan pada rentang tanggal ini. Tidak ada data untuk dianalisis oleh AI.",
        grandTotal: 0,
        count: 0
      }, { status: 200 });
    }

    const grandTotal = expensesList.reduce((acc, item) => acc + item.amount, 0);

    // Group expenses by category
    const categoryMap: { [cat: string]: CategorySummary } = {};

    expensesList.forEach((t) => {
      const catName = t.category || 'Lainnya';
      if (!categoryMap[catName]) {
        categoryMap[catName] = {
          category: catName,
          total: 0,
          count: 0,
          percentage: 0,
          items: [],
        };
      }
      categoryMap[catName].total += t.amount;
      categoryMap[catName].count += 1;
      categoryMap[catName].items.push({
        description: t.description,
        amount: t.amount,
        date: t.date,
      });
    });

    const categoriesArray: CategorySummary[] = Object.values(categoryMap).map((c) => ({
      ...c,
      percentage: grandTotal > 0 ? (c.total / grandTotal) * 100 : 0,
    }));

    // Sort categories descending by total
    categoriesArray.sort((a, b) => b.total - a.total);

    const summaryText = await generateAISummary({
      startDate,
      endDate,
      grandTotal,
      totalTransactionsCount: expensesList.length,
      categories: categoriesArray,
    });

    return NextResponse.json({
      summary: summaryText,
      grandTotal,
      count: expensesList.length,
      categories: categoriesArray,
    }, { status: 200 });
  } catch (err: any) {
    console.error("AI Summary error:", err);
    return NextResponse.json(
      { error: err.message || "Gagal membuat ringkasan AI" },
      { status: 500 }
    );
  }
}
