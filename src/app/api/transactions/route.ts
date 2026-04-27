import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
      const userId = request.headers.get("user_id");
      const dateStart = request.headers.get("date_start");
      const dateEnd = request.headers.get("date_end");

      if (!userId) {
        return NextResponse.json({ error: "user_id is required" }, { status: 400 });
      }

      const now = new Date();
      const start = dateStart || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const end = dateEnd || new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
      
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .gte("date", start)
        .lt("date", end)
        .order("date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
