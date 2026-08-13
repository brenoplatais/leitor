// Export a document + its annotations to structured JSON or compiled Markdown.
import { typeOf } from './annotationTypes'

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
      text: p.text,
    })),
    annotations: annotations.map((a) => ({
      id: a.id,
      label: a.label,
      type: a.type || 'note',
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
  const lines = []

  lines.push(`# ${baseName(pdfName)}`)
  lines.push('')
  lines.push(`> Exportado do Leitor em ${new Date().toLocaleString()}`)
  lines.push(`> ${paragraphs.length} parágrafos · ${annotations.length} anotações`)
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## Texto anotado')
  lines.push('')

  paragraphs.forEach((p, i) => {
    const anns = byPara.get(i)
    const markers = anns ? ' ' + anns.map((a) => `**[${a.label}]**`).join(' ') : ''
    lines.push(`${p.text}${markers}`)
    lines.push('')
    if (anns) {
      for (const a of anns) {
        lines.push(`> **[${a.label}]** _(${typeOf(a.type).label})_ ${a.transcription}`)
        lines.push('')
      }
    }
  })

  lines.push('---')
  lines.push('')
  lines.push('## Minhas anotações')
  lines.push('')

  if (annotations.length === 0) {
    lines.push('_Nenhuma anotação registrada._')
  } else {
    annotations.forEach((a) => {
      const page = paragraphs[a.paragraphIndex]?.page
      const when = new Date(a.createdAt).toLocaleString()
      const typeLabel = typeOf(a.type).label
      lines.push(`### [${a.label}] ${typeLabel} — pág. ${page ?? '?'} · ${when}`)
      lines.push('')
      lines.push(a.transcription)
      lines.push('')
      const snippet =
        a.contextSnippet ||
        (() => {
          const c = paragraphs[a.paragraphIndex]?.text || ''
          return c.length > 220 ? c.slice(0, 220) + '…' : c
        })()
      if (snippet) {
        lines.push(`> Trecho ancorado: ${snippet}`)
        lines.push('')
      }
    })
  }

  triggerDownload(lines.join('\n'), `${baseName(pdfName)}.md`, 'text/markdown')
}
