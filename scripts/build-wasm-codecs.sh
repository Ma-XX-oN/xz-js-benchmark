#!/usr/bin/env bash
set -euo pipefail

brotli_opt="${BROTLI_OPT:-${1:--O3}}"
zstd_opt="${ZSTD_OPT:-${1:--O3}}"
xz_opt="${XZ_COPT:-${1:--O3}}"
tag="${BUILD_TAG:-selected}"

mkdir -p wasm

emcc src/brotli-wasm-wrapper.c \
  .brotli-src/c/common/*.c .brotli-src/c/enc/*.c .brotli-src/c/dec/*.c \
  -I.brotli-src/c/include "$brotli_opt" \
  -s STANDALONE_WASM=1 -s ALLOW_MEMORY_GROWTH=1 -Wl,--no-entry \
  -Wl,--export=br_max_compressed_size -Wl,--export=br_compress \
  -Wl,--export=br_decompress -Wl,--export=br_malloc -Wl,--export=br_free \
  -o wasm/brotli.wasm

emcc src/zstd-wasm-wrapper.c \
  .zstd-src/lib/common/*.c .zstd-src/lib/compress/*.c .zstd-src/lib/decompress/*.c \
  -I.zstd-src/lib "$zstd_opt" \
  -s STANDALONE_WASM=1 -s ALLOW_MEMORY_GROWTH=1 -Wl,--no-entry \
  -Wl,--export=zs_compress_bound -Wl,--export=zs_compress \
  -Wl,--export=zs_decompress -Wl,--export=zs_is_error \
  -Wl,--export=zs_malloc -Wl,--export=zs_free -o wasm/zstd.wasm

build_dir=".xz-build-$tag"
rm -rf "$build_dir"
emcmake cmake -S .xz-src -B "$build_dir" \
  -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_FLAGS="$xz_opt" \
  -DBUILD_SHARED_LIBS=OFF -DXZ_THREADS=no -DXZ_NLS=OFF \
  -DXZ_TOOL_XZ=OFF -DXZ_TOOL_XZDEC=OFF -DXZ_TOOL_LZMADEC=OFF \
  -DXZ_TOOL_LZMAINFO=OFF
cmake --build "$build_dir" --target liblzma -j2
xz_library="$(find "$build_dir" -name 'liblzma.a' -print -quit)"
if [[ -z "$xz_library" ]]; then
  echo "liblzma.a was not produced by the XZ CMake build" >&2
  exit 1
fi

emcc src/xz-wasm-wrapper.c "$xz_library" \
  -I"$build_dir/src/liblzma/api" -I.xz-src/src/liblzma/api "$xz_opt" \
  -s STANDALONE_WASM=1 -s ALLOW_MEMORY_GROWTH=1 -Wl,--no-entry \
  -Wl,--export=xz_bound -Wl,--export=xz_compress -Wl,--export=xz_decompress \
  -Wl,--export=xz_malloc -Wl,--export=xz_free -o wasm/xz.wasm
