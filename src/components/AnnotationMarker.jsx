import { typeOf } from '../lib/annotationTypes'
import { stampOf } from '../lib/stamps'

/**
 * Inline marker placed at an annotation's exact position in the text. Voice
 * notes show their [A#] label colored by type; stamps ("carimbos") show their
 * icon colored by stamp. Hover shows a tooltip; click jumps/edits.
 */
export default function AnnotationMarker({ ann, onClick }) {
  const stamp = ann.kind === 'stamp' ? stampOf(ann.stampId) : null
  const t = typeOf(ann.type)
  const hex = stamp ? stamp.hex : t.hex
  const heading = stamp ? `${stamp.icon} ${stamp.label}` : t.label
  const body = stamp ? ann.contextSnippet : ann.transcription

  return (
    <span className="group/mk relative inline-block align-middle">
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClick?.(ann)
        }}
        className="mx-0.5 inline-flex -translate-y-0.5 items-center rounded px-1 py-0.5 font-sans text-[11px] font-semibold leading-none text-white shadow-sm"
        style={{ backgroundColor: hex }}
      >
        {stamp ? stamp.icon : ann.label}
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 hidden w-56 -translate-x-1/2 rounded-lg bg-slate-800 px-3 py-2 text-left font-sans text-xs not-italic leading-snug text-white shadow-xl group-hover/mk:block">
        <span
          className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide"
          style={{ color: hex }}
        >
          {heading}
        </span>
        {body}
      </span>
    </span>
  )
}
