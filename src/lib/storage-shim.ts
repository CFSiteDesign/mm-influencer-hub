/**
 * Storage shim for restrictive contexts (e.g. Instagram in-app browser
 * loading our site inside a third-party iframe, where localStorage access
 * throws SecurityError).
 *
 * If `window.localStorage` is unavailable or throws on access, we install
 * an in-memory fallback so libraries like supabase-js don't crash on init.
 *
 * This must be imported at the very top of `main.tsx`, BEFORE any module
 * that touches localStorage (including the Supabase client).
 */

function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    removeItem: (key: string) => {
      data.delete(key);
    },
    setItem: (key: string, value: string) => {
      data.set(key, String(value));
    },
  };
}

function isStorageWorking(storage: Storage | undefined): boolean {
  if (!storage) return false;
  try {
    const testKey = '__lov_storage_test__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function installStorageShim() {
  if (typeof window === 'undefined') return;

  // Test localStorage
  let lsWorks = false;
  try {
    lsWorks = isStorageWorking(window.localStorage);
  } catch {
    lsWorks = false;
  }

  if (!lsWorks) {
    const memory = createMemoryStorage();
    try {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: memory,
      });
    } catch {
      // Couldn't redefine — nothing else we can do.
    }
    // eslint-disable-next-line no-console
    console.warn('[storage-shim] localStorage unavailable; using in-memory fallback.');
  }

  // Same for sessionStorage
  let ssWorks = false;
  try {
    ssWorks = isStorageWorking(window.sessionStorage);
  } catch {
    ssWorks = false;
  }
  if (!ssWorks) {
    const memory = createMemoryStorage();
    try {
      Object.defineProperty(window, 'sessionStorage', {
        configurable: true,
        value: memory,
      });
    } catch {
      // ignore
    }
  }
}
