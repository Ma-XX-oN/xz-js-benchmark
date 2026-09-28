import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const JSONL_RECORD_BYTES = 1024;
const MIXED_BLOCK_BYTES = 64 * 1024;
const MIXED_PATTERN = Buffer.from(
  'xz-js-benchmark moderate compressible block; conversation JSONL source code logs WebAssembly LZMA2. '
);

export function generateJsonlCorpus(file, targetBytes = 32 * 1024 * 1024) {
  assert(Number.isInteger(targetBytes) && targetBytes > 0);
  assert.equal(targetBytes % JSONL_RECORD_BYTES, 0);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fd = fs.openSync(file, 'w');
  try {
    const records = targetBytes / JSONL_RECORD_BYTES;
    for (let id = 0; id < records; id += 1) {
      const role = id % 3 === 0 ? 'user' : 'assistant';
      const prefix = `{"id":${id},"role":"${role}","sequence":${id % 997},"content":"`;
      const suffix = '"}\n';
      const fillBytes = JSONL_RECORD_BYTES - Buffer.byteLength(prefix) - Buffer.byteLength(suffix);
      const repeated = ('Conversation benchmark JSONL record. Typed arrays WebAssembly compression source code logs. ')
        .repeat(Math.ceil(fillBytes / 91));
      const line = Buffer.from(prefix + repeated.slice(0, fillBytes) + suffix);
      assert.equal(line.length, JSONL_RECORD_BYTES);
      fs.writeSync(fd, line);
    }
  } finally {
    fs.closeSync(fd);
  }
  return corpusInfo(file, targetBytes);
}

export function generateModerateCorpus(file, targetBytes = 32 * 1024 * 1024) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const cipher = createCtrCipher('xz-js-benchmark-moderate-v1');
  const fd = fs.openSync(file, 'w');
  let written = 0;
  let blockIndex = 0;
  try {
    while (written < targetBytes) {
      const count = Math.min(MIXED_BLOCK_BYTES, targetBytes - written);
      const block = blockIndex % 2 === 0
        ? Buffer.from(MIXED_PATTERN.toString().repeat(Math.ceil(count / MIXED_PATTERN.length))).subarray(0, count)
        : cipher.update(Buffer.alloc(count));
      fs.writeSync(fd, block);
      written += count;
      blockIndex += 1;
    }
    assert.equal(cipher.final().length, 0);
  } finally {
    fs.closeSync(fd);
  }
  return corpusInfo(file, targetBytes);
}

export function generateIncompressibleCorpus(file, targetBytes = 32 * 1024 * 1024) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const cipher = createCtrCipher('xz-js-benchmark-incompressible-v1');
  const fd = fs.openSync(file, 'w');
  let written = 0;
  const zeroChunk = Buffer.alloc(1024 * 1024);
  try {
    while (written < targetBytes) {
      const count = Math.min(zeroChunk.length, targetBytes - written);
      const encrypted = cipher.update(zeroChunk.subarray(0, count));
      fs.writeSync(fd, encrypted);
      written += encrypted.length;
    }
    assert.equal(cipher.final().length, 0);
  } finally {
    fs.closeSync(fd);
  }
  return corpusInfo(file, targetBytes);
}

export function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function createCtrCipher(label) {
  const key = crypto.createHash('sha256').update(`${label}:key`).digest();
  const iv = crypto.createHash('sha256').update(`${label}:iv`).digest().subarray(0, 16);
  return crypto.createCipheriv('aes-256-ctr', key, iv);
}

function corpusInfo(file, expectedBytes) {
  assert.equal(fs.statSync(file).size, expectedBytes);
  return { bytes: expectedBytes, sha256: hashFile(file) };
}
