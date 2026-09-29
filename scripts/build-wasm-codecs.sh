#!/usr/bin/env bash
set -euo pipefail

brotli_opt="${BROTLI_OPT:-${1:--O3}}"
zstd_opt="${ZSTD_OPT:-${1:--O3}}"
xz_opt="${XZ_COPT:-${1:--O3}}"
tag="${BUILD_TAG:-selected}"

mkdir -p wasm
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
