# Browser compression: Brotli/WASM vs XZ/WASM vs Zstd/WASM

This report compares codecs in the same headless Chrome process on the same deterministic corpora.  Each measured result follows one warm-up and uses the median of the measured repetitions.  Every measured codec is decompressed and checked byte-for-byte against its source on every run.

## Environment

- Browser: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36
- CPU: AMD EPYC 7763 64-Core Processor
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
| gzip | 365,083 | 1.0880% | 197.7 | 161.86 | 49.0 | 653.06 |
| deflate | 365,071 | 1.0880% | 198.2 | 161.45 | 48.9 | 654.40 |
| deflate-raw | 365,065 | 1.0880% | 197.6 | 161.94 | 47.9 | 668.06 |
| brotli | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| zstd | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| brotli-wasm-q1 | 172,686 | 0.5146% | 23.6 | 1355.93 | 15.3 | 2091.50 |
| brotli-wasm-q4 | 122,405 | 0.3648% | 150.2 | 213.05 | 17.7 | 1807.91 |
| brotli-wasm-q6 | 86,366 | 0.2574% | 274.5 | 116.58 | 12.0 | 2666.67 |
| brotli-wasm-q9 | 85,749 | 0.2556% | 374.6 | 85.42 | 11.6 | 2758.62 |
| brotli-wasm-q11 | 88,117 | 0.2626% | 20085.8 | 1.59 | 13.2 | 2424.24 |
| zstd-wasm-l1 | 152,699 | 0.4551% | 28.5 | 1122.81 | 8.5 | 3764.71 |
| zstd-wasm-l4 | 150,874 | 0.4496% | 32.4 | 987.65 | 16.2 | 1975.31 |
| zstd-wasm-l6 | 118,512 | 0.3532% | 94.6 | 338.27 | 8.7 | 3678.16 |
| zstd-wasm-l9 | 129,967 | 0.3873% | 110.7 | 289.07 | 11.0 | 2909.09 |
| zstd-wasm-l11 | 131,863 | 0.3930% | 144.3 | 221.76 | 8.4 | 3809.52 |
| xz-wasm-p1 | 148,816 | 0.4435% | 378.3 | 84.59 | 53.8 | 594.80 |
| xz-wasm-p4 | 134,240 | 0.4001% | 989.2 | 32.35 | 52.8 | 606.06 |
| xz-wasm-p6 | 92,180 | 0.2747% | 3051.8 | 10.49 | 49.9 | 641.28 |
| xz-wasm-p9 | 84,516 | 0.2519% | 2966.9 | 10.79 | 52.6 | 608.37 |

### Moderately compressible 50/50 mixed data

| Codec | Compressed bytes | Ratio | Compress ms | Compress MiB/s | Decompress ms | Decompress MiB/s |
|---|---:|---:|---:|---:|---:|---:|
| gzip | 16,928,281 | 50.4502% | 466.5 | 68.60 | 85.9 | 372.53 |
| deflate | 16,928,269 | 50.4502% | 464.3 | 68.92 | 84.5 | 378.70 |
| deflate-raw | 16,928,263 | 50.4502% | 467.1 | 68.51 | 83.4 | 383.69 |
| brotli | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| zstd | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| brotli-wasm-q1 | 16,787,648 | 50.0311% | 78.1 | 409.73 | 69.5 | 460.43 |
| brotli-wasm-q4 | 16,779,081 | 50.0056% | 353.7 | 90.47 | 62.2 | 514.47 |
| brotli-wasm-q6 | 16,779,197 | 50.0059% | 484.7 | 66.02 | 61.9 | 516.96 |
| brotli-wasm-q9 | 16,780,278 | 50.0091% | 2583.8 | 12.38 | 63.8 | 501.57 |
| brotli-wasm-q11 | 16,779,573 | 50.0070% | 51524.7 | 0.62 | 62.2 | 514.47 |
| zstd-wasm-l1 | 16,818,602 | 50.1233% | 34.3 | 932.94 | 11.9 | 2689.08 |
| zstd-wasm-l4 | 16,786,371 | 50.0273% | 69.9 | 457.80 | 10.0 | 3200.00 |
| zstd-wasm-l6 | 16,781,166 | 50.0118% | 64.7 | 494.59 | 10.5 | 3047.62 |
| zstd-wasm-l9 | 16,800,733 | 50.0701% | 84.8 | 377.36 | 11.2 | 2857.14 |
| zstd-wasm-l11 | 16,800,733 | 50.0701% | 109.1 | 293.31 | 11.1 | 2882.88 |
| xz-wasm-p1 | 17,018,112 | 50.7179% | 2735.9 | 11.70 | 892.4 | 35.86 |
| xz-wasm-p4 | 16,997,244 | 50.6557% | 4479.2 | 7.14 | 891.5 | 35.89 |
| xz-wasm-p6 | 16,997,056 | 50.6552% | 5625.7 | 5.69 | 893.6 | 35.81 |
| xz-wasm-p9 | 16,997,120 | 50.6554% | 5363.0 | 5.97 | 891.4 | 35.90 |

