#include <stddef.h>
#include <stdint.h>
#include <stdlib.h>
#include <brotli/decode.h>
#include <brotli/encode.h>

size_t br_max_compressed_size(size_t input_size) {
  return BrotliEncoderMaxCompressedSize(input_size);
}

int br_compress(int quality, int lgwin, int mode,
    const uint8_t* input, size_t input_size,
    uint8_t* output, size_t* output_size) {
  return BrotliEncoderCompress(
      quality, lgwin, (BrotliEncoderMode)mode,
      input_size, input, output_size, output);
}

int br_decompress(const uint8_t* input, size_t input_size,
    uint8_t* output, size_t* output_size) {
  return BrotliDecoderDecompress(
      input_size, input, output_size, output) == BROTLI_DECODER_RESULT_SUCCESS;
}

void* br_malloc(size_t size) {
  return malloc(size);
}

void br_free(void* ptr) {
  free(ptr);
}
