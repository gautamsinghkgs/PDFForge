const API_BASE = process.env.REACT_APP_API_URL || 'https://pdfforge-server-8mwu.onrender.com/api';

/**
 * Resolve download URL against the API server, not window.location (Vercel).
 */
export function resolveDownloadUrl(downloadUrl) {
  if (!downloadUrl) throw new Error('Missing download URL');
  const u = String(downloadUrl).trim();
  if (/^https?:\/\//i.test(u)) return u;
  const path = u.startsWith('/') ? u : `/${u}`;
  return `${API_BASE.replace(/\/api\/?$/, '')}${path}`;
}

export async function downloadOutputFile({ downloadUrl, filename }) {
  const url = resolveDownloadUrl(downloadUrl);
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      text && text.length < 200 ? text : `Download failed (${res.status})`
    );
  }
  const blob = await res.blob();
  if (!blob.size) {
    throw new Error('Empty file — server may not have saved the output. Try processing again.');
  }
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename || 'download';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  return blob.size;
}
