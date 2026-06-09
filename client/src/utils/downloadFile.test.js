import { resolveDownloadUrl } from './downloadFile';

describe('resolveDownloadUrl', () => {
  test('uses the current origin for relative signed download links', () => {
    expect(resolveDownloadUrl('/api/downloads/token')).toBe(
      `${window.location.origin}/api/downloads/token`
    );
  });

  test('normalizes legacy absolute signed download links to the current origin', () => {
    expect(resolveDownloadUrl('http://localhost:5000/api/downloads/token?source=history')).toBe(
      `${window.location.origin}/api/downloads/token?source=history`
    );
  });

  test('keeps unrelated absolute URLs unchanged', () => {
    expect(resolveDownloadUrl('https://example.com/file.pdf')).toBe(
      'https://example.com/file.pdf'
    );
  });
});
