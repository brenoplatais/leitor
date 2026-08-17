import { useCallback, useEffect, useRef, useState } from 'react'

// Split a paragraph into words with their character offsets. Used by the
// time-based highlight estimator (below).
function tokenizeWords(text) {
  const toks = []
  const re = /\S+/g
  let m
  while ((m = re.exec(text))) {
    toks.push({ start: m.index, end: m.index + m[0].length, word: m[0] })
  }
  return toks
}

// Estimated time to speak a word, in ms, scaled by the reading rate. Tuned so
// the running average lands near the app's ~155 wpm baseline at rate 1.
function estWordMs(word, rate) {
  const charsPerSec = 14 * (rate || 1)
  let ms = ((word.length + 1) / charsPerSec) * 1000
  // A little extra dwell after sentence-final punctuation, matching the pause
  // most voices insert.
  if (/[.!?;:]["')\]]?$/.test(word)) ms += 220
  return Math.max(90, ms)
}

/**
 * Sequential text-to-speech reader over an array of paragraphs.
 *
 * One SpeechSynthesisUtterance is spoken per paragraph; when it ends we advance
 * to the next. A generation counter invalidates the `onend` handler of any
 * utterance we deliberately cancel (speed change, jump, stop) so a cancelled
 * paragraph never triggers a spurious advance.
 *
 * Word highlighting prefers the native `boundary` event, but many modern
 * (enhanced/neural) voices never fire it. So we also run a time-based estimator
 * that walks the words at their estimated pace; the first real boundary event,
 * if any, takes over and the estimator steps aside.
 *
 * `endIndex` (optional) bounds auto-advance: reading stops after that paragraph,
 * which is what powers "read pages X–Y" (e.g. a single book chapter).
 */
export function useReader({
  paragraphs,
  rate,
  volume,
  lang,
  voice,
  endIndex,
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
  const settingsRef = useRef({ paragraphs, rate, volume, lang, voice, endIndex })
  const finishRef = useRef(onFinish)
  const indexRef = useRef(onIndexChange)
  const wordRef = useRef(onWord)

  // Word-highlight estimator state.
  const estTimerRef = useRef(null)
  const estCtxRef = useRef(null) // { target, tokens, wi, gen }
  const boundaryFiredRef = useRef(false)

  useEffect(() => {
    settingsRef.current = { paragraphs, rate, volume, lang, voice, endIndex }
  }, [paragraphs, rate, volume, lang, voice, endIndex])
  useEffect(() => {
    finishRef.current = onFinish
    indexRef.current = onIndexChange
    wordRef.current = onWord
  }, [onFinish, onIndexChange, onWord])

  const stopEstimator = useCallback(() => {
    if (estTimerRef.current) clearTimeout(estTimerRef.current)
    estTimerRef.current = null
  }, [])

  // Walk the current paragraph's words on a self-scheduling timer, emitting a
  // word range for each. Stops as soon as a real boundary event took over, the
  // generation changed, or reading is no longer active.
  const runEstimator = useCallback(() => {
    const ctx = estCtxRef.current
    if (!ctx) return
    const tick = () => {
      if (ctx.gen !== genRef.current || !activeRef.current || boundaryFiredRef.current) {
        stopEstimator()
        return
      }
      if (ctx.wi >= ctx.tokens.length) {
        estTimerRef.current = null
        return
      }
      const tok = ctx.tokens[ctx.wi]
      wordRef.current?.({ index: ctx.target, start: tok.start, end: tok.end })
      ctx.wi++
      estTimerRef.current = setTimeout(tick, estWordMs(tok.word, settingsRef.current.rate))
    }
    tick()
  }, [stopEstimator])

  const stop = useCallback(() => {
    activeRef.current = false
    genRef.current++
    stopEstimator()
    estCtxRef.current = null
    boundaryFiredRef.current = false
    if (supported) window.speechSynthesis.cancel()
    wordRef.current?.(null)
    setReading(false)
    setPaused(false)
  }, [supported, stopEstimator])

  const speakIndex = useCallback(
    (i) => {
      const { paragraphs, rate, volume, lang, voice, endIndex } = settingsRef.current
      const lastAllowed =
        endIndex == null
          ? (paragraphs?.length ?? 0) - 1
          : Math.min(endIndex, (paragraphs?.length ?? 1) - 1)
      if (!paragraphs || i >= paragraphs.length || i > lastAllowed) {
        stop()
        finishRef.current?.()
        return
      }
      const target = Math.max(0, i)
      idxRef.current = target
      indexRef.current?.(target)

      const gen = ++genRef.current
      const text = paragraphs[target].text
      const u = new SpeechSynthesisUtterance(text)
      u.rate = rate
      u.volume = volume
      // A chosen voice carries its own locale; fall back to the language hint.
      if (voice) {
        u.voice = voice
        u.lang = voice.lang
      } else if (lang) {
        u.lang = lang
      }

      // Prepare the estimator for this paragraph; it starts on `onstart`.
      stopEstimator()
      boundaryFiredRef.current = false
      estCtxRef.current = { target, tokens: tokenizeWords(text), wi: 0, gen }

      u.onstart = () => {
        if (gen !== genRef.current || !activeRef.current || boundaryFiredRef.current) return
        estCtxRef.current = { target, tokens: tokenizeWords(text), wi: 0, gen }
        runEstimator()
      }

      // Native word-level highlighting: the boundary event reports the character
      // offset of the word about to be spoken. When it fires, it's authoritative
      // — hand highlighting over to it and stand the estimator down.
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
        boundaryFiredRef.current = true
        stopEstimator()
        wordRef.current?.({ index: target, start, end })
      }
      u.onend = () => {
        stopEstimator()
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
    [stop, stopEstimator, runEstimator],
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
    // Freeze the estimated highlight in place; native speech keeps its own state.
    stopEstimator()
    window.speechSynthesis.pause()
    setPaused(true)
  }, [supported, stopEstimator])

  const resume = useCallback(() => {
    if (!supported || !activeRef.current) return
    window.speechSynthesis.resume()
    setPaused(false)
    // Only the estimator needs restarting; native boundary events resume on
    // their own with the audio.
    if (estCtxRef.current && !boundaryFiredRef.current) runEstimator()
  }, [supported, runEstimator])

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

  // Clean up any in-flight speech and the estimator on unmount.
  useEffect(
    () => () => {
      if (estTimerRef.current) clearTimeout(estTimerRef.current)
      if (supported) window.speechSynthesis.cancel()
    },
    [supported],
  )

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
