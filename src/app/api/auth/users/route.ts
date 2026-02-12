import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { User } from '@/lib/types';

export const dynamic = 'force-dynamic';

let cachedUsers: User[] | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 15000;

export async function GET() {
  try {
    const now = Date.now();
    if (cachedUsers && now - cachedAt < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, data: cachedUsers });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase.from('users').select('id,username,password,name,role,can_be_assigned');
    if (error) throw error;

    const mapped: User[] = (data || []).map((u: any) => ({
      id: u.id,
      username: u.username,
      password: u.password || undefined,
      name: u.name,
      role: u.role,
      canBeAssigned: u.can_be_assigned ?? true,
    }));

    cachedUsers = mapped;
    cachedAt = now;

    return NextResponse.json({ success: true, data: mapped });
  } catch (e: any) {
    if (cachedUsers) {
      return NextResponse.json({ success: true, data: cachedUsers });
    }
    return NextResponse.json({ success: true, data: [] });
  }
}
