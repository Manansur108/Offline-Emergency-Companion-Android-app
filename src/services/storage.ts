export function readJson<T>(key: string, fallback: T, guard: (value: unknown) => value is T): T {
  const storage = getLocalStorage();
  if (!storage) return fallback;

  try {
    const rawValue = storage.getItem(key);
    if (!rawValue) return fallback;

    const parsed = JSON.parse(rawValue);
    return guard(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T): void {
  const storage = getLocalStorage();
  if (!storage) return;

  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    storage.removeItem(key);
  }
}

export function removeStorageItem(key: string): void {
  const storage = getLocalStorage();
  if (!storage) return;

  storage.removeItem(key);
}

export function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
