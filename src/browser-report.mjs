import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const dir = path.join(root, 'browser-benchmark-results');
const data = JSON.parse(fs.readFileSync(path.join(dir, 'results.json'), 'utf8'));
const supported = data.results.filter(row => row.supported);
const graphs = [
  ['compression-ratio.svg', 'Compressed size (% of input; lower is better)', row => row.ratio * 100, '%'],
  ['compression-speed.svg', 'Compression throughput (MiB/s; higher is better)', row => row.compressionMiBPerSec, ' MiB/s'],
  ['decompression-speed.svg', 'Decompression throughput (MiB/s; higher is better)', row => row.decompressionMiBPerSec, ' MiB/s']
];
for (const [file, title, value, suffix] of graphs) fs.writeFileSync(path.join(dir, file), tradeoffChart(title, supported, value, suffix));
fs.writeFileSync(path.join(dir, 'REPORT.md'), renderReport(data));

function renderReport(data) {
  const lines = [
    '# Browser compression and Brotli/WASM vs XZ/WASM', '',
    'This report compares codecs in the same headless Chrome process on the same deterministic corpora.  Each measured result follows one warm-up and uses the median of the measured repetitions.  Every measured codec is decompressed and checked byte-for-byte against its source on every run.', '',
    '## Environment', '',
    `- Browser: ${data.metadata.browser}`,
    `- CPU: ${data.metadata.cpuModel}`,
    `- Logical CPUs: ${data.metadata.logicalCpus}`,
    `- Corpus size: ${(data.metadata.corpusBytes / 1024 / 1024).toFixed(2)} MiB each`,
    `- Repetitions: ${data.metadata.repetitions} measured after ${data.metadata.warmupRuns} warm-up`,
    `- XZ: node-liblzma 5.1.3 WebAssembly, presets ${data.metadata.xzPresets.join(', ')}, binary ${(data.metadata.xzWasmBytes / 1024).toFixed(1)} KiB`,
    `- Brotli: Google Brotli WebAssembly, qualities ${data.metadata.brotliQualities.join(', ')}, binary ${(data.metadata.brotliWasmBytes / 1024).toFixed(1)} KiB`, '',
    '### WebAssembly payload size', '',
    '| Implementation | WASM bytes | KiB |', '|---|---:|---:|',
    `| Brotli/WASM | ${data.metadata.brotliWasmBytes.toLocaleString('en-US')} | ${(data.metadata.brotliWasmBytes / 1024).toFixed(1)} |`,
    `| XZ/WASM | ${data.metadata.xzWasmBytes.toLocaleString('en-US')} | ${(data.metadata.xzWasmBytes / 1024).toFixed(1)} |`, ''
    '## Browser codec support', '',
    'Support is runtime-detected in the browser named above.  An unsupported entry means that this browser rejects the corresponding `CompressionStream` / `DecompressionStream` format; it does not mean the compression algorithm is absent from the browser\'s HTTP stack.', '',
    'As of September 2026, Chromium/Chrome does **not** expose Brotli through `CompressionStream`, despite supporting Brotli HTTP content encoding.  Chromium issue 463397980 tracks that still-unshipped API support.  Firefox 147+ and Safari 18.4+ do expose native Brotli through `CompressionStream`.  Therefore this Chrome run cannot produce a legitimate browser-native Brotli measurement.', ''
  ];
  for (const [codec, available] of Object.entries(data.codecSupport)) lines.push(`- ${available ? 'Supported' : 'Unsupported'}: \`${codec}\``);
  lines.push('', '## Graphs', '', '### Compression ability', '', '![Compressed size](compression-ratio.svg)', '', '### Compression speed', '', '![Compression speed](compression-speed.svg)', '', '### Decompression speed', '', '![Decompression speed](decompression-speed.svg)', '', '## Measurements', '');
  for (const corpus of data.corpora) {
    lines.push(`### ${corpus.label}`, '', '| Codec | Compressed bytes | Ratio | Compress ms | Compress MiB/s | Decompress ms | Decompress MiB/s |', '|---|---:|---:|---:|---:|---:|---:|');
    for (const row of data.results.filter(r => r.corpus === corpus.kind)) {
      if (!row.supported) lines.push(`| ${row.codec} | unsupported | unsupported | unsupported | unsupported | unsupported | unsupported |`);
      else lines.push(`| ${row.codec} | ${row.archiveBytes.toLocaleString('en-US')} | ${(row.ratio * 100).toFixed(4)}% | ${row.compressionMs.toFixed(1)} | ${row.compressionMiBPerSec.toFixed(2)} | ${row.decompressionMs.toFixed(1)} | ${row.decompressionMiBPerSec.toFixed(2)} |`);
    }
    lines.push('');
  }
  lines.push('## Interpretation', '');
  for (const corpus of data.corpora) {
    const rows = data.results.filter(r => r.corpus === corpus.kind && r.supported);
    const smallest = [...rows].sort((a, b) => a.archiveBytes - b.archiveBytes)[0];
    const fastestCompression = [...rows].sort((a, b) => b.compressionMiBPerSec - a.compressionMiBPerSec)[0];
    const fastestDecompression = [...rows].sort((a, b) => b.decompressionMiBPerSec - a.decompressionMiBPerSec)[0];
    lines.push(`- **${corpus.label}:** smallest output: **${smallest.codec}** (${(smallest.ratio * 100).toFixed(4)}%); fastest compression: **${fastestCompression.codec}** (${fastestCompression.compressionMiBPerSec.toFixed(2)} MiB/s); fastest decompression: **${fastestDecompression.codec}** (${fastestDecompression.decompressionMiBPerSec.toFixed(2)} MiB/s).`);
  }
  lines.push('', 'The graphs and conclusions above are generated directly from results.json; unsupported codecs remain explicitly visible in the support section and measurement tables.', '');
  return lines.join('\n');
}

