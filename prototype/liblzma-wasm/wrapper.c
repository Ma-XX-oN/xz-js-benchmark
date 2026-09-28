#include <lzma.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
  lzma_stream strm;
  uint8_t *out;
  size_t out_cap;
} dc_xz_encoder;

static int dc_reserve(dc_xz_encoder *e, size_t cap) {
  if (e->out_cap >= cap) return 1;
  uint8_t *p = (uint8_t *)realloc(e->out, cap);
  if (!p) return 0;
  e->out = p;
  e->out_cap = cap;
  return 1;
}

dc_xz_encoder *dc_xz_encoder_new(uint32_t level) {
  if (level > 9) return NULL;
  dc_xz_encoder *e = (dc_xz_encoder *)calloc(1, sizeof(*e));
  if (!e) return NULL;
  e->strm = (lzma_stream)LZMA_STREAM_INIT;
  if (lzma_easy_encoder(&e->strm, level, LZMA_CHECK_CRC64) != LZMA_OK) {
    free(e);
    return NULL;
  }
  return e;
}

int dc_xz_encoder_write(dc_xz_encoder *e, const uint8_t *input, size_t input_len,
                        uint8_t **output, size_t *output_len) {
  if (!e || !output || !output_len) return 0;
  size_t cap = input_len + 65536;
  if (cap < 65536) cap = 65536;
  if (!dc_reserve(e, cap)) return 0;
  e->strm.next_in = input;
  e->strm.avail_in = input_len;
  e->strm.next_out = e->out;
  e->strm.avail_out = e->out_cap;
  while (e->strm.avail_in) {
    lzma_ret ret = lzma_code(&e->strm, LZMA_RUN);
    if (ret != LZMA_OK) return 0;
    if (!e->strm.avail_out) {
      size_t used = e->out_cap;
      if (!dc_reserve(e, e->out_cap * 2)) return 0;
      e->strm.next_out = e->out + used;
      e->strm.avail_out = e->out_cap - used;
    }
  }
  *output = e->out;
  *output_len = e->out_cap - e->strm.avail_out;
  return 1;
}

int dc_xz_encoder_finish(dc_xz_encoder *e, uint8_t **output, size_t *output_len) {
  if (!e || !output || !output_len) return 0;
  if (!dc_reserve(e, 65536)) return 0;
  e->strm.next_in = NULL;
  e->strm.avail_in = 0;
  e->strm.next_out = e->out;
  e->strm.avail_out = e->out_cap;
  for (;;) {
    lzma_ret ret = lzma_code(&e->strm, LZMA_FINISH);
    if (ret == LZMA_STREAM_END) break;
    if (ret != LZMA_OK) return 0;
    if (!e->strm.avail_out) {
      size_t used = e->out_cap;
      if (!dc_reserve(e, e->out_cap * 2)) return 0;
      e->strm.next_out = e->out + used;
      e->strm.avail_out = e->out_cap - used;
    }
  }
  *output = e->out;
  *output_len = e->out_cap - e->strm.avail_out;
  return 1;
}

void dc_xz_encoder_free(dc_xz_encoder *e) {
  if (!e) return;
  lzma_end(&e->strm);
  free(e->out);
  free(e);
}

/* issue-3 CI trigger */
