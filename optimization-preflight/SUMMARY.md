# WASM compiler optimization preflight

All three codecs were built from pinned upstream C sources with Emscripten 3.1.51. Each compiler optimization was tested on the same deterministic 4 MiB JSONL, moderate, and incompressible corpora with one warm-up and three measured repetitions at every benchmarked codec level. Every measured run performed an exact byte-for-byte round trip; truncated-stream rejection is checked by the browser harness.

The throughput columns below are geometric means across all corpora and all benchmarked levels. They are selection evidence, not substitutes for the final 32 MiB benchmark.

| Codec | Emscripten opt | WASM bytes | Compress MiB/s (geo mean) | Decompress MiB/s (geo mean) |
|---|---|---:|---:|---:|
| Brotli | -O2 | 749,578 | 72.82 | 1,351.11 |
| Brotli | -O3 | 796,677 | 78.34 | 1,348.72 |
| Brotli | -Os | 703,298 | 79.40 | 1,348.62 |
| Brotli | -Oz | 695,023 | 79.31 | 683.38 |
| Zstd | -O2 | 372,596 | 712.96 | 2,435.87 |
| Zstd | -O3 | 413,532 | 751.82 | 2,524.56 |
| Zstd | -Os | 328,415 | 749.62 | 2,474.39 |
| Zstd | -Oz | 253,163 | 498.45 | 2,289.71 |
| XZ/liblzma | -O2 | 111,884 | 10.63 | 262.08 |
| XZ/liblzma | -O3 | 121,263 | 10.68 | 260.99 |
| XZ/liblzma | -Os | 97,911 | 10.62 | 260.92 |
| XZ/liblzma | -Oz | 95,294 | 10.88 | 219.91 |

Archive byte counts were identical across -O2, -O3, -Os, and -Oz for every codec/corpus/level combination.

## Selection

**-Os is selected for Brotli, Zstd, and XZ/liblzma.**

- Brotli -Os is 11.7% smaller than -O3 while its aggregate compression throughput was slightly higher and decompression effectively unchanged. -Oz saved only another 1.2% of WASM size but roughly halved aggregate decompression throughput.
- Zstd -Os is 20.6% smaller than -O3 while retaining essentially the same aggregate compression speed and about 98% of aggregate decompression speed. -Oz is much smaller but lost about one third of aggregate compression throughput.
- XZ/liblzma -Os is 19.3% smaller than -O3 with essentially unchanged aggregate compression and decompression throughput. -Oz saved only another 2.7% but reduced aggregate decompression throughput by about 16%.

Source run: GitHub Actions run 36597249070.
