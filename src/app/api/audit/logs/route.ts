import { NextResponse } from 'next/server';
import type { AuditLog } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

let cachedLogs: AuditLog[] | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 15000;

export async function GET() {
  try {
    const now = Date.now();
    if (cachedLogs && now - cachedAt < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, data: cachedLogs });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let data: any[] | null = null;
    let error: any = null;

    {
      const res = await supabase.from('audit_logs').select('*').order('id', { ascending: false }).limit(100);
      data = (res as any).data || null;
      error = (res as any).error || null;
    }

    if (error) {
      const message = String(error?.message || '');
      if (message.toLowerCase().includes('statement timeout')) {
        const res2 = await supabase.from('audit_logs').select('*').limit(100);
        if ((res2 as any).error) throw (res2 as any).error;
        data = (res2 as any).data || [];
      } else {
        throw error;
      }
    }

    const mapped: AuditLog[] = (data || []).map((l: any) => ({
      id: l.id,
      timestamp: l.timestamp,
      userId: l.user_id ?? l.userId ?? undefined,
      userName: l.user_name ?? l.userName ?? undefined,
      userRole: l.user_role ?? l.userRole ?? undefined,
      action: l.action,
      details: l.details ?? undefined,
    }));

    cachedLogs = mapped;
    cachedAt = now;

    return NextResponse.json({ success: true, data: mapped });
  } catch (e: any) {
    if (cachedLogs) {
      return NextResponse.json({ success: true, data: cachedLogs });
    }
    return NextResponse.json({ success: false, error: e?.message || 'Failed to fetch audit logs' }, { status: 500 });
  }
}
