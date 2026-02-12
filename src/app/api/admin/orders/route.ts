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
    const searchTerm = searchParams.get('search')?.toLowerCase() || null;

    const defaultLimit = includeItems ? 40 : 20;
    const maxLimit = includeItems ? 60 : 40;
    const requestedLimit = searchParams.get('limit') === 'all' ? 10000 : Number(searchParams.get('limit') || String(defaultLimit));
    const isFetchAll = searchParams.get('limit') === 'all';
    const limit = isFetchAll ? 10000 : (Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 10), maxLimit) : defaultLimit);
    const cursor = searchParams.get('cursor');

    const cacheKey = id ? `id:${id}:items:${includeItems ? 1 : 0}` : `list:${isFetchAll ? 'all' : limit}:${cursor || ''}:items:${includeItems ? 1 : 0}:search:${searchTerm || ''}`;
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
      : 'id,customer,items,total,discount,downPayment,installments,installmentValue,date,firstDueDate,status,paymentMethod,installmentDetails,sellerId,sellerName,commission,commissionPaid,isCommissionManual,source,created_at,updated_at';

    const work = (async () => {
      const countRes = !cursor && !searchTerm ? await supabase.from('orders').select('id', { count: 'exact', head: true }) : null;
      const totalCount = countRes?.count || null;

      if (searchTerm) {
         // Busca global no banco de dados (limitada a 100 resultados por busca para performance)
         const { data, error } = await supabase
           .from('orders')
           .select(selectList)
           .or(`id.ilike.%${searchTerm}%,customer->>name.ilike.%${searchTerm}%,customer->>cpf.ilike.%${searchTerm}%`)
           .order('date', { ascending: false })
           .limit(100);

         if (error) throw error;
         const mapped = (data || []).map(mapDbOrderToOrder);
         const entry: CacheEntry = { at: now, data: mapped, source: 'search' };
         return { entry, nextCursor: null, totalCount: mapped.length };
       }

      if (isFetchAll) {
        let allData: any[] = [];
        let lastId: string | null = null;
        let hasMore = true;
        
        while (hasMore) {
          let query = supabase
            .from('orders')
            .select(selectList)
            .order('id', { ascending: true })
            .limit(1000);
            
          if (lastId) query = query.gt('id', lastId);
          
          const { data, error } = await query;
          if (error) throw error;
          
          if (!data || data.length === 0) {
            hasMore = false;
          } else {
            allData = allData.concat(data);
            lastId = data[data.length - 1].id;
            if (data.length < 1000) hasMore = false;
          }
        }

        const mapped = allData.map(mapDbOrderToOrder);
        const entry: CacheEntry = { at: now, data: mapped, source: 'all' };
        return { entry, nextCursor: null, totalCount: mapped.length };
      }

      const parseCursor = (raw: string | null) => {
        if (!raw) return { date: null as string | null, id: null as string | null };
        const s = String(raw);
        const idx = s.lastIndexOf('|');
        if (idx > 0 && idx < s.length - 1) {
          return { date: s.slice(0, idx), id: s.slice(idx + 1) };
        }
        return { date: s, id: null };
      };

      const cursorParsed = parseCursor(cursor);
      const cursorDate = cursorParsed.date;
      const cursorId = cursorParsed.id;
      const cursorTime = cursorDate ? Date.parse(cursorDate) : NaN;

      const overfetchLimit = Math.min(limit * 2, 120);
      const idPageRaw = cursorDate
        ? await supabase
            .from('orders')
            .select('id,date')
            .lte('date', cursorDate)
            .order('date', { ascending: false })
            .order('id', { ascending: false })
            .limit(overfetchLimit)
        : await supabase.from('orders').select('id,date').order('date', { ascending: false }).order('id', { ascending: false }).limit(limit);
      if (idPageRaw.error) throw idPageRaw.error;
      let idPage = (idPageRaw.data || []) as any[];
      if (cursorDate) {
        idPage = idPage.filter((r) => {
          const rowDate = String(r?.date || '');
          const rowId = String(r?.id || '');
          const rowTime = Date.parse(rowDate);

          if (Number.isFinite(cursorTime) && Number.isFinite(rowTime)) {
            if (rowTime < cursorTime) return true;
            if (rowTime > cursorTime) return false;
            return cursorId ? rowId < cursorId : false;
          }

          if (rowDate < cursorDate) return true;
          if (rowDate > cursorDate) return false;
          return cursorId ? rowId < cursorId : false;
        });
      }
      idPage = idPage.slice(0, limit);

      const ids: string[] = idPage.map((r: any) => String(r.id)).filter((v: string) => Boolean(v));
      if (ids.length === 0) {
        const entry: CacheEntry = { at: now, data: [], source: 'by_date_ids' };
        return { entry, nextCursor: null };
      }


      const fetchChunk = async (chunk: string[]): Promise<any[]> => {
        const res = await supabase.from('orders').select(selectList).in('id', chunk);
        if (!res.error) return res.data || [];
        const msg = String(res.error.message || '').toLowerCase();
        if (msg.includes('statement timeout') && chunk.length > 1) {
          const mid = Math.ceil(chunk.length / 2);
          const left = await fetchChunk(chunk.slice(0, mid));
          const right = await fetchChunk(chunk.slice(mid));
          return [...left, ...right];
        }
        throw res.error;
      };

      const byId = new Map<string, any>();
      const chunkSize = 15;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const rows = await fetchChunk(chunk);
        for (const r of rows) {
          byId.set(String((r as any).id), r);
        }
      }
      const orderedRows = ids.map((id) => byId.get(id)).filter(Boolean);

      const mapped = orderedRows.map(mapDbOrderToOrder);
      const last = idPage[idPage.length - 1];
      const nextCursor = last?.date && last?.id ? `${String(last.date)}|${String(last.id)}` : null;
      const entry: CacheEntry = { at: now, data: mapped, source: 'by_date_ids' };
      return { entry, nextCursor, totalCount };
    })();

    cacheState.inflight.set(cacheKey, work);
    const { entry, nextCursor, totalCount } = await work.finally(() => cacheState.inflight.delete(cacheKey));

    cacheState.hotCache.set(cacheKey, entry);
    cacheState.stale = entry;

    const res = NextResponse.json({ success: true, data: entry.data, source: entry.source, cursor: cursor || null, nextCursor, totalCount });
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
