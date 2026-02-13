import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { CustomerInfo } from '@/lib/types';

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 5000;

type CacheEntry = { at: number; data: CustomerInfo[] };

function getCache(): CacheEntry | null {
  return ((globalThis as any).__adminCustomersApiCache as CacheEntry | null) || null;
}

function setCache(entry: CacheEntry | null) {
  (globalThis as any).__adminCustomersApiCache = entry;
}

export async function GET(request: Request) {
  try {
    const now = Date.now();
    const url = new URL(request.url);
    const bypassCache = url.searchParams.has('bust');
    if (!bypassCache) {
      const cached = getCache();
      if (cached && now - cached.at < CACHE_TTL_MS) {
        return NextResponse.json({ success: true, data: cached.data });
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const res = await supabase.from('customers').select('*').order('name', { ascending: true }).limit(2000);
    if (res.error) {
      const msg = String(res.error.message || '').toLowerCase();
      if (msg.includes('statement timeout')) {
        const res2 = await supabase.from('customers').select('*').order('id', { ascending: false }).limit(2000);
        if (res2.error) throw res2.error;
        const mappedBase: CustomerInfo[] = (res2.data || []).map((c: any) => ({
          id: c.id,
          code: c.code || undefined,
          name: c.name,
          cpf: c.cpf || undefined,
          phone: c.phone || '',
          phone2: c.phone2 || undefined,
          phone3: c.phone3 || undefined,
          email: c.email || undefined,
          zip: c.zip || '',
          address: c.address || '',
          number: c.number || '',
          complement: c.complement || undefined,
          neighborhood: c.neighborhood || '',
          city: c.city || '',
          state: c.state || '',
          password: c.password || undefined,
          observations: c.observations || undefined,
          sellerId: c.seller_id ?? c.sellerId ?? undefined,
          sellerName: c.seller_name ?? c.sellerName ?? undefined,
          blocked: !!c.blocked,
          blockedReason: c.blocked_reason ?? c.blockedReason ?? undefined,
          rating: c.rating ?? undefined,
        }));
        let merged = mappedBase;
        const blockedRes = await supabase.from('customers').select('*').eq('blocked', true).order('name', { ascending: true }).limit(5000);
        if (!blockedRes.error && blockedRes.data) {
          const mappedBlocked: CustomerInfo[] = (blockedRes.data || []).map((c: any) => ({
            id: c.id,
            code: c.code || undefined,
            name: c.name,
            cpf: c.cpf || undefined,
            phone: c.phone || '',
            phone2: c.phone2 || undefined,
            phone3: c.phone3 || undefined,
            email: c.email || undefined,
            zip: c.zip || '',
            address: c.address || '',
            number: c.number || '',
            complement: c.complement || undefined,
            neighborhood: c.neighborhood || '',
            city: c.city || '',
            state: c.state || '',
            password: c.password || undefined,
            observations: c.observations || undefined,
            sellerId: c.seller_id ?? c.sellerId ?? undefined,
            sellerName: c.seller_name ?? c.sellerName ?? undefined,
            blocked: !!c.blocked,
            blockedReason: c.blocked_reason ?? c.blockedReason ?? undefined,
            rating: c.rating ?? undefined,
          }));

          const byId = new Map<string, CustomerInfo>();
          for (const c of mappedBase) byId.set(String(c.id), c);
          for (const c of mappedBlocked) byId.set(String(c.id), c);
          merged = Array.from(byId.values()).sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
        }

        setCache({ at: now, data: merged });
        return NextResponse.json({ success: true, data: merged });
      }
      throw res.error;
    }

    const mappedBase: CustomerInfo[] = (res.data || []).map((c: any) => ({
      id: c.id,
      code: c.code || undefined,
      name: c.name,
      cpf: c.cpf || undefined,
      phone: c.phone || '',
      phone2: c.phone2 || undefined,
      phone3: c.phone3 || undefined,
      email: c.email || undefined,
      zip: c.zip || '',
      address: c.address || '',
      number: c.number || '',
      complement: c.complement || undefined,
      neighborhood: c.neighborhood || '',
      city: c.city || '',
      state: c.state || '',
      password: c.password || undefined,
      observations: c.observations || undefined,
      sellerId: c.seller_id ?? c.sellerId ?? undefined,
      sellerName: c.seller_name ?? c.sellerName ?? undefined,
      blocked: !!c.blocked,
      blockedReason: c.blocked_reason ?? c.blockedReason ?? undefined,
      rating: c.rating ?? undefined,
    }));

    let merged = mappedBase;
    const blockedRes = await supabase.from('customers').select('*').eq('blocked', true).order('name', { ascending: true }).limit(5000);
    if (!blockedRes.error && blockedRes.data) {
      const mappedBlocked: CustomerInfo[] = (blockedRes.data || []).map((c: any) => ({
        id: c.id,
        code: c.code || undefined,
        name: c.name,
        cpf: c.cpf || undefined,
        phone: c.phone || '',
        phone2: c.phone2 || undefined,
        phone3: c.phone3 || undefined,
        email: c.email || undefined,
        zip: c.zip || '',
        address: c.address || '',
        number: c.number || '',
        complement: c.complement || undefined,
        neighborhood: c.neighborhood || '',
        city: c.city || '',
        state: c.state || '',
        password: c.password || undefined,
        observations: c.observations || undefined,
        sellerId: c.seller_id ?? c.sellerId ?? undefined,
        sellerName: c.seller_name ?? c.sellerName ?? undefined,
        blocked: !!c.blocked,
        blockedReason: c.blocked_reason ?? c.blockedReason ?? undefined,
        rating: c.rating ?? undefined,
      }));

      const byId = new Map<string, CustomerInfo>();
      for (const c of mappedBase) byId.set(String(c.id), c);
      for (const c of mappedBlocked) byId.set(String(c.id), c);
      merged = Array.from(byId.values()).sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
    }

    setCache({ at: now, data: merged });
    return NextResponse.json({ success: true, data: merged });
  } catch (e: any) {
    const cached = getCache();
    if (cached) return NextResponse.json({ success: true, data: cached.data });
    return NextResponse.json({ success: false, error: e?.message || 'Falha ao buscar clientes' }, { status: 500 });
  }
}
