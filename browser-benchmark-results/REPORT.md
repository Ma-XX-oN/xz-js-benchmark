# Browser compression: Brotli/WASM vs XZ/WASM vs Zstd/WASM

This report compares codecs in the same headless Chrome process on the same deterministic corpora.  Each measured result follows one warm-up and uses the median of the measured repetitions.  Every measured codec is decompressed and checked byte-for-byte against its source on every run.

## Environment

- Browser: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36
- CPU: AMD EPYC 9V74 80-Core Processor
- Logical CPUs: 4
- Corpus size: 32.00 MiB each
- Repetitions: 3 measured after 1 warm-up
- XZ: upstream liblzma WebAssembly, presets 1, 4, 6, 9, binary 108.6 KiB
- Brotli: Google Brotli WebAssembly, qualities 1, 4, 6, 9, 11, binary 686.8 KiB
- Zstd: Facebook Zstandard WebAssembly, levels 1, 4, 6, 9, 11, binary 320.7 KiB
- Emscripten: 3.1.51; selected optimization: Brotli -Os, Zstd -Os, XZ -Os
- Upstream commits: Brotli `d5d3f45973da91c386dd7e1086b13facecfb4087`; Zstd `01b7154f1172432f8abe9b3bb9909e14a1176b7d`; XZ `3b1efb04d17c3a9ef7f473d73af13f1531428ffe`

Compiler optimization selection was established by the checked-in [optimization preflight](../optimization-preflight/SUMMARY.md) before this final benchmark.

### WebAssembly payload size

| Implementation | WASM bytes | KiB |
|---|---:|---:|
| Brotli/WASM | 703,298 | 686.8 |
| Zstd/WASM | 328,415 | 320.7 |
| XZ/WASM | 111,252 | 108.6 |

## Browser codec support

Support is runtime-detected in the browser named above.  An unsupported entry means that this browser rejects the corresponding `CompressionStream` / `DecompressionStream` format; it does not mean the compression algorithm is absent from the browser's HTTP stack.

As of September 2026, Chromium/Chrome does **not** expose Brotli through `CompressionStream`, despite supporting Brotli HTTP content encoding.  Chromium issue 463397980 tracks that still-unshipped API support.  Firefox 147+ and Safari 18.4+ do expose native Brotli through `CompressionStream`.  Therefore this Chrome run cannot produce a legitimate browser-native Brotli measurement.

- Supported: `gzip`
- Supported: `deflate`
- Supported: `deflate-raw`
- Unsupported: `brotli`
- Unsupported: `zstd`

## Graphs

### Compression ability

![Compressed size](compression-ratio.svg)

### Compression speed

![Compression speed](compression-speed.svg)

### Decompression speed

![Decompression speed](decompression-speed.svg)

## Measurements

### Highly compressible JSONL

| Codec | Compressed bytes | Ratio | Compress ms | Compress MiB/s | Decompress ms | Decompress MiB/s |
|---|---:|---:|---:|---:|---:|---:|
| gzip | 365,083 | 1.0880% | 165.0 | 193.94 | 54.1 | 591.50 |
| deflate | 365,071 | 1.0880% | 163.8 | 195.36 | 53.3 | 600.38 |
| deflate-raw | 365,065 | 1.0880% | 161.2 | 198.51 | 51.9 | 616.57 |
| brotli | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| zstd | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| brotli-wasm-q1 | 172,686 | 0.5146% | 20.6 | 1553.40 | 15.4 | 2077.92 |
| brotli-wasm-q4 | 122,405 | 0.3648% | 107.9 | 296.57 | 13.2 | 2424.24 |
| brotli-wasm-q6 | 86,366 | 0.2574% | 213.5 | 149.88 | 12.4 | 2580.65 |
| brotli-wasm-q9 | 85,749 | 0.2556% | 356.8 | 89.69 | 12.6 | 2539.68 |
| brotli-wasm-q11 | 88,117 | 0.2626% | 20841.8 | 1.54 | 13.4 | 2388.06 |
| zstd-wasm-l1 | 152,699 | 0.4551% | 18.7 | 1711.23 | 7.4 | 4324.32 |
| zstd-wasm-l4 | 150,874 | 0.4496% | 28.4 | 1126.76 | 8.6 | 3720.93 |
| zstd-wasm-l6 | 118,512 | 0.3532% | 83.2 | 384.62 | 7.8 | 4102.56 |
| zstd-wasm-l9 | 129,967 | 0.3873% | 99.7 | 320.96 | 7.3 | 4383.56 |
| zstd-wasm-l11 | 131,863 | 0.3930% | 129.7 | 246.72 | 7.5 | 4266.67 |
| xz-wasm-p1 | 148,816 | 0.4435% | 340.0 | 94.12 | 58.8 | 544.22 |
| xz-wasm-p4 | 134,240 | 0.4001% | 1063.7 | 30.08 | 57.9 | 552.68 |
| xz-wasm-p6 | 92,180 | 0.2747% | 3246.0 | 9.86 | 56.5 | 566.37 |
| xz-wasm-p9 | 84,516 | 0.2519% | 3222.3 | 9.93 | 59.7 | 536.01 |

### Moderately compressible 50/50 mixed data

