// AI-backed structural detection. Classifies each paragraph into an "Estrutura
// do artigo" stamp using the Anthropic API, called directly from the browser
// with the user's own key. The Anthropic SDK is imported lazily so offline users
// never load it. Returns the same shape as the heuristic detectStructure.
import { STAMPS } from './stamps.js'

const MAX_SNIPPET = 600 // chars per paragraph sent to the model
const CONFIDENCE = new Set(['high', 'medium', 'low'])

function structuraStamps() {
  return STAMPS.filter((s) => s.group === 'estrutura')
}

/** Pure: build the {system, user} prompt from the document's body paragraphs. */
export function buildStructurePrompt(paragraphs) {
  const body = []
  paragraphs.forEach((p, i) => {
    if (!p.pageMarker) body.push({ index: i, text: p.text })
  })

  const taxonomy = structuraStamps()
    .map((s) => `- ${s.id}: ${s.label} — ${s.desc}`)
    .join('\n')

  const system =
    'Você é um assistente que identifica as SEÇÕES ESTRUTURAIS de um artigo ' +
    'científico (em português ou inglês). Dada uma lista numerada de parágrafos, ' +
    'você marca cada parágrafo que corresponde claramente a uma destas seções:\n\n' +
    taxonomy +
    '\n\nRegras:\n' +
    '- Use SOMENTE os identificadores acima (a coluna antes dos dois-pontos).\n' +
    '- Marque apenas quando tiver confiança; é melhor não marcar do que errar.\n' +
    '- Ignore resumo/abstract, palavras-chave, referências e notas de rodapé.\n' +
    '- Cada seção normalmente aparece UMA vez (tema, objetivo, lacuna, relevância, ' +
    'contribuições); metodologia e contexto teórico podem aparecer em poucos parágrafos.\n' +
    '- Escolha o parágrafo mais representativo de cada seção.\n' +
    '- Para cada marca, indique a confiança "high", "medium" ou "low". Se não tiver ' +
    'confiança razoável, ABSTENHA-SE (simplesmente não inclua o parágrafo). Use "low" ' +
    'com parcimônia — é melhor omitir do que arriscar.\n' +
    '- Responda APENAS com um array JSON, sem texto extra, no formato: ' +
    '[{"i": <número do parágrafo>, "s": "<identificador>", "c": "high|medium|low"}].'

  const list = body
    .map((b) => {
      const t = b.text.length > MAX_SNIPPET ? b.text.slice(0, MAX_SNIPPET) + '…' : b.text
      return `[${b.index}] ${t}`
    })
    .join('\n\n')

  const user = `Parágrafos do artigo:\n\n${list}\n\nRetorne o array JSON.`
  return { system, user }
}

/**
 * Pure: parse + validate the model's JSON into detection results, each with a
 * `confidence` of 'high' | 'medium' | 'low'. Low-confidence marks are dropped by
 * default (pass `includeLow: true` to keep them).
 */
export function parseAiStructure(text, validStampIds, validIndexSet, { includeLow = false } = {}) {
  let raw = text
  const match = text.match(/\[[\s\S]*\]/)
  if (match) raw = match[0]
  let arr
  try {
    arr = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(arr)) return []

  const seen = new Set()
  const out = []
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue
    const idx = Number(item.i)
    const stampId = item.s
    if (!Number.isInteger(idx) || seen.has(idx)) continue
    if (!validIndexSet.has(idx)) continue
    if (!validStampIds.has(stampId)) continue
    const confidence = CONFIDENCE.has(item.c) ? item.c : 'medium'
    if (confidence === 'low' && !includeLow) continue // abstain-by-default on low
    seen.add(idx)
    out.push({ paragraphIndex: idx, stampId, confidence })
  }
  return out.sort((a, b) => a.paragraphIndex - b.paragraphIndex)
}

/**
 * Classify structure via the Anthropic API (browser-direct, user's key).
 * @returns {Promise<{paragraphIndex:number, stampId:string, score:number}[]>}
 */
export async function detectStructureAI(paragraphs, { apiKey, model }) {
  const { system, user } = buildStructurePrompt(paragraphs)

  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const response = await client.messages.create({
    model,
    max_tokens: 4000,
    system,
    messages: [{ role: 'user', content: user }],
  })

  const textOut = (response.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')

  const validStampIds = new Set(structuraStamps().map((s) => s.id))
  const validIndexSet = new Set(
    paragraphs.map((p, i) => (!p.pageMarker ? i : -1)).filter((i) => i >= 0),
  )
  return parseAiStructure(textOut, validStampIds, validIndexSet)
}
