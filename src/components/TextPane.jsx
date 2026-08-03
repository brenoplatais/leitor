import { useEffect, useMemo, useRef, useState } from 'react'

// Smoothly tween a container's scrollTop. We animate scrollTop ourselves rather
// than rely on scrollIntoView({behavior:'smooth'}), which some embedded browsers
// treat as a no-op — this works everywhere.
function animateScrollTo(container, to, duration, animRef) {
  const start = container.scrollTop
  const change = to - start
  if (Math.abs(change) < 2) return
  if (animRef?.current) cancelAnimationFrame(animRef.current)
  const startTime = performance.now()
  const step = (now) => {
    const t = Math.min(1, (now - startTime) / duration)
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t // easeInOutQuad
    container.scrollTop = start + change * eased
    if (t < 1) animRef.current = requestAnimationFrame(step)
  }
  animRef.current = requestAnimationFrame(step)
}

/** Scroll `el` into view within `container`: 'center' always, 'nearest' only if drifting to an edge. */
function scrollElementIntoView(container, el, block, animRef) {
  if (!container || !el) return
  const cRect = container.getBoundingClientRect()
  const eRect = el.getBoundingClientRect()
  const current = container.scrollTop
  const max = container.scrollHeight - container.clientHeight
  let target
  if (block === 'center') {
    target = current + (eRect.top - cRect.top) - (container.clientHeight - el.offsetHeight) / 2
  } else {
    const margin = 28
    if (eRect.top < cRect.top + margin) target = current + (eRect.top - cRect.top) - margin
    else if (eRect.bottom > cRect.bottom - margin)
      target = current + (eRect.bottom - cRect.bottom) + margin
    else return // already comfortably visible
  }
  target = Math.max(0, Math.min(target, max))
  animateScrollTo(container, target, 320, animRef)
}

/**
 * Render a paragraph's text, wrapping the word currently being spoken in a
 * larger, highlighted marker. `range` is null unless this paragraph is active;
 * `markRef` is attached to the marker so the pane can scroll it into view.
 */
function renderText(text, range, markRef) {
  if (!range) return text
  const start = Math.max(0, Math.min(range.start, text.length))
  const end = Math.max(start, Math.min(range.end, text.length))
  if (end <= start) return text
  return (
    <>
      {text.slice(0, start)}
      <mark
        ref={markRef}
        className="mx-0.5 inline-block rounded bg-amber-300 px-1 align-baseline text-[1.22em] font-semibold leading-none text-slate-900 shadow-[0_1px_0_rgba(0,0,0,0.06)]"
      >
        {text.slice(start, end)}
      </mark>
      {text.slice(end)}
    </>
  )
}

/**
 * Right pane — the extracted text as clickable paragraphs. Auto-scroll follows
 * the reader: the active paragraph is kept centered and the word being read is
 * kept in view. Inline [A#] markers show anchored annotations; clicking a
 * paragraph positions the reader there.
 */
export default function TextPane({
  pdfName,
  paragraphs,
  currentIndex,
  wordRange,
  annotations,
  onSelectParagraph,
  onOpenAnnotation,
}) {
  const paraRefs = useRef({})
  const wordElRef = useRef(null)
  const scrollRef = useRef(null)
  const animRef = useRef(null)
  // Scroll mode: 'off' | 'follow' (nudge at edges) | 'center' (teleprompter).
  const [scrollMode, setScrollMode] = useState('center')
  const [fontPx, setFontPx] = useState(17)

  const FONT_MIN = 14
  const FONT_MAX = 26

  const byParagraph = useMemo(() => {
    const map = new Map()
    for (const a of annotations) {
      if (!map.has(a.paragraphIndex)) map.set(a.paragraphIndex, [])
      map.get(a.paragraphIndex).push(a)
    }
    return map
  }, [annotations])

  // Center the active paragraph when reading moves between paragraphs.
  useEffect(() => {
    if (scrollMode === 'off') return
    scrollElementIntoView(scrollRef.current, paraRefs.current[currentIndex], 'center', animRef)
  }, [currentIndex, scrollMode])

  // Follow the word being read. In teleprompter ('center') mode the word is kept
  // vertically centered; in 'follow' mode it only nudges when nearing an edge.
  useEffect(() => {
    if (scrollMode === 'off') return
    const block = scrollMode === 'center' ? 'center' : 'nearest'
    scrollElementIntoView(scrollRef.current, wordElRef.current, block, animRef)
  }, [wordRange, scrollMode])

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-slate-700" title={pdfName}>
            {pdfName || 'Texto extraído'}
          </h2>
          <p className="text-xs text-slate-400">
            {paragraphs.length} parágrafos · clique para posicionar a leitura
          </p>
        </div>
        <div className="ml-3 flex shrink-0 items-center gap-2">
          {/* Font size */}
          <div className="flex items-center rounded-lg border border-slate-200">
            <button
              onClick={() => setFontPx((v) => Math.max(FONT_MIN, v - 1))}
              disabled={fontPx <= FONT_MIN}
              className="px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              title="Diminuir a fonte"
            >
              A−
            </button>
            <span className="w-8 select-none text-center text-[11px] tabular-nums text-slate-400">
              {fontPx}
            </span>
            <button
              onClick={() => setFontPx((v) => Math.min(FONT_MAX, v + 1))}
              disabled={fontPx >= FONT_MAX}
              className="px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              title="Aumentar a fonte"
            >
              A+
            </button>
          </div>

          {/* Scroll mode */}
          <select
            value={scrollMode}
            onChange={(e) => setScrollMode(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none focus:border-accent"
            title="Como o texto rola durante a leitura"
          >
            <option value="center">Rolagem: teleprompter</option>
            <option value="follow">Rolagem: acompanhar</option>
            <option value="off">Rolagem: desativada</option>
          </select>
        </div>
      </div>

      <div ref={scrollRef} className="scroll-thin flex-1 overflow-auto px-6 py-6">
        <article
          className="mx-auto max-w-2xl space-y-4 font-serif leading-relaxed text-slate-800"
          style={{ fontSize: `${fontPx}px` }}
        >
          {paragraphs.map((p, i) => {
            const anns = byParagraph.get(i)
            const active = i === currentIndex
            const range = active && wordRange && wordRange.index === i ? wordRange : null
            return (
              <p
                key={i}
                ref={(el) => (paraRefs.current[i] = el)}
                onClick={() => onSelectParagraph(i)}
                className={
                  'group cursor-pointer rounded-lg px-3 py-2 transition ' +
                  (active
                    ? 'bg-amber-100/80 shadow-[inset_3px_0_0_0_#f59e0b]'
                    : 'hover:bg-slate-50')
                }
              >
                <span
                  className="mr-2 select-none align-super text-[10px] font-sans text-slate-300 group-hover:text-slate-400"
                  title={`Parágrafo ${i + 1} · pág. ${p.page}`}
                >
                  {i + 1}
                </span>
                {renderText(p.text, range, wordElRef)}
                {anns?.map((a) => (
                  <button
                    key={a.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenAnnotation?.(a)
                    }}
                    className="mx-1 inline-flex -translate-y-0.5 items-center rounded bg-accent px-1.5 py-0.5 align-middle font-sans text-[11px] font-semibold text-white hover:bg-indigo-700"
                    title={a.transcription}
                  >
                    {a.label}
                  </button>
                ))}
              </p>
            )
          })}
          {paragraphs.length === 0 && (
            <p className="text-center text-sm text-slate-400">
              Nenhum texto ainda. Carregue um PDF para começar.
            </p>
          )}
        </article>
      </div>
    </div>
  )
}
