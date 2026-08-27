import { Fragment } from 'react'
import { STAMP_GROUPS, stampsInGroup } from '../lib/stamps'

/**
 * A row of one-click reading stamps, split into groups. Clicking a stamp drops a
 * mark at the reader's current position — no modal, reading isn't interrupted.
 */
export default function StampBar({ onStamp, disabled }) {
  return (
    <div className="scroll-thin flex items-center gap-1.5 overflow-x-auto border-t border-slate-200 bg-slate-50 px-4 py-2">
      {STAMP_GROUPS.map((group, gi) => (
        <Fragment key={group.id}>
          {gi > 0 && <span className="mx-1 h-6 w-px shrink-0 bg-slate-200" aria-hidden="true" />}
          <span className="shrink-0 select-none pr-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {group.label}
          </span>
          {stampsInGroup(group.id).map((s) => (
            <button
              key={s.id}
              onClick={() => onStamp(s.id)}
              disabled={disabled}
              title={s.desc ? `${s.label} — ${s.desc}` : `Marcar “${s.label}” no ponto atual`}
              className="flex shrink-0 items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:text-white disabled:opacity-40"
              style={{ borderColor: s.hex }}
              onMouseEnter={(e) => {
                if (!disabled) e.currentTarget.style.backgroundColor = s.hex
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = ''
              }}
            >
              <span aria-hidden="true">{s.icon}</span>
              {s.short}
            </button>
          ))}
        </Fragment>
      ))}
    </div>
  )
}
