// Unit tests for the PDF text heuristics. Run with: node --test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  linesToParagraphs,
  normalizeTemplate,
  marginBand,
  isPageNumberLine,
  detectRunningTemplates,
  buildParagraphs,
} from './pdfText.js'

test('isPageNumberLine: digits, romans and wrappers count; words do not', () => {
  for (const s of ['12', ' 7 ', '- 3 -', 'pág. 5', 'p. 10', 'iv', 'IV', 'xii', '(9)']) {
    assert.equal(isPageNumberLine(s), true, `expected page-number: ${s}`)
  }
  for (const s of ['civil', 'Introdução', 'Turismo', '', 'capítulo 3 de 8', 'nota 12 sobre']) {
    assert.equal(isPageNumberLine(s), false, `expected NOT page-number: ${s}`)
  }
})

test('normalizeTemplate collapses digits and whitespace', () => {
  assert.equal(normalizeTemplate('Revista  de Turismo 2020'), 'revista de turismo #')
  assert.equal(normalizeTemplate('Vol. 3, n. 12'), 'vol. #, n. #')
})

test('marginBand classifies top/bottom/body by normalized Y', () => {
  assert.equal(marginBand({ y: 760 }, 800), 'top') // 0.95
  assert.equal(marginBand({ y: 40 }, 800), 'bottom') // 0.05
  assert.equal(marginBand({ y: 400 }, 800), null) // 0.50
})

// A 3-page article with a running header, footer page numbers, and body text.
function fixturePages() {
  const header = (t) => ({ y: 760, height: 10, text: t })
  const footer = (t) => ({ y: 40, height: 10, text: t })
  const body = (y, t) => ({ y, height: 12, text: t })
  return [
    {
      pageNum: 1,
      height: 800,
      lines: [
        header('Revista de Turismo 2020'),
        body(400, 'O turismo organiza-se em torno de'),
        body(384, 'infraestrutura e fluxos de pessoas.'),
        footer('12'),
      ],
    },
    {
      pageNum: 2,
      height: 800,
      lines: [
        header('Revista de Turismo 2020'),
        body(400, 'Praticas alternativas ampliam o conceito.'),
        body(300, '42'), // a bare number in the BODY must be kept
        footer('13'),
      ],
    },
    {
      pageNum: 3,
      height: 800,
      lines: [
        header('Revista de Turismo 2020'),
        body(400, 'Consideracoes finais do texto.'),
        footer('14'),
      ],
    },
  ]
}

test('detectRunningTemplates flags the repeated header and the page-number template', () => {
  const drop = detectRunningTemplates(fixturePages())
  assert.ok(drop.has('revista de turismo #'), 'running header should be flagged')
  assert.ok(drop.has('#'), 'footer page-number template should be flagged')
})

test('buildParagraphs drops headers/footers, keeps body, and adds page markers', () => {
  const paras = buildParagraphs(fixturePages())

  // Every page opens with its marker, in order.
  const markers = paras.filter((p) => p.pageMarker)
  assert.deepEqual(
    markers.map((m) => m.text),
    ['Página 1', 'Página 2', 'Página 3'],
  )
  assert.deepEqual(
    markers.map((m) => m.page),
    [1, 2, 3],
  )

  const bodyText = paras.filter((p) => !p.pageMarker).map((p) => p.text)

  // Header and footer text is gone everywhere.
  assert.ok(!bodyText.some((t) => /Revista de Turismo/.test(t)), 'header leaked')
  assert.ok(!bodyText.includes('12') && !bodyText.includes('13') && !bodyText.includes('14'), 'footer page number leaked')

  // Page 1's two body lines merged into one flowing paragraph.
  assert.ok(
    bodyText.some((t) => t === 'O turismo organiza-se em torno de infraestrutura e fluxos de pessoas.'),
    'body lines should merge',
  )

  // A number that sits in the body (not a margin) is preserved.
  assert.ok(bodyText.includes('42'), 'body-band number should be kept')
})

test('linesToParagraphs merges close lines and splits on large gaps', () => {
  const merged = linesToParagraphs([
    { y: 400, height: 12, text: 'linha um' },
    { y: 386, height: 12, text: 'linha dois.' },
  ])
  assert.deepEqual(merged, ['linha um linha dois.'])

  const split = linesToParagraphs([
    { y: 400, height: 12, text: 'fim de um paragrafo.' },
    { y: 340, height: 12, text: 'Inicio de outro.' },
  ])
  assert.deepEqual(split, ['fim de um paragrafo.', 'Inicio de outro.'])
})
