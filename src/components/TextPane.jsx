import { useEffect, useMemo, useRef, useState } from 'react'
import AnnotationMarker from './AnnotationMarker'
import { stampOf } from '../lib/stamps'
import { typeOf } from '../lib/annotationTypes'
import { Chevron, Close } from './Icons'

/** Translucent version of a stamp's hex color, for highlighting a passage. */
function hexToRgba(hex, alpha) {
  const h = (hex || '#888888').replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

// --- selection → character-offset mapping ----------------------------------
/** Nearest ancestor that wraps a paragraph's own text (marked data-ptext). */
function ptextElOf(node) {
  let el = node && (node.nodeType === 3 ? node.parentElement : node)
  while (el && !(el.dataset && 'ptext' in el.dataset)) el = el.parentElement
  return el
}

/**
 * Character offset of (container, offset) within a paragraph's data-ptext
 * element, counting only its own text (skipping inserted [data-skip] chips).
 */
function offsetInPtext(ptextEl, container, offset) {
  if (container.nodeType !== 3) {
    const child = container.childNodes[offset]
    if (child) {
      container = child
      offset = 0
    }
  }
  let acc = 0
  const walker = document.createTreeWalker(ptextEl, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      let pp = n.parentElement
      while (pp && pp !== ptextEl) {
        if (pp.dataset && 'skip' in pp.dataset) return NodeFilter.FILTER_REJECT
        pp = pp.parentElement
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })
  let cur
  while ((cur = walker.nextNode())) {
    if (cur === container) return acc + offset
    if (container.nodeType !== 3 && container.contains && container.contains(cur)) return acc
    acc += cur.textContent.length
  }
  return acc
}

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
 * Render a paragraph: plain text, with the word currently being spoken wrapped
 * in a larger highlight (`range`, non-null only for the active paragraph),
 * search matches highlighted, and annotation `markers` inserted at their exact
 * character offsets.
 *
 * We split the text at every boundary (word-range edges, each search-match
 * edge, and each marker offset), then walk the slices — emitting marker chips at
 * their offset and wrapping word/search slices in <mark>.
 */
function renderParagraph(
  text,
  range,
  markers,
  markRef,
  onOpenAnnotation,
  searchRanges = [],
  activeMatchIndex = -1,
  activeMatchRef = null,
  stampHighlights = [],
) {
  const clamp = (n) => Math.max(0, Math.min(n ?? 0, text.length))

  // Group markers by clamped offset, in label order.
  const byOffset = new Map()
  for (const ann of markers) {
    const o = clamp(ann.charOffset)
    if (!byOffset.has(o)) byOffset.set(o, [])
    byOffset.get(o).push(ann)
  }

  const wStart = range ? clamp(range.start) : -1
  const wEnd = range ? clamp(range.end) : -1
  const hasWord = range && wEnd > wStart

  const points = new Set([0, text.length])
  byOffset.forEach((_, o) => points.add(o))
  if (hasWord) {
    points.add(wStart)
    points.add(wEnd)
  }
  for (const s of searchRanges) {
    points.add(clamp(s.start))
    points.add(clamp(s.end))
  }
  for (const h of stampHighlights) {
    points.add(clamp(h.start))
    points.add(clamp(h.end))
  }
  const sorted = [...points].sort((a, b) => a - b)

  const out = []
  let wordAttached = false
  let activeAttached = false
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]
    if (byOffset.has(p)) {
      for (const ann of byOffset.get(p)) {
        // Wrapped in data-skip so selection→offset mapping ignores the chip.
        out.push(
          <span key={'m' + ann.id} data-skip="">
            <AnnotationMarker ann={ann} onClick={onOpenAnnotation} />
          </span>,
        )
      }
    }
    const next = sorted[i + 1]
    if (next === undefined || next === p) continue
    const slice = text.slice(p, next)

    // The actively-spoken word wins over any highlight on the same span.
    if (hasWord && p >= wStart && next <= wEnd) {
      out.push(
        <mark
          key={'w' + p}
          ref={wordAttached ? undefined : markRef}
          className="mx-0.5 inline-block rounded bg-amber-300 px-1 align-baseline text-[1.22em] font-semibold leading-none text-slate-900 shadow-[0_1px_0_rgba(0,0,0,0.06)]"
        >
          {slice}
        </mark>,
      )
      wordAttached = true
      continue
    }

    const sr = searchRanges.find((s) => p >= clamp(s.start) && next <= clamp(s.end))
    if (sr) {
      const isActive = sr.globalIndex === activeMatchIndex
      out.push(
        <mark
          key={'s' + p}
          ref={isActive && !activeAttached ? activeMatchRef : undefined}
          className={
            'rounded px-0.5 text-slate-900 ' +
            (isActive ? 'bg-orange-400 ring-2 ring-orange-500' : 'bg-yellow-200')
          }
        >
          {slice}
        </mark>,
      )
      if (isActive) activeAttached = true
      continue
    }

    // A stamp applied to a selected passage: highlight it in the stamp's color.
    const hl = stampHighlights.find((h) => p >= clamp(h.start) && next <= clamp(h.end))
    if (hl) {
      out.push(
        <mark
          key={'h' + p}
          onClick={(e) => {
            e.stopPropagation()
            onOpenAnnotation?.(hl.ann)
          }}
          className="cursor-pointer rounded text-slate-900"
          style={{ backgroundColor: hexToRgba(hl.hex, 0.32) }}
          title={hl.label}
        >
          {slice}
        </mark>,
      )
      continue
    }

    out.push(<span key={'t' + p}>{slice}</span>)
  }
  return out
}

