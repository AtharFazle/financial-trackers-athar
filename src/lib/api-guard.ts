import { NextRequest, NextResponse } from 'next/server';
import { supabase } from './supabase';

/**
 * Validates that the request contains a valid user_id header
 * and that the user actually exists in the database.
 * Returns the user_id string on success, or a NextResponse error on failure.
 */
export async function guardUserId(
  request: NextRequest
): Promise<string | NextResponse> {
  const userId = request.headers.get('user_id');

  if (!userId) {
    return NextResponse.json(
      { error: 'user_id header is required' },
      { status: 400 }
    );
  }

  // Verify user exists
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 401 }
    );
  }

  return userId;
}

/**
 * Type guard: checks if guardUserId returned an error response
 */
export function isGuardError(
  result: string | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
