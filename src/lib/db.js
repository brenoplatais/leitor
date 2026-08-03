// IndexedDB persistence via idb. One store, keyed by a stable document id
// (name + byte size), holding the extracted paragraphs, the annotations, and
// the original PDF bytes so a document can be fully reopened offline.
import { openDB } from 'idb'

const DB_NAME = 'leitor'
const DB_VERSION = 1
const STORE = 'documents'

let dbPromise = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' })
          store.createIndex('updatedAt', 'updatedAt')
        }
      },
    })
  }
  return dbPromise
}

/** Deterministic id for a file so re-opening the same PDF reuses its record. */
export function makeDocId(file) {
  return `${file.name}::${file.size}`
}

/**
 * Persist (create or overwrite) a document record.
 * @param {object} doc { id, pdfName, numPages, paragraphs, annotations, bytes }
 */
export async function saveDocument(doc) {
  const db = await getDB()
  const now = Date.now()
  const existing = await db.get(STORE, doc.id)
  const record = {
    ...existing,
    ...doc,
    addedAt: existing?.addedAt ?? now,
    updatedAt: now,
  }
  await db.put(STORE, record)
  return record
}

/** Lightweight patch — merge fields into an existing record without a full rewrite. */
export async function patchDocument(id, patch) {
  const db = await getDB()
  const existing = await db.get(STORE, id)
  if (!existing) return null
  const record = { ...existing, ...patch, updatedAt: Date.now() }
  await db.put(STORE, record)
  return record
}

export async function getDocument(id) {
  const db = await getDB()
  return db.get(STORE, id)
}

/** Recent documents, newest first, without the heavy bytes/paragraph payloads. */
export async function listDocuments() {
  const db = await getDB()
  const all = await db.getAll(STORE)
  return all
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(({ id, pdfName, numPages, annotations, addedAt, updatedAt }) => ({
      id,
      pdfName,
      numPages,
      annotationCount: annotations?.length ?? 0,
      addedAt,
      updatedAt,
    }))
}

export async function deleteDocument(id) {
  const db = await getDB()
  await db.delete(STORE, id)
}
