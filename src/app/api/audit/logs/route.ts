import { NextResponse } from 'next/server';
import type { AuditLog } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);
    if (error) throw error;

    const mapped: AuditLog[] = (data || []).map((l: any) => ({
      id: l.id,
      timestamp: l.timestamp,
      userId: l.user_id ?? l.userId ?? undefined,
      userName: l.user_name ?? l.userName ?? undefined,
      userRole: l.user_role ?? l.userRole ?? undefined,
      action: l.action,
      details: l.details ?? undefined,
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to fetch audit logs' }, { status: 500 });
  }
}
