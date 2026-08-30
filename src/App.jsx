import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PdfViewer from './components/PdfViewer'
import TextPane from './components/TextPane'
import Controls from './components/Controls'
import AnnotationModal from './components/AnnotationModal'
import AnnotationsPanel from './components/AnnotationsPanel'
import StampBar from './components/StampBar'
import AiSettingsModal from './components/AiSettingsModal'
import LibraryModal from './components/LibraryModal'
import { detectStructure } from './lib/autostructure'
import { detectStructureAI } from './lib/aiStructure'
import { loadAiConfig, saveAiConfig, isAiReady } from './lib/aiConfig'
import ErrorBoundary from './components/ErrorBoundary'
import { Upload, Library } from './components/Icons'
import { useReader } from './hooks/useReader'
import { useVoices, pickBestVoice, useSortedVoices } from './hooks/useVoices'
import { extractParagraphs } from './lib/pdf'
import {
  makeDocId,
  saveDocument,
  patchDocument,
  getDocument,
} from './lib/db'
import { exportJSON, exportMarkdown } from './lib/export'
import { contextAround, DEFAULT_TYPE } from './lib/annotationTypes'

const LANGUAGES = [
  { code: '', label: 'Idioma do navegador' },
  { code: 'pt-BR', label: 'Português (BR)' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'es-ES', label: 'Español (ES)' },
]

