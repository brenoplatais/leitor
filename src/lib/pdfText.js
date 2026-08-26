// Pure text heuristics for PDF extraction — no pdf.js/react-pdf dependency, so
// they can be unit-tested in isolation. `pdf.js` does the pdf.js I/O and defers
// all reasoning about lines, paragraphs, headers/footers and page markers here.

// --- line reconstruction (per page) ---------------------------------------
/**
 * Rebuild visual lines from a page's positioned text fragments (pdf.js
 * textContent shape), keyed by their baseline Y. Returns lines top-to-bottom
 * with { y, height, text }.
 */
export function pageToLines(textContent) {
  const items = (textContent?.items || []).filter((it) => 'str' in it)
  if (items.length === 0) return []

  const lines = []
  let current = null
  const yTolerance = 3

  for (const it of items) {
    const x = it.transform[4]
    const y = it.transform[5]
    const h = Math.abs(it.height || it.transform[3] || 10)

    if (current && Math.abs(current.y - y) <= yTolerance) {
      current.fragments.push({ x, str: it.str })
      current.height = Math.max(current.height, h)
    } else {
      if (current) lines.push(current)
      current = { y, height: h, fragments: [{ x, str: it.str }] }
    }
  }
  if (current) lines.push(current)

  return lines
    .map((ln) => {
      const text = ln.fragments
        .sort((a, b) => a.x - b.x)
        .map((f) => f.str)
        .join('')
        .replace(/\s+/g, ' ')
        .trim()
      return { y: ln.y, height: ln.height, text }
    })
    .filter((ln) => ln.text.length > 0)
}

/** Merge visually-consecutive lines into paragraphs by their vertical gap. */
export function linesToParagraphs(flatLines) {
  if (flatLines.length === 0) return []
  const paragraphs = []
  let buffer = [flatLines[0].text]
  let prev = flatLines[0]

  for (let i = 1; i < flatLines.length; i++) {
    const line = flatLines[i]
    const gap = prev.y - line.y // pdf Y grows upward, so this is positive top→bottom
    const threshold = Math.max(prev.height, line.height) * 1.6
    const endsSentence = /[.!?;:]["')\]]?$/.test(buffer[buffer.length - 1])

    if (gap > threshold && (endsSentence || gap > threshold * 1.5)) {
      paragraphs.push(buffer.join(' ').trim())
      buffer = [line.text]
    } else {
      // Join hyphenated line breaks tightly, otherwise with a space.
      const last = buffer[buffer.length - 1]
      if (/[A-Za-zÀ-ÿ]-$/.test(last)) {
        buffer[buffer.length - 1] = last.replace(/-$/, '') + line.text
      } else {
        buffer.push(line.text)
      }
    }
    prev = line
  }
  if (buffer.length) paragraphs.push(buffer.join(' ').trim())

  return paragraphs.filter((p) => p.length > 0)
}

// --- header / footer detection --------------------------------------------
const TOP_BAND = 0.9 // normalized Y above this = top margin
const BOTTOM_BAND = 0.1 // normalized Y below this = bottom margin
const ROMAN = /^m{0,4}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/i

/** Collapse a line to a template (digits → #) so running heads match across pages. */
export function normalizeTemplate(text) {
  return text
    .toLowerCase()
    .replace(/\d+/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Which margin (if any) a line sits in, given the page height. */
export function marginBand(ln, pageHeight) {
  const ny = pageHeight > 0 ? ln.y / pageHeight : 0.5
  if (ny >= TOP_BAND) return 'top'
  if (ny <= BOTTOM_BAND) return 'bottom'
  return null
}

/**
 * A standalone page-number line: Arabic digits or a valid Roman numeral,
 * optionally wrapped in dashes/dots or prefixed with "p."/"pág.". Strict Roman
 * validation avoids eating real words made of roman-ish letters.
 */
export function isPageNumberLine(text) {
  const stripped = text.trim().replace(/^[\s\-–—.·|/()[\]]+|[\s\-–—.·|/()[\]]+$/g, '')
  const core = stripped.replace(/^(p[áa]g\.?|p\.)\s*/i, '').trim()
  if (!core) return false
  if (/^\d{1,7}$/.test(core)) return true
  if (core.length <= 7 && ROMAN.test(core)) return true
  return false
}

/**
 * Templates that recur in the margins across enough pages to be running
 * headers/footers (journal name, author, short title, page numbers).
 */
export function detectRunningTemplates(pages) {
  const seen = new Map() // template → Set(pageNum)
  for (const pg of pages) {
    for (const ln of pg.lines) {
      if (!marginBand(ln, pg.height)) continue
      const tmpl = normalizeTemplate(ln.text)
      if (!tmpl) continue
      if (!seen.has(tmpl)) seen.set(tmpl, new Set())
      seen.get(tmpl).add(pg.pageNum)
    }
  }
  const threshold = Math.max(2, Math.ceil(pages.length * 0.3))
  const drop = new Set()
  for (const [tmpl, pset] of seen) if (pset.size >= threshold) drop.add(tmpl)
  return drop
}

/** True when a line is a header/footer to drop (margin-band gated). */
export function isHeaderFooter(ln, pageHeight, runningTemplates) {
  if (!marginBand(ln, pageHeight)) return false
  if (isPageNumberLine(ln.text)) return true
  return runningTemplates.has(normalizeTemplate(ln.text))
}

/**
 * Assemble the final paragraph list from per-page lines: drop headers/footers,
 * merge the body into paragraphs, and open each page with a { pageMarker: true }
 * "Página N" paragraph — the only margin text kept.
 *
 * @param {{pageNum:number, height:number, lines:{y:number,height:number,text:string}[]}[]} pages
 */
export function buildParagraphs(pages) {
  const runningTemplates = detectRunningTemplates(pages)
  const result = []
  for (const pg of pages) {
    const body = pg.lines.filter((ln) => !isHeaderFooter(ln, pg.height, runningTemplates))
    const paras = linesToParagraphs(body)
    result.push({ text: `Página ${pg.pageNum}`, page: pg.pageNum, pageMarker: true })
    for (const text of paras) result.push({ text, page: pg.pageNum })
  }
  return result
}
