# xz-js-benchmark

Reproducible XZ/LZMA2 compression benchmarks for JavaScript/WebAssembly implementations against native `xz`.

The benchmark mirrors the methodology used by `Ma-XX-oN/7z-js-benchmark` with deterministic 32 MiB corpora:

- `jsonl`: highly compressible conversation-style JSONL.
- `moderate`: alternating 64 KiB repetitive and AES-256-CTR high-entropy blocks.
- `incompressible`: deterministic AES-256-CTR high-entropy bytes.

Every produced `.xz` file is verified with native `xz -t`, decompressed with native `xz -dc`, and checked byte-for-byte by SHA-256 against the source.

Work is tracked in issue #1.
