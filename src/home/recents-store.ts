import type { Position } from '../deck/navigation';
import { MAX_RECENTS, upsertRecent, type RecentDeck } from '../deck/recents';

/**
 * Recent decks, kept in this browser's IndexedDB. Every function fails soft: a private window or
 * a blocked storage only means no recents, never a broken presentation.
 */

const DB_NAME = 'motion-slides';
const DB_VERSION = 1;
const STORE = 'recents';

let database: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'name' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  // A failed open must not be cached forever: the next call tries again.
  database.catch(() => (database = null));
  return database;
}

function done(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function soft<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.warn('Decks récents indisponibles :', error);
    return fallback;
  }
}

/** Newest first. */
export function listRecents(): Promise<RecentDeck[]> {
  return soft(async () => {
    const db = await openDatabase();
    const all = await result(db.transaction(STORE).objectStore(STORE).getAll() as IDBRequest<RecentDeck[]>);
    return all.sort((a, b) => b.openedAt - a.openedAt).slice(0, MAX_RECENTS);
  }, []);
}

/** Records a deck just opened, and forgets the oldest ones beyond MAX_RECENTS. */
export function rememberDeck(entry: RecentDeck): Promise<void> {
  return soft(async () => {
    const kept = new Set(upsertRecent(await listRecents(), entry).map((deck) => deck.name));
    const db = await openDatabase();
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    store.put(entry);
    const names = (await result(store.getAllKeys())) as string[];
    for (const name of names) {
      if (!kept.has(name)) store.delete(name);
    }
    await done(transaction);
  }, undefined);
}

export function forgetDeck(name: string): Promise<void> {
  return soft(async () => {
    const db = await openDatabase();
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).delete(name);
    await done(transaction);
  }, undefined);
}

/** Updates only the position, without rewriting the deck's (possibly large) source. */
export function saveRecentPosition(name: string, position: Position): Promise<void> {
  return soft(async () => {
    const db = await openDatabase();
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    const entry = (await result(store.get(name))) as RecentDeck | undefined;
    if (entry) store.put({ ...entry, position });
    await done(transaction);
  }, undefined);
}
