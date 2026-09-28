import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

test('direct WASM encoder preserves one XZ stream across many writes', async () => {
  const pkg = path.resolve('prototype/direct-xz/pkg/direct_xz_wasm.js');
  assert.ok(fs.existsSync(pkg), 'build prototype/direct-xz first');
  const mod = await import(pathToFileURL(pkg));
  const encoder = new mod.XzEncoder(9);
  const records = Array.from({ length: 10000 }, (_, i) =>
    JSON.stringify({ timestamp: `2026-09-28T03:${String(i % 60).padStart(2, '0')}:00-04:00`, seq: i, text: 'repeated conversation payload '.repeat(8) }) + '\n'
  );
  const chunks = [];
  for (const record of records) {
    const out = encoder.write(new TextEncoder().encode(record));
    if (out.length) chunks.push(Buffer.from(out));
  }
  chunks.push(Buffer.from(encoder.finish()));
  const compressed = Buffer.concat(chunks);
  const expected = Buffer.from(records.join(''));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'direct-xz-'));
  try {
    const archive = path.join(root, 'stream.xz');
    fs.writeFileSync(archive, compressed);
    const integrity = childProcess.spawnSync('xz', ['-t', archive], { encoding: 'utf8' });
    assert.equal(integrity.status, 0, integrity.stderr);
    const decoded = childProcess.spawnSync('xz', ['-dc', archive], { maxBuffer: expected.length * 2 + 1024 });
    assert.equal(decoded.status, 0, String(decoded.stderr));
    assert.deepEqual(decoded.stdout, expected);
    assert.equal(compressed.subarray(0, 6).toString('hex'), 'fd377a585a00');
    assert.equal(compressed.indexOf(Buffer.from('fd377a585a00', 'hex'), 1), -1, 'writes must not create concatenated XZ streams');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
