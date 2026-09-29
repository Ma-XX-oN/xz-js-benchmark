# Browser compression and Brotli/WASM vs XZ/WASM

This report compares codecs in the same headless Chrome process on the same deterministic corpora.  Each measured result follows one warm-up and uses the median of the measured repetitions.  Every measured codec is decompressed and checked byte-for-byte against its source on every run.

## Environment

- Browser: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36
- CPU: AMD EPYC 7763 64-Core Processor
- Logical CPUs: 4
- Corpus size: 32.00 MiB each
- Repetitions: 3 measured after 1 warm-up
- XZ: lzma-wasm 1.0.7 WebAssembly, presets 1, 4, 6, 9, binary 192.8 KiB
- Brotli: Google Brotli WebAssembly, qualities 1, 4, 6, 9, 11, binary 778.0 KiB

### WebAssembly payload size

| Implementation | WASM bytes | KiB |
|---|---:|---:|
| Brotli/WASM | 796,677 | 778.0 |
| XZ/WASM | 197,376 | 192.8 |

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
| gzip | 365,083 | 1.0880% | 197.8 | 161.78 | 48.6 | 658.44 |
| deflate | 365,071 | 1.0880% | 195.4 | 163.77 | 47.0 | 680.85 |
| deflate-raw | 365,065 | 1.0880% | 191.4 | 167.19 | 45.1 | 709.53 |
| brotli | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| zstd | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| brotli-wasm-q1 | 172,686 | 0.5146% | 15.3 | 2091.50 | 13.8 | 2318.84 |
| brotli-wasm-q4 | 122,405 | 0.3648% | 80.5 | 397.52 | 17.6 | 1818.18 |
| brotli-wasm-q6 | 86,366 | 0.2574% | 251.6 | 127.19 | 11.2 | 2857.14 |
| brotli-wasm-q9 | 85,749 | 0.2556% | 355.7 | 89.96 | 11.0 | 2909.09 |
| brotli-wasm-q11 | 88,117 | 0.2626% | 19620.8 | 1.63 | 12.1 | 2644.63 |
| xz-wasm-p1 | 148,808 | 0.4435% | 503.6 | 63.54 | 120.9 | 264.68 |
| xz-wasm-p4 | 134,240 | 0.4001% | 1272.4 | 25.15 | 119.8 | 267.11 |
| xz-wasm-p6 | 92,132 | 0.2746% | 4082.3 | 7.84 | 121.1 | 264.24 |
| xz-wasm-p9 | 84,452 | 0.2517% | 4016.5 | 7.97 | 121.0 | 264.46 |

### Moderately compressible 50/50 mixed data

| Codec | Compressed bytes | Ratio | Compress ms | Compress MiB/s | Decompress ms | Decompress MiB/s |
|---|---:|---:|---:|---:|---:|---:|
| gzip | 16,928,281 | 50.4502% | 456.3 | 70.13 | 84.0 | 380.95 |
| deflate | 16,928,269 | 50.4502% | 452.1 | 70.78 | 81.9 | 390.72 |
| deflate-raw | 16,928,263 | 50.4502% | 451.9 | 70.81 | 81.6 | 392.16 |
| brotli | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| zstd | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| brotli-wasm-q1 | 16,787,648 | 50.0311% | 71.3 | 448.81 | 61.5 | 520.33 |
| brotli-wasm-q4 | 16,779,081 | 50.0056% | 196.4 | 162.93 | 60.3 | 530.68 |
| brotli-wasm-q6 | 16,779,197 | 50.0059% | 375.9 | 85.13 | 60.3 | 530.68 |
| brotli-wasm-q9 | 16,780,278 | 50.0091% | 2248.5 | 14.23 | 63.4 | 504.73 |
| brotli-wasm-q11 | 16,779,573 | 50.0070% | 48559.1 | 0.66 | 60.5 | 528.93 |
| xz-wasm-p1 | 17,030,372 | 50.7545% | 2876.8 | 11.12 | 1077.3 | 29.70 |
| xz-wasm-p4 | 17,009,244 | 50.6915% | 4044.7 | 7.91 | 1076.5 | 29.73 |
| xz-wasm-p6 | 17,008,564 | 50.6895% | 5713.7 | 5.60 | 1072.7 | 29.83 |
| xz-wasm-p9 | 17,008,772 | 50.6901% | 5900.9 | 5.42 | 1072.5 | 29.84 |

### Incompressible high-entropy data

| Codec | Compressed bytes | Ratio | Compress ms | Compress MiB/s | Decompress ms | Decompress MiB/s |
|---|---:|---:|---:|---:|---:|---:|
| gzip | 33,564,695 | 100.0306% | 759.5 | 42.13 | 83.2 | 384.62 |
| deflate | 33,564,683 | 100.0306% | 755.8 | 42.34 | 83.7 | 382.32 |
| deflate-raw | 33,564,677 | 100.0305% | 752.7 | 42.51 | 80.7 | 396.53 |
| brotli | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| zstd | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| brotli-wasm-q1 | 33,554,465 | 100.0001% | 27.2 | 1176.47 | 13.7 | 2335.77 |
| brotli-wasm-q4 | 33,554,449 | 100.0001% | 101.6 | 314.96 | 13.6 | 2352.94 |
| brotli-wasm-q6 | 33,554,512 | 100.0002% | 471.9 | 67.81 | 14.2 | 2253.52 |
| brotli-wasm-q9 | 33,554,520 | 100.0003% | 660.5 | 48.45 | 13.7 | 2335.77 |
| brotli-wasm-q11 | 33,554,536 | 100.0003% | 22769.0 | 1.41 | 13.9 | 2302.16 |
| xz-wasm-p1 | 33,556,056 | 100.0048% | 6025.4 | 5.31 | 122.5 | 261.22 |
| xz-wasm-p4 | 33,556,056 | 100.0048% | 8959.9 | 3.57 | 122.7 | 260.80 |
| xz-wasm-p6 | 33,556,056 | 100.0048% | 10983.2 | 2.91 | 123.1 | 259.95 |
| xz-wasm-p9 | 33,556,056 | 100.0048% | 10492.8 | 3.05 | 126.0 | 253.97 |

## Interpretation

- **Highly compressible JSONL:** smallest output: **xz-wasm-p9** (0.2517%); fastest compression: **brotli-wasm-q1** (2091.50 MiB/s); fastest decompression: **brotli-wasm-q9** (2909.09 MiB/s).
- **Moderately compressible 50/50 mixed data:** smallest output: **brotli-wasm-q4** (50.0056%); fastest compression: **brotli-wasm-q1** (448.81 MiB/s); fastest decompression: **brotli-wasm-q4** (530.68 MiB/s).
- **Incompressible high-entropy data:** smallest output: **brotli-wasm-q4** (100.0001%); fastest compression: **brotli-wasm-q1** (1176.47 MiB/s); fastest decompression: **brotli-wasm-q4** (2352.94 MiB/s).

The graphs and conclusions above are generated directly from results.json; unsupported codecs remain explicitly visible in the support section and measurement tables.
