import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import puppeteer from 'puppeteer-core';
import {
  generateIncompressibleCorpus,
  generateJsonlCorpus,
  generateModerateCorpus
} from './corpus.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const work = path.join(root, '.browser-benchmark-work');
const resultsDir = path.join(root, 'browser-benchmark-results');
const repetitions = Number(process.env.BENCH_REPETITIONS || 3);
const corpusBytes = Number(process.env.BENCH_CORPUS_BYTES || 32 * 1024 * 1024);
assert(Number.isInteger(repetitions) && repetitions > 0);
assert(Number.isInteger(corpusBytes) && corpusBytes > 0);

fs.rmSync(work, { recursive: true, force: true });
fs.rmSync(resultsDir, { recursive: true, force: true });
fs.mkdirSync(path.join(work, 'corpora'), { recursive: true });
fs.mkdirSync(resultsDir, { recursive: true });

const definitions = [
  ['jsonl', 'Highly compressible JSONL', generateJsonlCorpus],
  ['moderate', 'Moderately compressible 50/50 mixed data', generateModerateCorpus],
  ['incompressible', 'Incompressible high-entropy data', generateIncompressibleCorpus]
];
const corpora = definitions.map(([kind, label, create]) => {
  const file = path.join(work, 'corpora', `${kind}.bin`);
  const info = create(file, corpusBytes);
  return { kind, label, file, sha256: info.sha256, bytes: info.bytes, url: `/corpora/${kind}.bin` };
});

fs.copyFileSync(path.join(root, 'wasm', 'brotli.wasm'), path.join(work, 'brotli.wasm'));
fs.copyFileSync(path.join(root, 'wasm', 'zstd.wasm'), path.join(work, 'zstd.wasm'));
fs.copyFileSync(path.join(root, 'wasm', 'xz.wasm'), path.join(work, 'xz.wasm'));

await build({
  entryPoints: [path.join(here, 'browser-harness.mjs')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'chrome120',
  outfile: path.join(work, 'harness.js')
});

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/') return send(response, path.join(work, 'index.html'), 'text/html');
  if (pathname === '/harness.js') return send(response, path.join(work, 'harness.js'), 'text/javascript');
  if (pathname === '/brotli.wasm') return send(response, path.join(work, 'brotli.wasm'), 'application/wasm');
  if (pathname === '/zstd.wasm') return send(response, path.join(work, 'zstd.wasm'), 'application/wasm');
  if (pathname === '/xz.wasm') return send(response, path.join(work, 'xz.wasm'), 'application/wasm');
  const corpus = corpora.find(item => item.url === pathname);
  if (corpus) return send(response, corpus.file, 'application/octet-stream');
  response.writeHead(404).end();
});
fs.writeFileSync(path.join(work, 'index.html'), '<!doctype html><meta charset="utf-8"><script type="module" src="/harness.js"></script>\n');
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;

const executablePath = process.env.CHROME_BIN || '/usr/bin/google-chrome';
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  protocolTimeout: 15 * 60 * 1000,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});
try {
  const page = await browser.newPage();
  page.on('console', message => console.log('browser:', message.text()));
  page.on('pageerror', error => console.error('browser page error:', error));
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.runCompressionBenchmark === 'function');
  const browserResult = await page.evaluate(
    async config => window.runCompressionBenchmark(config),
    { corpora: corpora.map(({ kind, label, url }) => ({ kind, label, url })), repetitions }
  );
  const output = {
    metadata: {
      timestamp: new Date().toISOString(),
      gitSha: process.env.GITHUB_SHA || null,
      workflowRunId: process.env.GITHUB_RUN_ID || null,
      platform: `${process.platform} ${process.arch}`,
      release: os.release(),
      cpuModel: os.cpus()[0]?.model || 'unknown',
      logicalCpus: os.cpus().length,
      corpusBytes,
      repetitions,
      warmupRuns: 1,
      xzPresets: browserResult.xzPresets,
      xzWasmBytes: browserResult.xzWasmBytes,
      brotliQualities: browserResult.brotliQualities,
      brotliWasmBytes: browserResult.brotliWasmBytes,
      zstdLevels: browserResult.zstdLevels,
      zstdWasmBytes: browserResult.zstdWasmBytes,
      browser: browserResult.userAgent,
      browserHardwareConcurrency: browserResult.hardwareConcurrency,
      emscriptenVersion: '3.1.51',
      buildOptimization: { brotli: '-Os', zstd: '-Os', xz: '-Os' },
      upstreamCommits: { brotli: 'd5d3f45973da91c386dd7e1086b13facecfb4087', zstd: '01b7154f1172432f8abe9b3bb9909e14a1176b7d', xz: '3b1efb04d17c3a9ef7f473d73af13f1531428ffe' }
    },
    codecSupport: browserResult.support,
    corpora: corpora.map(({ file, url, ...rest }) => rest),
    results: browserResult.results
  };
  fs.writeFileSync(path.join(resultsDir, 'results.json'), JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify(output, null, 2));
} finally {
  await browser.close();
  server.close();
}

function send(response, file, contentType) {
  response.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': fs.statSync(file).size,
    'Cache-Control': 'no-store'
  });
  fs.createReadStream(file).pipe(response);
}

