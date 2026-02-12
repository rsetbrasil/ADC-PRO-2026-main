import { NextResponse } from 'next/server';
import { listMetrics } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit') || '100');
  return NextResponse.json({ success: true, data: listMetrics(limit) });
}

