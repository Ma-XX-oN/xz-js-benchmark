import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import {
  generateIncompressibleCorpus,
  generateJsonlCorpus,
  generateModerateCorpus,
  hashFile
} from './corpus.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const workRoot = path.join(repoRoot, '.benchmark-work');
const resultRoot = path.join(repoRoot, 'benchmark-results');
const repetitions = Number(process.env.BENCH_REPETITIONS || 3);
const corpusBytes = Number(process.env.BENCH_CORPUS_BYTES || 32 * 1024 * 1024);
const corpusSelection = process.env.BENCH_CORPUS_KIND || 'all';
const preset = Number(process.env.BENCH_PRESET || 6);
const xz = process.env.XZ_BIN || 'xz';

assert(Number.isInteger(repetitions) && repetitions > 0);
assert(Number.isInteger(corpusBytes) && corpusBytes > 0);
assert(Number.isInteger(preset) && preset >= 0 && preset <= 9);
assert(['all', 'jsonl', 'moderate', 'incompressible'].includes(corpusSelection));

const definitions = [
  { kind: 'jsonl', label: 'Highly compressible JSONL', create: generateJsonlCorpus, ratio: [0, 0.10] },
  { kind: 'moderate', label: 'Moderately compressible 50/50 mixed data', create: generateModerateCorpus, ratio: [0.40, 0.60] },
  { kind: 'incompressible', label: 'Incompressible high-entropy data', create: generateIncompressibleCorpus, ratio: [0.99, 1.02] }
];
const selected = corpusSelection === 'all' ? definitions : definitions.filter(x => x.kind === corpusSelection);

fs.rmSync(workRoot, { recursive: true, force: true });
fs.rmSync(resultRoot, { recursive: true, force: true });
fs.mkdirSync(path.join(workRoot, 'corpora'), { recursive: true });
fs.mkdirSync(path.join(workRoot, 'out'), { recursive: true });
fs.mkdirSync(resultRoot, { recursive: true });

const metadata = {
  timestamp: new Date().toISOString(),
  workflowRunId: process.env.GITHUB_RUN_ID || null,
  gitSha: process.env.GITHUB_SHA || null,
  node: process.version,
  platform: `${process.platform} ${process.arch}`,
  release: os.release(),
  cpuModel: os.cpus()[0]?.model || 'unknown',
  logicalCpus: os.cpus().length,
  totalMemoryBytes: os.totalmem(),
  settings: { format: 'xz', method: 'LZMA2', preset, repetitions, warmupRuns: 1 }
};
const corpora = [];

for (const definition of selected) {
  const source = path.join(workRoot, 'corpora', `${definition.kind}.bin`);
  const corpus = definition.create(source, corpusBytes);
  const implementations = [
    await runNative(definition.kind, source),
    await runLzmaWasm(definition.kind, source),
    await runNodeLiblzma(definition.kind, source)
  ];
  for (const implementation of implementations) {
    for (const run of implementation.runs) verifyXz(run.output, corpus.sha256);
  }
  const summary = implementations.map(entry => summarize(entry, corpus.bytes));
  assert(summary.every(row => row.ratio >= definition.ratio[0] && row.ratio <= definition.ratio[1]), `${definition.kind} ratio outside expected range`);
  corpora.push({ corpus: { ...corpus, kind: definition.kind, label: definition.label, ratioExpected: definition.ratio }, summary, rawResults: implementations });
}

const output = { metadata, corpora };
fs.writeFileSync(path.join(resultRoot, 'results.json'), `${JSON.stringify(output, null, 2)}\n`);
fs.writeFileSync(path.join(resultRoot, 'summary.md'), renderMarkdown(metadata, corpora));
console.log(renderMarkdown(metadata, corpora));

async function runNative(kind, source) {
  const runs = [];
  const warmup = path.join(workRoot, 'out', `${kind}-native-warmup.xz`);
  nativeOnce(source, warmup);
  fs.rmSync(warmup, { force: true });
  for (let i = 0; i < repetitions; i += 1) {
    runs.push(nativeOnce(source, path.join(workRoot, 'out', `${kind}-native-${i + 1}.xz`)));
  }
  return { id: `native-xz-preset-${preset}`, api: 'native-cli', streaming: true, runs };
}

function nativeOnce(source, output) {
  const input = fs.readFileSync(source);
  const start = performance.now();
  const result = childProcess.spawnSync(xz, [`-${preset}`, '-c'], { input, maxBuffer: Math.max(input.length * 2, 128 * 1024 * 1024) });
  const compressionMs = performance.now() - start;
  assert.equal(result.status, 0, String(result.stderr));
  fs.writeFileSync(output, result.stdout);
  return { initMs: 0, compressionMs, archiveBytes: result.stdout.length, output };
}

