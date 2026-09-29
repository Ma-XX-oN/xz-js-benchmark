# Browser-native compression vs XZ/WASM

This report compares codecs in the same headless Chrome process on the same deterministic corpora.  Each measured result follows one warm-up and uses the median of the measured repetitions.  Every measured codec is decompressed and checked byte-for-byte against its source on every run.

## Environment

- Browser: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36
- CPU: AMD EPYC 7763 64-Core Processor
- Logical CPUs: 4
- Corpus size: 32.00 MiB each
- Repetitions: 3 measured after 1 warm-up
- XZ: node-liblzma 5.1.3 WebAssembly, preset 6

## Browser codec support

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
| gzip | 365,083 | 1.0880% | 204.6 | 156.40 | 47.8 | 669.46 |
| deflate | 365,071 | 1.0880% | 195.1 | 164.02 | 47.6 | 672.27 |
| deflate-raw | 365,065 | 1.0880% | 194.4 | 164.61 | 46.0 | 695.65 |
| brotli | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| zstd | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| xz-wasm | 92,172 | 0.2747% | 3102.9 | 10.31 | 108.8 | 294.12 |

### Moderately compressible 50/50 mixed data

| Codec | Compressed bytes | Ratio | Compress ms | Compress MiB/s | Decompress ms | Decompress MiB/s |
|---|---:|---:|---:|---:|---:|---:|
| gzip | 16,928,281 | 50.4502% | 467.4 | 68.46 | 86.5 | 369.94 |
| deflate | 16,928,269 | 50.4502% | 457.8 | 69.90 | 82.0 | 390.24 |
| deflate-raw | 16,928,263 | 50.4502% | 454.8 | 70.36 | 81.5 | 392.64 |
| brotli | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| zstd | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| xz-wasm | 16,997,048 | 50.6552% | 4848.6 | 6.60 | 979.1 | 32.68 |

### Incompressible high-entropy data

| Codec | Compressed bytes | Ratio | Compress ms | Compress MiB/s | Decompress ms | Decompress MiB/s |
|---|---:|---:|---:|---:|---:|---:|
| gzip | 33,564,695 | 100.0306% | 769.2 | 41.60 | 87.2 | 366.97 |
| deflate | 33,564,683 | 100.0306% | 759.5 | 42.13 | 83.1 | 385.08 |
| deflate-raw | 33,564,677 | 100.0305% | 753.1 | 42.49 | 85.0 | 376.47 |
| brotli | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| zstd | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |
| xz-wasm | 33,556,156 | 100.0051% | 10477.8 | 3.05 | 154.4 | 207.25 |

## Interpretation

- **Highly compressible JSONL:** smallest output: **xz-wasm** (0.2747%); fastest compression: **deflate-raw** (164.61 MiB/s); fastest decompression: **deflate-raw** (695.65 MiB/s).
- **Moderately compressible 50/50 mixed data:** smallest output: **deflate-raw** (50.4502%); fastest compression: **deflate-raw** (70.36 MiB/s); fastest decompression: **deflate-raw** (392.64 MiB/s).
- **Incompressible high-entropy data:** smallest output: **xz-wasm** (100.0051%); fastest compression: **deflate-raw** (42.49 MiB/s); fastest decompression: **deflate** (385.08 MiB/s).

The graphs and conclusions above are generated directly from results.json; unsupported codecs remain explicitly visible in the support section and measurement tables.
