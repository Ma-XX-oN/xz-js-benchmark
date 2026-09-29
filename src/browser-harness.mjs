import { createUnxz, createXz, initModule } from 'node-liblzma';

const NATIVE_FORMATS = ['gzip', 'deflate', 'deflate-raw', 'brotli', 'zstd'];

window.runCompressionBenchmark = async ({ corpora, repetitions, xzPreset }) => {
  const support = Object.fromEntries(NATIVE_FORMATS.map(format => [format, supportsNative(format)]));
  await initModule();
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
    results.push(await measureCodec(corpus.kind, 'xz-wasm', input, repetitions, {
      compress: data => nativeTransform(data, createXz({ preset: xzPreset })),
      decompress: data => nativeTransform(data, createUnxz())
    }));
  }
  return {
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency,
    support,
    repetitions,
    xzPreset,
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
