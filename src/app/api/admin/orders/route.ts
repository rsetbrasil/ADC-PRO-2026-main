import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { mapDbOrderToOrder } from '@/lib/supabase-mappers';
import { maybeAlert, recordMetric } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';

type CacheEntry = { at: number; data: any[]; source: string };

const HOT_TTL_MS = 8000;
const STALE_TTL_MS = 30000;

type CacheState = {
  hotCache: Map<string, CacheEntry>;
  inflight: Map<string, Promise<{ entry: CacheEntry; nextCursor: string | null }>>;
  stale: CacheEntry | null;
};

function getCacheState(): CacheState {
  const existing = (globalThis as any).__adminOrdersApiCache as CacheState | undefined;
  if (existing) return existing;
  const created: CacheState = { hotCache: new Map(), inflight: new Map(), stale: null };
  (globalThis as any).__adminOrdersApiCache = created;
  return created;
}

function getSupabaseAdmin() {
  const existing = (globalThis as any).__supabaseAdmin;
  if (existing) return existing;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase env ausente (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  }

  const created = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  (globalThis as any).__supabaseAdmin = created;
  return created;
}

export async function GET(req: Request) {
  const startedAt = Date.now();
  try {
    const now = Date.now();
    const cacheState = getCacheState();
    const { searchParams } = new URL(req.url);
    const includeItemsRaw = String(searchParams.get('includeItems') || '').toLowerCase();
    const includeItems = includeItemsRaw === '1' || includeItemsRaw === 'true';
    const id = searchParams.get('id');

    const defaultLimit = includeItems ? 40 : 20;
    const maxLimit = includeItems ? 60 : 60;
    const requestedLimit = Number(searchParams.get('limit') || String(defaultLimit));
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 10), maxLimit) : defaultLimit;
    const cursor = searchParams.get('cursor');

    const cacheKey = id ? `id:${id}:items:${includeItems ? 1 : 0}` : `list:${limit}:${cursor || ''}:items:${includeItems ? 1 : 0}`;
    const hit = cacheState.hotCache.get(cacheKey);
    if (hit && now - hit.at < HOT_TTL_MS) {
      const res = NextResponse.json({ success: true, data: hit.data, source: hit.source, cursor: cursor || null });
      res.headers.set('x-response-ms', String(Date.now() - startedAt));
      res.headers.set('x-cache', 'HIT');
      recordMetric({ at: Date.now(), name: 'GET /api/admin/orders', ms: Date.now() - startedAt, ok: true, meta: { cache: 'HIT' } });
      void maybeAlert({ at: Date.now(), name: 'GET /api/admin/orders', ms: Date.now() - startedAt, ok: true, meta: { cache: 'HIT' } });
      return res;
    }

    const existing = cacheState.inflight.get(cacheKey);
    if (existing) {
      if (cacheState.stale && now - cacheState.stale.at < STALE_TTL_MS) {
        const res = NextResponse.json({
          success: true,
          data: cacheState.stale.data,
          source: `${cacheState.stale.source}_stale`,
          cursor: cursor || null,
        });
        res.headers.set('x-response-ms', String(Date.now() - startedAt));
        res.headers.set('x-cache', 'STALE');
        recordMetric({ at: Date.now(), name: 'GET /api/admin/orders', ms: Date.now() - startedAt, ok: true, meta: { cache: 'STALE', inflight: true } });
        void maybeAlert({ at: Date.now(), name: 'GET /api/admin/orders', ms: Date.now() - startedAt, ok: true, meta: { cache: 'STALE', inflight: true } });
        return res;
      }

      const r = await existing;
      const res = NextResponse.json({ success: true, data: r.entry.data, source: r.entry.source, cursor: cursor || null, nextCursor: r.nextCursor });
      res.headers.set('x-response-ms', String(Date.now() - startedAt));
      res.headers.set('x-cache', 'COALESCED');
      recordMetric({ at: Date.now(), name: 'GET /api/admin/orders', ms: Date.now() - startedAt, ok: true, meta: { cache: 'COALESCED' } });
      void maybeAlert({ at: Date.now(), name: 'GET /api/admin/orders', ms: Date.now() - startedAt, ok: true, meta: { cache: 'COALESCED' } });
      return res;
    }

    const supabase = getSupabaseAdmin();

    if (id) {
      const work = (async () => {
        const row = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
        if (row.error) throw row.error;
        if (!row.data) throw new Error('Pedido não encontrado');
        const mapped = mapDbOrderToOrder(row.data);
        const entry: CacheEntry = { at: now, data: [mapped], source: 'by_id' };
        return { entry, nextCursor: null };
      })();

      cacheState.inflight.set(cacheKey, work);
      const { entry } = await work.finally(() => cacheState.inflight.delete(cacheKey));
      cacheState.hotCache.set(cacheKey, entry);
      cacheState.stale = entry;

      const res = NextResponse.json({ success: true, data: entry.data[0], source: entry.source });
      res.headers.set('x-response-ms', String(Date.now() - startedAt));
      res.headers.set('x-cache', 'MISS');
      recordMetric({ at: Date.now(), name: 'GET /api/admin/orders', ms: Date.now() - startedAt, ok: true, meta: { source: entry.source } });
      void maybeAlert({ at: Date.now(), name: 'GET /api/admin/orders', ms: Date.now() - startedAt, ok: true, meta: { source: entry.source } });
      return res;
    }

    const selectList = includeItems
      ? 'id,customer,items,total,discount,downPayment,installments,installmentValue,date,firstDueDate,status,paymentMethod,installmentDetails,sellerId,sellerName,commission,commissionPaid,isCommissionManual,observations,source,created_at,updated_at'
      : 'id,customer,total,discount,downPayment,installments,installmentValue,date,firstDueDate,status,paymentMethod,sellerId,sellerName,source,created_at,updated_at';

    const work = (async () => {
      const ordered = cursor
        ? await supabase.from('orders').select(selectList).lt('date', cursor).order('date', { ascending: false }).limit(limit)
        : await supabase.from('orders').select(selectList).order('date', { ascending: false }).limit(limit);

      if (ordered.error) {
        const msg = String(ordered.error.message || '').toLowerCase();
        if (msg.includes('statement timeout')) {
          const byId = await supabase.from('orders').select(selectList).order('id', { ascending: false }).limit(Math.min(limit, 100));
          if (!byId.error) {
            const mapped = (byId.data || []).map(mapDbOrderToOrder);
            const entry: CacheEntry = { at: now, data: mapped, source: 'by_id' };
            return { entry, nextCursor: null };
          }

          const plain = await supabase.from('orders').select(selectList).limit(Math.min(limit, 60));
          if (plain.error) throw plain.error;
          const mapped = (plain.data || []).map(mapDbOrderToOrder);
          const entry: CacheEntry = { at: now, data: mapped, source: 'plain' };
          return { entry, nextCursor: null };
        }
        throw ordered.error;
      }

      const mapped = (ordered.data || []).map(mapDbOrderToOrder);
      const nextCursor = (ordered.data || [])[(ordered.data || []).length - 1]?.date || null;
      const entry: CacheEntry = { at: now, data: mapped, source: 'by_date' };
      return { entry, nextCursor };
    })();

    cacheState.inflight.set(cacheKey, work);
    const { entry, nextCursor } = await work.finally(() => cacheState.inflight.delete(cacheKey));

    cacheState.hotCache.set(cacheKey, entry);
    cacheState.stale = entry;

    const res = NextResponse.json({ success: true, data: entry.data, source: entry.source, cursor: cursor || null, nextCursor });
    res.headers.set('x-response-ms', String(Date.now() - startedAt));
    res.headers.set('x-cache', 'MISS');
    while (cacheState.hotCache.size > 200) {
      const firstKey = cacheState.hotCache.keys().next().value as string | undefined;
      if (!firstKey) break;
      cacheState.hotCache.delete(firstKey);
    }
    recordMetric({ at: Date.now(), name: 'GET /api/admin/orders', ms: Date.now() - startedAt, ok: true, meta: { source: entry.source } });
    void maybeAlert({ at: Date.now(), name: 'GET /api/admin/orders', ms: Date.now() - startedAt, ok: true, meta: { source: entry.source } });
    return res;
  } catch (e: any) {
    const now = Date.now();
    const ms = now - startedAt;
    recordMetric({ at: now, name: 'GET /api/admin/orders', ms, ok: false, meta: { error: e?.message } });
    void maybeAlert({ at: now, name: 'GET /api/admin/orders', ms, ok: false, meta: { error: e?.message } });

    const cacheState = getCacheState();
    if (cacheState.stale && now - cacheState.stale.at < STALE_TTL_MS) {
      const res = NextResponse.json({
        success: true,
        data: cacheState.stale.data,
        source: `${cacheState.stale.source}_stale`,
      });
      res.headers.set('x-response-ms', String(ms));
      res.headers.set('x-cache', 'STALE');
      return res;
    }

    return NextResponse.json({ success: false, error: e?.message || 'Falha ao buscar pedidos' }, { status: 500 });
  }
}
