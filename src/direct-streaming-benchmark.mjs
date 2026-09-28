import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { generateJsonlCorpus } from '../src/corpus.mjs';

const root = path.resolve('.direct-benchmark');
fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
const source = path.join(root, 'jsonl.bin');
generateJsonlCorpus(source, 32 * 1024 * 1024);
const input = new Uint8Array(fs.readFileSync(source));
const direct = await import(pathToFileURL(path.resolve('prototype/direct-xz/pkg/direct_xz_wasm.js')));
const oneShot = await import('lzma-wasm');
await oneShot.initWasm();

const chunkSizes = [input.byteLength, 4 * 1024 * 1024, 1024 * 1024, 64 * 1024];
const directRuns = [];
for (const chunkBytes of chunkSizes) {
const encoder = new direct.XzEncoder(9);
const outputs = [];
let emittedBeforeFinish = 0;
const directStart = performance.now();
for (let offset = 0; offset < input.length; offset += chunkBytes) {
  const out = encoder.write(input.subarray(offset, Math.min(offset + chunkBytes, input.length)));
  emittedBeforeFinish += out.byteLength;
  if (out.byteLength) outputs.push(Buffer.from(out));
}
const tail = encoder.finish();
outputs.push(Buffer.from(tail));
const directMs = performance.now() - directStart;
const directBytes = Buffer.concat(outputs);
directRuns.push({ chunkBytes, compressionMs: directMs, archiveBytes: directBytes.byteLength, emittedBeforeFinish });
}
const directResult = directRuns.at(-1);

const oneStart = performance.now();
const oneBytes = oneShot.compress(input, { format: 'xz', level: 9 });
const oneMs = performance.now() - oneStart;

assert(emittedBeforeFinish > 0, 'encoder must emit drainable bytes before finish');
const finalEncoder = new direct.XzEncoder(9);
const finalParts = [Buffer.from(finalEncoder.write(input)), Buffer.from(finalEncoder.finish())];
fs.writeFileSync(path.join(root, 'direct.xz'), Buffer.concat(finalParts));
fs.writeFileSync(path.join(root, 'oneshot.xz'), oneBytes);
const result = {
  inputBytes: input.byteLength,
  directRuns,
  direct: directResult,
  oneShot: { compressionMs: oneMs, archiveBytes: oneBytes.byteLength }
};
fs.mkdirSync('benchmark-results', { recursive: true });
fs.writeFileSync('benchmark-results/direct-streaming-benchmark.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
