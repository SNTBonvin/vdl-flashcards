/**
 * Enveloppe minimale autour d'IndexedDB (aucune dépendance externe).
 * Quatre magasins : subjects, decks, cards, logs — plus un magasin clé/valeur
 * « meta » pour les réglages.
 */

const DB_NAME = 'vdl-flashcards'
const DB_VERSION = 1

export type StoreName = 'subjects' | 'decks' | 'cards' | 'logs' | 'meta'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('subjects')) {
        db.createObjectStore('subjects', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('decks')) {
        const decks = db.createObjectStore('decks', { keyPath: 'id' })
        decks.createIndex('bySubject', 'subjectId')
      }
      if (!db.objectStoreNames.contains('cards')) {
        const cards = db.createObjectStore('cards', { keyPath: 'id' })
        cards.createIndex('byDeck', 'deckId')
        cards.createIndex('byDue', 'srs.due')
      }
      if (!db.objectStoreNames.contains('logs')) {
        const logs = db.createObjectStore('logs', { keyPath: 'id' })
        logs.createIndex('byTs', 'ts')
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta')
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('Base de données bloquée par un autre onglet.'))
  })
  return dbPromise
}

function run<T>(
  stores: StoreName[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(stores, mode)
        let result: T
        tx.oncomplete = () => resolve(result)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error ?? new Error('Transaction annulée.'))
        Promise.resolve(fn(tx)).then(
          (value) => {
            result = value
          },
          (error) => {
            reject(error)
            tx.abort()
          },
        )
      }),
  )
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function getAll<T>(store: StoreName): Promise<T[]> {
  return run([store], 'readonly', (tx) => wrap(tx.objectStore(store).getAll() as IDBRequest<T[]>))
}

export function putMany<T>(store: StoreName, items: T[]): Promise<void> {
  if (items.length === 0) return Promise.resolve()
  return run([store], 'readwrite', (tx) => {
    const os = tx.objectStore(store)
    for (const item of items) os.put(item)
  })
}

export function put<T>(store: StoreName, item: T): Promise<void> {
  return putMany(store, [item])
}

export function del(store: StoreName, ids: string[]): Promise<void> {
  if (ids.length === 0) return Promise.resolve()
  return run([store], 'readwrite', (tx) => {
    const os = tx.objectStore(store)
    for (const id of ids) os.delete(id)
  })
}

export function getMeta<T>(key: string): Promise<T | undefined> {
  return run(['meta'], 'readonly', (tx) => wrap(tx.objectStore('meta').get(key) as IDBRequest<T>))
}

export function setMeta<T>(key: string, value: T): Promise<void> {
  return run(['meta'], 'readwrite', (tx) => {
    tx.objectStore('meta').put(value, key)
  })
}

/** Vide entièrement la base (utilisé par la restauration d'une sauvegarde). */
export function clearAll(): Promise<void> {
  return run(['subjects', 'decks', 'cards', 'logs'], 'readwrite', (tx) => {
    tx.objectStore('subjects').clear()
    tx.objectStore('decks').clear()
    tx.objectStore('cards').clear()
    tx.objectStore('logs').clear()
  })
}
