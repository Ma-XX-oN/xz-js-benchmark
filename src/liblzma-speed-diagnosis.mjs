import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { generateJsonlCorpus } from './corpus.mjs';

const root = path.resolve('.liblzma-speed-diagnosis');
fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
const sourcePath = path.join(root, 'jsonl.bin');
generateJsonlCorpus(sourcePath, 32 * 1024 * 1024);
const input = new Uint8Array(fs.readFileSync(sourcePath));
const chunkBytes = 64 * 1024;
const repeats = 3;

const direct = await import(pathToFileURL(path.resolve('prototype/direct-xz/pkg-web/direct_xz_wasm.js')));
const directWasm = fs.readFileSync(path.resolve('prototype/direct-xz/pkg-web/direct_xz_wasm_bg.wasm'));
direct.initSync({ module: directWasm });
const factory = (await import('../prototype/liblzma-wasm/liblzma.cjs')).default;
const wasmBinary = fs.readFileSync(new URL('../prototype/liblzma-wasm/liblzma.wasm', import.meta.url));
const mod = await factory({ wasmBinary });

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function finishLiblzma(enc, outPtrPtr, outLenPtr) {
  assert.equal(mod._dc_xz_encoder_finish(enc, outPtrPtr, outLenPtr), 1);
  const ptr = mod.HEAPU32[outPtrPtr >>> 2];
  const len = mod.HEAPU32[outLenPtr >>> 2];
  return len ? Buffer.from(mod.HEAPU8.slice(ptr, ptr + len)) : Buffer.alloc(0);
}

function runRust() {
  const encoder = new direct.XzEncoder(9);
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

function runLiblzmaProductionStyle() {
  const enc = mod._dc_xz_encoder_new(9);
  const parts = [];
  const start = performance.now();
  for (let offset = 0; offset < input.length; offset += chunkBytes) {
    const b = input.subarray(offset, Math.min(offset + chunkBytes, input.length));
    const p = mod._malloc(b.length);
    mod.HEAPU8.set(b, p);
    const outPtrPtr = mod._malloc(4);
    const outLenPtr = mod._malloc(4);
    assert.equal(mod._dc_xz_encoder_write(enc, p, b.length, outPtrPtr, outLenPtr), 1);
    const ptr = mod.HEAPU32[outPtrPtr >>> 2];
    const len = mod.HEAPU32[outLenPtr >>> 2];
    if (len) parts.push(Buffer.from(mod.HEAPU8.slice(ptr, ptr + len)));
    mod._free(p);
    mod._free(outPtrPtr);
    mod._free(outLenPtr);
  }
  const outPtrPtr = mod._malloc(4);
  const outLenPtr = mod._malloc(4);
  const tail = finishLiblzma(enc, outPtrPtr, outLenPtr);
  if (tail.length) parts.push(tail);
  const ms = performance.now() - start;
  mod._dc_xz_encoder_free(enc);
  mod._free(outPtrPtr);
  mod._free(outLenPtr);
  return { ms, bytes: Buffer.concat(parts).length };
}

function runLiblzmaReuseAllocations() {
  const enc = mod._dc_xz_encoder_new(9);
  const inputPtr = mod._malloc(chunkBytes);
  const outPtrPtr = mod._malloc(4);
  const outLenPtr = mod._malloc(4);
  const parts = [];
  const start = performance.now();
  for (let offset = 0; offset < input.length; offset += chunkBytes) {
    const b = input.subarray(offset, Math.min(offset + chunkBytes, input.length));
    mod.HEAPU8.set(b, inputPtr);
    assert.equal(mod._dc_xz_encoder_write(enc, inputPtr, b.length, outPtrPtr, outLenPtr), 1);
    const ptr = mod.HEAPU32[outPtrPtr >>> 2];
    const len = mod.HEAPU32[outLenPtr >>> 2];
    if (len) parts.push(Buffer.from(mod.HEAPU8.slice(ptr, ptr + len)));
  }
  const tail = finishLiblzma(enc, outPtrPtr, outLenPtr);
  if (tail.length) parts.push(tail);
  const ms = performance.now() - start;
  mod._dc_xz_encoder_free(enc);
  mod._free(inputPtr);
  mod._free(outPtrPtr);
  mod._free(outLenPtr);
  return { ms, bytes: Buffer.concat(parts).length };
}

function runLiblzmaPreloaded() {
  const enc = mod._dc_xz_encoder_new(9);
  const inputPtr = mod._malloc(input.length);
  mod.HEAPU8.set(input, inputPtr);
  const outPtrPtr = mod._malloc(4);
  const outLenPtr = mod._malloc(4);
  const parts = [];
  const start = performance.now();
  for (let offset = 0; offset < input.length; offset += chunkBytes) {
    const lenIn = Math.min(chunkBytes, input.length - offset);
    assert.equal(mod._dc_xz_encoder_write(enc, inputPtr + offset, lenIn, outPtrPtr, outLenPtr), 1);
    const ptr = mod.HEAPU32[outPtrPtr >>> 2];
    const len = mod.HEAPU32[outLenPtr >>> 2];
    if (len) parts.push(Buffer.from(mod.HEAPU8.slice(ptr, ptr + len)));
  }
  const tail = finishLiblzma(enc, outPtrPtr, outLenPtr);
  if (tail.length) parts.push(tail);
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
  liblzmaProduction64k: runLiblzmaProductionStyle,
  liblzmaReuse64k: runLiblzmaReuseAllocations,
  liblzmaPreloaded64k: runLiblzmaPreloaded,
  nativeXz9: runNative
};

const result = { inputBytes: input.length, chunkBytes, repeats, cases: {} };
for (const [name, fn] of Object.entries(cases)) {
  const runs = [];
  for (let index = 0; index < repeats; index += 1) runs.push(fn());
  const byteSet = new Set(runs.map(run => run.bytes));
  assert.equal(byteSet.size, 1, `${name} archive size must be stable`);
  result.cases[name] = {
    runs,
    medianMs: median(runs.map(run => run.ms)),
    archiveBytes: runs[0].bytes
  };
}

fs.mkdirSync('benchmark-results', { recursive: true });
fs.writeFileSync(
  'benchmark-results/liblzma-speed-diagnosis.json',
  JSON.stringify(result, null, 2) + '\n'
);
console.log(JSON.stringify(result, null, 2));
