// Paragraph-level text extraction built on the same pdf.js instance react-pdf
// uses, so we never load a second (mismatched) copy of the library.
import { pdfjs } from 'react-pdf'

/**
 * Reconstruct paragraphs from a single page's text content.
 *
 * pdf.js gives us positioned text fragments. We first rebuild visual lines by
 * their vertical position, then merge consecutive lines into paragraphs,
 * starting a new paragraph when the vertical gap between two lines is clearly
 * larger than the running line height (a blank-ish line) — a heuristic that
 * holds up well for single- and double-column scientific PDFs.
 */
function pageToParagraphs(textContent) {
  const items = textContent.items.filter((it) => 'str' in it)
  if (items.length === 0) return []

  // Group fragments into lines keyed by their rounded baseline Y.
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

  // Order fragments left-to-right, collapse each line to a string.
  const flatLines = lines
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

  if (flatLines.length === 0) return []

  // Merge lines into paragraphs by vertical gap.
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

/**
 * Extract the whole document as an ordered list of paragraphs.
 * Each paragraph records the page it came from for navigation.
 *
 * @param {ArrayBuffer} data raw PDF bytes
 * @param {(ratio:number)=>void} [onProgress] 0..1 progress callback
 * @returns {Promise<{ text: string, page: number }[]>}
 */
export async function extractParagraphs(data, onProgress) {
  // getDocument consumes the buffer, so hand it a copy — the caller keeps theirs.
  const loadingTask = pdfjs.getDocument({ data: data.slice(0) })
  const pdf = await loadingTask.promise
  const result = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    const paras = pageToParagraphs(textContent)
    for (const text of paras) {
      result.push({ text, page: pageNum })
    }
    page.cleanup()
    onProgress?.(pageNum / pdf.numPages)
  }

  await pdf.destroy()

  // Fallback: a PDF with no meaningful line breaks still yields something.
  if (result.length === 0) {
    return [{ text: '(Nenhum texto extraível encontrado neste PDF.)', page: 1 }]
  }
  return result
}
