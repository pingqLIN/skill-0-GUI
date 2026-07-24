export const DRAFT_SCHEMA_VERSION = 2;

export type VersionedDraftEnvelope<T> = {
  payload: T;
  schemaVersion: number;
  updatedAt: string;
};

export interface DraftStore<T> {
  clear(): Promise<void>;
  read(): Promise<VersionedDraftEnvelope<T> | null>;
  write(envelope: VersionedDraftEnvelope<T>): Promise<void>;
}

export class DraftStoreUnavailableError extends Error {
  constructor(message = 'Draft storage is unavailable in this browser.') {
    super(message);
    this.name = 'DraftStoreUnavailableError';
  }
}

export function createInMemoryDraftStore<T>(initialValue: VersionedDraftEnvelope<T> | null = null): DraftStore<T> {
  let value = initialValue;
  return {
    async clear() { value = null; },
    async read() { return value; },
    async write(envelope) { value = envelope; },
  };
}

type BrowserDraftStoreOptions = {
  databaseName?: string;
  recordId?: string;
  storeName?: string;
};

type DraftRecord<T> = { envelope: VersionedDraftEnvelope<T>; id: string };

const DEFAULT_DATABASE_NAME = 'skill-0-review-studio';
const DEFAULT_RECORD_ID = 'workspace';
const DEFAULT_STORE_NAME = 'workspaceDrafts';

function getIndexedDbFactory() {
  if (typeof window === 'undefined' || !('indexedDB' in window) || !window.indexedDB) {
    throw new DraftStoreUnavailableError();
  }
  return window.indexedDB;
}

function openDatabase(databaseName: string, storeName: string): Promise<IDBDatabase> {
  const indexedDb = getIndexedDbFactory();
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(databaseName, DRAFT_SCHEMA_VERSION);
    request.onerror = () => reject(request.error ?? new DraftStoreUnavailableError());
    request.onblocked = () => reject(new DraftStoreUnavailableError('Draft storage is blocked by another open tab.'));
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

function runTransaction<T>(database: IDBDatabase, storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = operation(transaction.objectStore(storeName));
    let result: T;
    request.onerror = () => reject(request.error ?? transaction.error ?? new DraftStoreUnavailableError());
    transaction.onerror = () => reject(transaction.error ?? new DraftStoreUnavailableError());
    transaction.onabort = () => reject(transaction.error ?? new DraftStoreUnavailableError());
    request.onsuccess = () => { result = request.result; };
    transaction.oncomplete = () => resolve(result);
  });
}

export function createBrowserDraftStore<T>(options: BrowserDraftStoreOptions = {}): DraftStore<T> {
  const databaseName = options.databaseName ?? DEFAULT_DATABASE_NAME;
  const recordId = options.recordId ?? DEFAULT_RECORD_ID;
  const storeName = options.storeName ?? DEFAULT_STORE_NAME;
  let databasePromise: Promise<IDBDatabase> | null = null;
  const getDatabase = () => (databasePromise ??= openDatabase(databaseName, storeName));

  return {
    async clear() {
      const database = await getDatabase();
      await runTransaction(database, storeName, 'readwrite', (store) => store.delete(recordId));
    },
    async read() {
      const database = await getDatabase();
      const record = await runTransaction<DraftRecord<T> | undefined>(database, storeName, 'readonly', (store) => store.get(recordId));
      return record?.envelope ?? null;
    },
    async write(envelope) {
      const database = await getDatabase();
      await runTransaction<IDBValidKey>(database, storeName, 'readwrite', (store) => store.put({ id: recordId, envelope }));
    },
  };
}
