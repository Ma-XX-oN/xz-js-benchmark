# Browser compression: Brotli/WASM vs XZ/WASM vs Zstd/WASM

This report compares codecs in the same headless Chrome process on the same deterministic corpora.  Each measured result follows one warm-up and uses the median of the measured repetitions.  Every measured codec is decompressed and checked byte-for-byte against its source on every run.

## Environment

- Browser: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36
- CPU: Intel(R) Xeon(R) 6973P-C
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

## Browser-native CompressionStream support

The WASM implementations benchmarked in this report are supported and measured independently of this table.  The entries below refer **only** to the browser-native `CompressionStream` / `DecompressionStream` API.

Native API support is runtime-detected in the browser named above.  An unsupported entry means that this browser rejects the corresponding `CompressionStream` / `DecompressionStream` format; it does not mean the compression algorithm is absent from the browser's HTTP stack.

As of September 2026, Chromium/Chrome does **not** expose Brotli through `CompressionStream`, despite supporting Brotli HTTP content encoding.  Chromium issue 463397980 tracks that still-unshipped API support.  Firefox 147+ and Safari 18.4+ do expose native Brotli through `CompressionStream`.  Therefore this Chrome run cannot produce a legitimate browser-native Brotli measurement.

- Browser-native supported: `gzip`
- Browser-native supported: `deflate`
- Browser-native supported: `deflate-raw`
- Browser-native unsupported: `brotli`
- Browser-native unsupported: `zstd`

- WASM benchmark: **Brotli/WASM supported and measured**
- WASM benchmark: **Zstd/WASM supported and measured**
- WASM benchmark: **XZ/WASM supported and measured**

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
| gzip | 365,083 | 1.0880% | 122.1 | 262.08 | 42.0 | 761.90 |
| deflate | 365,071 | 1.0880% | 121.3 | 263.81 | 41.6 | 769.23 |
| deflate-raw | 365,065 | 1.0880% | 121.0 | 264.46 | 41.8 | 765.55 |
| brotli | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| zstd | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| brotli-wasm-q1 | 172,686 | 0.5146% | 36.0 | 888.89 | 20.0 | 1600.00 |
| brotli-wasm-q4 | 122,405 | 0.3648% | 85.1 | 376.03 | 16.1 | 1987.58 |
| brotli-wasm-q6 | 86,366 | 0.2574% | 152.2 | 210.25 | 15.9 | 2012.58 |
| brotli-wasm-q9 | 85,749 | 0.2556% | 238.6 | 134.12 | 15.5 | 2064.52 |
| brotli-wasm-q11 | 88,117 | 0.2626% | 13823.2 | 2.31 | 16.2 | 1975.31 |
| zstd-wasm-l1 | 152,699 | 0.4551% | 28.6 | 1118.88 | 13.1 | 2442.75 |
| zstd-wasm-l4 | 150,874 | 0.4496% | 32.0 | 1000.00 | 13.6 | 2352.94 |
| zstd-wasm-l6 | 118,512 | 0.3532% | 69.6 | 459.77 | 11.7 | 2735.04 |
| zstd-wasm-l9 | 129,967 | 0.3873% | 93.4 | 342.61 | 13.3 | 2406.02 |
| zstd-wasm-l11 | 131,863 | 0.3930% | 110.8 | 288.81 | 13.8 | 2318.84 |
| xz-wasm-p1 | 148,816 | 0.4435% | 209.1 | 153.04 | 49.7 | 643.86 |
| xz-wasm-p4 | 134,240 | 0.4001% | 672.5 | 47.58 | 49.6 | 645.16 |
| xz-wasm-p6 | 92,180 | 0.2747% | 2158.2 | 14.83 | 49.8 | 642.57 |
| xz-wasm-p9 | 84,516 | 0.2519% | 2200.4 | 14.54 | 51.2 | 625.00 |

### Moderately compressible 50/50 mixed data

