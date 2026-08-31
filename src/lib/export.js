// Export a document + its annotations (voice notes and stamps) to structured
// JSON or compiled Markdown.
import { typeOf } from './annotationTypes'
import { stampOf } from './stamps'

function triggerDownload(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function baseName(pdfName) {
  return (pdfName || 'documento').replace(/\.pdf$/i, '')
}

/** Group annotations by the paragraph index they anchor to. */
function annotationsByParagraph(annotations) {
  const map = new Map()
  for (const a of annotations) {
    if (!map.has(a.paragraphIndex)) map.set(a.paragraphIndex, [])
    map.get(a.paragraphIndex).push(a)
  }
  return map
}

const isStamp = (a) => a.kind === 'stamp'

/** The inline marker shown next to a paragraph: a stamp icon or the [A#] label. */
function inlineMarker(a) {
  if (isStamp(a)) return `**${stampOf(a.stampId)?.icon || '🔖'}**`
  return `**[${a.label}]**`
}

/** Fallback anchored snippet for an annotation. */
function snippetOf(a, paragraphs) {
  if (a.contextSnippet) return a.contextSnippet
  const c = paragraphs[a.paragraphIndex]?.text || ''
  return c.length > 220 ? c.slice(0, 220) + '…' : c
}

export function exportJSON({ pdfName, paragraphs, annotations }) {
  const payload = {
    app: 'leitor',
    version: 1,
    exportedAt: new Date().toISOString(),
    pdfName,
    paragraphCount: paragraphs.length,
    paragraphs: paragraphs.map((p, i) => ({
      index: i,
      page: p.page,
      pageMarker: p.pageMarker || false,
      text: p.text,
    })),
    annotations: annotations.map((a) => ({
      id: a.id,
      label: a.label,
      kind: a.kind || 'voice',
      type: a.type || 'note',
      stampId: a.stampId || null,
      stampLabel: isStamp(a) ? stampOf(a.stampId)?.label ?? null : null,
      auto: a.auto || false,
      aiConfidence: a.aiConfidence || null,
      paragraphIndex: a.paragraphIndex,
      charOffset: a.charOffset ?? null,
      contextSnippet: a.contextSnippet || '',
      page: paragraphs[a.paragraphIndex]?.page ?? null,
      transcription: a.transcription,
      refinement: a.refinement || null,
      createdAt: new Date(a.createdAt).toISOString(),
    })),
  }
  triggerDownload(
    JSON.stringify(payload, null, 2),
    `${baseName(pdfName)}.leitor.json`,
    'application/json',
  )
}

export function exportMarkdown({ pdfName, paragraphs, annotations }) {
  const byPara = annotationsByParagraph(annotations)
  const stamps = annotations.filter(isStamp)
  const notes = annotations.filter((a) => !isStamp(a))
  const lines = []

  lines.push(`# ${baseName(pdfName)}`)
  lines.push('')
  lines.push(`> Exportado do Leitor em ${new Date().toLocaleString()}`)
  lines.push(
    `> ${paragraphs.length} parágrafos · ${notes.length} anotações · ${stamps.length} carimbos`,
  )
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## Texto anotado')
  lines.push('')

  paragraphs.forEach((p, i) => {
    if (p.pageMarker) {
      lines.push(`### ${p.text}`)
      lines.push('')
      return
    }
    const anns = byPara.get(i)
    const markers = anns ? ' ' + anns.map(inlineMarker).join(' ') : ''
    lines.push(`${p.text}${markers}`)
    lines.push('')
    if (anns) {
      for (const a of anns) {
        if (isStamp(a)) {
          const s = stampOf(a.stampId)
          lines.push(`> ${s?.icon || '🔖'} _(carimbo: ${s?.label || a.stampId})_`)
        } else {
          lines.push(`> **[${a.label}]** _(${typeOf(a.type).label})_ ${a.transcription}`)
        }
        lines.push('')
      }
    }
  })

  // Stamp summary — counts per category, useful for a reading pass overview.
  if (stamps.length) {
    lines.push('---')
    lines.push('')
    lines.push('## Carimbos')
    lines.push('')
    const counts = new Map()
    for (const a of stamps) counts.set(a.stampId, (counts.get(a.stampId) || 0) + 1)
    for (const [stampId, n] of counts) {
      const s = stampOf(stampId)
      lines.push(`- ${s?.icon || '🔖'} **${s?.label || stampId}** — ${n}`)
    }
    lines.push('')
    for (const a of stamps) {
      const s = stampOf(a.stampId)
      const page = paragraphs[a.paragraphIndex]?.page
      lines.push(
        `- ${s?.icon || '🔖'} ${s?.label || a.stampId} · pág. ${page ?? '?'} · parágrafo ${a.paragraphIndex + 1} — “${snippetOf(a, paragraphs)}”`,
      )
    }
    lines.push('')
  }

  lines.push('---')
  lines.push('')
  lines.push('## Minhas anotações')
  lines.push('')

  if (notes.length === 0) {
    lines.push('_Nenhuma anotação registrada._')
  } else {
    notes.forEach((a) => {
      const page = paragraphs[a.paragraphIndex]?.page
      const when = new Date(a.createdAt).toLocaleString()
      const typeLabel = typeOf(a.type).label
      lines.push(`### [${a.label}] ${typeLabel} — pág. ${page ?? '?'} · ${when}`)
      lines.push('')
      lines.push(a.transcription)
      lines.push('')
      const snippet = snippetOf(a, paragraphs)
      if (snippet) {
        lines.push(`> Trecho ancorado: ${snippet}`)
        lines.push('')
      }
    })
  }

  triggerDownload(lines.join('\n'), `${baseName(pdfName)}.md`, 'text/markdown')
}
