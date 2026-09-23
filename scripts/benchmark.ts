/**
 * Render-latency benchmark: measures PNG, GIF, and layout rendering across a
 * representative set of templates using only the library API.
 *
 * Usage: npm run benchmark
 * Env:   BENCH_ITERATIONS (default 10), BENCH_OUT (markdown report path)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTemplate, listTemplates, renderMeme, templateImagePath } from '../src/index.js';
import type { MemeSpec } from '../src/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ITERATIONS = parseInt(process.env.BENCH_ITERATIONS ?? '10', 10);
const WARMUP = 2;

const IMAGE_TEMPLATES = [
  'drake', // small classic 2-slot
  'distracted-boyfriend', // wide photo
  'anakin-padme-4-panel', // large multi-panel
  'always-has-been', // tall
  'expanding-brain', // 4-slot vertical
];
const GIF_TEMPLATES = ['blinking-white-guy', 'confused-monkey'];

interface Stat {
  name: string;
  kind: string;
  iterations: number;
  p50: number;
  p95: number;
  min: number;
  max: number;
  mean: number;
  bytes: number;
}

function quantile(sorted: number[], q: number): number {
  const idx = Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1);
  return sorted[Math.max(0, idx)]!;
}

async function bench(name: string, kind: string, spec: MemeSpec): Promise<Stat> {
  for (let i = 0; i < WARMUP; i++) await renderMeme(spec);
  const samples: number[] = [];
  let bytes = 0;
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    const result = await renderMeme(spec);
    samples.push(performance.now() - start);
    bytes = result.bytes;
  }
  samples.sort((a, b) => a - b);
  return {
    name,
    kind,
    iterations: ITERATIONS,
    p50: quantile(samples, 0.5),
    p95: quantile(samples, 0.95),
    min: samples[0]!,
    max: samples[samples.length - 1]!,
    mean: samples.reduce((a, b) => a + b, 0) / samples.length,
    bytes,
  };
}

function templateSpec(id: string): MemeSpec {
  const t = getTemplate(id);
  return {
    base: { kind: 'template', id },
    texts: t.slots.map((s) => ({ slot: s.name, text: `benchmark ${s.name}` })),
    output: {},
  };
}

function ms(n: number): string {
  return n.toFixed(1);
}

async function main(): Promise<void> {
  const available = new Set(listTemplates().map((t) => t.id));
  const stats: Stat[] = [];

  for (const id of IMAGE_TEMPLATES.filter((id) => available.has(id))) {
    stats.push(await bench(id, 'png', templateSpec(id)));
    process.stdout.write('.');
  }
  for (const id of GIF_TEMPLATES.filter((id) => available.has(id))) {
    stats.push(await bench(id, 'gif', templateSpec(id)));
    process.stdout.write('.');
  }

  const cellImage = templateImagePath(getTemplate('drake'));
  stats.push(
    await bench('layout-2x2', 'layout', {
      base: { kind: 'layout', grid: [2, 2], cells: Array(4).fill({ image: cellImage }) },
      texts: [{ text: 'benchmark layout', x: '5%', y: '5%', width: '90%', height: '20%' }],
      output: {},
    }),
  );
  process.stdout.write('.\n\n');

  const header =
    '| template | kind | iters | p50 (ms) | p95 (ms) | min | max | mean | output bytes |';
  const sep = '| --- | --- | --- | --- | --- | --- | --- | --- | --- |';
  const rows = stats.map(
    (s) =>
      `| ${s.name} | ${s.kind} | ${s.iterations} | ${ms(s.p50)} | ${ms(s.p95)} | ${ms(s.min)} | ${ms(s.max)} | ${ms(s.mean)} | ${s.bytes} |`,
  );
  const table = [header, sep, ...rows].join('\n');
  console.log(table);

  const out = process.env.BENCH_OUT ?? join(ROOT, 'benchmarks', 'latest.md');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    out,
    `# Render benchmark\n\nDate: ${new Date().toISOString()}\nNode: ${process.version}\nIterations: ${ITERATIONS} (after ${WARMUP} warmup)\n\n${table}\n`,
  );
  console.log(`\nreport written to ${out}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
