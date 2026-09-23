# Performance

Benchmark and load-test scripts for verifying production readiness. Both use
only built-in Node modules plus the existing library API — no extra
dependencies.

## Render benchmark

Measures render latency (p50/p95/min/max/mean) for PNG templates, GIF
templates, and a 2x2 layout composition via the library API.

```sh
npm run benchmark
```

Options (env vars):

| Variable           | Default                | Description                        |
| ------------------ | ---------------------- | ---------------------------------- |
| `BENCH_ITERATIONS` | `10`                   | Timed iterations per template      |
| `BENCH_OUT`        | `benchmarks/latest.md` | Markdown report output path        |

A markdown report is written to `benchmarks/latest.md`.

## HTTP load test

Starts the local HTTP server in-process, then hammers it with concurrent
`POST /api/render` and `GET /api/templates` requests, reporting throughput
(rps), latency percentiles, and error rate. Exits non-zero if any request
fails.

```sh
npm run load-test
```

Options (env vars):

| Variable            | Default | Description                                    |
| ------------------- | ------- | ---------------------------------------------- |
| `LOAD_DURATION_MS`  | `10000` | Test duration in milliseconds                  |
| `LOAD_CONCURRENCY`  | `16`    | Number of concurrent workers                   |
| `LOAD_RENDER_RATIO` | `0.3`   | Fraction of requests that are renders (0..1)   |
| `LOAD_URL`          | (unset) | Target an already-running server instead       |

## Reference results

Recorded on Ubuntu (Node v20.18.1), 2026-07-21.

### Benchmark (`npm run benchmark`, 10 iterations)

| template             | kind   | p50 (ms) | p95 (ms) | output bytes |
| -------------------- | ------ | -------- | -------- | ------------ |
| drake                | png    | 78.9     | 101.9    | 1331302      |
| distracted-boyfriend | png    | 83.4     | 91.6     | 1644638      |
| anakin-padme-4-panel | png    | 64.2     | 74.7     | 1344577      |
| always-has-been      | png    | 48.9     | 58.0     | 680461       |
| expanding-brain      | png    | 75.0     | 85.3     | 1344326      |
| blinking-white-guy   | gif    | 602.6    | 701.7    | 562811       |
| confused-monkey      | gif    | 1630.2   | 1811.6   | 987954       |
| layout-2x2           | layout | 154.7    | 183.8    | 747099       |

### Load test (`LOAD_DURATION_MS=5000 npm run load-test`, concurrency 16)

| endpoint             | requests | rps  | p50 (ms) | p95 (ms) | errors |
| -------------------- | -------- | ---- | -------- | -------- | ------ |
| `POST /api/render`   | 98       | 17.1 | 833.7    | 994.8    | 0      |
| `GET /api/templates` | 232      | 40.4 | 16.9     | 61.1     | 0      |
| total                | 330      | 57.4 | —        | —        | 0.00%  |

Render throughput is bounded by the server's render semaphore
(`limits.maxConcurrency()`), so p50 render latency under load reflects queue
wait plus single-render latency (~80 ms for PNG templates).
