import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Sequential text-to-speech reader over an array of paragraphs.
 *
 * One SpeechSynthesisUtterance is spoken per paragraph; when it ends we advance
 * to the next. A generation counter invalidates the `onend` handler of any
 * utterance we deliberately cancel (speed change, jump, stop) so a cancelled
 * paragraph never triggers a spurious advance.
 */
export function useReader({
  paragraphs,
  rate,
  volume,
  lang,
  voice,
  onIndexChange,
  onWord,
  onFinish,
}) {
  const [reading, setReading] = useState(false)
  const [paused, setPaused] = useState(false)
  const [supported] = useState(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window,
  )

  const genRef = useRef(0)
  const activeRef = useRef(false)
  const idxRef = useRef(0)
  // Latest settings, read at speak time so live changes take effect.
  const settingsRef = useRef({ paragraphs, rate, volume, lang, voice })
  const finishRef = useRef(onFinish)
  const indexRef = useRef(onIndexChange)
  const wordRef = useRef(onWord)

  useEffect(() => {
    settingsRef.current = { paragraphs, rate, volume, lang, voice }
  }, [paragraphs, rate, volume, lang, voice])
  useEffect(() => {
    finishRef.current = onFinish
    indexRef.current = onIndexChange
    wordRef.current = onWord
  }, [onFinish, onIndexChange, onWord])

  const stop = useCallback(() => {
    activeRef.current = false
    genRef.current++
    if (supported) window.speechSynthesis.cancel()
    wordRef.current?.(null)
    setReading(false)
    setPaused(false)
  }, [supported])

  const speakIndex = useCallback(
    (i) => {
      const { paragraphs, rate, volume, lang, voice } = settingsRef.current
      if (!paragraphs || i >= paragraphs.length) {
        stop()
        finishRef.current?.()
        return
      }
      const target = Math.max(0, i)
      idxRef.current = target
      indexRef.current?.(target)

      const gen = ++genRef.current
      const u = new SpeechSynthesisUtterance(paragraphs[target].text)
      u.rate = rate
      u.volume = volume
      // A chosen voice carries its own locale; fall back to the language hint.
      if (voice) {
        u.voice = voice
        u.lang = voice.lang
      } else if (lang) {
        u.lang = lang
      }
      // Word-level highlighting: the boundary event reports the character
      // offset of the word about to be spoken. We derive the word's end from
      // charLength when the browser provides it, otherwise scan to the next
      // whitespace, and report the range so the UI can follow along live.
      const text = paragraphs[target].text
      u.onboundary = (e) => {
        if (gen !== genRef.current || !activeRef.current) return
        if (e.name && e.name !== 'word') return
        const start = e.charIndex ?? 0
        if (start >= text.length) return
        let end = e.charLength ? start + e.charLength : start
        if (!e.charLength) {
          while (end < text.length && !/\s/.test(text[end])) end++
        }
        if (end <= start) return
        wordRef.current?.({ index: target, start, end })
      }
      u.onend = () => {
        if (gen === genRef.current && activeRef.current) speakIndex(target + 1)
      }
      u.onerror = (e) => {
        // "interrupted"/"canceled" are expected when we cancel on purpose.
        if (e.error && e.error !== 'interrupted' && e.error !== 'canceled') {
          if (gen === genRef.current && activeRef.current) speakIndex(target + 1)
        }
      }
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(u)
    },
    [stop],
  )

  const start = useCallback(
    (i) => {
      if (!supported) return
      activeRef.current = true
      setReading(true)
      setPaused(false)
      speakIndex(i ?? idxRef.current)
    },
    [supported, speakIndex],
  )

  const pause = useCallback(() => {
    if (!supported || !activeRef.current) return
    window.speechSynthesis.pause()
    setPaused(true)
  }, [supported])

  const resume = useCallback(() => {
    if (!supported || !activeRef.current) return
    window.speechSynthesis.resume()
    setPaused(false)
  }, [supported])

  /** Move to an arbitrary paragraph; keeps reading if we were reading. */
  const jumpTo = useCallback(
    (i) => {
      idxRef.current = i
      indexRef.current?.(i)
      if (activeRef.current) {
        setPaused(false)
        speakIndex(i)
      }
    },
    [speakIndex],
  )

  const next = useCallback(() => jumpTo(idxRef.current + 1), [jumpTo])
  const prev = useCallback(() => jumpTo(Math.max(0, idxRef.current - 1)), [jumpTo])

  /** Re-speak the current paragraph so a rate/volume change is heard now. */
  const restartCurrent = useCallback(() => {
    if (activeRef.current && !paused) speakIndex(idxRef.current)
  }, [paused, speakIndex])

  // Some browsers silently kill long queued speech; keep it alive while active.
  useEffect(() => {
    if (!supported) return
    const id = setInterval(() => {
      const s = window.speechSynthesis
      if (activeRef.current && !paused && s.speaking) {
        s.pause()
        s.resume()
      }
    }, 12000)
    return () => clearInterval(id)
  }, [supported, paused])

  // Clean up any in-flight speech on unmount.
  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel()
  }, [supported])

  return {
    supported,
    reading,
    paused,
    start,
    pause,
    resume,
    stop,
    jumpTo,
    next,
    prev,
    restartCurrent,
  }
}
