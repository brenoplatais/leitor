// Heuristic auto-detection of an article's structural sections, mapping each to
// an "Estrutura do artigo" stamp. Pure and offline: it scans paragraphs for cue
// phrases (PT primary, plus common EN/ES), scores each against the sections, and
// returns the best matches. It's a first pass — approximate by design — that the
// reader refines by hand. Structured so an AI classifier could later replace
// `detectStructure` behind the same return shape.

// Cue rules per stamp. `w` weights how strongly a cue implies the section.
// `positional(order, total)` nudges by position in the body (0-based order over
// non-marker paragraphs). `max` caps how many paragraphs may carry the stamp.
const RULES = [
  {
    stampId: 'tema_central',
    max: 1,
    cues: [
      { re: /\beste\s+(artigo|trabalho|estudo)\s+(trata|aborda|discute|analisa|investiga|apresenta)/i, w: 4 },
      { re: /\bo\s+presente\s+(artigo|trabalho|estudo)/i, w: 4 },
      { re: /\btem\s+como\s+tema\b/i, w: 4 },
      { re: /\bthis\s+(article|paper|study)\s+(addresses|examines|explores|investigates|presents)/i, w: 4 },
    ],
    // The opening paragraph almost always introduces the theme, so position
    // alone can qualify it (no cue phrase required).
    positionalAlone: true,
    positional: (order) => (order === 0 ? 3 : order === 1 ? 1 : 0),
  },
  {
    stampId: 'relevancia_social',
    max: 3,
    cues: [
      { re: /\brelev[âa]ncia\b|\bimport[âa]ncia\b/i, w: 3 },
      { re: /\bcada\s+vez\s+mais\b|\bcresc(e|imento|ente)\b|\bem\s+expans[ãa]o\b/i, w: 3 },
      { re: /\bdados\b|\bestat[íi]sticas?\b|\b\d{1,3}%|\bmilh[õo]es?\b/i, w: 2 },
      { re: /\b(ibge|omt|unwto|embratur|mtur)\b/i, w: 3 },
      { re: /\bgrowing\b|\bincreasingly\b|\brelevance\b|\bsignificance\b/i, w: 2 },
    ],
    positional: () => 0,
  },
  {
    stampId: 'contexto_teorico',
    max: 3,
    cues: [
      { re: /\bsegundo\b|\bde\s+acordo\s+com\b|\bconforme\b|\bpara\s+[A-ZÀ-Ý][a-zà-ÿ]+\s+\(\d{4}\)/i, w: 2 },
      { re: /\bautores?\s+como\b|\bna\s+literatura\b|\bestudos?\s+anteriores\b|\brevis[ãa]o\s+(de\s+)?literatura\b/i, w: 3 },
      { re: /\baccording\s+to\b|\bprevious\s+studies\b|\bliterature\b/i, w: 2 },
      // Citation density: several "(Autor, ano)" or "Autor (ano)".
      { re: /\([A-ZÀ-Ý][^)]*\d{4}\)/, w: 2 },
    ],
    positional: () => 0,
  },
  {
    stampId: 'lacuna_pesquisa',
    max: 1,
    cues: [
      { re: /\blacuna\b/i, w: 4 },
      { re: /\bpoucos?\s+(estudos|trabalhos|autores)\b|\bescass(ez|os|as)\b|\bpouco\s+explorad/i, w: 3 },
      { re: /\bainda\s+n[ãa]o\b|\bcarece\b|\bn[ãa]o\s+h[áa]\s+consenso\b|\blacunas?\b/i, w: 3 },
      { re: /\blittle\s+is\s+known\b|\bresearch\s+gap\b|\bfew\s+studies\b|\bhas\s+not\s+been\b|\bremains?\s+unclear\b/i, w: 4 },
    ],
    positional: () => 0,
  },
  {
    stampId: 'objetivo',
    max: 1,
    cues: [
      { re: /\bobjetivo(s)?\s+(deste|desta|do|da)\s+(trabalho|estudo|artigo|pesquisa)/i, w: 5 },
      { re: /\btem\s+(como|por)\s+objetivo\b|\bobjetiva-se\b|\bpretende-se\b|\bbusca-se\b/i, w: 4 },
      { re: /\bo\s+(objetivo|prop[óo]sito|intuito)\b|\ba\s+finalidade\b/i, w: 3 },
      { re: /\b(the\s+)?(aim|objective|purpose|goal)\s+of\s+this\b|\bthis\s+(study|paper|article)\s+(aims|seeks|intends)\b|\bwe\s+aim\b/i, w: 5 },
    ],
    positional: () => 0,
  },
  {
    stampId: 'metodologia',
    max: 3,
    cues: [
      { re: /\bmetodologia\b|\bm[ée]todo(s|l[óo]gic)?\b|\bprocedimentos?\s+metodol/i, w: 4 },
      { re: /\bpesquisa\s+(qualitativa|quantitativa|explorat[óo]ria|descritiva)\b|\bestudo\s+de\s+caso\b/i, w: 3 },
      { re: /\bamostra\b|\bcoleta\s+de\s+dados\b|\bentrevistas?\b|\bquestion[áa]rios?\b|\an[áa]lise\s+de\s+conte[úu]do\b/i, w: 3 },
      { re: /\bmethodolog|\bmethods?\b|\bdata\s+collection\b|\bsample\b|\binterviews?\b/i, w: 3 },
    ],
    positional: () => 0,
  },
  {
    stampId: 'contribuicoes',
    max: 1,
    cues: [
      { re: /\bcontribui(?:\s|-)?|\bcontribui[çc][ãa]o(es)?\b/i, w: 3 },
      { re: /\beste\s+(trabalho|estudo|artigo)\s+contribui\b|\bimplica[çc][õo]es\b|\bavan[çc]a\b/i, w: 4 },
      { re: /\bcontribution\b|\bimplications\b|\badvances\b/i, w: 3 },
    ],
    positional: (order, total) => (total > 0 && order >= total * 0.6 ? 0.5 : 0),
  },
]

