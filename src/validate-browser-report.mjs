import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('browser-benchmark-results');
const data = JSON.parse(fs.readFileSync(path.join(dir, 'results.json'), 'utf8'));
for (const prefix of ['brotli-wasm-q', 'xz-wasm-p', 'zstd-wasm-l']) {
  for (const corpus of ['jsonl', 'moderate', 'incompressible']) {
    assert(data.results.some(row => row.supported && row.corpus === corpus && row.codec.startsWith(prefix)),
      `missing ${prefix} / ${corpus}`);
  }
}
assert.equal(data.metadata.emscriptenVersion, '3.1.51');
assert.deepEqual(data.metadata.buildOptimization, { brotli: '-Os', zstd: '-Os', xz: '-Os' });

for (const file of ['compression-ratio.svg', 'compression-speed.svg', 'decompression-speed.svg']) {
  const svg = fs.readFileSync(path.join(dir, file), 'utf8');
  for (const color of ['#0072B2', '#D55E00', '#009E73']) assert(svg.includes(color), `${file}: missing ${color}`);
  assert(svg.includes('stroke-dasharray="9 5"'), `${file}: missing moderate dash`);
  assert(svg.includes('stroke-dasharray="2 4"'), `${file}: missing incompressible dash`);
  assert(svg.includes('<circle'), `${file}: missing circle markers`);
  assert(svg.includes('<rect'), `${file}: missing square markers`);
  assert(svg.includes(' Z"'), `${file}: missing triangle markers`);
  assert(!svg.includes('panel'), `${file}: unexpected panel marker`);
  assert(svg.includes('text-anchor="end"'), `${file}: missing numeric Y-axis ticks`);
  const expectedUnit = file === 'compression-ratio.svg' ? 'Percent of input (%)' : 'Throughput (MiB/s)';
  assert(svg.includes(expectedUnit), `${file}: missing Y-axis unit ${expectedUnit}`);
}
const report = fs.readFileSync(path.join(dir, 'REPORT.md'), 'utf8');
for (const name of ['Brotli', 'Zstd', 'XZ']) assert(report.includes(name), `report missing ${name}`);
assert(report.includes('optimization preflight'));
assert(report.includes('Browser-native CompressionStream support'));
assert(report.includes('Brotli/WASM supported and measured'));
assert(report.includes('Zstd/WASM supported and measured'));
assert(report.includes('XZ/WASM supported and measured'));
console.log('Generated benchmark report validation passed.');
