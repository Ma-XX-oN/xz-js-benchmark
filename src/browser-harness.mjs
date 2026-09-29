import { compress as xzCompress, decompress as xzDecompress, initWasm as initXzWasm } from 'lzma-wasm';

const NATIVE_FORMATS = ['gzip', 'deflate', 'deflate-raw', 'brotli', 'zstd'];
const BROTLI_QUALITIES = [1, 4, 6, 9, 11];
const XZ_PRESETS = [1, 4, 6, 9];
const ZSTD_LEVELS = [1, 4, 6, 9, 11];

window.runCompressionBenchmark = async ({ corpora, repetitions }) => {
  const support = Object.fromEntries(NATIVE_FORMATS.map(format => [format, supportsNative(format)]));
  await initXzWasm();
  const brotli = await createBrotliWasm();
  const zstd = await createZstdWasm();
  const results = [];
  for (const corpus of corpora) {
    const input = new Uint8Array(await (await fetch(corpus.url)).arrayBuffer());
    for (const format of NATIVE_FORMATS) {
      if (!support[format]) {
        results.push({ corpus: corpus.kind, codec: format, supported: false });
        continue;
      }
      results.push(await measureCodec(corpus.kind, format, input, repetitions, {
        compress: data => nativeTransform(data, new CompressionStream(format)),
        decompress: data => nativeTransform(data, new DecompressionStream(format))
      }));
    }
    for (const quality of BROTLI_QUALITIES) {
      results.push(await measureCodec(corpus.kind, `brotli-wasm-q${quality}`, input, repetitions, {
        compress: data => brotli.compress(data, quality),
        decompress: data => brotli.decompress(data, input.byteLength)
      }));
    }
    for (const level of ZSTD_LEVELS) {
      results.push(await measureCodec(corpus.kind, `zstd-wasm-l${level}`, input, repetitions, {
        compress: data => zstd.compress(data, level),
        decompress: data => zstd.decompress(data, input.byteLength)
      }));
    }
    for (const preset of XZ_PRESETS) {
      results.push(await measureCodec(corpus.kind, `xz-wasm-p${preset}`, input, repetitions, {
        compress: data => Promise.resolve(xzCompress(data, { format: 'xz', level: preset })),
        decompress: data => Promise.resolve(xzDecompress(data))
      }));
    }
  }
  return {
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency,
    support,
    repetitions,
    xzPresets: XZ_PRESETS,
    brotliQualities: BROTLI_QUALITIES,
    brotliWasmBytes: brotli.wasmBytes,
    zstdLevels: ZSTD_LEVELS,
    zstdWasmBytes: zstd.wasmBytes,
    results
  };
};

function supportsNative(format) {
  try {
    new CompressionStream(format);
    new DecompressionStream(format);
    return true;
  } catch {
    return false;
  }
}

async function measureCodec(corpus, codec, input, repetitions, transforms) {
  const warmCompressed = await transforms.compress(input);
  const warmRestored = await transforms.decompress(warmCompressed);
  assertBytesEqual(warmRestored, input, `${corpus}/${codec} warm-up`);

  const runs = [];
  for (let i = 0; i < repetitions; i += 1) {
    const compressStart = performance.now();
    const compressed = await transforms.compress(input);
    const compressionMs = performance.now() - compressStart;

    const decompressStart = performance.now();
    const restored = await transforms.decompress(compressed);
    const decompressionMs = performance.now() - decompressStart;
    assertBytesEqual(restored, input, `${corpus}/${codec} run ${i + 1}`);

    runs.push({
      compressionMs,
      decompressionMs,
      archiveBytes: compressed.byteLength
    });
  }

  const archiveBytes = runs[0].archiveBytes;
  if (!runs.every(run => run.archiveBytes === archiveBytes)) {
    throw new Error(`${corpus}/${codec}: output size varied between repetitions`);
  }
  return {
    corpus,
    codec,
    supported: true,
    inputBytes: input.byteLength,
    archiveBytes,
    ratio: archiveBytes / input.byteLength,
    compressionMs: median(runs.map(run => run.compressionMs)),
    decompressionMs: median(runs.map(run => run.decompressionMs)),
    compressionMiBPerSec: throughput(input.byteLength, median(runs.map(run => run.compressionMs))),
    decompressionMiBPerSec: throughput(input.byteLength, median(runs.map(run => run.decompressionMs))),
    runs
  };
}