const THRESHOLD = 3

/** Count of distinct cue hits (each cue at most once) plus positional nudge. */
function scoreRule(rule, text, order, total) {
  let s = 0
  for (const c of rule.cues) if (c.re.test(text)) s += c.w
  // The positional nudge applies once a cue matched; rules flagged
  // `positionalAlone` (e.g. the theme) may qualify on position by itself.
  if ((s > 0 || rule.positionalAlone) && rule.positional) s += rule.positional(order, total)
  return s
}

/**
 * Detect structural sections.
 * @param {{text:string, page:number, pageMarker?:boolean}[]} paragraphs
 * @returns {{paragraphIndex:number, stampId:string, score:number}[]} sorted by paragraph index
 */
export function detectStructure(paragraphs) {
  const body = []
  paragraphs.forEach((p, i) => {
    if (!p.pageMarker) body.push({ p, i })
  })
  const total = body.length

  // Best-scoring section per paragraph.
  const perParagraph = []
  body.forEach(({ p, i }, order) => {
    let best = null
    for (const rule of RULES) {
      const s = scoreRule(rule, p.text, order, total)
      if (s >= THRESHOLD && (!best || s > best.score)) {
        best = { paragraphIndex: i, stampId: rule.stampId, score: s }
      }
    }
    if (best) perParagraph.push(best)
  })

  // Apply per-section caps (keep the strongest paragraphs for each section).
  const maxOf = Object.fromEntries(RULES.map((r) => [r.stampId, r.max]))
  const byStamp = new Map()
  for (const s of perParagraph) {
    if (!byStamp.has(s.stampId)) byStamp.set(s.stampId, [])
    byStamp.get(s.stampId).push(s)
  }
  const kept = []
  for (const [stampId, list] of byStamp) {
    list.sort((a, b) => b.score - a.score)
    kept.push(...list.slice(0, maxOf[stampId] ?? 1))
  }

  return kept.sort((a, b) => a.paragraphIndex - b.paragraphIndex)
}
