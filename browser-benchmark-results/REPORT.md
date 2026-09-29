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

| Codec | Compressed bytes | Ratio | Compress MiB/s | Decompress MiB/s |
|---|---:|---:|---:|---:|
| gzip | 365,083 | 1.0880% | 162.44 | 666.67 |
| deflate | 365,071 | 1.0880% | 164.36 | 675.11 |
| deflate-raw | 365,065 | 1.0880% | 164.95 | 698.69 |
| brotli-wasm-q1 | 172,686 | 0.5146% | 2133.33 | 2253.52 |
| brotli-wasm-q4 | 122,405 | 0.3648% | 397.02 | 1767.96 |
| brotli-wasm-q6 | 86,366 | 0.2574% | 119.23 | 2601.63 |
| brotli-wasm-q9 | 85,749 | 0.2556% | 86.89 | 2735.04 |
| brotli-wasm-q11 | 88,117 | 0.2626% | 1.64 | 2560.00 |
| xz-wasm-p1 | 148,808 | 0.4435% | 62.76 | 264.24 |
| xz-wasm-p4 | 134,240 | 0.4001% | 25.11 | 265.34 |
| xz-wasm-p6 | 92,132 | 0.2746% | 7.87 | 266.44 |
| xz-wasm-p9 | 84,452 | **0.2517%** | 7.87 | 261.01 |

### Moderately compressible 50/50 mixed data

| Codec | Compressed bytes | Ratio | Compress MiB/s | Decompress MiB/s |
|---|---:|---:|---:|---:|
| gzip | 16,928,281 | 50.4502% | 70.13 | 378.25 |
| deflate | 16,928,269 | 50.4502% | 69.90 | 385.54 |
| deflate-raw | 16,928,263 | 50.4502% | 70.19 | 389.29 |
| brotli-wasm-q1 | 16,787,648 | 50.0311% | 465.79 | 519.48 |
| brotli-wasm-q4 | 16,779,081 | **50.0056%** | 164.02 | 529.80 |
| brotli-wasm-q6 | 16,779,197 | 50.0059% | 85.31 | 528.93 |
| brotli-wasm-q9 | 16,780,278 | 50.0091% | 13.74 | 503.94 |
| brotli-wasm-q11 | 16,779,573 | 50.0070% | 0.65 | 529.80 |
| xz-wasm-p1 | 17,030,372 | 50.7545% | 11.10 | 29.81 |
| xz-wasm-p4 | 17,009,244 | 50.6915% | 7.70 | 29.74 |
| xz-wasm-p6 | 17,008,564 | 50.6895% | 5.46 | 29.53 |
| xz-wasm-p9 | 17,008,772 | 50.6901% | 5.38 | 29.84 |

### Incompressible high-entropy data

| Codec | Compressed bytes | Ratio | Compress MiB/s | Decompress MiB/s |
|---|---:|---:|---:|---:|
| gzip | 33,564,695 | 100.0306% | 42.18 | 375.59 |
| deflate | 33,564,683 | 100.0306% | 42.24 | 375.15 |
| deflate-raw | 33,564,677 | 100.0305% | 42.14 | 376.03 |
| brotli-wasm-q1 | 33,554,465 | **100.0001%** | 1180.81 | 2253.52 |
| brotli-wasm-q4 | 33,554,449 | **100.0001%** | 305.34 | 2253.52 |
| brotli-wasm-q6 | 33,554,512 | 100.0002% | 68.11 | 2253.52 |
| brotli-wasm-q9 | 33,554,520 | 100.0003% | 46.56 | 2269.50 |
| brotli-wasm-q11 | 33,554,536 | 100.0003% | 1.36 | 2318.84 |
| xz-wasm-p1 | 33,556,056 | 100.0048% | 5.30 | 260.16 |
| xz-wasm-p4 | 33,556,056 | 100.0048% | 3.33 | 260.16 |
| xz-wasm-p6 | 33,556,056 | 100.0048% | 2.85 | 259.53 |
| xz-wasm-p9 | 33,556,056 | 100.0048% | 2.96 | 256.00 |

## Interpretation

- **Highly compressible JSONL:** smallest output: **xz-wasm-p9** (0.2517%); fastest compression: **brotli-wasm-q1** (2133.33 MiB/s); fastest decompression: **brotli-wasm-q9** (2735.04 MiB/s).
- **Moderately compressible 50/50 mixed data:** smallest output: **brotli-wasm-q4** (50.0056%); fastest compression: **brotli-wasm-q1** (465.79 MiB/s); fastest decompression: **brotli-wasm-q11** (529.80 MiB/s).
- **Incompressible high-entropy data:** smallest output: **brotli-wasm-q4** (100.0001%); fastest compression: **brotli-wasm-q1** (1180.81 MiB/s); fastest decompression: **brotli-wasm-q11** (2318.84 MiB/s).

Generated from GitHub Actions run 36521981417, commit 442152820809a8d8aec5a1e2e951656130b3c90c.
