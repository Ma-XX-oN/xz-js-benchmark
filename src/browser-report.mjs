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
for (const [file, title, value, suffix] of graphs) fs.writeFileSync(path.join(dir, file), barChart(title, supported, value, suffix));
fs.writeFileSync(path.join(dir, 'REPORT.md'), renderReport(data));

function renderReport(data) {
  const lines = [
    '# Browser-native compression vs XZ/WASM', '',
    'This report compares codecs in the same headless Chrome process on the same deterministic corpora.  Each measured result follows one warm-up and uses the median of the measured repetitions.  Every measured codec is decompressed and checked byte-for-byte against its source on every run.', '',
    '## Environment', '',
    `- Browser: ${data.metadata.browser}`,
    `- CPU: ${data.metadata.cpuModel}`,
    `- Logical CPUs: ${data.metadata.logicalCpus}`,
    `- Corpus size: ${(data.metadata.corpusBytes / 1024 / 1024).toFixed(2)} MiB each`,
    `- Repetitions: ${data.metadata.repetitions} measured after ${data.metadata.warmupRuns} warm-up`,
    `- XZ: node-liblzma 5.1.3 WebAssembly, preset ${data.metadata.xzPreset}`, '',
    '## Browser codec support', ''
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

function barChart(title, rows, value, suffix) {
  const labels = rows.map(row => `${row.corpus} / ${row.codec}`);
  const values = rows.map(value);
  const max = Math.max(...values) || 1;
  const left = 190, width = 900, plot = 650, rowHeight = 30;
  const height = 80 + rows.length * rowHeight;
  const bars = rows.map((row, i) => {
    const y = 55 + i * rowHeight, v = values[i], w = Math.max(1, v / max * plot);
    const text = suffix === '%' ? `${v.toFixed(4)}%` : `${v.toFixed(2)}${suffix}`;
    return `<text x="${left - 8}" y="${y + 15}" text-anchor="end" font-size="12">${escapeXml(labels[i])}</text><rect x="${left}" y="${y}" width="${w}" height="20" fill="#4c78a8"/><text x="${Math.min(left + w + 6, width - 100)}" y="${y + 15}" font-size="12">${escapeXml(text)}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/><text x="20" y="28" font-size="18" font-weight="bold">${escapeXml(title)}</text>${bars}</svg>\n`;
}

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
