// Heuristic auto-detection of an article's structural sections, mapping each to
// an "Estrutura do artigo" stamp. Pure and offline. Precision-first: it prefers
// to mark FEW high-confidence sections over splattering guesses.
//
// Signals, in order of confidence:
//  1. Section HEADINGS at a paragraph start (INTRODUÇÃO, OBJETIVOS, METODOLOGIA,
//     REFERENCIAL TEÓRICO, CONSIDERAÇÕES FINAIS…). Most reliable.
//  2. Strict cue phrases, confined to the section's zone (intro / body / end),
//     excluding the abstract and everything from REFERÊNCIAS onward.
//
// Same return shape as before, so an AI classifier could later replace it.

const HEADING_SCORE = 100 // headings dominate keyword matches
const FIRST_PROSE_SCORE = 40 // opening prose paragraph as a fallback "tema"

// --- heading detection -----------------------------------------------------
/** Leading run of ALL-CAPS words at a paragraph start (e.g. "RESUMO", "CONSIDERAÇÕES FINAIS"). */
export function leadingHeading(text) {
  const tokens = (text || '').trim().split(/\s+/).slice(0, 12)
  const head = []
  for (const tok of tokens) {
    const core = tok.replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, '')
    if (!core) {
      if (head.length) continue // internal punctuation like quotes
      break
    }
    const isNumbering = head.length === 0 && /^[\dIVXLC]+[.)]?$/.test(core)
    const isUpperWord = core.length >= 2 && /^[\p{Lu}][\p{Lu}\d'’-]*$/u.test(core)
    if (isNumbering || isUpperWord) head.push(core)
    else break
  }
  const words = head.filter((t) => /\p{L}/u.test(t) && t.length >= 2)
  if (!words.length) return null
  return head.join(' ')
}

const HEADING_STAMP = [
  { re: /^(introdu[çc][ãa]o|introduction)\b/i, stampId: 'tema_central' },
  { re: /^(objetivos?|objectives?|aims?)\b/i, stampId: 'objetivo' },
  {
    re: /^(metodologia|m[ée]todos?|materiais\s+e\s+m[ée]todos|procedimentos\s+metodol[óo]gicos|percurso\s+metodol[óo]gico|aspectos\s+metodol[óo]gicos|methodology|methods?|materials\s+and\s+methods)\b/i,
    stampId: 'metodologia',
  },
  {
    re: /^(referencial\s+te[óo]rico|fundamenta[çc][ãa]o\s+te[óo]rica|revis[ãa]o\s+(de\s+|da\s+)?literatura|marco\s+te[óo]rico|literature\s+review|theoretical\s+framework)\b/i,
    stampId: 'contexto_teorico',
  },
  {
    re: /^(considera[çc][õo]es\s+finais|conclus[ãõ]es?|conclusion|final\s+remarks)\b/i,
    stampId: 'contribuicoes',
  },
]
const HEADING_ABSTRACT = /^(resumo|abstract|palavras[- ]chave|keywords)\b/i
const HEADING_REFERENCES = /^(refer[êe]ncias?|references|bibliografia|obras\s+citadas|outras\s+leituras|works\s+cited)\b/i

/** Classify a paragraph by its heading: a stampId, 'abstract', 'references', or null. */
function classifyHeading(text) {
  const h = leadingHeading(text)
  if (!h) return null
  if (HEADING_REFERENCES.test(h)) return 'references'
  if (HEADING_ABSTRACT.test(h)) return 'abstract'
  for (const { re, stampId } of HEADING_STAMP) if (re.test(h)) return stampId
  return null
}

// --- strict keyword cues (fallback within zones) ---------------------------
const KEYWORD_RULES = {
  objetivo: {
    zone: 'intro',
    threshold: 5,
    cues: [
      { re: /\bobjetivo(s)?\s+(deste|desta|do|da)\s+(trabalho|estudo|artigo|pesquisa|texto)\b/i, w: 5 },
      { re: /\btem\s+(como|por)\s+objetivo\b|\bobjetiva-se\b/i, w: 5 },
      { re: /\b(o\s+)?objetivo\s+(geral|central|principal)\b/i, w: 5 },
      { re: /\bthis\s+(study|paper|article)\s+(aims|seeks|intends)\b|\b(the\s+)?(aim|purpose|objective)\s+of\s+this\b/i, w: 5 },
    ],
  },
  lacuna_pesquisa: {
    zone: 'intro',
    threshold: 4,
    cues: [
      { re: /\blacunas?\s+(de\s+pesquisa|na\s+literatura|no\s+conhecimento|te[óo]rica)\b/i, w: 5 },
      { re: /\blacuna\b/i, w: 4 },
      { re: /\bpoucos?\s+(estudos|trabalhos)\b|\bescass(ez|os|as)\s+de\b|\bcarece\s+de\b|\bn[ãa]o\s+h[áa]\s+estudos\b/i, w: 4 },
      { re: /\bresearch\s+gap\b|\bfew\s+studies\b|\blittle\s+is\s+known\b/i, w: 5 },
    ],
  },
  relevancia_social: {
    zone: 'intro',
    threshold: 4,
    cues: [
      { re: /\b(dados|estat[íi]sticas?)\s+(de|da|do|apontam|mostram|indicam|revelam)\b/i, w: 3 },
      { re: /\b(ibge|omt|unwto|embratur|mtur|oms|who)\b/i, w: 3 },
      { re: /\b\d{1,3}(?:[.,]\d+)?\s*%/, w: 2 },
      { re: /\brelev[âa]ncia\s+(social|do\s+tema)\b/i, w: 3 },
    ],
  },
  metodologia: {
    zone: 'body',
    threshold: 4,
    max: 2,
    cues: [
      { re: /\bmetodologia\s+(adotada|utilizada|empregada|proposta|da\s+pesquisa)\b/i, w: 4 },
      { re: /\bprocedimentos\s+metodol[óo]gicos\b|\bmateriais\s+e\s+m[ée]todos\b|\bpercurso\s+metodol[óo]gico\b/i, w: 4 },
      { re: /\b(a\s+)?coleta\s+de\s+dados\b|\ban[áa]lise\s+de\s+conte[úu]do\b|\bforam\s+realizadas?\s+entrevistas?\b|\ba\s+amostra\s+(foi|de|contou)\b/i, w: 4 },
      { re: /\bmethodolog|\bdata\s+collection\b|\bwe\s+conducted\b/i, w: 4 },
    ],
  },
  contribuicoes: {
    zone: 'end',
    threshold: 4,
    cues: [
      { re: /\b(este|o)\s+(trabalho|estudo|artigo)\s+contribui\b|\bcontribui[çc][õo]es\s+(deste|do|para)\b/i, w: 4 },
      { re: /\bimplica[çc][õo]es\s+(te[óo]ricas|pr[áa]ticas|gerenciais|para)\b/i, w: 3 },
      { re: /\bcontribut(e|ion|es)\b|\bimplications\b/i, w: 3 },
    ],
  },
}

