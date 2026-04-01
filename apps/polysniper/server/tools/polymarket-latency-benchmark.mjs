#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns/promises';
import { performance } from 'node:perf_hooks';
import { execFile } from 'node:child_process';

function parseArgs(argv) {
  const out = {
    iterations: 20,
    timeoutMs: 7000,
    delayMs: 120,
    output: '',
    targets: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--iterations') out.iterations = Number(argv[++i] ?? out.iterations);
    else if (token === '--timeout-ms') out.timeoutMs = Number(argv[++i] ?? out.timeoutMs);
    else if (token === '--delay-ms') out.delayMs = Number(argv[++i] ?? out.delayMs);
    else if (token === '--output') out.output = argv[++i] ?? '';
    else if (token === '--target') out.targets.push(argv[++i] ?? '');
  }

  if (!Number.isFinite(out.iterations) || out.iterations < 1) out.iterations = 20;
  if (!Number.isFinite(out.timeoutMs) || out.timeoutMs < 200) out.timeoutMs = 7000;
  if (!Number.isFinite(out.delayMs) || out.delayMs < 0) out.delayMs = 120;

  return out;
}

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return null;
  if (sortedValues.length === 1) return sortedValues[0];
  const idx = Math.ceil((p / 100) * sortedValues.length) - 1;
  const clamped = Math.min(sortedValues.length - 1, Math.max(0, idx));
  return sortedValues[clamped];
}

function summarizeDurations(durations) {
  if (!durations.length) {
    return {
      count: 0,
      minMs: null,
      maxMs: null,
      avgMs: null,
      p50Ms: null,
      p95Ms: null,
    };
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);

  return {
    count: sorted.length,
    minMs: Number(sorted[0].toFixed(2)),
    maxMs: Number(sorted[sorted.length - 1].toFixed(2)),
    avgMs: Number((total / sorted.length).toFixed(2)),
    p50Ms: Number(percentile(sorted, 50).toFixed(2)),
    p95Ms: Number(percentile(sorted, 95).toFixed(2)),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function timedDnsLookup(hostname) {
  const start = performance.now();
  const records = await dns.lookup(hostname, { all: true });
  const end = performance.now();
  return {
    hostname,
    durationMs: Number((end - start).toFixed(2)),
    addresses: records.map((record) => record.address),
  };
}

async function timedHttpProbe(url, timeoutMs) {
  const start = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'polysniper-latency-benchmark/1.0',
      },
    });
    await response.arrayBuffer();
    const end = performance.now();

    return {
      ok: true,
      status: response.status,
      durationMs: Number((end - start).toFixed(2)),
    };
  } catch (error) {
    const end = performance.now();
    const fetchError = error instanceof Error ? error.message : 'unknown_error';
    const curlProbe = await timedCurlProbe(url, timeoutMs);
    if (curlProbe.ok) {
      return {
        ...curlProbe,
        transport: 'curl_fallback',
      };
    }
    return {
      ok: false,
      status: null,
      durationMs: Number((end - start).toFixed(2)),
      error: `fetch:${fetchError}; curl:${curlProbe.error ?? 'failed'}`,
      transport: 'fetch',
    };
  } finally {
    clearTimeout(timeout);
  }
}

function timedCurlProbe(url, timeoutMs) {
  return new Promise((resolve) => {
    const start = performance.now();
    const timeoutSec = Math.max(1, Math.ceil(timeoutMs / 1000));
    execFile(
      'curl',
      [
        '-sS',
        '--max-time',
        String(timeoutSec),
        '-o',
        '/dev/null',
        '-w',
        '%{time_total} %{http_code}',
        url,
      ],
      (error, stdout, stderr) => {
        const end = performance.now();

        if (error) {
          resolve({
            ok: false,
            status: null,
            durationMs: Number((end - start).toFixed(2)),
            error: (stderr || error.message || 'curl_failed').trim(),
          });
          return;
        }

        const raw = String(stdout || '').trim();
        const [timeTotalSec, statusCode] = raw.split(/\s+/);
        const durationMs = Number(timeTotalSec) * 1000;

        resolve({
          ok: Number.isFinite(durationMs),
          status: Number(statusCode) || null,
          durationMs: Number((Number.isFinite(durationMs) ? durationMs : end - start).toFixed(2)),
          transport: 'curl',
        });
      },
    );
  });
}

