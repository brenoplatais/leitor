import { typeOf } from '../lib/annotationTypes'

/**
 * Inline [A#] marker placed at an annotation's exact position in the text.
 * Colored by annotation type; hover shows a tooltip; click opens the editor.
 */
export default function AnnotationMarker({ ann, onClick }) {
  const t = typeOf(ann.type)
  return (
    <span className="group/mk relative inline-block align-middle">
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClick?.(ann)
        }}
        className="mx-0.5 inline-flex -translate-y-0.5 items-center rounded px-1 py-0.5 font-sans text-[11px] font-semibold leading-none text-white shadow-sm"
        style={{ backgroundColor: t.hex }}
      >
        {ann.label}
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 hidden w-56 -translate-x-1/2 rounded-lg bg-slate-800 px-3 py-2 text-left font-sans text-xs not-italic leading-snug text-white shadow-xl group-hover/mk:block">
        <span
          className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide"
          style={{ color: t.hex }}
        >
          {t.label}
        </span>
        {ann.transcription}
      </span>
    </span>
  )
}
