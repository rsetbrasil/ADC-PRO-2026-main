import { NextResponse } from 'next/server';
import { listMetrics } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';

function percentile(values: number[], p: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit') || '200');
  const name = searchParams.get('name') || 'GET /api/admin/orders';

  const metrics = listMetrics(limit).filter((m) => m.name === name);
  const msValues = metrics.map((m) => m.ms);
  const errors = metrics.filter((m) => !m.ok).length;

  return NextResponse.json({
    success: true,
    data: {
      name,
      samples: metrics.length,
      errorRate: metrics.length ? errors / metrics.length : 0,
      p50: percentile(msValues, 50),
      p95: percentile(msValues, 95),
      p99: percentile(msValues, 99),
      max: msValues.length ? Math.max(...msValues) : null,
      last: metrics[0] || null,
    },
  });
}

