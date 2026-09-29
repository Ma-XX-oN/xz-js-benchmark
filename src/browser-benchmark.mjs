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

const xzWasmSource = path.join(root, 'node_modules', 'node-liblzma', 'lib', 'wasm', 'liblzma.wasm');
const xzWasmBytes = fs.statSync(xzWasmSource).size;
fs.copyFileSync(xzWasmSource, path.join(work, 'liblzma.wasm'));

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
  if (pathname === '/liblzma.wasm') return send(response, path.join(work, 'liblzma.wasm'), 'application/wasm');
  if (pathname === '/brotli.wasm') return send(response, path.join(work, 'brotli.wasm'), 'application/wasm');
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
      xzWasmBytes,
      brotliQualities: browserResult.brotliQualities,
      brotliWasmBytes: browserResult.brotliWasmBytes,
      browser: browserResult.userAgent,
      browserHardwareConcurrency: browserResult.hardwareConcurrency
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
