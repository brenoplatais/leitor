import { useState } from 'react'
import { PROTOCOL_STEPS, isStepComplete } from '../lib/refinement'
import { Chevron, Check } from './Icons'

/**
 * TAB 2 — the 6-move critique protocol as an accordion. `value` is the protocol
 * object; `onChange(fieldName, fieldValue)` patches a single field.
 */
export default function ProtocolWizard({ value, onChange }) {
  const [open, setOpen] = useState(1) // step id currently expanded

  return (
    <div className="space-y-2">
      {PROTOCOL_STEPS.map((step) => {
        const expanded = open === step.id
        const complete = isStepComplete(step, value)
        return (
          <div
            key={step.id}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <button
              type="button"
              onClick={() => setOpen(expanded ? null : step.id)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
            >
              <span
                className={
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ' +
                  (complete
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-500')
                }
              >
                {complete ? <Check width={13} height={13} /> : step.id}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-700">
                  {step.title}
                  {step.required && !complete && (
                    <span className="ml-1 text-rose-400">*</span>
                  )}
                </span>
              </span>
              <Chevron
                width={16}
                height={16}
                className={
                  'shrink-0 text-slate-400 transition-transform ' +
                  (expanded ? 'rotate-90' : '')
                }
              />
            </button>

            {expanded && (
              <div className="border-t border-slate-100 px-3 pb-3 pt-2.5">
                <p className="mb-2 text-xs text-slate-600">{step.instruction}</p>

                {step.checklist && (
                  <ul className="mb-2 space-y-0.5 rounded-lg bg-slate-50 px-3 py-2">
                    {step.checklist.map((item, i) => (
                      <li key={i} className="text-[11px] text-slate-500">
                        • {item}
                      </li>
                    ))}
                  </ul>
                )}

                <StepField step={step} value={value} onChange={onChange} />

                {step.suggestions && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {step.suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const cur = value[step.fieldName] || ''
                          onChange(step.fieldName, cur ? cur + ' ' + s : s)
                        }}
                        className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {step.example && (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] italic leading-snug text-slate-500">
                    <span className="mr-1 not-italic font-medium text-slate-400">
                      exemplo:
                    </span>
                    {step.example}
                  </p>
                )}

                {step.hint && (
                  <p
                    className={
                      'mt-2 text-[11px] leading-snug ' +
                      (complete ? 'text-emerald-600' : 'text-amber-600')
                    }
                  >
                    {step.hint}
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Renders the input(s) for a step according to its fieldType. */
function StepField({ step, value, onChange }) {
  const inputBase =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20'

  if (step.fieldType === 'textarea') {
    return (
      <textarea
        rows={3}
        value={value[step.fieldName] || ''}
        onChange={(e) => onChange(step.fieldName, e.target.value)}
        placeholder={step.placeholder || ''}
        className={inputBase + ' resize-none leading-relaxed'}
      />
    )
  }

  if (step.fieldType === 'select') {
    return (
      <select
        value={value[step.fieldName] || ''}
        onChange={(e) => onChange(step.fieldName, e.target.value)}
        className={inputBase + ' bg-white'}
      >
        <option value="">Selecione…</option>
        {step.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }

  if (step.fieldType === 'select+textarea') {
    return (
      <div className="space-y-2">
        <select
          value={value[step.fieldName] || ''}
          onChange={(e) => onChange(step.fieldName, e.target.value)}
          className={inputBase + ' bg-white'}
        >
          <option value="">Tipo de fundamento…</option>
          {step.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <textarea
          rows={3}
          value={value[step.detailFieldName] || ''}
          onChange={(e) => onChange(step.detailFieldName, e.target.value)}
          placeholder="Descreva o fundamento (contraexemplo, evidência, autor…)"
          className={inputBase + ' resize-none leading-relaxed'}
        />
      </div>
    )
  }

  if (step.fieldType === 'radio') {
    return (
      <div className="space-y-1.5">
        {step.options.map((o) => {
          const active = value[step.fieldName] === o.value
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(step.fieldName, o.value)}
              className={
                'flex w-full items-start gap-2 rounded-lg border p-2.5 text-left transition ' +
                (active
                  ? 'border-accent bg-accent-soft'
                  : 'border-slate-200 hover:bg-slate-50')
              }
            >
              <span
                className={
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ' +
                  (active ? 'border-accent' : 'border-slate-300')
                }
              >
                {active && <span className="h-2 w-2 rounded-full bg-accent" />}
              </span>
              <span className="min-w-0">
                <span
                  className={
                    'block text-xs font-semibold ' +
                    (active ? 'text-accent' : 'text-slate-700')
                  }
                >
                  {o.label}
                </span>
                <span className="block text-[11px] leading-snug text-slate-500">
                  {o.explanation}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  return null
}
