import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { userId, name, password } = await req.json();

    if (!password || (!userId && !name)) {
      return NextResponse.json(
        { error: "Nama profil/User ID dan password wajib diisi" },
        { status: 400 }
      );
    }

    let query = supabase.from("users").select("id, name, password");

    if (userId) {
      query = query.eq("id", userId);
    } else if (name) {
      query = query.ilike("name", name.trim());
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Profil tidak ditemukan. Periksa nama profil Anda." },
        { status: 404 }
      );
    }

    if (data.password !== password) {
      return NextResponse.json(
        { error: "Password salah!" },
        { status: 401 }
      );
    }

    // Success: return user data without password
    const user = { id: data.id, name: data.name };
    return NextResponse.json({ data: user }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
