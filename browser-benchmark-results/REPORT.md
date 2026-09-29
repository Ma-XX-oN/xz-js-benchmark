# Browser compression and Brotli/WASM vs XZ/WASM

Same headless Chrome process, deterministic 32 MiB corpora, one warm-up, median of three measured runs. Every measured codec was decompressed and verified byte-for-byte.

Brotli/WASM: official Google Brotli, qualities 1, 4, 6, 9, 11, binary 778.0 KiB. XZ/WASM: preset 6.

## Graphs

![Compressed size](compression-ratio.svg)

![Compression speed](compression-speed.svg)

![Decompression speed](decompression-speed.svg)

## Measurements

### Highly compressible JSONL

| Codec | Bytes | Ratio | Compress MiB/s | Decompress MiB/s |
|---|---:|---:|---:|---:|
| gzip | 365,083 | 1.0880% | 245.78 | 723.98 |
| deflate | 365,071 | 1.0880% | 245.59 | 756.50 |
| deflate-raw | 365,065 | 1.0880% | 250.39 | 778.59 |
| brotli | unsupported | unsupported | unsupported | unsupported |
| zstd | unsupported | unsupported | unsupported | unsupported |
| brotli-wasm-q1 | 172,686 | 0.5146% | 3333.33 | 2500.00 |
| brotli-wasm-q4 | 122,405 | 0.3648% | 228.73 | 2758.62 |
| brotli-wasm-q6 | 86,366 | 0.2574% | 202.28 | 3018.87 |
| brotli-wasm-q9 | 85,749 | 0.2556% | 132.62 | 3076.92 |
| brotli-wasm-q11 | 88,117 | 0.2626% | 2.02 | 2857.14 |
| xz-wasm | 92,172 | 0.2747% | 12.26 | 327.87 |

### Moderately compressible 50/50 mixed data

| Codec | Bytes | Ratio | Compress MiB/s | Decompress MiB/s |
|---|---:|---:|---:|---:|
| gzip | 16,928,281 | 50.4502% | 81.80 | 427.24 |
| deflate | 16,928,269 | 50.4502% | 82.41 | 430.11 |
| deflate-raw | 16,928,263 | 50.4502% | 84.03 | 442.60 |
| brotli | unsupported | unsupported | unsupported | unsupported |
| zstd | unsupported | unsupported | unsupported | unsupported |
| brotli-wasm-q1 | 16,787,648 | 50.0311% | 551.72 | 632.41 |
| brotli-wasm-q4 | 16,779,081 | 50.0056% | 203.82 | 642.57 |
| brotli-wasm-q6 | 16,779,197 | 50.0059% | 75.19 | 643.86 |
| brotli-wasm-q9 | 16,780,278 | 50.0091% | 17.99 | 643.86 |
| brotli-wasm-q11 | 16,779,573 | 50.0070% | 0.77 | 646.46 |
| xz-wasm | 16,997,048 | 50.6552% | 6.22 | 37.32 |

### Incompressible high-entropy data

| Codec | Bytes | Ratio | Compress MiB/s | Decompress MiB/s |
|---|---:|---:|---:|---:|
| gzip | 33,564,695 | 100.0306% | 45.64 | 418.30 |
| deflate | 33,564,683 | 100.0306% | 43.91 | 298.23 |
| deflate-raw | 33,564,677 | 100.0305% | 45.68 | 428.38 |
| brotli | unsupported | unsupported | unsupported | unsupported |
| zstd | unsupported | unsupported | unsupported | unsupported |
| brotli-wasm-q1 | 33,554,465 | 100.0001% | 1481.48 | 3200.00 |
| brotli-wasm-q4 | 33,554,449 | 100.0001% | 347.45 | 3137.25 |
| brotli-wasm-q6 | 33,554,512 | 100.0002% | 89.66 | 3106.80 |
| brotli-wasm-q9 | 33,554,520 | 100.0003% | 55.49 | 3076.92 |
| brotli-wasm-q11 | 33,554,536 | 100.0003% | 1.41 | 3018.87 |
| xz-wasm | 33,556,156 | 100.0051% | 2.47 | 236.34 |

## Interpretation

For highly compressible JSONL, Brotli/WASM q9 produced **85,749 bytes (0.2556%)** versus XZ/WASM preset 6 at **92,172 bytes (0.2747%)**. q9 compressed at **132.62 MiB/s** versus XZ at **12.26 MiB/s**, and decompressed at **3,076.92 MiB/s** versus **327.87 MiB/s**.

Brotli q6 was slightly larger (86,366 bytes) but faster (202.28 MiB/s). q11 was both slower and larger than q9 on this corpus.

Chrome 153 did not expose native Brotli or Zstd through `CompressionStream`; these Brotli rows are the official Google implementation compiled to WebAssembly.
