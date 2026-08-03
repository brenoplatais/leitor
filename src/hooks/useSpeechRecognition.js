import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Thin wrapper over the Web Speech API's SpeechRecognition (STT).
 *
 * Exposes the confirmed (final) transcript plus a live interim fragment so the
 * UI can show words appearing as they are spoken. The confirmed text is held in
 * a ref and mirrored to state; `setFinal` lets the user edit it by hand.
 */
export function useSpeechRecognition({ lang } = {}) {
  const SR =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null
  const supported = !!SR

  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [finalText, setFinalText] = useState('')
  const [error, setError] = useState(null)

  const recognitionRef = useRef(null)
  const finalRef = useRef('')
  const shouldRunRef = useRef(false)

  useEffect(() => {
    if (!supported) return undefined
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = lang || navigator.language || 'pt-BR'

    rec.onresult = (event) => {
      let interimChunk = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript
        if (result.isFinal) {
          finalRef.current = (finalRef.current + ' ' + transcript.trim()).trim()
          setFinalText(finalRef.current)
        } else {
          interimChunk += transcript
        }
      }
      setInterim(interimChunk)
    }

    rec.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return
      // Fatal errors: don't let onend restart into a tight retry loop.
      if (
        event.error === 'not-allowed' ||
        event.error === 'service-not-allowed' ||
        event.error === 'audio-capture'
      ) {
        shouldRunRef.current = false
        setListening(false)
      }
      setError(event.error)
    }

    rec.onend = () => {
      // Chrome ends the session periodically; restart while the user wants it on.
      if (shouldRunRef.current) {
        try {
          rec.start()
        } catch {
          /* already starting */
        }
      } else {
        setListening(false)
        setInterim('')
      }
    }

    recognitionRef.current = rec
    return () => {
      shouldRunRef.current = false
      try {
        rec.stop()
      } catch {
        /* noop */
      }
      recognitionRef.current = null
    }
  }, [supported, SR, lang])

  const start = useCallback(() => {
    if (!supported || !recognitionRef.current) return
    setError(null)
    shouldRunRef.current = true
    try {
      recognitionRef.current.start()
      setListening(true)
    } catch {
      /* already started */
    }
  }, [supported])

  const stop = useCallback(() => {
    shouldRunRef.current = false
    setListening(false)
    setInterim('')
    try {
      recognitionRef.current?.stop()
    } catch {
      /* noop */
    }
  }, [])

  const reset = useCallback(() => {
    finalRef.current = ''
    setFinalText('')
    setInterim('')
    setError(null)
  }, [])

  // Allow manual edits to the confirmed transcript, keeping the ref in sync.
  const setFinal = useCallback((value) => {
    finalRef.current = value
    setFinalText(value)
  }, [])

  return {
    supported,
    listening,
    interim,
    finalText,
    setFinal,
    error,
    start,
    stop,
    reset,
  }
}
