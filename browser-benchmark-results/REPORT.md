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
| gzip | 365,083 | 1.0880% | 199.1 | 160.72 | 48.7 | 657.08 |
| deflate | 365,071 | 1.0880% | 195.9 | 163.35 | 48.1 | 665.28 |
| deflate-raw | 365,065 | 1.0880% | 195.0 | 164.10 | 46.4 | 689.66 |
| brotli | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| zstd | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| brotli-wasm-q1 | 172,686 | 0.5146% | 14.1 | 2269.50 | 14.4 | 2222.22 |
| brotli-wasm-q4 | 122,405 | 0.3648% | 82.4 | 388.35 | 18.3 | 1748.63 |
| brotli-wasm-q6 | 86,366 | 0.2574% | 267.7 | 119.54 | 11.5 | 2782.61 |
| brotli-wasm-q9 | 85,749 | 0.2556% | 358.9 | 89.16 | 11.5 | 2782.61 |
| brotli-wasm-q11 | 88,117 | 0.2626% | 19642.4 | 1.63 | 12.4 | 2580.65 |
| xz-wasm-p1 | 148,808 | 0.4435% | 514.8 | 62.16 | 123.3 | 259.53 |
| xz-wasm-p4 | 134,240 | 0.4001% | 1279.9 | 25.00 | 121.0 | 264.46 |
| xz-wasm-p6 | 92,132 | 0.2746% | 4136.2 | 7.74 | 121.3 | 263.81 |
| xz-wasm-p9 | 84,452 | 0.2517% | 4094.4 | 7.82 | 122.4 | 261.44 |

### Moderately compressible 50/50 mixed data

| Codec | Compressed bytes | Ratio | Compress ms | Compress MiB/s | Decompress ms | Decompress MiB/s |
|---|---:|---:|---:|---:|---:|---:|
| gzip | 16,928,281 | 50.4502% | 458.6 | 69.78 | 85.3 | 375.15 |
| deflate | 16,928,269 | 50.4502% | 457.9 | 69.88 | 84.6 | 378.25 |
| deflate-raw | 16,928,263 | 50.4502% | 458.5 | 69.79 | 83.8 | 381.86 |
| brotli | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| zstd | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| brotli-wasm-q1 | 16,787,648 | 50.0311% | 68.9 | 464.44 | 62.5 | 512.00 |
| brotli-wasm-q4 | 16,779,081 | 50.0056% | 199.2 | 160.64 | 60.8 | 526.32 |
| brotli-wasm-q6 | 16,779,197 | 50.0059% | 382.9 | 83.57 | 61.0 | 524.59 |
| brotli-wasm-q9 | 16,780,278 | 50.0091% | 2421.8 | 13.21 | 63.8 | 501.57 |
| brotli-wasm-q11 | 16,779,573 | 50.0070% | 50304.8 | 0.64 | 60.9 | 525.45 |
| xz-wasm-p1 | 17,030,372 | 50.7545% | 2931.7 | 10.92 | 1072.9 | 29.83 |
| xz-wasm-p4 | 17,009,244 | 50.6915% | 4802.1 | 6.66 | 1079.4 | 29.65 |
| xz-wasm-p6 | 17,008,564 | 50.6895% | 6380.8 | 5.02 | 1082.5 | 29.56 |
| xz-wasm-p9 | 17,008,772 | 50.6901% | 6171.1 | 5.19 | 1085.8 | 29.47 |

### Incompressible high-entropy data

| Codec | Compressed bytes | Ratio | Compress ms | Compress MiB/s | Decompress ms | Decompress MiB/s |
|---|---:|---:|---:|---:|---:|---:|
| gzip | 33,564,695 | 100.0306% | 760.2 | 42.09 | 87.8 | 364.46 |
| deflate | 33,564,683 | 100.0306% | 764.2 | 41.87 | 87.0 | 367.82 |
| deflate-raw | 33,564,677 | 100.0305% | 760.3 | 42.09 | 84.5 | 378.70 |
| brotli | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| zstd | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| brotli-wasm-q1 | 33,554,465 | 100.0001% | 27.6 | 1159.42 | 14.2 | 2253.52 |
| brotli-wasm-q4 | 33,554,449 | 100.0001% | 103.6 | 308.88 | 14.0 | 2285.71 |
| brotli-wasm-q6 | 33,554,512 | 100.0002% | 473.6 | 67.57 | 14.7 | 2176.87 |
| brotli-wasm-q9 | 33,554,520 | 100.0003% | 696.3 | 45.96 | 13.8 | 2318.84 |
| brotli-wasm-q11 | 33,554,536 | 100.0003% | 29132.1 | 1.10 | 14.2 | 2253.52 |
| xz-wasm-p1 | 33,556,056 | 100.0048% | 6726.6 | 4.76 | 122.7 | 260.80 |
| xz-wasm-p4 | 33,556,056 | 100.0048% | 10906.8 | 2.93 | 123.2 | 259.74 |
| xz-wasm-p6 | 33,556,056 | 100.0048% | 12837.7 | 2.49 | 123.2 | 259.74 |
| xz-wasm-p9 | 33,556,056 | 100.0048% | 11318.0 | 2.83 | 125.6 | 254.78 |

## Interpretation

- **Highly compressible JSONL:** smallest output: **xz-wasm-p9** (0.2517%); fastest compression: **brotli-wasm-q1** (2269.50 MiB/s); fastest decompression: **brotli-wasm-q6** (2782.61 MiB/s).
- **Moderately compressible 50/50 mixed data:** smallest output: **brotli-wasm-q4** (50.0056%); fastest compression: **brotli-wasm-q1** (464.44 MiB/s); fastest decompression: **brotli-wasm-q4** (526.32 MiB/s).
- **Incompressible high-entropy data:** smallest output: **brotli-wasm-q4** (100.0001%); fastest compression: **brotli-wasm-q1** (1159.42 MiB/s); fastest decompression: **brotli-wasm-q9** (2318.84 MiB/s).

The graphs and conclusions above are generated directly from results.json; unsupported codecs remain explicitly visible in the support section and measurement tables.