function tradeoffChart(title, rows, value, suffix) {
  const levels = [1, 4, 6, 9, 11];
  const series = [
    { prefix: 'brotli-wasm-q', label: 'Brotli/WASM', marker: 'circle' },
    { prefix: 'xz-wasm-p', label: 'XZ/WASM', marker: 'square' }
  ];
  const corpora = [...new Set(rows.map(row => row.corpus))];
  const width = 1000, panelHeight = 300, height = 60 + corpora.length * panelHeight;
  const left = 85, right = 40, plotWidth = width - left - right;
  const x = level => left + (level - 1) / 10 * plotWidth;
  const panels = corpora.map((corpus, panelIndex) => {
    const subset = rows.filter(row => row.corpus === corpus);
    const curveRows = subset.filter(row => series.some(s => row.codec.startsWith(s.prefix)));
    const baselines = subset.filter(row => ['gzip', 'deflate', 'deflate-raw'].includes(row.codec));
    const max = Math.max(...curveRows.map(value), ...baselines.map(value), 1);
    const top = 65 + panelIndex * panelHeight, bottom = top + 205;
    const y = v => bottom - v / max * 180;
    const grid = levels.map(level => `<line x1="${x(level)}" y1="${top}" x2="${x(level)}" y2="${bottom}" stroke="#ddd"/><text x="${x(level)}" y="${bottom + 22}" text-anchor="middle" font-size="12">${level}</text>`).join('');
    const curves = series.map(s => {
      const points = curveRows
        .filter(row => row.codec.startsWith(s.prefix))
        .map(row => ({ row, level: Number(row.codec.slice(s.prefix.length)) }))
        .sort((a, b) => a.level - b.level);
      const path = points.map((p, i) => `${i ? 'L' : 'M'} ${x(p.level)} ${y(value(p.row))}`).join(' ');
      const nodes = points.map(p => marker(s.marker, x(p.level), y(value(p.row))) + `<text x="${x(p.level) + 7}" y="${y(value(p.row)) - 7}" font-size="10">${formatValue(value(p.row), suffix)}</text>`).join('');
      return `<path d="${path}" fill="none" stroke="currentColor" stroke-width="2"/>${nodes}`;
    }).join('');
    const refs = baselines.map((row, i) => {
      const yy = y(value(row));
      return `<line x1="${left}" y1="${yy}" x2="${width - right}" y2="${yy}" stroke="#777" stroke-dasharray="${4 + i * 2} 4"/><text x="${width - right - 4}" y="${yy - 4}" text-anchor="end" font-size="10">${escapeXml(row.codec)} ${formatValue(value(row), suffix)}</text>`;
    }).join('');
    return `<text x="20" y="${top - 18}" font-size="15" font-weight="bold">${escapeXml(corpus)}</text>${grid}${refs}${curves}<text x="${left + plotWidth / 2}" y="${bottom + 43}" text-anchor="middle" font-size="12">Quality / preset level</text>`;
  }).join('');
  const legend = `<circle cx="720" cy="25" r="5" fill="currentColor"/><text x="732" y="29" font-size="12">Brotli/WASM</text><rect x="825" y="20" width="10" height="10" fill="currentColor"/><text x="840" y="29" font-size="12">XZ/WASM</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/><text x="20" y="28" font-size="18" font-weight="bold">${escapeXml(title)}</text>${legend}${panels}</svg>\n`;
}

function marker(kind, x, y) {
  return kind === 'square'
    ? `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" fill="currentColor"/>`
    : `<circle cx="${x}" cy="${y}" r="5" fill="currentColor"/>`;
}

function formatValue(value, suffix) {
  return suffix === '%' ? `${value.toFixed(4)}%` : `${value.toFixed(2)}${suffix}`;
}

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
