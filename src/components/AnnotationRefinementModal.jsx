import { useState } from 'react'
import CritiqueTypeSelector from './CritiqueTypeSelector'
import ProtocolWizard from './ProtocolWizard'
import ControlQuestionsChecklist from './ControlQuestionsChecklist'
import {
  emptyRefinement,
  emptyProtocol,
  emptyControlQuestions,
  computeScore,
  isProtocolComplete,
  CONTROL_TOTAL,
} from '../lib/refinement'
import { Close, Check } from './Icons'

const TABS = [
  { id: 'classificar', label: 'Classificar' },
  { id: 'protocolo', label: 'Protocolo' },
  { id: 'controle', label: 'Controle' },
]

/**
 * The refinement modal: 3 tabs (Classificar | Protocolo | Controle) that build a
 * structured critique. Manages its own draft seeded from `initial`; on save it
 * hands back a complete refinement object (with score + lastRefined stamped).
 */
export default function AnnotationRefinementModal({ open, initial, onSave, onClose }) {
  const [draft, setDraft] = useState(() => normalize(initial))
  const [tab, setTab] = useState('classificar')

  if (!open) return null

  const score = computeScore(draft.controlQuestions)
  const protocolReady = isProtocolComplete(draft.protocol)

  function setType(type) {
    setDraft((d) => ({ ...d, type }))
  }
  function setProtocolField(field, val) {
    setDraft((d) => ({ ...d, protocol: { ...d.protocol, [field]: val } }))
  }
  function setControlAnswer(id, answer) {
    setDraft((d) => ({ ...d, controlQuestions: { ...d.controlQuestions, [id]: answer } }))
  }

  function handleSave() {
    onSave({
      ...draft,
      score: computeScore(draft.controlQuestions),
      lastRefined: Date.now(),
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Refinar anotação</h3>
            <p className="text-xs text-slate-400">
              Transforme uma reação em uma crítica argumentada.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
            aria-label="Fechar"
          >
            <Close />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-100 px-3 pt-2">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={
                  'rounded-t-lg px-3 py-2 text-sm font-medium transition ' +
                  (active
                    ? 'border-b-2 border-accent text-accent'
                    : 'text-slate-500 hover:text-slate-700')
                }
              >
                {t.label}
                {t.id === 'protocolo' && protocolReady && (
                  <span className="ml-1 text-emerald-500">✓</span>
                )}
                {t.id === 'controle' && score > 0 && (
                  <span className="ml-1 text-[11px] text-slate-400">
                    {score}/{CONTROL_TOTAL}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Body */}
        <div className="scroll-thin min-h-0 flex-1 overflow-auto px-5 py-4">
          {tab === 'classificar' && (
            <CritiqueTypeSelector value={draft.type} onChange={setType} />
          )}
          {tab === 'protocolo' && (
            <ProtocolWizard value={draft.protocol} onChange={setProtocolField} />
          )}
          {tab === 'controle' && (
            <ControlQuestionsChecklist
              value={draft.controlQuestions}
              onChange={setControlAnswer}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
          <span className="text-xs text-slate-400">
            Score de controle:{' '}
            <span className="font-semibold text-slate-600">
              {score}/{CONTROL_TOTAL}
            </span>
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Check width={16} height={16} />
              Salvar refinamento
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Merge a (possibly partial or null) stored refinement onto a full skeleton. */
function normalize(initial) {
  const base = emptyRefinement()
  if (!initial) return base
  return {
    type: initial.type ?? null,
    protocol: { ...emptyProtocol(), ...(initial.protocol || {}) },
    controlQuestions: { ...emptyControlQuestions(), ...(initial.controlQuestions || {}) },
    score: initial.score ?? 0,
    lastRefined: initial.lastRefined ?? null,
  }
}
