import { getLocalStorage } from './storage';

const APP_STORAGE_PREFIX = 'ai-offline-base.';

export function clearAllAppMemory(): void {
  const storage = getLocalStorage();
  if (!storage) return;

  Object.keys(storage)
    .filter((key) => key.startsWith(APP_STORAGE_PREFIX))
    .forEach((key) => storage.removeItem(key));
}

export function getAppMemorySummary() {
  const storage = getLocalStorage();
  if (!storage) {
    return {
      itemCount: 0,
      sizeBytes: 0,
    };
  }

  return Object.keys(storage)
    .filter((key) => key.startsWith(APP_STORAGE_PREFIX))
    .reduce(
      (summary, key) => {
        const value = storage.getItem(key) ?? '';
        return {
          itemCount: summary.itemCount + 1,
          sizeBytes: summary.sizeBytes + key.length + value.length,
        };
      },
      { itemCount: 0, sizeBytes: 0 },
    );
}