export default function App() {
  const [doc, setDoc] = useState(null) // { id, pdfName, numPages, paragraphs, bytes }
  const [annotations, setAnnotations] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [wordRange, setWordRange] = useState(null) // { index, start, end } — word being read

  const [rate, setRate] = useState(1)
  const [volume, setVolume] = useState(1)
  const [lang, setLang] = useState('')
  const [voiceURI, setVoiceURI] = useState('') // '' = auto (best available)
  // Optional reading window by page (e.g. a single book chapter). null = open.
  const [startPage, setStartPage] = useState(null)
  const [endPage, setEndPage] = useState(null)
  // Transient feedback for the "Detectar estrutura" action.
  const [detectMsg, setDetectMsg] = useState('')
  // AI mode (opt-in): config in localStorage, plus in-flight + settings state.
  const [aiConfig, setAiConfig] = useState(loadAiConfig)
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false)
  const [detecting, setDetecting] = useState(false)

  const [extracting, setExtracting] = useState(null) // 0..1 progress
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [annotationModal, setAnnotationModal] = useState(null) // { paragraphIndex, editing? }
  const [dragOver, setDragOver] = useState(false)

  const fileInputRef = useRef(null)
  // Current doc id in a ref so the reader's index callback can persist reading
  // progress without clobbering it during a document switch.
  const docIdRef = useRef(null)
  useEffect(() => {
    docIdRef.current = doc?.id ?? null
  }, [doc?.id])

  const handleIndexChange = useCallback((i) => {
    setCurrentIndex(i)
    if (docIdRef.current) patchDocument(docIdRef.current, { progressIndex: i })
  }, [])

  const paragraphs = doc?.paragraphs ?? []
  const effectiveLang = lang || (typeof navigator !== 'undefined' ? navigator.language : 'pt-BR')

  // Highest page number in the document, and the paragraph window implied by the
  // optional start/end page bounds.
  const pageMax = useMemo(
    () => paragraphs.reduce((m, p) => Math.max(m, p.page || 1), 1),
    [paragraphs],
  )
  const startIndex = useMemo(() => {
    if (startPage == null) return 0
    const i = paragraphs.findIndex((p) => (p.page || 1) >= startPage)
    return i < 0 ? 0 : i
  }, [paragraphs, startPage])
  const endIndex = useMemo(() => {
    if (endPage == null) return paragraphs.length - 1
    let last = -1
    for (let i = 0; i < paragraphs.length; i++) {
      if ((paragraphs[i].page || 1) <= endPage) last = i
    }
    return last < 0 ? paragraphs.length - 1 : last
  }, [paragraphs, endPage])

  // A fresh document starts with no page window.
  useEffect(() => {
    setStartPage(null)
    setEndPage(null)
  }, [doc?.id])

  // Voice selection: an explicit pick wins; otherwise auto-pick the best voice
  // available for the current language.
  const voices = useVoices()
  const groupedVoices = useSortedVoices(voices, effectiveLang)
  const selectedVoice = useMemo(() => {
    if (voiceURI) return voices.find((v) => v.voiceURI === voiceURI) || null
    return pickBestVoice(voices, effectiveLang)
  }, [voices, voiceURI, effectiveLang])

  const reader = useReader({
    paragraphs,
    rate,
    volume,
    lang: effectiveLang,
    voice: selectedVoice,
    endIndex,
    onIndexChange: handleIndexChange,
    onWord: setWordRange,
  })

  // Play/resume respecting the page window: if the cursor sits outside the
  // window, start at the window's first paragraph; otherwise start where we are.
  const playRespectingRange = useCallback(() => {
    const from = currentIndex < startIndex || currentIndex > endIndex ? startIndex : currentIndex
    reader.start(from)
  }, [reader, currentIndex, startIndex, endIndex])

  // Fresh byte copy for react-pdf (pdf.js may detach the buffer it receives).
  const viewerData = useMemo(
    () => (doc?.bytes ? doc.bytes.slice(0) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc?.id],
  )

  const currentPage = paragraphs[currentIndex]?.page ?? 1

  // ---- Reading speed & time-remaining estimate ---------------------------
  // A voice at rate 1.0 speaks roughly this many words per minute; scaling by
  // the current rate gives a usable words-per-minute figure and countdown.
  const BASE_WPM = 155
  const wpm = Math.round(BASE_WPM * rate)

  const wordCounts = useMemo(
    () => paragraphs.map((p) => (p.text.trim().match(/\S+/g) || []).length),
    [paragraphs],
  )

  // A 1s heartbeat keeps the countdown visibly ticking between word events.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!reader.reading || reader.paused) return undefined
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [reader.reading, reader.paused])

  // Words left to read within the active window [startIndex, endIndex]. With no
  // page range set the window spans the whole document, so this is the full
  // countdown; when a range is selected it reflects only that excerpt.
  const remainingWords = useMemo(() => {
    if (!paragraphs.length) return 0
    const lo = Math.max(0, startIndex)
    const hi = Math.min(endIndex, wordCounts.length - 1)
    if (hi < lo) return 0
    // Total words in the window.
    let windowTotal = 0
    for (let i = lo; i <= hi; i++) windowTotal += wordCounts[i]
    // Already past the window's end → nothing left.
    if (currentIndex > hi) return 0
    // Words consumed in the window up to the current paragraph.
    let consumed = 0
    for (let i = lo; i < currentIndex && i <= hi; i++) consumed += wordCounts[i]
    // Fraction of the current paragraph already read, from the word offset.
    if (currentIndex >= lo && currentIndex <= hi) {
      const curText = paragraphs[currentIndex]?.text || ''
      const curWords = wordCounts[currentIndex] || 0
      if (wordRange && wordRange.index === currentIndex && curText.length) {
        consumed += Math.round((wordRange.end / curText.length) * curWords)
      }
    }
    return Math.max(0, windowTotal - consumed)
  }, [paragraphs, currentIndex, wordCounts, wordRange, startIndex, endIndex])

  const remainingSeconds = wpm > 0 ? (remainingWords / wpm) * 60 : 0

  // ---- Persistence -------------------------------------------------------
  const persistAnnotations = useCallback(
    (next) => {
      if (doc?.id) patchDocument(doc.id, { annotations: next })
    },
    [doc?.id],
  )

  // ---- Loading a PDF -----------------------------------------------------
  const loadFile = useCallback(async (file) => {
    if (!file || file.type !== 'application/pdf') {
      alert('Selecione um arquivo PDF válido.')
      return
    }
    reader.stop()
    setCurrentIndex(0)
    const id = makeDocId(file)
    const bytes = await file.arrayBuffer()

    const existing = await getDocument(id)
    if (existing?.paragraphs?.length) {
      // Reuse the cache when it already has the new extraction, or when it holds
      // annotations (re-extracting would shift the indices they anchor to).
      const isNewExtraction = existing.paragraphs.some((p) => p.pageMarker)
      const hasNotes = (existing.annotations?.length ?? 0) > 0
      if (isNewExtraction || hasNotes) {
        setDoc({
          id,
          pdfName: existing.pdfName,
          numPages: existing.numPages,
          paragraphs: existing.paragraphs,
          bytes,
        })
        setAnnotations(existing.annotations ?? [])
        setCurrentIndex(existing.progressIndex ?? 0) // resume where we stopped
        // refresh the stored blob so the record stays openable
        patchDocument(id, { blob: file })
        return
      }
      // else: an un-annotated old-format doc — fall through to re-extract it.
    }

    setExtracting(0)
    try {
      const paras = await extractParagraphs(bytes, (r) => setExtracting(r))
      const record = {
        id,
        pdfName: file.name,
        numPages: paras[paras.length - 1]?.page ?? 1,
        paragraphs: paras,
        annotations: [],
        blob: file,
      }
      await saveDocument(record)
      setDoc({
        id,
        pdfName: file.name,
        numPages: record.numPages,
        paragraphs: paras,
        bytes,
      })
      setAnnotations([])
    } catch (err) {
      console.error(err)
      alert('Falha ao extrair o texto do PDF: ' + (err?.message || err))
    } finally {
      setExtracting(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadFromLibrary = useCallback(async (id) => {
    setLibraryOpen(false)
    const record = await getDocument(id)
    if (!record?.blob) {
      alert('Este PDF não pôde ser recuperado.')
      return
    }
    reader.stop()
    setCurrentIndex(0)
    const bytes = await record.blob.arrayBuffer()

    // Upgrade an un-annotated old-format doc to the header/footer-aware
    // extraction with page markers (annotated docs keep their anchors).
    let paragraphs = record.paragraphs
    let numPages = record.numPages
    const isNewExtraction = record.paragraphs?.some((p) => p.pageMarker)
    const hasNotes = (record.annotations?.length ?? 0) > 0
    if (record.paragraphs?.length && !isNewExtraction && !hasNotes) {
      try {
        paragraphs = await extractParagraphs(bytes)
        numPages = paragraphs[paragraphs.length - 1]?.page ?? numPages
        await patchDocument(record.id, { paragraphs, numPages })
      } catch {
        paragraphs = record.paragraphs
      }
    }

    setDoc({
      id: record.id,
      pdfName: record.pdfName,
      numPages,
      paragraphs,
      bytes,
    })
    setAnnotations(record.annotations ?? [])
    setCurrentIndex(record.progressIndex ?? 0) // resume where we stopped
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onFileInput(e) {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
    e.target.value = ''
  }

  // ---- Annotation actions ------------------------------------------------
  // Anchor point: the exact character offset of the word being read (falls back
  // to the paragraph start when not mid-word).
  function openAnnotate() {
    if (reader.reading && !reader.paused) reader.pause()
    const pText = paragraphs[currentIndex]?.text || ''
    const charOffset = wordRange && wordRange.index === currentIndex ? wordRange.start : 0
    setAnnotationModal({
      paragraphIndex: currentIndex,
      charOffset,
      contextSnippet: contextAround(pText, charOffset),
      editing: null,
    })
  }

  // One-click stamp at the reader's current position. Doesn't pause reading.
  function addStamp(stampId) {
    if (!doc) return
    const pText = paragraphs[currentIndex]?.text || ''
    const charOffset = wordRange && wordRange.index === currentIndex ? wordRange.start : 0
    setAnnotations((prev) => {
      const n = prev.reduce((m, a) => Math.max(m, a.n ?? 0), 0) + 1
      const ann = {
        id: crypto.randomUUID(),
        n,
        label: `A${n}`,
        kind: 'stamp',
        stampId,
        paragraphIndex: currentIndex,
        charOffset,
        contextSnippet: contextAround(pText, charOffset),
        type: DEFAULT_TYPE,
        transcription: '',
        createdAt: Date.now(),
      }
      const next = [...prev, ann].sort(
        (a, b) =>
          a.paragraphIndex - b.paragraphIndex ||
          (a.charOffset ?? 0) - (b.charOffset ?? 0) ||
          a.n - b.n,
      )
      persistAnnotations(next)
      return next
    })
  }

  function flashDetectMsg(msg) {
    setDetectMsg(msg)
    window.clearTimeout(flashDetectMsg._t)
    flashDetectMsg._t = window.setTimeout(() => setDetectMsg(''), 5000)
  }

  // Turn detection suggestions into stamp annotations. Auto stamps carry
  // `auto: true`; re-running replaces them but keeps manual stamps. Returns the
  // number added.
  function applyAutoStamps(suggestions) {
    const manual = annotations.filter((a) => !(a.kind === 'stamp' && a.auto))
    const taken = new Set(
      manual.filter((a) => a.kind === 'stamp').map((a) => a.paragraphIndex + ':' + a.stampId),
    )
    let n = manual.reduce((m, a) => Math.max(m, a.n ?? 0), 0)
    const added = []
    for (const s of suggestions) {
      if (taken.has(s.paragraphIndex + ':' + s.stampId)) continue
      const pText = paragraphs[s.paragraphIndex]?.text || ''
      n += 1
      added.push({
        id: crypto.randomUUID(),
        n,
        label: `A${n}`,
        kind: 'stamp',
        stampId: s.stampId,
        auto: true,
        paragraphIndex: s.paragraphIndex,
        charOffset: 0,
        contextSnippet: contextAround(pText, 0),
        type: DEFAULT_TYPE,
        transcription: '',
        createdAt: Date.now(),
      })
    }
    const next = [...manual, ...added].sort(
      (a, b) =>
        a.paragraphIndex - b.paragraphIndex ||
        (a.charOffset ?? 0) - (b.charOffset ?? 0) ||
        a.n - b.n,
    )
    setAnnotations(next)
    persistAnnotations(next)
    return added.length
  }

  const foundMsg = (n, via) =>
    n
      ? `${n === 1 ? '1 seção detectada' : n + ' seções detectadas'}${via ? ' ' + via : ''}`
      : 'Nada detectado com confiança'

  // Detect the article's structural sections: AI when enabled, else the offline
  // heuristic. Both produce the same suggestion shape.
  async function autodetectStructure() {
    if (!doc || detecting) return
    if (isAiReady(aiConfig)) {
      setDetecting(true)
      setDetectMsg('Detectando com IA…')
      try {
        const suggestions = await detectStructureAI(paragraphs, aiConfig)
        flashDetectMsg(foundMsg(applyAutoStamps(suggestions), 'por IA'))
      } catch (err) {
        const status = err?.status
        flashDetectMsg(
          status === 401
            ? 'Chave de API inválida'
            : status === 429
              ? 'Limite de uso atingido — tente mais tarde'
              : 'Falha na IA: ' + (err?.message || err),
        )
      } finally {
        setDetecting(false)
      }
      return
    }
    flashDetectMsg(foundMsg(applyAutoStamps(detectStructure(paragraphs))))
  }

  function saveAiSettings(cfg) {
    setAiConfig(saveAiConfig(cfg))
    setAiSettingsOpen(false)
  }

  function editAnnotation(a) {
    // Stamps carry no editable transcript — clicking one just jumps to it.
    if (a.kind === 'stamp') {
      selectParagraph(a.paragraphIndex)
      return
    }
    const pText = paragraphs[a.paragraphIndex]?.text || ''
    const charOffset = a.charOffset ?? 0
    setAnnotationModal({
      paragraphIndex: a.paragraphIndex,
      charOffset,
      contextSnippet: a.contextSnippet || contextAround(pText, charOffset),
      editing: a,
    })
  }

  function saveAnnotation(text, type, refinement) {
    setAnnotations((prev) => {
      let next
      if (annotationModal.editing) {
        next = prev.map((a) =>
          a.id === annotationModal.editing.id
            ? { ...a, transcription: text, type, refinement: refinement || null }
            : a,
        )
      } else {
        const n = prev.reduce((m, a) => Math.max(m, a.n ?? 0), 0) + 1
        const ann = {
          id: crypto.randomUUID(),
          n,
          label: `A${n}`,
          paragraphIndex: annotationModal.paragraphIndex,
          charOffset: annotationModal.charOffset ?? 0,
          contextSnippet: annotationModal.contextSnippet || '',
          type: type || DEFAULT_TYPE,
          transcription: text,
          refinement: refinement || null,
          createdAt: Date.now(),
        }
        next = [...prev, ann].sort(
          (a, b) =>
            a.paragraphIndex - b.paragraphIndex ||
            (a.charOffset ?? 0) - (b.charOffset ?? 0) ||
            a.n - b.n,
        )
      }
      persistAnnotations(next)
      return next
    })
    setAnnotationModal(null)
  }

  function deleteAnnotation(a) {
    if (!confirm(`Excluir a anotação ${a.label}?`)) return
    setAnnotations((prev) => {
      const next = prev.filter((x) => x.id !== a.id)
      persistAnnotations(next)
      return next
    })
  }

  // ---- Navigation --------------------------------------------------------
  function selectParagraph(i) {
    reader.jumpTo(i)
  }

  // Keyboard: space toggles play/pause when not typing.
  useEffect(() => {
    function onKey(e) {
      if (!doc) return
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || annotationModal) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (!reader.reading) playRespectingRange()
        else if (reader.paused) reader.resume()
        else reader.pause()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doc, reader, playRespectingRange, annotationModal])

  // Re-speak current paragraph when speed or voice changes mid-reading so the
  // change is heard immediately.
  const firstReadSetting = useRef(true)
  useEffect(() => {
    if (firstReadSetting.current) {
      firstReadSetting.current = false
      return
    }
    reader.restartCurrent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate, selectedVoice?.voiceURI])

  // ---- Render ------------------------------------------------------------
  return (
    <div
      className="flex h-screen flex-col bg-slate-100"
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file) loadFile(file)
      }}
    >
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            L
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight text-slate-800">Leitor</h1>
            <p className="text-[11px] leading-tight text-slate-400">
              Anotação por voz para PDFs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600 outline-none focus:border-accent"
            title="Idioma da voz e transcrição"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>

          {voices.length > 0 && (
            <select
              value={voiceURI}
              onChange={(e) => setVoiceURI(e.target.value)}
              className="max-w-[190px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600 outline-none focus:border-accent"
              title="Voz da leitura — escolha uma voz aprimorada para um som menos robótico"
            >
              <option value="">
                {selectedVoice ? `Voz automática — ${selectedVoice.name}` : 'Voz automática'}
              </option>
              {groupedVoices.matching.length > 0 && (
                <optgroup label="Idioma do documento">
                  {groupedVoices.matching.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </optgroup>
              )}
              {groupedVoices.others.length > 0 && (
                <optgroup label="Outras vozes">
                  {groupedVoices.others.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          )}

          <button
            onClick={() => setLibraryOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Library width={16} height={16} /> Anteriores
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Upload width={16} height={16} /> Abrir PDF
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={onFileInput}
          />
        </div>
      </header>

      {/* Body */}
      {!doc ? (
        <EmptyState
          dragOver={dragOver}
          extracting={extracting}
          onPick={() => fileInputRef.current?.click()}
          onLibrary={() => setLibraryOpen(true)}
        />
      ) : (
        <div className="flex min-h-0 flex-1">
          {/* Left: PDF (40%) */}
          <div className="w-2/5 min-w-[280px] border-r border-slate-200">
            <ErrorBoundary
              resetKey={doc.id}
              fallback={
                <div className="flex h-full flex-col items-center justify-center bg-slate-200/60 p-6 text-center text-sm text-slate-500">
                  <p className="font-medium text-slate-600">Não foi possível exibir o PDF.</p>
                  <p className="mt-1 max-w-xs text-xs">
                    O texto extraído e as anotações continuam disponíveis ao lado.
                  </p>
                </div>
              }
            >
              <PdfViewer fileData={viewerData} page={currentPage} />
            </ErrorBoundary>
          </div>

          {/* Middle: extracted text (grows) + controls */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1">
              <TextPane
                pdfName={doc.pdfName}
                paragraphs={paragraphs}
                currentIndex={currentIndex}
                wordRange={wordRange}
                annotations={annotations}
                onSelectParagraph={selectParagraph}
                onOpenAnnotation={editAnnotation}
              />
            </div>
            <StampBar
              onStamp={addStamp}
              onDetect={autodetectStructure}
              onOpenAiSettings={() => setAiSettingsOpen(true)}
              aiActive={isAiReady(aiConfig)}
              detecting={detecting}
              detectMsg={detectMsg}
              disabled={!doc}
            />
            <Controls
              reading={reader.reading}
              paused={reader.paused}
              supported={reader.supported}
              rate={rate}
              volume={volume}
              currentIndex={currentIndex}
              total={paragraphs.length}
              wpm={wpm}
              remainingSeconds={remainingSeconds}
              onPlay={playRespectingRange}
              onPause={reader.pause}
              onResume={reader.resume}
              onStop={reader.stop}
              onPrev={reader.prev}
              onNext={reader.next}
              onRateChange={setRate}
              onVolumeChange={setVolume}
              onAnnotate={openAnnotate}
              startPage={startPage}
              endPage={endPage}
              pageMax={pageMax}
              onStartPageChange={setStartPage}
              onEndPageChange={setEndPage}
            />
          </div>

          {/* Right: annotations panel */}
          <div className="w-80 min-w-[260px] max-w-[340px]">
            <AnnotationsPanel
              annotations={annotations}
              paragraphs={paragraphs}
              onJump={selectParagraph}
              onEdit={editAnnotation}
              onDelete={deleteAnnotation}
              onExportJSON={() => exportJSON({ pdfName: doc.pdfName, paragraphs, annotations })}
              onExportMarkdown={() =>
                exportMarkdown({ pdfName: doc.pdfName, paragraphs, annotations })
              }
            />
          </div>
        </div>
      )}

      {/* Modals */}
      <AnnotationModal
        open={!!annotationModal}
        editing={annotationModal?.editing}
        paragraphIndex={annotationModal?.paragraphIndex ?? 0}
        page={paragraphs[annotationModal?.paragraphIndex ?? 0]?.page ?? 1}
        contextSnippet={annotationModal?.contextSnippet}
        lang={effectiveLang}
        onSave={saveAnnotation}
        onClose={() => setAnnotationModal(null)}
      />
      <LibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onOpen={loadFromLibrary}
      />
      <AiSettingsModal
        open={aiSettingsOpen}
        initial={aiConfig}
        onSave={saveAiSettings}
        onClose={() => setAiSettingsOpen(false)}
      />
    </div>
  )
}

function EmptyState({ dragOver, extracting, onPick, onLibrary }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div
        className={
          'w-full max-w-md rounded-2xl border-2 border-dashed bg-white p-10 text-center shadow-sm transition ' +
          (dragOver ? 'border-accent bg-accent-soft' : 'border-slate-300')
        }
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Upload width={26} height={26} />
        </div>
        {extracting != null ? (
          <>
            <p className="text-sm font-medium text-slate-700">Extraindo texto…</p>
            <div className="mx-auto mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${Math.round((extracting || 0) * 100)}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-slate-800">Abra um PDF científico</h2>
            <p className="mt-1 text-sm text-slate-500">
              Arraste um arquivo aqui ou selecione para começar a ouvir e anotar por voz.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <button
                onClick={onPick}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Selecionar PDF
              </button>
              <button
                onClick={onLibrary}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                PDFs anteriores
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