function parseTargets(rawTargets) {
  const defaults = [
    ['clob_api', 'https://clob.polymarket.com/'],
    ['gamma_api', 'https://gamma-api.polymarket.com/'],
    ['ws_edge_https_probe', 'https://ws-subscriptions-clob.polymarket.com/'],
  ];

  if (!rawTargets.length) {
    return defaults.map(([label, url]) => ({ label, url }));
  }

  return rawTargets
    .filter(Boolean)
    .map((entry) => {
      const idx = entry.indexOf('=');
      if (idx === -1) return { label: entry, url: entry };
      return {
        label: entry.slice(0, idx).trim(),
        url: entry.slice(idx + 1).trim(),
      };
    });
}

function renderConsoleSummary(report) {
  const lines = [];
  lines.push('Polymarket Latency Benchmark Summary');
  lines.push(`timestamp: ${report.timestampUtc}`);
  lines.push(`iterations: ${report.config.iterations}, timeoutMs: ${report.config.timeoutMs}`);
  lines.push('');
  lines.push('label | success/total | p50 ms | p95 ms | avg ms | min ms | max ms');
  lines.push('----- | ------------- | ------ | ------ | ------ | ------ | ------');

  for (const target of report.targets) {
    const s = target.summary;
    lines.push(
      `${target.label} | ${s.successCount}/${s.totalCount} | ${String(s.p50Ms)} | ${String(s.p95Ms)} | ${String(
        s.avgMs,
      )} | ${String(s.minMs)} | ${String(s.maxMs)}`,
    );
  }

  return lines.join('\n');
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const targets = parseTargets(args.targets);

  const report = {
    timestampUtc: new Date().toISOString(),
    hostLabel: process.env.PSNP_BENCH_HOST_LABEL || 'local',
    config: {
      iterations: args.iterations,
      timeoutMs: args.timeoutMs,
      delayMs: args.delayMs,
      node: process.version,
    },
    targets: [],
  };

  for (const target of targets) {
    const hostname = new URL(target.url).hostname;
    let dnsProbe;
    try {
      dnsProbe = await timedDnsLookup(hostname);
    } catch (error) {
      dnsProbe = {
        hostname,
        durationMs: null,
        addresses: [],
        error: error instanceof Error ? error.message : 'dns_lookup_failed',
      };
    }

    const samples = [];
    for (let i = 0; i < args.iterations; i += 1) {
      const probe = await timedHttpProbe(target.url, args.timeoutMs);
      samples.push({
        index: i + 1,
        ...probe,
      });
      if (i < args.iterations - 1 && args.delayMs > 0) {
        await sleep(args.delayMs);
      }
    }

    const successDurations = samples.filter((sample) => sample.ok).map((sample) => sample.durationMs);
    const summary = summarizeDurations(successDurations);

    report.targets.push({
      label: target.label,
      url: target.url,
      dns: dnsProbe,
      samples,
      summary: {
        totalCount: samples.length,
        successCount: successDurations.length,
        failureCount: samples.length - successDurations.length,
        ...summary,
      },
    });
  }

  if (args.output) {
    fs.mkdirSync(path.dirname(args.output), { recursive: true });
    fs.writeFileSync(args.output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  console.log(renderConsoleSummary(report));
  if (args.output) {
    console.log(`\nWrote: ${args.output}`);
  }

  const anySuccess = report.targets.some((target) => target.summary.successCount > 0);
  if (!anySuccess) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('benchmark_failed', error instanceof Error ? error.message : error);
  process.exit(1);
});
