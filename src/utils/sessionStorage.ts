// Helper to get and set session storage
export function getSessionCache(key: string) {
  try {
    const record = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (!record) return null;
    if (Date.now() > record.expiry) {
      sessionStorage.removeItem(key);
      return null;
    }
    return record.value;
  } catch {
    return null;
  }
}

export function setSessionCache(key: string, value: any, ttlMs = 5 * 60 * 1000) {
  // 5 min default
  const record = { value, expiry: Date.now() + ttlMs };
  sessionStorage.setItem(key, JSON.stringify(record));
} 