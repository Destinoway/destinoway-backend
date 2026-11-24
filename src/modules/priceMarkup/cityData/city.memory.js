// Per-process cache; MongoDB remains the persistent source after restarts.
const entries = new Map();
const MAX_ENTRIES = 500;
const TTL_MS = 60 * 60 * 1000;

export const cityMemory = {
  get(key) {
    const entry = entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      entries.delete(key);
      return null;
    }
    entries.delete(key);
    entries.set(key, entry);
    return entry.value;
  },
  set(key, value) {
    entries.delete(key);
    entries.set(key, { value, expiresAt: Date.now() + TTL_MS });
    if (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value);
  },
  clear() { entries.clear(); },
};
