import { NextResponse } from 'next/server';
import type { User } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = String(body?.action || '').trim();
    const details = String(body?.details || '').trim();
    const user = body?.user as User | null;

    if (!user || !user.id || !user.name || !user.role) {
      return NextResponse.json({ success: false, error: 'User not logged in' }, { status: 401 });
    }

    if (!action) {
      return NextResponse.json({ success: false, error: 'Missing action' }, { status: 400 });
    }

    const newLog = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action,
      details,
    };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.from('audit_logs').insert(newLog);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to write audit log' }, { status: 500 });
  }
}
