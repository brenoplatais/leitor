import { CRITIQUE_TYPES } from '../lib/refinement'

/**
 * TAB 1 — classify the annotation's critique type. A grid of clickable cards;
 * exactly one may be selected. `value` is the selected type id (or null).
 */
export default function CritiqueTypeSelector({ value, onChange }) {
  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">
        Que tipo de crítica você está fazendo? Escolha um para orientar o protocolo.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CRITIQUE_TYPES.map((t) => {
          const active = t.id === value
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(active ? null : t.id)}
              aria-pressed={active}
              className={
                'flex flex-col rounded-xl border p-3 text-left transition ' +
                (active
                  ? 'border-accent bg-accent-soft ring-1 ring-accent'
                  : 'border-slate-200 bg-white hover:border-accent/40 hover:bg-slate-50')
              }
            >
              <div className="flex items-start gap-2">
                <span className="text-lg leading-none" aria-hidden="true">
                  {t.icon}
                </span>
                <div className="min-w-0">
                  <p
                    className={
                      'text-sm font-semibold ' + (active ? 'text-accent' : 'text-slate-700')
                    }
                  >
                    {t.name}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                    {t.description}
                  </p>
                </div>
              </div>
              <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] italic leading-snug text-slate-400">
                {t.question}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
