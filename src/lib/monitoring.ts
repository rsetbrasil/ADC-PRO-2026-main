type Metric = {
  at: number;
  name: string;
  ms: number;
  ok: boolean;
  meta?: Record<string, any>;
};

const MAX_METRICS = 500;
const metrics: Metric[] = [];

export function recordMetric(metric: Metric) {
  metrics.push(metric);
  if (metrics.length > MAX_METRICS) metrics.splice(0, metrics.length - MAX_METRICS);
}

export function listMetrics(limit = 100) {
  const n = Math.min(Math.max(limit, 1), MAX_METRICS);
  return metrics.slice(-n).reverse();
}

export async function maybeAlert(metric: Metric) {
  if (metric.ms <= 3000) return;

  const webhook = process.env.ALERT_WEBHOOK_URL;
  if (!webhook) {
    console.warn(`[ALERT] Slow response: ${metric.name} ${metric.ms}ms`);
    return;
  }

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'latency_alert',
        at: new Date(metric.at).toISOString(),
        name: metric.name,
        ms: metric.ms,
        ok: metric.ok,
        meta: metric.meta || {},
      }),
    });
  } catch {
  }
}

