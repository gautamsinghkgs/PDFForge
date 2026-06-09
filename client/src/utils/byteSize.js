/** API / JSON can send size as string; avoid NaN → wrong "B" display. */
export function parseByteSize(v) {
  if (v == null) return 0;
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.trunc(v));
  const s = String(v).replace(/,/g, '').trim();
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Human-readable size — always show KB/MB for non-zero files (fix PPT byte display). */
export function formatFileSize(b) {
  const n = parseByteSize(b);
  if (!n) return '0 B';
  if (n < 1048576) {
    const kb = n / 1024;
    // Always show KB for any non-zero file size
    return `${kb < 10 ? kb.toFixed(2) : kb.toFixed(1)} KB`;
  }
  return `${(n / 1048576).toFixed(2)} MB`;
}
