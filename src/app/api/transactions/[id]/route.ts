import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { guardUserId, isGuardError } from '@/lib/api-guard';

/**
 * DELETE /api/transactions/[id]
 * Headers: user_id (required)
 * Soft-deletes a transaction by setting deleted_at.
 * Only the owner of the transaction can delete it.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await guardUserId(request);
  if (isGuardError(guard)) return guard;
  const userId = guard;

  try {
    const { id } = await params;

    // First, verify the transaction belongs to this user
    const { data: existing, error: fetchError } = await supabase
      .from('transactions')
      .select('id, user_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Ownership check: user can only delete their own transactions
    if (existing.user_id !== userId) {
      return NextResponse.json(
        { error: 'You are not authorized to delete this transaction' },
        { status: 403 }
      );
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Transaction deleted' }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
