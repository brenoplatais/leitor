import { useEffect, useRef, useState } from 'react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { ANNOTATION_TYPES, DEFAULT_TYPE } from '../lib/annotationTypes'
import { Mic, Stop, Close, Check } from './Icons'

/**
 * Recording modal. Opens with the reader already paused. Captures voice via STT
 * in real time, shows the live transcript (editable), lets the user tag the
 * annotation's type, and saves it anchored to a precise point in the text.
 * Also used to edit an existing annotation.
 */
export default function AnnotationModal({
  open,
  editing,
  paragraphIndex,
  page,
  contextSnippet,
  lang,
  onSave,
  onClose,
}) {
  const { supported, listening, interim, finalText, setFinal, error, start, stop, reset } =
    useSpeechRecognition({ lang })
  const textareaRef = useRef(null)
  const [type, setType] = useState(DEFAULT_TYPE)

  // Prime the transcript when the modal opens; auto-listen for new annotations.
  useEffect(() => {
    if (!open) return
    if (editing) {
      setFinal(editing.transcription)
      setType(editing.type || DEFAULT_TYPE)
    } else {
      reset()
      setType(DEFAULT_TYPE)
      if (supported) start()
    }
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const preview = (finalText + (interim ? ' ' + interim : '')).trim()

  function handleSave() {
    stop()
    const text = preview.trim()
    if (!text) return
    onSave(text, type)
  }

  function handleClose() {
    stop()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={handleClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              {editing ? `Editar anotação ${editing.label}` : 'Nova anotação'}
            </h3>
            <p className="text-xs text-slate-400">
              Ancorada no ponto exato · parágrafo {paragraphIndex + 1} · pág. {page}
            </p>
          </div>
          <button onClick={handleClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <Close />
          </button>
        </div>

        {contextSnippet && (
          <div className="mx-5 mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs italic text-slate-500">
            <span className="mr-1 not-italic font-medium text-slate-400">no ponto:</span>
            “{contextSnippet}”
          </div>
        )}

        <div className="px-5 pt-4">
          {/* Type selector */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {ANNOTATION_TYPES.map((t) => {
              const active = t.id === type
              return (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={
                    'rounded-full border px-3 py-1 text-xs font-medium transition ' +
                    (active ? 'text-white' : 'text-slate-500 hover:bg-slate-50')
                  }
                  style={
                    active
                      ? { backgroundColor: t.hex, borderColor: t.hex }
                      : { borderColor: '#e2e8f0' }
                  }
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="px-5 pb-4">
          <div className="mb-3 flex items-center gap-3">
            {listening ? (
              <button
                onClick={stop}
                className="flex items-center gap-2 rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"
              >
                <span className="rec-dot inline-block h-2.5 w-2.5 rounded-full bg-white" />
                Gravando — parar
                <Stop width={16} height={16} />
              </button>
            ) : (
              <button
                onClick={start}
                disabled={!supported}
                className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                <Mic width={16} height={16} />
                {finalText ? 'Continuar gravando' : 'Gravar'}
              </button>
            )}
            {listening && (
              <span className="text-xs text-slate-400">Fale — a transcrição aparece abaixo.</span>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={finalText}
            onChange={(e) => setFinal(e.target.value)}
            placeholder="A transcrição da sua voz aparece aqui. Você pode editar livremente."
            rows={5}
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm leading-relaxed text-slate-700 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          {interim && (
            <p className="mt-1 px-1 text-sm italic text-slate-400">… {interim}</p>
          )}

          {!supported && (
            <p className="mt-2 text-xs text-rose-500">
              Reconhecimento de voz indisponível neste navegador. Você ainda pode digitar a anotação.
            </p>
          )}
          {error && (
            <p className="mt-2 text-xs text-rose-500">Erro no reconhecimento: {error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            onClick={handleClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Descartar
          </button>
          <button
            onClick={handleSave}
            disabled={!preview}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            <Check width={16} height={16} />
            Salvar anotação
          </button>
        </div>
      </div>
    </div>
  )
}