### Incompressible high-entropy data

| Codec | Compressed bytes | Ratio | Compress ms | Compress MiB/s | Decompress ms | Decompress MiB/s |
|---|---:|---:|---:|---:|---:|---:|
| gzip | 33,564,695 | 100.0306% | 770.4 | 41.54 | 87.8 | 364.46 |
| deflate | 33,564,683 | 100.0306% | 773.9 | 41.35 | 89.4 | 357.94 |
| deflate-raw | 33,564,677 | 100.0305% | 768.2 | 41.66 | 84.6 | 378.25 |
| brotli | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| zstd | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| brotli-wasm-q1 | 33,554,465 | 100.0001% | 35.6 | 898.88 | 14.0 | 2285.71 |
| brotli-wasm-q4 | 33,554,449 | 100.0001% | 161.6 | 198.02 | 14.2 | 2253.52 |
| brotli-wasm-q6 | 33,554,512 | 100.0002% | 485.6 | 65.90 | 13.7 | 2335.77 |
| brotli-wasm-q9 | 33,554,520 | 100.0003% | 705.0 | 45.39 | 14.0 | 2285.71 |
| brotli-wasm-q11 | 33,554,536 | 100.0003% | 27694.8 | 1.16 | 13.8 | 2318.84 |
| zstd-wasm-l1 | 33,555,210 | 100.0023% | 42.3 | 756.50 | 21.6 | 1481.48 |
| zstd-wasm-l4 | 33,555,210 | 100.0023% | 46.8 | 683.76 | 21.6 | 1481.48 |
| zstd-wasm-l6 | 33,555,210 | 100.0023% | 57.8 | 553.63 | 20.3 | 1576.35 |
| zstd-wasm-l9 | 33,555,210 | 100.0023% | 63.7 | 502.35 | 19.2 | 1666.67 |
| zstd-wasm-l11 | 33,555,210 | 100.0023% | 74.0 | 432.43 | 19.2 | 1666.67 |
| xz-wasm-p1 | 33,556,040 | 100.0048% | 6207.9 | 5.15 | 48.5 | 659.79 |
| xz-wasm-p4 | 33,556,040 | 100.0048% | 11535.1 | 2.77 | 48.0 | 666.67 |
| xz-wasm-p6 | 33,556,040 | 100.0048% | 12579.9 | 2.54 | 48.2 | 663.90 |
| xz-wasm-p9 | 33,556,040 | 100.0048% | 11302.9 | 2.83 | 48.2 | 663.90 |

## Interpretation

- **Highly compressible JSONL:** smallest output: **xz-wasm-p9** (0.2519%); fastest compression: **brotli-wasm-q1** (1355.93 MiB/s); fastest decompression: **zstd-wasm-l11** (3809.52 MiB/s).
- **Moderately compressible 50/50 mixed data:** smallest output: **brotli-wasm-q4** (50.0056%); fastest compression: **zstd-wasm-l1** (932.94 MiB/s); fastest decompression: **zstd-wasm-l4** (3200.00 MiB/s).
- **Incompressible high-entropy data:** smallest output: **brotli-wasm-q4** (100.0001%); fastest compression: **brotli-wasm-q1** (898.88 MiB/s); fastest decompression: **brotli-wasm-q6** (2335.77 MiB/s).

The graphs and conclusions above are generated directly from results.json; unsupported codecs remain explicitly visible in the support section and measurement tables.
