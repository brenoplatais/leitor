import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildCleanMarkdown } from './export.js'

const paragraphs = [
  { text: 'Página 1', page: 1, pageMarker: true },
  { text: 'Introdução do artigo sobre turismo.', page: 1 },
  { text: 'Este estudo tem por objetivo analisar X.', page: 1 },
  { text: 'Página 2', page: 2, pageMarker: true },
  { text: 'Conclusão final.', page: 2 },
]

test('clean markdown: title, no page markers, estrutura-only headings, no notes', () => {
  const annotations = [
    { kind: 'stamp', stampId: 'objetivo', paragraphIndex: 2 }, // estrutura → vira ##
    { kind: 'stamp', stampId: 'kit_essencial', paragraphIndex: 1 }, // leitura → NÃO vira heading
    { kind: 'voice', label: 'A1', type: 'note', transcription: 'nota falada', paragraphIndex: 1 },
  ]
  const md = buildCleanMarkdown({ pdfName: 'artigo.pdf', paragraphs, annotations })

  assert.match(md, /^# artigo\n/) // título, .pdf removido
  assert.doesNotMatch(md, /Página \d/) // marcadores de página fora
  assert.match(md, /## Objetivo central\n\nEste estudo tem por objetivo/) // seção de estrutura
  assert.doesNotMatch(md, /## Essencial/) // carimbo de "leitura" não é heading
  assert.doesNotMatch(md, /\[A1\]/) // anotação de voz não entra
  assert.doesNotMatch(md, /nota falada/)
  assert.doesNotMatch(md, /\n{3,}/) // sem linhas em branco triplas
})

test('clean markdown: sem anotações ainda entrega corpo limpo', () => {
  const md = buildCleanMarkdown({ pdfName: 'x', paragraphs })
  assert.match(md, /Introdução do artigo/)
  assert.match(md, /Conclusão final\./)
  assert.doesNotMatch(md, /##/) // sem seções, mas texto corrido válido
})
