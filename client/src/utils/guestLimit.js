const STORAGE_KEY = 'pdfforge_guest_usage';
const GUEST_LIMIT = 5;

export function getGuestUsage() {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY), 10) || 0;
  } catch {
    return 0;
  }
}

export function incrementGuestUsage() {
  const count = getGuestUsage() + 1;
  try {
    localStorage.setItem(STORAGE_KEY, String(count));
  } catch { /* ignore */ }
  return count;
}

export function isGuestLimitReached() {
  return getGuestUsage() >= GUEST_LIMIT;
}

export function clearGuestUsage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

export { GUEST_LIMIT };
