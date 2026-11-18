/**
 * Tiny promise wrapper over IndexedDB. Every call fails soft: private windows
 * and blocked storage just mean nothing is saved.
 */
const DB_NAME = "mockform";
const DB_VERSION = 1;
export type StoreName = "assets" | "frames";

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined")
      return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of ["assets", "frames"]) {
        if (!db.objectStoreNames.contains(name))
          db.createObjectStore(name, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

function run<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
) {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(db.transaction(store, mode).objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function idbPut<T extends { id: string }>(
  store: StoreName,
  value: T,
) {
  try {
    await run(store, "readwrite", (s) => s.put(value));
  } catch {
    // Storage full or blocked; the editor keeps working without saving.
  }
}

export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  try {
    return await run<T[]>(
      store,
      "readonly",
      (s) => s.getAll() as IDBRequest<T[]>,
    );
  } catch {
    return [];
  }
}

export async function idbDelete(store: StoreName, id: string) {
  try {
    await run(store, "readwrite", (s) => s.delete(id));
  } catch {
    // ignore
  }
}
