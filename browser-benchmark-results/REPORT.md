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

## Browser-native CompressionStream support

The WASM implementations benchmarked in this report are supported and measured independently of this table.  The entries below refer **only** to the browser-native `CompressionStream` / `DecompressionStream` API.

Native API availability is runtime-detected in the browser named above.  Brotli and Zstd are benchmarked through their WASM implementations regardless of whether this browser exposes those formats through `CompressionStream` / `DecompressionStream`.

As of September 2026, Chromium/Chrome does **not** expose Brotli through `CompressionStream`, despite supporting Brotli HTTP content encoding.  Chromium issue 463397980 tracks that still-unshipped API support.  Firefox 147+ and Safari 18.4+ do expose native Brotli through `CompressionStream`.  Therefore this Chrome run cannot produce a legitimate browser-native Brotli measurement.

- `gzip`: browser-native CompressionStream available
- `deflate`: browser-native CompressionStream available
- `deflate-raw`: browser-native CompressionStream available
- `brotli`: browser-native CompressionStream not available in this Chrome run
- `zstd`: browser-native CompressionStream not available in this Chrome run

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
| gzip | 365,083 | 1.0880% | 200.6 | 159.52 | 48.8 | 655.74 |
| deflate | 365,071 | 1.0880% | 199.7 | 160.24 | 47.5 | 673.68 |
| deflate-raw | 365,065 | 1.0880% | 196.1 | 163.18 | 47.2 | 677.97 |
| brotli-wasm-q1 | 172,686 | 0.5146% | 23.3 | 1373.39 | 15.0 | 2133.33 |
| brotli-wasm-q4 | 122,405 | 0.3648% | 149.3 | 214.33 | 17.6 | 1818.18 |
| brotli-wasm-q6 | 86,366 | 0.2574% | 268.9 | 119.00 | 12.2 | 2622.95 |
| brotli-wasm-q9 | 85,749 | 0.2556% | 367.6 | 87.05 | 12.3 | 2601.63 |
| brotli-wasm-q11 | 88,117 | 0.2626% | 20144.2 | 1.59 | 12.1 | 2644.63 |
| zstd-wasm-l1 | 152,699 | 0.4551% | 27.7 | 1155.23 | 9.4 | 3404.26 |
| zstd-wasm-l4 | 150,874 | 0.4496% | 32.1 | 996.88 | 15.9 | 2012.58 |
| zstd-wasm-l6 | 118,512 | 0.3532% | 93.9 | 340.79 | 8.5 | 3764.71 |
| zstd-wasm-l9 | 129,967 | 0.3873% | 112.8 | 283.69 | 11.0 | 2909.09 |
| zstd-wasm-l11 | 131,863 | 0.3930% | 139.9 | 228.73 | 7.8 | 4102.56 |
| xz-wasm-p1 | 148,816 | 0.4435% | 376.5 | 84.99 | 53.4 | 599.25 |
| xz-wasm-p4 | 134,240 | 0.4001% | 985.9 | 32.46 | 52.6 | 608.37 |
| xz-wasm-p6 | 92,180 | 0.2747% | 3010.3 | 10.63 | 49.9 | 641.28 |
| xz-wasm-p9 | 84,516 | 0.2519% | 2987.4 | 10.71 | 52.9 | 604.91 |

### Moderately compressible 50/50 mixed data

| Codec | Compressed bytes | Ratio | Compress ms | Compress MiB/s | Decompress ms | Decompress MiB/s |
|---|---:|---:|---:|---:|---:|---:|
| gzip | 16,928,281 | 50.4502% | 462.4 | 69.20 | 87.5 | 365.71 |
| deflate | 16,928,269 | 50.4502% | 470.5 | 68.01 | 88.0 | 363.64 |
| deflate-raw | 16,928,263 | 50.4502% | 457.4 | 69.96 | 85.3 | 375.15 |
| brotli-wasm-q1 | 16,787,648 | 50.0311% | 85.0 | 376.47 | 69.8 | 458.45 |
| brotli-wasm-q4 | 16,779,081 | 50.0056% | 326.2 | 98.10 | 63.5 | 503.94 |
| brotli-wasm-q6 | 16,779,197 | 50.0059% | 489.5 | 65.37 | 62.2 | 514.47 |
| brotli-wasm-q9 | 16,780,278 | 50.0091% | 2643.8 | 12.10 | 64.4 | 496.89 |
| brotli-wasm-q11 | 16,779,573 | 50.0070% | 53414.9 | 0.60 | 63.3 | 505.53 |
| zstd-wasm-l1 | 16,818,602 | 50.1233% | 34.3 | 932.94 | 12.1 | 2644.63 |
| zstd-wasm-l4 | 16,786,371 | 50.0273% | 70.2 | 455.84 | 10.0 | 3200.00 |
| zstd-wasm-l6 | 16,781,166 | 50.0118% | 65.0 | 492.31 | 10.6 | 3018.87 |
| zstd-wasm-l9 | 16,800,733 | 50.0701% | 94.0 | 340.43 | 11.3 | 2831.86 |
| zstd-wasm-l11 | 16,800,733 | 50.0701% | 104.7 | 305.64 | 11.5 | 2782.61 |
| xz-wasm-p1 | 17,018,112 | 50.7179% | 2936.3 | 10.90 | 892.6 | 35.85 |
| xz-wasm-p4 | 16,997,244 | 50.6557% | 5467.8 | 5.85 | 893.7 | 35.81 |
| xz-wasm-p6 | 16,997,056 | 50.6552% | 6018.3 | 5.32 | 893.1 | 35.83 |
| xz-wasm-p9 | 16,997,120 | 50.6554% | 5579.3 | 5.74 | 890.8 | 35.92 |

