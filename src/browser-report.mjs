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
    '# Browser compression: Brotli/WASM vs XZ/WASM vs Zstd/WASM', '',
    'This report compares codecs in the same headless Chrome process on the same deterministic corpora.  Each measured result follows one warm-up and uses the median of the measured repetitions.  Every measured codec is decompressed and checked byte-for-byte against its source on every run.', '',
    '## Environment', '',
    `- Browser: ${data.metadata.browser}`,
    `- CPU: ${data.metadata.cpuModel}`,
    `- Logical CPUs: ${data.metadata.logicalCpus}`,
    `- Corpus size: ${(data.metadata.corpusBytes / 1024 / 1024).toFixed(2)} MiB each`,
    `- Repetitions: ${data.metadata.repetitions} measured after ${data.metadata.warmupRuns} warm-up`,
    `- XZ: upstream liblzma WebAssembly, presets ${[...data.metadata.xzPresets].sort((a, b) => a - b).join(', ')}, binary ${(data.metadata.xzWasmBytes / 1024).toFixed(1)} KiB`,
    `- Brotli: Google Brotli WebAssembly, qualities ${data.metadata.brotliQualities.join(', ')}, binary ${(data.metadata.brotliWasmBytes / 1024).toFixed(1)} KiB`,
    `- Zstd: Facebook Zstandard WebAssembly, levels ${data.metadata.zstdLevels.join(', ')}, binary ${(data.metadata.zstdWasmBytes / 1024).toFixed(1)} KiB`,
    `- Emscripten: ${data.metadata.emscriptenVersion}; selected optimization: Brotli ${data.metadata.buildOptimization.brotli}, Zstd ${data.metadata.buildOptimization.zstd}, XZ ${data.metadata.buildOptimization.xz}`,
    `- Upstream commits: Brotli \`${data.metadata.upstreamCommits.brotli}\`; Zstd \`${data.metadata.upstreamCommits.zstd}\`; XZ \`${data.metadata.upstreamCommits.xz}\``, '',
    'Compiler optimization selection was established by the checked-in [optimization preflight](../optimization-preflight/SUMMARY.md) before this final benchmark.', '',
    '### WebAssembly payload size', '',
    '| Implementation | WASM bytes | KiB |', '|---|---:|---:|',
    `| Brotli/WASM | ${data.metadata.brotliWasmBytes.toLocaleString('en-US')} | ${(data.metadata.brotliWasmBytes / 1024).toFixed(1)} |`,
    `| Zstd/WASM | ${data.metadata.zstdWasmBytes.toLocaleString('en-US')} | ${(data.metadata.zstdWasmBytes / 1024).toFixed(1)} |`,
    `| XZ/WASM | ${data.metadata.xzWasmBytes.toLocaleString('en-US')} | ${(data.metadata.xzWasmBytes / 1024).toFixed(1)} |`, '',
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
  const schemes = [
    { prefix: 'brotli-wasm-q', label: 'Brotli/WASM', color: '#0072B2' },
    { prefix: 'xz-wasm-p', label: 'XZ/WASM', color: '#D55E00' },
    { prefix: 'zstd-wasm-l', label: 'Zstd/WASM', color: '#009E73' }
  ];
  const corpusStyles = [
    { corpus: 'jsonl', label: 'JSONL', dash: '', marker: 'circle' },
    { corpus: 'moderate', label: 'Moderate', dash: '9 5', marker: 'square' },
    { corpus: 'incompressible', label: 'Incompressible', dash: '2 4', marker: 'triangle' }
  ];
  const native = [
    { codec: 'gzip', color: '#CC79A7', dash: '10 4' },
    { codec: 'deflate', color: '#E69F00', dash: '4 4' },
    { codec: 'deflate-raw', color: '#56B4E9', dash: '10 3 2 3' }
  ];
  const width = 1200, height = 650, left = 90, right = 45, top = 95, bottom = 555;
  const plotWidth = width - left - right;
  const x = level => left + (level - 1) / 10 * plotWidth;
  const curveRows = rows.filter(row => schemes.some(s => row.codec.startsWith(s.prefix)));
  const baselineRows = rows.filter(row => native.some(n => row.codec === n.codec));
  const max = Math.max(...curveRows.map(value), ...baselineRows.map(value), 1);
  const y = v => bottom - v / max * (bottom - top - 15);
  const grid = levels.map(level => `<line x1="${x(level)}" y1="${top}" x2="${x(level)}" y2="${bottom}" stroke="#ddd"/><text x="${x(level)}" y="${bottom + 24}" text-anchor="middle" font-size="12">${level}</text>`).join('');
  const curves = schemes.flatMap(s => corpusStyles.map(cs => {
    const points = curveRows.filter(row => row.corpus === cs.corpus && row.codec.startsWith(s.prefix))
      .map(row => ({ row, level: Number(row.codec.slice(s.prefix.length)) })).sort((a, b) => a.level - b.level);
    if (!points.length) return '';
    const path = points.map((p, i) => `${i ? 'L' : 'M'} ${x(p.level)} ${y(value(p.row))}`).join(' ');
    const dash = cs.dash ? ` stroke-dasharray="${cs.dash}"` : '';
    const nodes = points.map(p => marker(cs.marker, x(p.level), y(value(p.row)), s.color)).join('');
    return `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="2.5"${dash}/>${nodes}`;
  })).join('');
  const refs = native.flatMap((n, ni) => corpusStyles.map((cs, ci) => {
    const row = baselineRows.find(r => r.codec === n.codec && r.corpus === cs.corpus);
    if (!row) return '';
    const yy = y(value(row));
    const dash = cs.dash || n.dash;
    return `<line x1="${left}" y1="${yy}" x2="${width - right}" y2="${yy}" stroke="${n.color}" stroke-width="1.3" stroke-dasharray="${dash}" opacity="0.65"/>`;
  })).join('');
  const schemeLegend = schemes.map((s, i) => `<line x1="${620 + i * 180}" y1="25" x2="${645 + i * 180}" y2="25" stroke="${s.color}" stroke-width="3"/><text x="${652 + i * 180}" y="29" font-size="12">${s.label}</text>`).join('');
  const corpusLegend = corpusStyles.map((cs, i) => {
    const xx = 620 + i * 180, yy = 55;
    const dash = cs.dash ? ` stroke-dasharray="${cs.dash}"` : '';
    return `<line x1="${xx}" y1="${yy}" x2="${xx + 25}" y2="${yy}" stroke="#333" stroke-width="2.5"${dash}/>${marker(cs.marker, xx + 12.5, yy, '#333')}<text x="${xx + 32}" y="${yy + 4}" font-size="12">${cs.label}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/><text x="20" y="28" font-size="18" font-weight="bold">${escapeXml(title)}</text>${schemeLegend}${corpusLegend}${grid}${refs}${curves}<text x="${left + plotWidth / 2}" y="${bottom + 48}" text-anchor="middle" font-size="12">Quality / preset / level</text></svg>\n`;
}

function marker(kind, x, y, color) {
  if (kind === 'square') return `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" fill="white" stroke="${color}" stroke-width="2.5"/>`;
  if (kind === 'triangle') return `<path d="M ${x} ${y - 6} L ${x + 6} ${y + 5} L ${x - 6} ${y + 5} Z" fill="white" stroke="${color}" stroke-width="2.5"/>`;
  return `<circle cx="${x}" cy="${y}" r="5" fill="white" stroke="${color}" stroke-width="2.5"/>`;
}

function formatValue(value, suffix) {
  return suffix === '%' ? `${value.toFixed(4)}%` : `${value.toFixed(2)}${suffix}`;
}

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
