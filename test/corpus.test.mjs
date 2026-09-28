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

test('deterministic corpora retain fixed hashes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xz-js-benchmark-'));
  try {
    const jsonl = path.join(root, 'jsonl.bin');
    const moderate = path.join(root, 'moderate.bin');
    const incompressible = path.join(root, 'incompressible.bin');
    generateJsonlCorpus(jsonl, bytes);
    generateModerateCorpus(moderate, bytes);
    generateIncompressibleCorpus(incompressible, bytes);
    assert.equal(hashFile(jsonl), '04f38e0679fa5988d9f2c9f792eef143020716151972906863ace09cbf33bbfa');
    assert.equal(hashFile(moderate), '7f947496e4b17ba6a73b21edc60aee3e87f32cc07d95c6f226273702fe6b9ac4');
    assert.equal(hashFile(incompressible), '781d1018c016c68882da4340097401709dde0397cf87a33dcfc525cf567c8db4');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