const CAP = {
  tema_central: 1,
  relevancia_social: 1,
  contexto_teorico: 2,
  lacuna_pesquisa: 1,
  objetivo: 1,
  metodologia: 2,
  contribuicoes: 1,
}

const META_RE = /\b(issn|doi:|©|revista\b|e-?mail|https?:|recebido:|aceito:|vol\.|professora?|doutora?)\b/i

function scoreKeywords(rule, text) {
  let s = 0
  for (const c of rule.cues) if (c.re.test(text)) s += c.w
  return s
}

/**
 * Detect structural sections. Returns [{paragraphIndex, stampId, score}] sorted
 * by paragraph index (highest-confidence single paragraph per capped section).
 * @param {{text:string, page:number, pageMarker?:boolean}[]} paragraphs
 */
export function detectStructure(paragraphs) {
  // Body paragraphs (skip page markers), remembering global index + body order.
  const body = []
  paragraphs.forEach((p, i) => {
    if (!p.pageMarker) body.push({ text: p.text, index: i, order: body.length })
  })
  const N = body.length
  if (!N) return []

  // Heading classification per paragraph.
  const headClass = body.map((b) => classifyHeading(b.text))

  // References boundary: ignore everything from the first references heading on.
  let refOrder = headClass.findIndex((c) => c === 'references')
  if (refOrder < 0) refOrder = N
  const refN = refOrder // body length considered "content"

  const abstractSet = new Set()
  headClass.forEach((c, order) => {
    if (c === 'abstract') abstractSet.add(order)
  })

  // Zones (relative to content length; a minimum keeps short docs workable).
  const introEnd = Math.min(refN, Math.max(8, Math.round(refN * 0.35)))
  const endStart = Math.min(refN - 1, Math.round(refN * 0.72))
  const inZone = (zone, order) =>
    zone === 'intro' ? order < introEnd : zone === 'end' ? order >= endStart : order < refN

  const candidates = [] // {index, stampId, score}

  // 1) Heading-based (high confidence), content only.
  for (let order = 0; order < refN; order++) {
    const c = headClass[order]
    if (c && c !== 'abstract' && c !== 'references') {
      candidates.push({ index: body[order].index, stampId: c, score: HEADING_SCORE })
    }
  }

  // 2) Fallback "tema": first real prose paragraph (no explicit INTRODUÇÃO).
  if (!candidates.some((c) => c.stampId === 'tema_central')) {
    for (let order = 0; order < introEnd; order++) {
      if (abstractSet.has(order)) continue
      if (headClass[order]) continue
      const t = body[order].text
      if (t.length < 120 || META_RE.test(t)) continue
      candidates.push({ index: body[order].index, stampId: 'tema_central', score: FIRST_PROSE_SCORE })
      break
    }
  }

  // 3) Strict keyword cues within zones (skip abstracts and heading paragraphs).
  for (let order = 0; order < refN; order++) {
    if (abstractSet.has(order) || headClass[order]) continue
    const text = body[order].text
    for (const [stampId, rule] of Object.entries(KEYWORD_RULES)) {
      if (!inZone(rule.zone, order)) continue
      const s = scoreKeywords(rule, text)
      if (s >= rule.threshold) {
        candidates.push({ index: body[order].index, stampId, score: s })
      }
    }
  }

  // Keep the single best stamp per paragraph.
  const bestByIndex = new Map()
  for (const c of candidates) {
    const prev = bestByIndex.get(c.index)
    if (!prev || c.score > prev.score) bestByIndex.set(c.index, c)
  }

  // Apply per-section caps, keeping the strongest paragraphs.
  const byStamp = new Map()
  for (const c of bestByIndex.values()) {
    if (!byStamp.has(c.stampId)) byStamp.set(c.stampId, [])
    byStamp.get(c.stampId).push(c)
  }
  const kept = []
  for (const [stampId, list] of byStamp) {
    list.sort((a, b) => b.score - a.score)
    kept.push(...list.slice(0, CAP[stampId] ?? 1))
  }

  return kept
    .map((c) => ({ paragraphIndex: c.index, stampId: c.stampId, score: c.score }))
    .sort((a, b) => a.paragraphIndex - b.paragraphIndex)
}
