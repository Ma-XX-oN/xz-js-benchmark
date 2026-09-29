# Browser compression and Brotli/WASM vs XZ/WASM

This report compares codecs in the same headless Chrome process on the same deterministic corpora.  Each measured result follows one warm-up and uses the median of three measured repetitions.  Every measured codec is decompressed and checked byte-for-byte against its source on every run.

## Environment

- Browser: HeadlessChrome/153.0.0.0 on Linux x64
- CPU: AMD EPYC 9V74 80-Core Processor, 4 logical CPUs
- Corpus size: 32.00 MiB each
- XZ: node-liblzma 5.1.3 WebAssembly, preset 6
- Brotli: official Google Brotli WebAssembly, qualities 1, 4, 6, 9, 11
- Brotli WASM binary: 796,677 bytes (778.0 KiB)
- Authoritative measurement run: 36513813896, commit 4451b9fb74c8a1dc3bf0a9ad09d76bea14d8ef08

## Browser codec support

Chrome 153 accepts `gzip`, `deflate`, and `deflate-raw` through CompressionStream.  It rejects `brotli` and `zstd`.  This does not mean Brotli is absent from Chrome's HTTP stack; it is not exposed through CompressionStream in this Chrome build.  The Brotli measurements below therefore use the official Google Brotli implementation compiled to WebAssembly, not a native Chrome CompressionStream codec.

## Graphs

### Compression ability

![Compressed size](compression-ratio.svg)

### Compression speed

![Compression speed](compression-speed.svg)

### Decompression speed

![Decompression speed](decompression-speed.svg)

## Key measurements

| Corpus | Codec | Ratio | Compress MiB/s | Decompress MiB/s |
|---|---|---:|---:|---:|
| JSONL | gzip | 1.0880% | 245.78 | 723.98 |
| JSONL | Brotli/WASM q1 | 0.5146% | 3333.33 | 2500.00 |
| JSONL | Brotli/WASM q4 | 0.3648% | 228.73 | 2758.62 |
| JSONL | Brotli/WASM q6 | **0.2574%** | **202.28** | **3018.87** |
| JSONL | Brotli/WASM q9 | **0.2556%** | **132.62** | **3076.92** |
| JSONL | Brotli/WASM q11 | 0.2626% | 2.02 | 2857.14 |
| JSONL | XZ/WASM preset 6 | 0.2747% | 12.26 | 327.87 |
| 50/50 mixed | Brotli/WASM q1 | 50.0311% | 551.72 | 632.41 |
| 50/50 mixed | Brotli/WASM q4 | **50.0056%** | **203.82** | **642.57** |
| 50/50 mixed | XZ/WASM preset 6 | 50.6552% | 6.22 | 37.32 |
| incompressible | Brotli/WASM q1 | 100.0001% | 1481.48 | 3200.00 |
| incompressible | Brotli/WASM q4 | 100.0001% | 347.45 | 3137.25 |
| incompressible | XZ/WASM preset 6 | 100.0051% | 2.47 | 236.34 |

## What the measurements show

For the conversation-like JSONL corpus, Brotli/WASM q6 and q9 both beat XZ/WASM preset 6 on all three measured axes.  Q6 produces 86,366 bytes versus XZ's 92,172 bytes (6.30% smaller), compresses 16.50 times as fast, and decompresses 9.21 times as fast.  Q9 produces 85,749 bytes (6.97% smaller than XZ), compresses 10.82 times as fast, and decompresses 9.38 times as fast.

Brotli q11 is not useful on this corpus: it is slower than XZ and produces a larger archive than Brotli q6/q9.  Brotli q1 is extraordinarily fast but gives up compression ratio.  Q4 is also a strong speed-oriented setting.

On the 50/50 mixed corpus, Brotli q4 is both smaller and about 32.8 times faster to compress than XZ, while decompression is about 17.2 times faster.  On incompressible data, Brotli also has lower framing overhead and much higher throughput.

These results are specific to this deterministic corpus, browser/runner and implementations.  They establish that the official Google Brotli WASM build is a serious candidate for DC; they do not imply identical ratios or throughput for every conversation.

The complete per-run raw measurements are emitted as `results.json` in the workflow artifact, and the report/graphs are generated directly from those measurements.