async function runLzmaWasm(kind, source) {
  const modStart = performance.now();
  const mod = await import('lzma-wasm');
  const importMs = performance.now() - modStart;
  const initStart = performance.now();
  await mod.initWasm();
  const initMs = performance.now() - initStart + importMs;
  const input = new Uint8Array(fs.readFileSync(source));
  mod.compress(input, { format: 'xz', level: preset });
  const runs = [];
  for (let i = 0; i < repetitions; i += 1) {
    const start = performance.now();
    const compressed = mod.compress(input, { format: 'xz', level: preset });
    const compressionMs = performance.now() - start;
    const output = path.join(workRoot, 'out', `${kind}-lzma-wasm-${i + 1}.xz`);
    fs.writeFileSync(output, compressed);
    runs.push({ initMs: i === 0 ? initMs : 0, compressionMs, archiveBytes: compressed.byteLength, output });
  }
  return { id: 'lzma-wasm-1.0.7', api: 'one-shot', streaming: false, runs };
}

async function runNodeLiblzma(kind, source) {
  const modStart = performance.now();
  const mod = await import('node-liblzma/wasm');
  const initMs = performance.now() - modStart;
  await nodeLiblzmaStreamOnce(mod, source, path.join(workRoot, 'out', `${kind}-node-liblzma-warmup.xz`));
  fs.rmSync(path.join(workRoot, 'out', `${kind}-node-liblzma-warmup.xz`), { force: true });
  const runs = [];
  for (let i = 0; i < repetitions; i += 1) {
    const output = path.join(workRoot, 'out', `${kind}-node-liblzma-${i + 1}.xz`);
    const run = await nodeLiblzmaStreamOnce(mod, source, output);
    runs.push({ initMs: i === 0 ? initMs : 0, ...run });
  }
  return { id: 'node-liblzma-5.1.3-wasm', api: 'web-transform-stream', streaming: true, runs };
}

async function nodeLiblzmaStreamOnce(mod, source, output) {
  const input = new Uint8Array(fs.readFileSync(source));
  const start = performance.now();
  const stream = new Blob([input]).stream().pipeThrough(mod.createXz({ preset }));
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
  const compressionMs = performance.now() - start;
  fs.writeFileSync(output, compressed);
  return { compressionMs, archiveBytes: compressed.byteLength, output };
}

function verifyXz(archive, expectedHash) {
  const test = childProcess.spawnSync(xz, ['-t', archive], { encoding: 'utf8' });
  assert.equal(test.status, 0, test.stderr || test.stdout);
  const result = childProcess.spawnSync(xz, ['-dc', archive], { maxBuffer: 128 * 1024 * 1024 });
  assert.equal(result.status, 0, String(result.stderr));
  const temp = `${archive}.raw`;
  fs.writeFileSync(temp, result.stdout);
  assert.equal(hashFile(temp), expectedHash);
  fs.rmSync(temp, { force: true });
}

function summarize(entry, inputBytes) {
  const times = entry.runs.map(x => x.compressionMs).sort((a, b) => a - b);
  const sizes = entry.runs.map(x => x.archiveBytes);
  assert(sizes.every(size => size === sizes[0]), `${entry.id} output size varied`);
  const medianMs = median(times);
  return {
    id: entry.id,
    api: entry.api,
    streaming: entry.streaming,
    medianMs,
    minMs: Math.min(...times),
    maxMs: Math.max(...times),
    throughputMiBPerSec: inputBytes / 1024 / 1024 / (medianMs / 1000),
    archiveBytes: sizes[0],
    ratio: sizes[0] / inputBytes,
    medianInitMs: median(entry.runs.map(x => x.initMs).sort((a, b) => a - b))
  };
}

function median(values) {
  const i = Math.floor(values.length / 2);
  return values.length % 2 ? values[i] : (values[i - 1] + values[i]) / 2;
}

function renderMarkdown(common, results) {
  const lines = [
    '# XZ JavaScript/WASM compression benchmark', '',
    `- CPU: ${common.cpuModel}`,
    `- Logical CPUs: ${common.logicalCpus}`,
    `- Node: ${common.node}`,
    `- Settings: XZ / LZMA2 / preset ${common.settings.preset}`,
    `- Measured repetitions: ${common.settings.repetitions} after 1 warm-up`, ''
  ];
  for (const result of results) {
    lines.push(`## ${result.corpus.label}`, '', `- Input: ${(result.corpus.bytes / 1024 / 1024).toFixed(2)} MiB`, '', '| Implementation | API | Streaming | Median compression | MiB/s | Archive MiB | Ratio | Median init |', '|---|---|---|---:|---:|---:|---:|---:|');
    for (const row of [...result.summary].sort((a, b) => a.medianMs - b.medianMs)) {
      lines.push(`| ${row.id} | ${row.api} | ${row.streaming} | ${row.medianMs.toFixed(1)} ms | ${row.throughputMiBPerSec.toFixed(2)} | ${(row.archiveBytes / 1024 / 1024).toFixed(3)} | ${(row.ratio * 100).toFixed(4)}% | ${row.medianInitMs.toFixed(1)} ms |`);
    }
    lines.push('');
  }
  lines.push('Every output passed native `xz -t`, native `xz -dc`, and exact SHA-256 verification of the decompressed bytes.', '');
  return `${lines.join('\n')}\n`;
}