| Codec | Compressed bytes | Ratio | Compress ms | Compress MiB/s | Decompress ms | Decompress MiB/s |
|---|---:|---:|---:|---:|---:|---:|
| gzip | 16,928,281 | 50.4502% | 348.3 | 91.87 | 76.1 | 420.50 |
| deflate | 16,928,269 | 50.4502% | 346.4 | 92.38 | 77.6 | 412.37 |
| deflate-raw | 16,928,263 | 50.4502% | 343.9 | 93.05 | 75.8 | 422.16 |
| brotli | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| zstd | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| brotli-wasm-q1 | 16,787,648 | 50.0311% | 76.6 | 417.75 | 59.9 | 534.22 |
| brotli-wasm-q4 | 16,779,081 | 50.0056% | 193.6 | 165.29 | 59.0 | 542.37 |
| brotli-wasm-q6 | 16,779,197 | 50.0059% | 278.7 | 114.82 | 59.1 | 541.46 |
| brotli-wasm-q9 | 16,780,278 | 50.0091% | 1716.1 | 18.65 | 58.9 | 543.29 |
| brotli-wasm-q11 | 16,779,573 | 50.0070% | 41629.2 | 0.77 | 59.2 | 540.54 |
| zstd-wasm-l1 | 16,818,602 | 50.1233% | 35.4 | 903.95 | 16.3 | 1963.19 |
| zstd-wasm-l4 | 16,786,371 | 50.0273% | 67.9 | 471.28 | 13.8 | 2318.84 |
| zstd-wasm-l6 | 16,781,166 | 50.0118% | 59.5 | 537.82 | 14.8 | 2162.16 |
| zstd-wasm-l9 | 16,800,733 | 50.0701% | 78.1 | 409.73 | 13.3 | 2406.02 |
| zstd-wasm-l11 | 16,800,733 | 50.0701% | 88.0 | 363.64 | 13.5 | 2370.37 |
| xz-wasm-p1 | 17,018,112 | 50.7179% | 2477.5 | 12.92 | 774.4 | 41.32 |
| xz-wasm-p4 | 16,997,244 | 50.6557% | 3157.9 | 10.13 | 784.1 | 40.81 |
| xz-wasm-p6 | 16,997,056 | 50.6552% | 5578.7 | 5.74 | 793.5 | 40.33 |
| xz-wasm-p9 | 16,997,120 | 50.6554% | 5648.1 | 5.67 | 825.1 | 38.78 |

### Incompressible high-entropy data

| Codec | Compressed bytes | Ratio | Compress ms | Compress MiB/s | Decompress ms | Decompress MiB/s |
|---|---:|---:|---:|---:|---:|---:|
| gzip | 33,564,695 | 100.0306% | 606.0 | 52.81 | 87.8 | 364.46 |
| deflate | 33,564,683 | 100.0306% | 598.3 | 53.48 | 85.3 | 375.15 |
| deflate-raw | 33,564,677 | 100.0305% | 610.0 | 52.46 | 85.6 | 373.83 |
| brotli | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| zstd | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| brotli-wasm-q1 | 33,554,465 | 100.0001% | 49.3 | 649.09 | 18.2 | 1758.24 |
| brotli-wasm-q4 | 33,554,449 | 100.0001% | 152.0 | 210.53 | 20.5 | 1560.98 |
| brotli-wasm-q6 | 33,554,512 | 100.0002% | 387.2 | 82.64 | 20.4 | 1568.63 |
| brotli-wasm-q9 | 33,554,520 | 100.0003% | 535.3 | 59.78 | 21.2 | 1509.43 |
| brotli-wasm-q11 | 33,554,536 | 100.0003% | 23683.3 | 1.35 | 20.6 | 1553.40 |
| zstd-wasm-l1 | 33,555,210 | 100.0023% | 44.1 | 725.62 | 17.1 | 1871.35 |
| zstd-wasm-l4 | 33,555,210 | 100.0023% | 53.8 | 594.80 | 18.1 | 1767.96 |
| zstd-wasm-l6 | 33,555,210 | 100.0023% | 59.2 | 540.54 | 16.9 | 1893.49 |
| zstd-wasm-l9 | 33,555,210 | 100.0023% | 71.1 | 450.07 | 18.1 | 1767.96 |
| zstd-wasm-l11 | 33,555,210 | 100.0023% | 83.0 | 385.54 | 17.5 | 1828.57 |
| xz-wasm-p1 | 33,556,040 | 100.0048% | 6171.8 | 5.18 | 50.7 | 631.16 |
| xz-wasm-p4 | 33,556,040 | 100.0048% | 8880.5 | 3.60 | 50.1 | 638.72 |
| xz-wasm-p6 | 33,556,040 | 100.0048% | 11599.2 | 2.76 | 50.0 | 640.00 |
| xz-wasm-p9 | 33,556,040 | 100.0048% | 11989.2 | 2.67 | 51.5 | 621.36 |

## Interpretation

- **Highly compressible JSONL:** smallest output: **xz-wasm-p9** (0.2519%); fastest compression: **zstd-wasm-l1** (1118.88 MiB/s); fastest decompression: **zstd-wasm-l6** (2735.04 MiB/s).
- **Moderately compressible 50/50 mixed data:** smallest output: **brotli-wasm-q4** (50.0056%); fastest compression: **zstd-wasm-l1** (903.95 MiB/s); fastest decompression: **zstd-wasm-l9** (2406.02 MiB/s).
- **Incompressible high-entropy data:** smallest output: **brotli-wasm-q4** (100.0001%); fastest compression: **zstd-wasm-l1** (725.62 MiB/s); fastest decompression: **zstd-wasm-l6** (1893.49 MiB/s).

The graphs and conclusions above are generated directly from results.json; unsupported codecs remain explicitly visible in the support section and measurement tables.
