import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { RolePermissions } from '@/lib/types';
import { initialPermissions } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

let cached: { at: number; data: RolePermissions } | null = null;
const CACHE_TTL_MS = 5000;

async function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET() {
  try {
    const now = Date.now();
    if (cached && now - cached.at < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, data: cached.data });
    }

    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'rolePermissions')
      .maybeSingle();
    if (error) throw error;

    if (data?.value) {
      const perms = data.value as unknown as RolePermissions;
      cached = { at: now, data: perms };
      return NextResponse.json({ success: true, data: perms });
    }

    const { error: insertError } = await supabase
      .from('config')
      .insert({ key: 'rolePermissions', value: initialPermissions as any });
    if (insertError) throw insertError;

    cached = { at: now, data: initialPermissions };
    return NextResponse.json({ success: true, data: initialPermissions });
  } catch (e: any) {
    const now = Date.now();
    const fallback = cached?.data || initialPermissions;
    cached = { at: now, data: fallback };
    return NextResponse.json({ success: true, data: fallback });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as { permissions?: RolePermissions };
    if (!body?.permissions) {
      return NextResponse.json({ success: false, error: 'Payload inválido' }, { status: 400 });
    }

    const supabase = await getSupabase();
    const { error } = await supabase
      .from('config')
      .upsert({ key: 'rolePermissions', value: body.permissions as any }, { onConflict: 'key' });
    if (error) throw error;

    cached = { at: Date.now(), data: body.permissions };
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Falha ao salvar permissões' }, { status: 500 });
  }
}

