# Browser compression: Brotli/WASM vs XZ/WASM vs Zstd/WASM

This report compares codecs in the same headless Chrome process on the same deterministic corpora.  Each measured result follows one warm-up and uses the median of the measured repetitions.  Every measured codec is decompressed and checked byte-for-byte against its source on every run.

## Environment

- Browser: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36
- CPU: AMD EPYC 9V45 96-Core Processor
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
| gzip | 365,083 | 1.0880% | 87.7 | 364.88 | 33.6 | 952.38 |
| deflate | 365,071 | 1.0880% | 91.1 | 351.26 | 31.9 | 1003.13 |
| deflate-raw | 365,065 | 1.0880% | 87.5 | 365.71 | 33.7 | 949.55 |
| brotli-wasm-q1 | 172,686 | 0.5146% | 14.1 | 2269.50 | 8.7 | 3678.16 |
| brotli-wasm-q4 | 122,405 | 0.3648% | 101.2 | 316.21 | 7.4 | 4324.32 |
| brotli-wasm-q6 | 86,366 | 0.2574% | 105.3 | 303.89 | 7.2 | 4444.44 |
| brotli-wasm-q9 | 85,749 | 0.2556% | 152.6 | 209.70 | 7.1 | 4507.04 |
| brotli-wasm-q11 | 88,117 | 0.2626% | 9852.1 | 3.25 | 7.6 | 4210.53 |
| zstd-wasm-l1 | 152,699 | 0.4551% | 14.5 | 2206.90 | 5.2 | 6153.85 |
| zstd-wasm-l4 | 150,874 | 0.4496% | 16.8 | 1904.76 | 5.0 | 6400.00 |
| zstd-wasm-l6 | 118,512 | 0.3532% | 43.2 | 740.74 | 5.5 | 5818.18 |
| zstd-wasm-l9 | 129,967 | 0.3873% | 53.1 | 602.64 | 5.2 | 6153.85 |
| zstd-wasm-l11 | 131,863 | 0.3930% | 71.9 | 445.06 | 5.2 | 6153.85 |
| xz-wasm-p1 | 148,816 | 0.4435% | 156.8 | 204.08 | 34.0 | 941.18 |
| xz-wasm-p4 | 134,240 | 0.4001% | 476.5 | 67.16 | 32.3 | 990.71 |
| xz-wasm-p6 | 92,180 | 0.2747% | 1486.6 | 21.53 | 31.3 | 1022.36 |
| xz-wasm-p9 | 84,516 | 0.2519% | 1487.3 | 21.52 | 33.4 | 958.08 |

### Moderately compressible 50/50 mixed data

| Codec | Compressed bytes | Ratio | Compress ms | Compress MiB/s | Decompress ms | Decompress MiB/s |
|---|---:|---:|---:|---:|---:|---:|
| gzip | 16,928,281 | 50.4502% | 293.8 | 108.92 | 60.1 | 532.45 |
| deflate | 16,928,269 | 50.4502% | 293.2 | 109.14 | 61.8 | 517.80 |
| deflate-raw | 16,928,263 | 50.4502% | 294.9 | 108.51 | 57.1 | 560.42 |
| brotli-wasm-q1 | 16,787,648 | 50.0311% | 53.2 | 601.50 | 38.4 | 833.33 |
| brotli-wasm-q4 | 16,779,081 | 50.0056% | 143.4 | 223.15 | 39.1 | 818.41 |
| brotli-wasm-q6 | 16,779,197 | 50.0059% | 187.2 | 170.94 | 37.9 | 844.33 |
| brotli-wasm-q9 | 16,780,278 | 50.0091% | 1182.4 | 27.06 | 37.6 | 851.06 |
| brotli-wasm-q11 | 16,779,573 | 50.0070% | 29613.4 | 1.08 | 37.9 | 844.33 |
| zstd-wasm-l1 | 16,818,602 | 50.1233% | 18.1 | 1767.96 | 7.1 | 4507.04 |
| zstd-wasm-l4 | 16,786,371 | 50.0273% | 34.7 | 922.19 | 6.4 | 5000.00 |
| zstd-wasm-l6 | 16,781,166 | 50.0118% | 33.0 | 969.70 | 6.3 | 5079.37 |
| zstd-wasm-l9 | 16,800,733 | 50.0701% | 42.6 | 751.17 | 5.5 | 5818.18 |
| zstd-wasm-l11 | 16,800,733 | 50.0701% | 53.1 | 602.64 | 5.4 | 5925.93 |
| xz-wasm-p1 | 17,018,112 | 50.7179% | 1782.3 | 17.95 | 691.2 | 46.30 |
| xz-wasm-p4 | 16,997,244 | 50.6557% | 2619.4 | 12.22 | 686.8 | 46.59 |
| xz-wasm-p6 | 16,997,056 | 50.6552% | 3883.2 | 8.24 | 687.8 | 46.53 |
| xz-wasm-p9 | 16,997,120 | 50.6554% | 4775.6 | 6.70 | 690.8 | 46.32 |

