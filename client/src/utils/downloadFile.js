/**
 * Cross-origin <a download> is often ignored; fetch + blob saves the full file reliably.
 */
export function resolveDownloadUrl(downloadUrl) {
  if (!downloadUrl) throw new Error('Missing download URL');
  const u = String(downloadUrl).trim();
  if (/^https?:\/\//i.test(u)) {
    const parsed = new URL(u);
    if (parsed.pathname.startsWith('/api/downloads/')) {
      return `${window.location.origin}${parsed.pathname}${parsed.search}`;
    }
    return u;
  }
  const path = u.startsWith('/') ? u : `/${u}`;
  return `${window.location.origin}${path}`;
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