/**
 * Right pane — the extracted text as clickable paragraphs. Auto-scroll follows
 * the reader: the active paragraph is kept centered and the word being read is
 * kept in view. Inline [A#] markers show anchored annotations; clicking a
 * paragraph positions the reader there. Cmd/Ctrl+F opens an in-text search.
 */
export default function TextPane({
  pdfName,
  paragraphs,
  currentIndex,
  wordRange,
  annotations,
  onSelectParagraph,
  onOpenAnnotation,
  selectionApi,
}) {
  const paraRefs = useRef({})
  const wordElRef = useRef(null)
  const scrollRef = useRef(null)
  const animRef = useRef(null)
  // Scroll mode: 'off' | 'follow' (nudge at edges) | 'center' (teleprompter).
  const [scrollMode, setScrollMode] = useState('center')
  const [fontPx, setFontPx] = useState(17)

  // In-text search (Cmd/Ctrl+F).
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeMatch, setActiveMatch] = useState(0)
  const searchInputRef = useRef(null)
  const activeMatchElRef = useRef(null)

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

  // Read the current text selection as a paragraph range, for stamping a passage.
  // Pulled on demand by the parent (at stamp-click time) via `selectionApi`.
  const computeSelection = () => {
    const selection = typeof window !== 'undefined' ? window.getSelection() : null
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null
    const rng = selection.getRangeAt(0)
    const startPt = ptextElOf(rng.startContainer)
    if (!startPt || startPt !== ptextElOf(rng.endContainer)) return null // single paragraph only
    const pEl = startPt.closest('[data-pidx]')
    if (!pEl) return null
    const paragraphIndex = Number(pEl.getAttribute('data-pidx'))
    const full = paragraphs[paragraphIndex]?.text || ''
    const a = offsetInPtext(startPt, rng.startContainer, rng.startOffset)
    const b = offsetInPtext(startPt, rng.endContainer, rng.endOffset)
    const charStart = Math.max(0, Math.min(Math.min(a, b), full.length))
    const charEnd = Math.max(0, Math.min(Math.max(a, b), full.length))
    if (charEnd - charStart < 1) return null
    const quote = full.slice(charStart, charEnd)
    if (!quote.trim()) return null
    return { paragraphIndex, charStart, charEnd, quote }
  }
  useEffect(() => {
    if (selectionApi) selectionApi.current = computeSelection
  })

  // Every occurrence of the query across paragraphs, in reading order.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const res = []
    paragraphs.forEach((p, pi) => {
      const t = p.text.toLowerCase()
      let from = 0
      for (;;) {
        const idx = t.indexOf(q, from)
        if (idx < 0) break
        res.push({ paraIndex: pi, start: idx, end: idx + q.length })
        from = idx + q.length
      }
    })
    return res
  }, [paragraphs, query])

  // Search matches grouped by paragraph, tagged with their global order.
  const searchByParagraph = useMemo(() => {
    const map = new Map()
    matches.forEach((m, gi) => {
      if (!map.has(m.paraIndex)) map.set(m.paraIndex, [])
      map.get(m.paraIndex).push({ ...m, globalIndex: gi })
    })
    return map
  }, [matches])

  // Reset the active match whenever the query (hence match set) changes.
  useEffect(() => {
    setActiveMatch(0)
  }, [query])

  // Global shortcut: Cmd/Ctrl+F opens search and selects its input.
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault()
        setSearchOpen(true)
        requestAnimationFrame(() => searchInputRef.current?.select())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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

  // Bring the active search match into view.
  useEffect(() => {
    if (!searchOpen || matches.length === 0) return
    const el = activeMatchElRef.current || paraRefs.current[matches[activeMatch]?.paraIndex]
    scrollElementIntoView(scrollRef.current, el, 'center', animRef)
  }, [activeMatch, matches, searchOpen])

  function closeSearch() {
    setSearchOpen(false)
  }
  function gotoNext() {
    if (matches.length) setActiveMatch((a) => (a + 1) % matches.length)
  }
  function gotoPrev() {
    if (matches.length) setActiveMatch((a) => (a - 1 + matches.length) % matches.length)
  }
  function onSearchKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) gotoPrev()
      else gotoNext()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeSearch()
    }
  }

  const activeMatchGlobalIndex = matches.length ? activeMatch : -1

  return (
    <div className="relative flex h-full flex-col bg-white">
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
          {/* Search toggle */}
          <button
            onClick={() => {
              setSearchOpen(true)
              requestAnimationFrame(() => searchInputRef.current?.select())
            }}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
            title="Buscar no texto (⌘F / Ctrl+F)"
          >
            <SearchIcon /> Buscar
          </button>

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

      {/* Search bar */}
      {searchOpen && (
        <div className="absolute right-6 top-[4.25rem] z-20 flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-lg">
          <SearchIcon />
          <input
            ref={searchInputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Buscar no texto"
            className="w-44 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
          <span className="w-14 select-none text-right text-[11px] tabular-nums text-slate-400">
            {matches.length ? `${activeMatch + 1}/${matches.length}` : query ? '0/0' : ''}
          </span>
          <button
            onClick={gotoPrev}
            disabled={!matches.length}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
            title="Anterior (Shift+Enter)"
          >
            <Chevron width={15} height={15} className="-rotate-90" />
          </button>
          <button
            onClick={gotoNext}
            disabled={!matches.length}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
            title="Próxima (Enter)"
          >
            <Chevron width={15} height={15} className="rotate-90" />
          </button>
          <button
            onClick={closeSearch}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
            title="Fechar (Esc)"
          >
            <Close width={15} height={15} />
          </button>
        </div>
      )}

      <div ref={scrollRef} className="scroll-thin flex-1 overflow-auto px-6 py-6">
        <article
          className="mx-auto max-w-2xl space-y-4 font-serif leading-relaxed text-slate-800"
          style={{ fontSize: `${fontPx}px` }}
        >
          {paragraphs.map((p, i) => {
            // Page-turn marker: a divider, still spoken by the reader.
            if (p.pageMarker) {
              const active = i === currentIndex
              return (
                <div
                  key={i}
                  ref={(el) => (paraRefs.current[i] = el)}
                  className="flex select-none items-center gap-3 py-1 font-sans"
                >
                  <span className="h-px flex-1 bg-slate-200" />
                  <span
                    className={
                      'rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ' +
                      (active
                        ? 'bg-amber-200 text-amber-800'
                        : 'bg-slate-100 text-slate-400')
                    }
                  >
                    {p.text}
                  </span>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
              )
            }
            const anns = byParagraph.get(i) || []
            // Precise markers have a charOffset; legacy ones render at the end.
            const inline = anns.filter((a) => typeof a.charOffset === 'number')
            const trailing = anns.filter((a) => typeof a.charOffset !== 'number')
            // Any annotation applied to a selected passage carries a range →
            // highlight it in its color (stamp color, or the note's type color).
            const stampHl = anns
              .filter(
                (a) =>
                  typeof a.charOffset === 'number' &&
                  typeof a.charEnd === 'number' &&
                  a.charEnd > a.charOffset,
              )
              .map((a) => {
                const s = a.kind === 'stamp' ? stampOf(a.stampId) : null
                const t = typeOf(a.type)
                return {
                  start: a.charOffset,
                  end: a.charEnd,
                  hex: s ? s.hex : t.hex,
                  label: s ? s.label : t.label,
                  ann: a,
                }
              })
            const active = i === currentIndex
            const range = active && wordRange && wordRange.index === i ? wordRange : null
            const searchRanges = searchOpen ? searchByParagraph.get(i) || [] : []
            return (
              <p
                key={i}
                data-pidx={i}
                ref={(el) => (paraRefs.current[i] = el)}
                onClick={() => {
                  // Don't jump the reader when the click ends a text selection.
                  const s = window.getSelection()
                  if (!s || s.isCollapsed) onSelectParagraph(i)
                }}
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
                <span data-ptext="">
                  {renderParagraph(
                    p.text,
                    range,
                    inline,
                    wordElRef,
                    onOpenAnnotation,
                    searchRanges,
                    activeMatchGlobalIndex,
                    activeMatchElRef,
                    stampHl,
                  )}
                </span>
                {trailing.map((a) => (
                  <span key={a.id} data-skip="">
                    <AnnotationMarker ann={a} onClick={onOpenAnnotation} />
                  </span>
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

// Small magnifier icon, matching the app's inline-SVG style.
function SearchIcon(p) {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}