async function nativeTransform(input, transform) {
  const output = new Blob([input]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(output).arrayBuffer());
}

function assertBytesEqual(actual, expected, label) {
  if (actual.byteLength !== expected.byteLength) {
    throw new Error(`${label}: length ${actual.byteLength} != ${expected.byteLength}`);
  }
  for (let i = 0; i < expected.byteLength; i += 1) {
    if (actual[i] !== expected[i]) throw new Error(`${label}: byte mismatch at ${i}`);
  }
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const i = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2;
}

function throughput(bytes, ms) {
  return bytes / 1024 / 1024 / (ms / 1000);
}

async function createBrotliWasm() {
  const bytes = new Uint8Array(await (await fetch('/brotli.wasm')).arrayBuffer());
  const { instance } = await WebAssembly.instantiate(bytes, { env: { emscripten_notify_memory_growth: () => {} }, wasi_snapshot_preview1: { proc_exit: code => { throw new Error(`Brotli WASM proc_exit ${code}`); } } });
  const e = instance.exports;
  const u32 = ptr => new Uint32Array(e.memory.buffer, ptr, 1);
  return {
    wasmBytes: bytes.byteLength,
    compress(input, quality) {
      const inPtr = e.br_malloc(input.byteLength);
      const cap = Number(e.br_max_compressed_size(input.byteLength));
      const outPtr = e.br_malloc(cap);
      const sizePtr = e.br_malloc(4);
      try {
        new Uint8Array(e.memory.buffer, inPtr, input.byteLength).set(input);
        u32(sizePtr)[0] = cap;
        if (!e.br_compress(quality, 22, 0, inPtr, input.byteLength, outPtr, sizePtr)) throw new Error('Brotli compression failed');
        return new Uint8Array(e.memory.buffer, outPtr, u32(sizePtr)[0]).slice();
      } finally { e.br_free(sizePtr); e.br_free(outPtr); e.br_free(inPtr); }
    },
    decompress(input, expectedBytes) {
      const inPtr = e.br_malloc(input.byteLength);
      const outPtr = e.br_malloc(expectedBytes);
      const sizePtr = e.br_malloc(4);
      try {
        new Uint8Array(e.memory.buffer, inPtr, input.byteLength).set(input);
        u32(sizePtr)[0] = expectedBytes;
        if (!e.br_decompress(inPtr, input.byteLength, outPtr, sizePtr)) throw new Error('Brotli decompression failed');
        return new Uint8Array(e.memory.buffer, outPtr, u32(sizePtr)[0]).slice();
      } finally { e.br_free(sizePtr); e.br_free(outPtr); e.br_free(inPtr); }
    }
  };
}

async function createZstdWasm() {
  const bytes = new Uint8Array(await (await fetch('/zstd.wasm')).arrayBuffer());
  const { instance } = await WebAssembly.instantiate(bytes, { env: { emscripten_notify_memory_growth: () => {} }, wasi_snapshot_preview1: { proc_exit: code => { throw new Error(`Zstd WASM proc_exit ${code}`); } } });
  const e = instance.exports;
  return {
    wasmBytes: bytes.byteLength,
    compress(input, level) {
      const inPtr = e.zs_malloc(input.byteLength);
      const cap = Number(e.zs_compress_bound(input.byteLength));
      const outPtr = e.zs_malloc(cap);
      try {
        new Uint8Array(e.memory.buffer, inPtr, input.byteLength).set(input);
        const size = Number(e.zs_compress(level, inPtr, input.byteLength, outPtr, cap));
        if (e.zs_is_error(size)) throw new Error('Zstd compression failed');
        return new Uint8Array(e.memory.buffer, outPtr, size).slice();
      } finally { e.zs_free(outPtr); e.zs_free(inPtr); }
    },
    decompress(input, expectedBytes) {
      const inPtr = e.zs_malloc(input.byteLength);
      const outPtr = e.zs_malloc(expectedBytes);
      try {
        new Uint8Array(e.memory.buffer, inPtr, input.byteLength).set(input);
        const size = Number(e.zs_decompress(inPtr, input.byteLength, outPtr, expectedBytes));
        if (e.zs_is_error(size)) throw new Error('Zstd decompression failed');
        return new Uint8Array(e.memory.buffer, outPtr, size).slice();
      } finally { e.zs_free(outPtr); e.zs_free(inPtr); }
    }
  };
}
