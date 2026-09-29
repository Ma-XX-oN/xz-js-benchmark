#include <stddef.h>
#include <stdint.h>
#include <stdlib.h>
#include <lzma.h>

size_t xz_bound(size_t input_size) {
  return lzma_stream_buffer_bound(input_size);
}

int xz_compress(uint32_t preset, const uint8_t* input, size_t input_size,
    uint8_t* output, size_t* output_size) {
  size_t out_pos = 0;
  lzma_ret ret = lzma_easy_buffer_encode(
      preset, LZMA_CHECK_CRC64, NULL, input, input_size,
      output, &out_pos, *output_size);
  *output_size = out_pos;
  return (int)ret;
}

int xz_decompress(const uint8_t* input, size_t input_size,
    uint8_t* output, size_t* output_size) {
  uint64_t memlimit = UINT64_MAX;
  size_t in_pos = 0;
  size_t out_pos = 0;
  lzma_ret ret = lzma_stream_buffer_decode(
      &memlimit, 0, NULL, input, &in_pos, input_size,
      output, &out_pos, *output_size);
  *output_size = out_pos;
  return (int)ret;
}

void* xz_malloc(size_t size) { return malloc(size); }
void xz_free(void* ptr) { free(ptr); }
