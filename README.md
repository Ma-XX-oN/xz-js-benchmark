# xz-js-benchmark

Reproducible XZ/LZMA2 compression benchmarks for JavaScript/WebAssembly implementations against native `xz`.

The benchmark mirrors the methodology used by `Ma-XX-oN/7z-js-benchmark` with deterministic 32 MiB corpora:

- `jsonl`: highly compressible conversation-style JSONL.
- `moderate`: alternating 64 KiB repetitive and AES-256-CTR high-entropy blocks.
- `incompressible`: deterministic AES-256-CTR high-entropy bytes.

Every produced `.xz` file is verified with native `xz -t`, decompressed with native `xz -dc`, and checked byte-for-byte by SHA-256 against the source.

Work is tracked in issue #1.

## Browser-native codec comparison

Issue #5 adds an in-browser comparison of the browser's native `CompressionStream` / `DecompressionStream` codecs against the repository's XZ/WASM implementation.  The benchmark detects codec support at runtime, uses the same deterministic corpora, verifies every round trip byte-for-byte, and records compression/decompression throughput plus output size.

Measured results and graphs: [browser-benchmark-results/REPORT.md](browser-benchmark-results/REPORT.md)

Run it on a machine with Google Chrome available as `/usr/bin/google-chrome`, or set `CHROME_BIN`:

```sh
npm run benchmark:browser
npm run report:browser
```

