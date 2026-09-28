import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  generateIncompressibleCorpus,
  generateJsonlCorpus,
  generateModerateCorpus,
  hashFile
} from '../src/corpus.mjs';

const bytes = 1024 * 1024;

test('deterministic corpora reproduce identical bytes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xz-js-benchmark-'));
  try {
    for (const [name, generator] of [
      ['jsonl', generateJsonlCorpus],
      ['moderate', generateModerateCorpus],
      ['incompressible', generateIncompressibleCorpus]
    ]) {
      const first = path.join(root, `${name}-a.bin`);
      const second = path.join(root, `${name}-b.bin`);
      generator(first, bytes);
      generator(second, bytes);
      assert.equal(fs.statSync(first).size, bytes);
      assert.equal(fs.statSync(second).size, bytes);
      assert.equal(hashFile(first), hashFile(second));
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
