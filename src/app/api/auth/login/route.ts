import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { userId, password } = await req.json();

    if (!userId || !password) {
      return NextResponse.json({ error: "User ID and password are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, name, password")
      .eq("id", userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (data.password !== password) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Success: return user data without password
    const user = { id: data.id, name: data.name };
    return NextResponse.json({ data: user }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
