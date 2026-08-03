import { useEffect, useState } from 'react'
import { listDocuments, deleteDocument } from '../lib/db'
import { Close, Trash, Library } from './Icons'

/** Modal listing previously opened PDFs stored in IndexedDB. */
export default function LibraryModal({ open, onClose, onOpen }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    listDocuments()
      .then(setDocs)
      .finally(() => setLoading(false))
  }, [open])

  if (!open) return null

  async function handleDelete(e, id) {
    e.stopPropagation()
    await deleteDocument(id)
    setDocs((d) => d.filter((x) => x.id !== id))
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <Library width={18} height={18} /> PDFs anteriores
          </h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <Close />
          </button>
        </div>

        <div className="scroll-thin max-h-[60vh] overflow-auto px-5 py-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Carregando…</p>
          ) : docs.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              Nenhum PDF salvo ainda. Abra um PDF para começar.
            </p>
          ) : (
            <ul className="space-y-2">
              {docs.map((d) => (
                <li
                  key={d.id}
                  onClick={() => onOpen(d.id)}
                  className="group flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-4 py-3 transition hover:border-accent/50 hover:bg-accent-soft"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-700">{d.pdfName}</p>
                    <p className="text-xs text-slate-400">
                      {d.numPages} págs · {d.annotationCount} anotações · atualizado{' '}
                      {new Date(d.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, d.id)}
                    className="ml-3 rounded p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                    title="Remover do histórico"
                  >
                    <Trash width={16} height={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