| Codec | Compressed bytes | Ratio | Compress ms | Compress MiB/s | Decompress ms | Decompress MiB/s |
|---|---:|---:|---:|---:|---:|---:|
| gzip | 16,928,281 | 50.4502% | 495.1 | 64.63 | 93.1 | 343.72 |
| deflate | 16,928,269 | 50.4502% | 494.1 | 64.76 | 92.8 | 344.83 |
| deflate-raw | 16,928,263 | 50.4502% | 493.6 | 64.83 | 90.8 | 352.42 |
| brotli | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| zstd | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| brotli-wasm-q1 | 16,787,648 | 50.0311% | 85.1 | 376.03 | 66.4 | 481.93 |
| brotli-wasm-q4 | 16,779,081 | 50.0056% | 253.8 | 126.08 | 65.2 | 490.80 |
| brotli-wasm-q6 | 16,779,197 | 50.0059% | 382.9 | 83.57 | 64.6 | 495.36 |
| brotli-wasm-q9 | 16,780,278 | 50.0091% | 2671.0 | 11.98 | 63.9 | 500.78 |
| brotli-wasm-q11 | 16,779,573 | 50.0070% | 55553.7 | 0.58 | 65.5 | 488.55 |
| zstd-wasm-l1 | 16,818,602 | 50.1233% | 28.5 | 1122.81 | 12.4 | 2580.65 |
| zstd-wasm-l4 | 16,786,371 | 50.0273% | 81.0 | 395.06 | 10.0 | 3200.00 |
| zstd-wasm-l6 | 16,781,166 | 50.0118% | 62.1 | 515.30 | 10.6 | 3018.87 |
| zstd-wasm-l9 | 16,800,733 | 50.0701% | 84.2 | 380.05 | 7.7 | 4155.84 |
| zstd-wasm-l11 | 16,800,733 | 50.0701% | 106.3 | 301.03 | 7.9 | 4050.63 |
| xz-wasm-p1 | 17,018,112 | 50.7179% | 2989.0 | 10.71 | 991.7 | 32.27 |
| xz-wasm-p4 | 16,997,244 | 50.6557% | 5347.0 | 5.98 | 996.5 | 32.11 |
| xz-wasm-p6 | 16,997,056 | 50.6552% | 6407.0 | 4.99 | 994.0 | 32.19 |
| xz-wasm-p9 | 16,997,120 | 50.6554% | 6322.4 | 5.06 | 1025.6 | 31.20 |

### Incompressible high-entropy data

| Codec | Compressed bytes | Ratio | Compress ms | Compress MiB/s | Decompress ms | Decompress MiB/s |
|---|---:|---:|---:|---:|---:|---:|
| gzip | 33,564,695 | 100.0306% | 901.0 | 35.52 | 93.3 | 342.98 |
| deflate | 33,564,683 | 100.0306% | 897.6 | 35.65 | 93.6 | 341.88 |
| deflate-raw | 33,564,677 | 100.0305% | 896.6 | 35.69 | 92.2 | 347.07 |
| brotli | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| zstd | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| brotli-wasm-q1 | 33,554,465 | 100.0001% | 34.6 | 924.86 | 11.3 | 2831.86 |
| brotli-wasm-q4 | 33,554,449 | 100.0001% | 172.2 | 185.83 | 12.1 | 2644.63 |
| brotli-wasm-q6 | 33,554,512 | 100.0002% | 488.8 | 65.47 | 11.7 | 2735.04 |
| brotli-wasm-q9 | 33,554,520 | 100.0003% | 813.2 | 39.35 | 12.6 | 2539.68 |
| brotli-wasm-q11 | 33,554,536 | 100.0003% | 31919.8 | 1.00 | 11.7 | 2735.04 |
| zstd-wasm-l1 | 33,555,210 | 100.0023% | 38.3 | 835.51 | 14.3 | 2237.76 |
| zstd-wasm-l4 | 33,555,210 | 100.0023% | 46.1 | 694.14 | 14.8 | 2162.16 |
| zstd-wasm-l6 | 33,555,210 | 100.0023% | 54.5 | 587.16 | 14.2 | 2253.52 |
| zstd-wasm-l9 | 33,555,210 | 100.0023% | 62.9 | 508.74 | 14.3 | 2237.76 |
| zstd-wasm-l11 | 33,555,210 | 100.0023% | 82.2 | 389.29 | 14.2 | 2253.52 |
| xz-wasm-p1 | 33,556,040 | 100.0048% | 6913.6 | 4.63 | 55.0 | 581.82 |
| xz-wasm-p4 | 33,556,040 | 100.0048% | 12615.7 | 2.54 | 54.6 | 586.08 |
| xz-wasm-p6 | 33,556,040 | 100.0048% | 13964.1 | 2.29 | 54.7 | 585.01 |
| xz-wasm-p9 | 33,556,040 | 100.0048% | 12950.4 | 2.47 | 55.2 | 579.71 |

## Interpretation

- **Highly compressible JSONL:** smallest output: **xz-wasm-p9** (0.2519%); fastest compression: **zstd-wasm-l1** (1711.23 MiB/s); fastest decompression: **zstd-wasm-l9** (4383.56 MiB/s).
- **Moderately compressible 50/50 mixed data:** smallest output: **brotli-wasm-q4** (50.0056%); fastest compression: **zstd-wasm-l1** (1122.81 MiB/s); fastest decompression: **zstd-wasm-l9** (4155.84 MiB/s).
- **Incompressible high-entropy data:** smallest output: **brotli-wasm-q4** (100.0001%); fastest compression: **brotli-wasm-q1** (924.86 MiB/s); fastest decompression: **brotli-wasm-q1** (2831.86 MiB/s).

The graphs and conclusions above are generated directly from results.json; unsupported codecs remain explicitly visible in the support section and measurement tables.
