import { Edit, Trash, Download } from './Icons'
import { typeOf } from '../lib/annotationTypes'
import { CONTROL_TOTAL, critiqueTypeOf } from '../lib/refinement'
import { stampOf } from '../lib/stamps'

/**
 * Right-most sidebar: every annotation for the document. Clicking one jumps the
 * reader/text pane to its anchored paragraph. Includes the compiled "Minhas
 * anotações" index and the export actions.
 */
export default function AnnotationsPanel({
  annotations,
  paragraphs,
  onJump,
  onEdit,
  onDelete,
  onExportJSON,
  onExportMarkdown,
}) {
  return (
    <aside className="flex h-full w-full flex-col border-l border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Minhas anotações</h2>
          <p className="text-xs text-slate-400">{annotations.length} no total</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onExportMarkdown}
            disabled={paragraphs.length === 0}
            title="Exportar o texto lido com anotações e carimbos (Markdown)"
            className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            <Download width={14} height={14} /> MD
          </button>
          <button
            onClick={onExportJSON}
            disabled={paragraphs.length === 0}
            title="Exportar o texto lido com anotações e carimbos (JSON)"
            className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            <Download width={14} height={14} /> JSON
          </button>
        </div>
      </div>

      <div className="scroll-thin flex-1 overflow-auto px-3 py-3">
        {annotations.length === 0 ? (
          <p className="mt-8 px-3 text-center text-sm text-slate-400">
            Nenhuma anotação ainda. Durante a leitura, toque em{' '}
            <span className="font-medium text-amber-600">Pausar e anotar</span> para gravar.
          </p>
        ) : (
          <ul className="space-y-2">
            {annotations.map((a) => {
              const para = paragraphs[a.paragraphIndex]
              const t = typeOf(a.type)
              const ct = a.refinement?.type ? critiqueTypeOf(a.refinement.type) : null
              const stamp = a.kind === 'stamp' ? stampOf(a.stampId) : null
              const chipHex = stamp ? stamp.hex : t.hex
              return (
                <li
                  key={a.id}
                  className="group rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-accent/40"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onJump(a.paragraphIndex)}
                        className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-white"
                        style={{ backgroundColor: chipHex }}
                        title="Ir para o parágrafo"
                      >
                        {stamp ? stamp.icon : a.label}
                      </button>
                      <span className="text-[11px] font-medium" style={{ color: chipHex }}>
                        {stamp ? stamp.label : t.label}
                      </span>
                      {a.refinement && (
                        <span
                          className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700"
                          title={
                            (ct ? ct.name + ' · ' : '') +
                            `refinada · score ${a.refinement.score ?? 0}/${CONTROL_TOTAL}`
                          }
                        >
                          {ct ? `${ct.icon} ` : '✓ '}
                          {a.refinement.score ?? 0}/{CONTROL_TOTAL}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      {!stamp && (
                        <button
                          onClick={() => onEdit(a)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          title="Editar"
                        >
                          <Edit width={15} height={15} />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(a)}
                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                        title="Excluir"
                      >
                        <Trash width={15} height={15} />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => onJump(a.paragraphIndex)}
                    className="block w-full text-left"
                  >
                    {stamp ? (
                      <p className="text-sm italic leading-snug text-slate-500">
                        “{a.contextSnippet || para?.text?.slice(0, 120) || ''}”
                      </p>
                    ) : (
                      <p className="text-sm leading-snug text-slate-700">{a.transcription}</p>
                    )}
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      pág. {para?.page ?? '?'} · parágrafo {a.paragraphIndex + 1} ·{' '}
                      {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
