const GUEST_ID_KEY = 'pdfforge_guest_id';
const GUEST_LIMIT = 5;

function generateId() {
  return 'guest_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

export function getGuestId() {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch {
    return generateId();
  }
}

export function clearGuestUsage() {
  try {
    localStorage.removeItem(GUEST_ID_KEY);
  } catch { /* ignore */ }
}

export { GUEST_LIMIT };
