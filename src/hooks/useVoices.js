import { useEffect, useMemo, useState } from 'react'

/**
 * Load the browser's available TTS voices (the list arrives asynchronously) and
 * help pick the least-robotic one for a given language.
 *
 * Quality heuristic: the OS/browser exposes several voices per language and the
 * default is often the low-quality "compact" one. We rank by name keywords that
 * mark the good neural/enhanced voices (Google, Natural, Siri, Premium…) and
 * penalise the compact/novelty ones.
 */
export function useVoices() {
  const [voices, setVoices] = useState([])

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined
    const synth = window.speechSynthesis
    const load = () => {
      const list = synth.getVoices()
      if (list.length) setVoices(list)
    }
    load()
    synth.addEventListener?.('voiceschanged', load)
    // Safari/Chrome sometimes populate late; nudge a couple of times.
    const t1 = setTimeout(load, 250)
    const t2 = setTimeout(load, 1000)
    return () => {
      synth.removeEventListener?.('voiceschanged', load)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return voices
}

const GOOD = /(google|natural|neural|premium|enhanced|siri|wavenet|multilingual)/i
const POOR = /(compact|eloquence|novelty|espeak|pico)/i

export function scoreVoice(voice, lang) {
  let score = 0
  const name = voice.name || ''
  const base = (lang || '').slice(0, 2).toLowerCase()

  if (base && voice.lang?.toLowerCase().startsWith(base)) score += 100
  if (lang && voice.lang?.toLowerCase() === lang.toLowerCase()) score += 25
  if (GOOD.test(name)) score += 45
  if (POOR.test(name)) score -= 60
  // Enhanced/premium local voices don't always carry a keyword — a longer,
  // region-qualified name is a weak signal they're not the compact default.
  if (name.length > 12) score += 3
  return score
}

/** Best voice for a language, or null if none installed. */
export function pickBestVoice(voices, lang) {
  if (!voices?.length) return null
  const ranked = [...voices]
    .map((v) => ({ v, s: scoreVoice(v, lang) }))
    .sort((a, b) => b.s - a.s)
  return ranked[0]?.s > 0 ? ranked[0].v : null
}

/** Voices grouped for a picker: matching-language first, then the rest. */
export function useSortedVoices(voices, lang) {
  return useMemo(() => {
    const base = (lang || '').slice(0, 2).toLowerCase()
    const matching = []
    const others = []
    for (const v of voices) {
      if (base && v.lang?.toLowerCase().startsWith(base)) matching.push(v)
      else others.push(v)
    }
    const byScore = (a, b) => scoreVoice(b, lang) - scoreVoice(a, lang)
    matching.sort(byScore)
    others.sort((a, b) => (a.lang || '').localeCompare(b.lang || ''))
    return { matching, others }
  }, [voices, lang])
}
