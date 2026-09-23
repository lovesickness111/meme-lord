/**
 * HTTP load test: starts the local server, then hammers it with concurrent
 * render (POST /api/render) and list (GET /api/templates) requests, reporting
 * throughput, latency percentiles, and error rate. Built-ins only.
 *
 * Usage: npm run load-test
 * Env:   LOAD_DURATION_MS (default 10000), LOAD_CONCURRENCY (default 16),
 *        LOAD_RENDER_RATIO (0..1, default 0.3), LOAD_URL (skip embedded server)
 */
import { startServer } from '../src/index.js';

const DURATION_MS = parseInt(process.env.LOAD_DURATION_MS ?? '10000', 10);
const CONCURRENCY = parseInt(process.env.LOAD_CONCURRENCY ?? '16', 10);
const RENDER_RATIO = parseFloat(process.env.LOAD_RENDER_RATIO ?? '0.3');

const RENDER_SPEC = {
  base: { kind: 'template', id: 'drake' },
  texts: [
    { slot: 'no', text: 'load test' },
    { slot: 'yes', text: 'meme maker' },
  ],
};

interface Bucket {
  samples: number[];
  ok: number;
  errors: number;
}

const buckets: Record<'render' | 'list', Bucket> = {
  render: { samples: [], ok: 0, errors: 0 },
  list: { samples: [], ok: 0, errors: 0 },
};

async function hit(base: string): Promise<void> {
  const isRender = Math.random() < RENDER_RATIO;
  const bucket = buckets[isRender ? 'render' : 'list'];
  const start = performance.now();
  try {
    const res = isRender
      ? await fetch(`${base}/api/render`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(RENDER_SPEC),
        })
      : await fetch(`${base}/api/templates`);
    await res.arrayBuffer();
    if (res.ok) bucket.ok++;
    else bucket.errors++;
  } catch {
    bucket.errors++;
  }
  bucket.samples.push(performance.now() - start);
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1);
  return sorted[Math.max(0, idx)]!;
}

function report(name: string, bucket: Bucket, elapsedMs: number): void {
  const total = bucket.ok + bucket.errors;
  const sorted = [...bucket.samples].sort((a, b) => a - b);
  console.log(
    `${name.padEnd(8)} requests=${total} rps=${((total / elapsedMs) * 1000).toFixed(1)} ` +
      `p50=${quantile(sorted, 0.5).toFixed(1)}ms p95=${quantile(sorted, 0.95).toFixed(1)}ms ` +
      `p99=${quantile(sorted, 0.99).toFixed(1)}ms max=${quantile(sorted, 1).toFixed(1)}ms ` +
      `errors=${bucket.errors} (${total ? ((bucket.errors / total) * 100).toFixed(2) : '0.00'}%)`,
  );
}

async function main(): Promise<void> {
  const embedded = process.env.LOAD_URL ? null : await startServer();
  const base = process.env.LOAD_URL ?? embedded!.url;
  console.log(
    `load test: ${base} duration=${DURATION_MS}ms concurrency=${CONCURRENCY} renderRatio=${RENDER_RATIO}`,
  );

  const started = performance.now();
  const deadline = started + DURATION_MS;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (performance.now() < deadline) await hit(base);
    }),
  );
  const elapsed = performance.now() - started;

  console.log('');
  report('render', buckets.render, elapsed);
  report('list', buckets.list, elapsed);
  const totalErrors = buckets.render.errors + buckets.list.errors;
  const total = buckets.render.ok + buckets.render.errors + buckets.list.ok + buckets.list.errors;
  console.log(
    `\ntotal    requests=${total} rps=${((total / elapsed) * 1000).toFixed(1)} errorRate=${
      total ? ((totalErrors / total) * 100).toFixed(2) : '0.00'
    }%`,
  );

  await embedded?.close();
  if (totalErrors > 0) process.exitCode = 1;
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
