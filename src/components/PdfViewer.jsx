import { useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page } from 'react-pdf'
import { Chevron } from './Icons'

/**
 * Left pane — renders the PDF and follows the reader: when `page` changes
 * (because reading advanced into a new page) it scrolls that page into view.
 */
export default function PdfViewer({ fileData, page, onNumPages }) {
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1.1)
  const [error, setError] = useState(null)
  const containerRef = useRef(null)
  const pageRefs = useRef({})

  // react-pdf wants a stable file prop; wrap the bytes once per document.
  const file = useMemo(() => (fileData ? { data: fileData } : null), [fileData])

  useEffect(() => {
    const el = pageRefs.current[page]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [page])

  function handleLoad({ numPages }) {
    setNumPages(numPages)
    setError(null)
    onNumPages?.(numPages)
  }

  return (
    <div className="flex h-full flex-col bg-slate-200/60">
      <div className="flex items-center justify-between border-b border-slate-300 bg-white/80 px-3 py-2 text-sm">
        <span className="font-medium text-slate-600">
          {numPages ? `${numPages} páginas` : 'PDF'}
        </span>
        <div className="flex items-center gap-1">
          <button
            className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100"
            onClick={() => setScale((s) => Math.max(0.6, +(s - 0.15).toFixed(2)))}
            title="Diminuir zoom"
          >
            −
          </button>
          <span className="w-12 text-center tabular-nums text-slate-500">
            {Math.round(scale * 100)}%
          </span>
          <button
            className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100"
            onClick={() => setScale((s) => Math.min(2.2, +(s + 0.15).toFixed(2)))}
            title="Aumentar zoom"
          >
            +
          </button>
        </div>
      </div>

      <div ref={containerRef} className="scroll-thin flex-1 overflow-auto px-4 py-4">
        {error ? (
          <div className="mt-10 text-center text-sm text-rose-600">
            Não foi possível abrir o PDF.
            <br />
            {String(error.message || error)}
          </div>
        ) : (
          <Document
            file={file}
            onLoadSuccess={handleLoad}
            onLoadError={setError}
            loading={
              <div className="mt-10 text-center text-sm text-slate-400">
                Carregando PDF…
              </div>
            }
            className="pdf-doc"
          >
            {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
              <div
                key={n}
                ref={(el) => (pageRefs.current[n] = el)}
                className={
                  'rounded-md transition ' +
                  (n === page ? 'ring-2 ring-accent ring-offset-2 ring-offset-slate-200' : '')
                }
              >
                <Page
                  pageNumber={n}
                  scale={scale}
                  renderTextLayer
                  renderAnnotationLayer={false}
                />
              </div>
            ))}
          </Document>
        )}
      </div>
    </div>
  )
}

export { Chevron }
