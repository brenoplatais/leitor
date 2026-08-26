// Paragraph-level text extraction built on the same pdf.js instance react-pdf
// uses, so we never load a second (mismatched) copy of the library. All the
// text reasoning (lines, paragraphs, header/footer removal, page markers) lives
// in ./pdfText so it can be unit-tested without pdf.js.
import { pdfjs } from 'react-pdf'
import { pageToLines, buildParagraphs } from './pdfText'

/**
 * Extract the whole document as an ordered list of paragraphs. Running
 * headers/footers are dropped so the read-aloud text flows; each page opens
 * with a { pageMarker: true } paragraph carrying "Página N" — the only margin
 * text kept, spoken at every page turn.
 *
 * @param {ArrayBuffer} data raw PDF bytes
 * @param {(ratio:number)=>void} [onProgress] 0..1 progress callback
 * @returns {Promise<{ text: string, page: number, pageMarker?: boolean }[]>}
 */
export async function extractParagraphs(data, onProgress) {
  // getDocument consumes the buffer, so hand it a copy — the caller keeps theirs.
  const loadingTask = pdfjs.getDocument({ data: data.slice(0) })
  const pdf = await loadingTask.promise

  // Reconstruct lines per page and remember page heights.
  const pages = []
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const height = page.getViewport({ scale: 1 }).height
    const textContent = await page.getTextContent()
    pages.push({ pageNum, height, lines: pageToLines(textContent) })
    page.cleanup()
    onProgress?.((pageNum / pdf.numPages) * 0.95)
  }
  await pdf.destroy()

  const result = buildParagraphs(pages)
  onProgress?.(1)

  // A PDF with no extractable text (e.g. scanned images) still yields something.
  if (!result.some((p) => !p.pageMarker)) {
    return [{ text: '(Nenhum texto extraível encontrado neste PDF.)', page: 1 }]
  }
  return result
}
