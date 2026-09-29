#include <stddef.h>
#include <stdint.h>
#include <stdlib.h>
#include <zstd.h>

size_t zs_compress_bound(size_t input_size) {
  return ZSTD_compressBound(input_size);
}

size_t zs_compress(int level, const uint8_t* input, size_t input_size,
    uint8_t* output, size_t output_capacity) {
  return ZSTD_compress(output, output_capacity, input, input_size, level);
}

size_t zs_decompress(const uint8_t* input, size_t input_size,
    uint8_t* output, size_t output_capacity) {
  return ZSTD_decompress(output, output_capacity, input, input_size);
}

int zs_is_error(size_t code) {
  return ZSTD_isError(code);
}

void* zs_malloc(size_t size) {
  return malloc(size);
}

void zs_free(void* ptr) {
  free(ptr);
}