### Incompressible high-entropy data

| Codec | Compressed bytes | Ratio | Compress ms | Compress MiB/s | Decompress ms | Decompress MiB/s |
|---|---:|---:|---:|---:|---:|---:|
| gzip | 33,564,695 | 100.0306% | 765.7 | 41.79 | 89.5 | 357.54 |
| deflate | 33,564,683 | 100.0306% | 764.0 | 41.88 | 89.0 | 359.55 |
| deflate-raw | 33,564,677 | 100.0305% | 759.9 | 42.11 | 87.7 | 364.88 |
| brotli-wasm-q1 | 33,554,465 | 100.0001% | 37.4 | 855.61 | 14.1 | 2269.50 |
| brotli-wasm-q4 | 33,554,449 | 100.0001% | 259.6 | 123.27 | 14.8 | 2162.16 |
| brotli-wasm-q6 | 33,554,512 | 100.0002% | 534.4 | 59.88 | 14.3 | 2237.76 |
| brotli-wasm-q9 | 33,554,520 | 100.0003% | 957.2 | 33.43 | 13.9 | 2302.16 |
| brotli-wasm-q11 | 33,554,536 | 100.0003% | 28031.8 | 1.14 | 13.8 | 2318.84 |
| zstd-wasm-l1 | 33,555,210 | 100.0023% | 42.7 | 749.41 | 21.7 | 1474.65 |
| zstd-wasm-l4 | 33,555,210 | 100.0023% | 45.5 | 703.30 | 19.9 | 1608.04 |
| zstd-wasm-l6 | 33,555,210 | 100.0023% | 59.5 | 537.82 | 19.8 | 1616.16 |
| zstd-wasm-l9 | 33,555,210 | 100.0023% | 65.3 | 490.05 | 19.1 | 1675.39 |
| zstd-wasm-l11 | 33,555,210 | 100.0023% | 80.1 | 399.50 | 19.0 | 1684.21 |
| xz-wasm-p1 | 33,556,040 | 100.0048% | 6094.4 | 5.25 | 48.2 | 663.90 |
| xz-wasm-p4 | 33,556,040 | 100.0048% | 11222.6 | 2.85 | 48.2 | 663.90 |
| xz-wasm-p6 | 33,556,040 | 100.0048% | 12682.8 | 2.52 | 48.2 | 663.90 |
| xz-wasm-p9 | 33,556,040 | 100.0048% | 11307.6 | 2.83 | 48.6 | 658.44 |

## Interpretation

- **Highly compressible JSONL:** smallest output: **xz-wasm-p9** (0.2519%); fastest compression: **brotli-wasm-q1** (1373.39 MiB/s); fastest decompression: **zstd-wasm-l11** (4102.56 MiB/s).
- **Moderately compressible 50/50 mixed data:** smallest output: **brotli-wasm-q4** (50.0056%); fastest compression: **zstd-wasm-l1** (932.94 MiB/s); fastest decompression: **zstd-wasm-l4** (3200.00 MiB/s).
- **Incompressible high-entropy data:** smallest output: **brotli-wasm-q4** (100.0001%); fastest compression: **brotli-wasm-q1** (855.61 MiB/s); fastest decompression: **brotli-wasm-q11** (2318.84 MiB/s).

The graphs and conclusions above are generated directly from results.json. Browser-native API availability is reported separately from the WASM benchmark measurements.
