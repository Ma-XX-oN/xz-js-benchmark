import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { generateJsonlCorpus } from './corpus.mjs';

const root = path.resolve('.liblzma-modern-compare');
fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
const sourcePath = path.join(root, 'jsonl.bin');
generateJsonlCorpus(sourcePath, 32 * 1024 * 1024);
const input = new Uint8Array(fs.readFileSync(sourcePath));
const chunkBytes = 64 * 1024;
const repeats = 5;

const rust = await import(pathToFileURL(path.resolve('prototype/direct-xz/pkg-web/direct_xz_wasm.js')));
await rust.default({ module_or_path: fs.readFileSync('prototype/direct-xz/pkg-web/direct_xz_wasm_bg.wasm') });

async function loadLiblzma(name) {
  const dir = path.resolve(`prototype/liblzma-wasm/${name}`);
  const factory = (await import(pathToFileURL(path.join(dir, 'liblzma.cjs')))).default;
  const wasmBinary = fs.readFileSync(path.join(dir, 'liblzma.wasm'));
  return factory({ wasmBinary });
}

const scalar = await loadLiblzma('scalar');
const simd = await loadLiblzma('simd128');

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function runRust() {
  const encoder = new rust.XzEncoder(9);
  const parts = [];
  const start = performance.now();
  for (let offset = 0; offset < input.length; offset += chunkBytes) {
    const out = encoder.write(input.subarray(offset, Math.min(offset + chunkBytes, input.length)));
    if (out.byteLength) parts.push(Buffer.from(out));
  }
  const tail = encoder.finish();
  if (tail.byteLength) parts.push(Buffer.from(tail));
  return { ms: performance.now() - start, bytes: Buffer.concat(parts).length };
}

function runLiblzma(mod) {
  const enc = mod._dc_xz_encoder_new(9);
  assert.notEqual(enc, 0);
  const inputPtr = mod._malloc(chunkBytes);
  const outPtrPtr = mod._malloc(4);
  const outLenPtr = mod._malloc(4);
  const parts = [];
  const start = performance.now();
  for (let offset = 0; offset < input.length; offset += chunkBytes) {
    const bytes = input.subarray(offset, Math.min(offset + chunkBytes, input.length));
    mod.HEAPU8.set(bytes, inputPtr);
    assert.equal(mod._dc_xz_encoder_write(enc, inputPtr, bytes.length, outPtrPtr, outLenPtr), 1);
    const outPtr = mod.HEAPU32[outPtrPtr >>> 2];
    const outLen = mod.HEAPU32[outLenPtr >>> 2];
    if (outLen) parts.push(Buffer.from(mod.HEAPU8.slice(outPtr, outPtr + outLen)));
  }
  assert.equal(mod._dc_xz_encoder_finish(enc, outPtrPtr, outLenPtr), 1);
  const tailPtr = mod.HEAPU32[outPtrPtr >>> 2];
  const tailLen = mod.HEAPU32[outLenPtr >>> 2];
  if (tailLen) parts.push(Buffer.from(mod.HEAPU8.slice(tailPtr, tailPtr + tailLen)));
  const ms = performance.now() - start;
  mod._dc_xz_encoder_free(enc);
  mod._free(inputPtr);
  mod._free(outPtrPtr);
  mod._free(outLenPtr);
  return { ms, bytes: Buffer.concat(parts).length };
}

function runNative() {
  const start = performance.now();
  const result = spawnSync('xz', ['-9', '-c', sourcePath], { maxBuffer: 64 * 1024 * 1024 });
  const ms = performance.now() - start;
  assert.equal(result.status, 0, String(result.stderr));
  return { ms, bytes: result.stdout.length };
}

const cases = {
  rust64k: runRust,
  liblzmaScalar64k: () => runLiblzma(scalar),
  liblzmaSimd12864k: () => runLiblzma(simd),
  nativeXz9: runNative
};
const runs = Object.fromEntries(Object.keys(cases).map(name => [name, []]));
const orders = [
  ['rust64k', 'liblzmaScalar64k', 'liblzmaSimd12864k', 'nativeXz9'],
  ['liblzmaSimd12864k', 'nativeXz9', 'rust64k', 'liblzmaScalar64k'],
  ['nativeXz9', 'liblzmaScalar64k', 'liblzmaSimd12864k', 'rust64k'],
  ['liblzmaScalar64k', 'rust64k', 'nativeXz9', 'liblzmaSimd12864k'],
  ['rust64k', 'liblzmaSimd12864k', 'liblzmaScalar64k', 'nativeXz9']
];

for (let index = 0; index < repeats; index += 1) {
  for (const name of orders[index]) runs[name].push(cases[name]());
}

const result = { inputBytes: input.length, chunkBytes, repeats, cases: {} };
for (const [name, values] of Object.entries(runs)) {
  assert.equal(new Set(values.map(run => run.bytes)).size, 1, `${name} archive size must be stable`);
  result.cases[name] = {
    runs: values,
    medianMs: median(values.map(run => run.ms)),
    archiveBytes: values[0].bytes
  };
}

fs.mkdirSync('benchmark-results', { recursive: true });
fs.writeFileSync(
  'benchmark-results/liblzma-modern-compare.json',
  JSON.stringify(result, null, 2) + '\n'
);
console.log(JSON.stringify(result, null, 2));