### Incompressible high-entropy data

| Codec | Compressed bytes | Ratio | Compress ms | Compress MiB/s | Decompress ms | Decompress MiB/s |
|---|---:|---:|---:|---:|---:|---:|
| gzip | 33,564,695 | 100.0306% | 540.4 | 59.22 | 61.0 | 524.59 |
| deflate | 33,564,683 | 100.0306% | 538.3 | 59.45 | 59.8 | 535.12 |
| deflate-raw | 33,564,677 | 100.0305% | 547.3 | 58.47 | 58.0 | 551.72 |
| brotli-wasm-q1 | 33,554,465 | 100.0001% | 20.0 | 1600.00 | 7.4 | 4324.32 |
| brotli-wasm-q4 | 33,554,449 | 100.0001% | 83.2 | 384.62 | 7.6 | 4210.53 |
| brotli-wasm-q6 | 33,554,512 | 100.0002% | 202.8 | 157.79 | 7.4 | 4324.32 |
| brotli-wasm-q9 | 33,554,520 | 100.0003% | 421.8 | 75.87 | 7.7 | 4155.84 |
| brotli-wasm-q11 | 33,554,536 | 100.0003% | 18061.8 | 1.77 | 7.5 | 4266.67 |
| zstd-wasm-l1 | 33,555,210 | 100.0023% | 23.4 | 1367.52 | 8.3 | 3855.42 |
| zstd-wasm-l4 | 33,555,210 | 100.0023% | 23.4 | 1367.52 | 8.7 | 3678.16 |
| zstd-wasm-l6 | 33,555,210 | 100.0023% | 28.4 | 1126.76 | 8.3 | 3855.42 |
| zstd-wasm-l9 | 33,555,210 | 100.0023% | 29.6 | 1081.08 | 8.6 | 3720.93 |
| zstd-wasm-l11 | 33,555,210 | 100.0023% | 49.0 | 653.06 | 8.3 | 3855.42 |
| xz-wasm-p1 | 33,556,040 | 100.0048% | 3936.9 | 8.13 | 30.5 | 1049.18 |
| xz-wasm-p4 | 33,556,040 | 100.0048% | 8134.4 | 3.93 | 30.5 | 1049.18 |
| xz-wasm-p6 | 33,556,040 | 100.0048% | 10665.3 | 3.00 | 30.5 | 1049.18 |
| xz-wasm-p9 | 33,556,040 | 100.0048% | 10375.9 | 3.08 | 30.5 | 1049.18 |

## Interpretation

- **Highly compressible JSONL:** smallest output: **xz-wasm-p9** (0.2519%); fastest compression: **brotli-wasm-q1** (2269.50 MiB/s); fastest decompression: **zstd-wasm-l4** (6400.00 MiB/s).
- **Moderately compressible 50/50 mixed data:** smallest output: **brotli-wasm-q4** (50.0056%); fastest compression: **zstd-wasm-l1** (1767.96 MiB/s); fastest decompression: **zstd-wasm-l11** (5925.93 MiB/s).
- **Incompressible high-entropy data:** smallest output: **brotli-wasm-q4** (100.0001%); fastest compression: **brotli-wasm-q1** (1600.00 MiB/s); fastest decompression: **brotli-wasm-q1** (4324.32 MiB/s).

The graphs and conclusions above are generated directly from results.json. Browser-native API availability is reported separately from the WASM benchmark measurements.
