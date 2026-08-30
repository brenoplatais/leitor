// Unit tests for the precision-first structural section detector.
// Run with: node --test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectStructure, leadingHeading } from './autostructure.js'

const P = (text) => ({ text, page: 1 })
const MARK = (n) => ({ text: `Página ${n}`, page: n, pageMarker: true })

function detectMap(paragraphs) {
  const out = new Map()
  for (const s of detectStructure(paragraphs)) out.set(s.paragraphIndex, s.stampId)
  return out
}

test('leadingHeading extracts an all-caps heading, else null', () => {
  assert.equal(leadingHeading('RESUMO O presente texto apresenta'), 'RESUMO')
  assert.equal(leadingHeading('CONSIDERAÇÕES FINAIS Essas trilhas'), 'CONSIDERAÇÕES FINAIS')
  assert.equal(leadingHeading('REFERÊNCIAS Baptista, M. L.'), 'REFERÊNCIAS')
  assert.equal(leadingHeading('1 INTRODUÇÃO O turismo cresce'), '1 INTRODUÇÃO')
  assert.equal(leadingHeading('Este artigo trata do tema'), null)
  assert.equal(leadingHeading('A metodologia deixa de ser rígida'), null)
})

test('headings drive detection; references and back-matter are ignored', () => {
  const paras = [
    MARK(1),
    P('INTRODUÇÃO O turismo é um fenômeno relevante e crescente na sociedade contemporânea.'), // 1 → tema
    P('Diversos autores discutem o tema em trabalhos recentes.'),
    P('OBJETIVOS O objetivo deste trabalho é analisar a hospedagem solidária.'), // 3 → objetivo
    P('METODOLOGIA A metodologia adotada foi qualitativa, com entrevistas.'), // 4 → metodologia
    P('Resultados diversos foram observados no campo estudado.'),
    P('CONSIDERAÇÕES FINAIS Este trabalho contribui para o campo do turismo.'), // 6 → contribuições
    P('REFERÊNCIAS Silva, J. (2019). Turismo. Editora.'), // 7 → references boundary
    P('Souza, M. (2020). Hospitalidade solidária. Editora.'), // 8 → ignored
  ]
  const m = detectMap(paras)
  assert.equal(m.get(1), 'tema_central')
  assert.equal(m.get(3), 'objetivo')
  assert.equal(m.get(4), 'metodologia')
  assert.equal(m.get(6), 'contribuicoes')
  assert.equal(m.has(7), false, 'a linha de REFERÊNCIAS não é carimbada')
  assert.equal(m.has(8), false, 'referências não são carimbadas')
})

test('essay traps: abstract skipped, quotes and stray "metodologia" do not fire', () => {
  const paras = [
    MARK(1),
    P('RESUMO O presente texto apresenta a proposição da cartografia de saberes como orientação metodológica para a pesquisa em turismo, numa perspectiva complexa e transdisciplinar.'), // abstract → skip
    P('PLATÔ INICIAL A proposta deste texto é partilhar a cartografia de saberes como orientação metodológica, ao longo de anos de docência em pesquisa qualitativa e complexa no campo do turismo contemporâneo brasileiro.'), // 2 → tema (first prose)
    P('Se a reforma do pensamento científico ainda não foi concebida, só nos resta começar, afirma o autor citado no texto.'), // 3 → NOT lacuna (quote, "ainda não")
    P('A metodologia deixa de ser uma engrenagem rígida e passa a ser construída no processo de investigação.'), // 4 → NOT metodologia (no "metodologia adotada")
    P('REFERÊNCIAS Guattari, F. (1992). Caosmose. Editora 34.'),
  ]
  const detected = detectStructure(paras)
  assert.deepEqual(
    detected.map((d) => [d.paragraphIndex, d.stampId]),
    [[2, 'tema_central']],
    'somente o parágrafo de abertura vira tema; nada de falsos positivos',
  )
})

test('a citation-heavy paragraph without a heading is not tagged as contexto', () => {
  const paras = [
    P('Introdução em prosa suficientemente longa para servir de tema de abertura, tratando do fenômeno turístico e sua importância para as comunidades locais estudadas neste artigo.'),
    P('Conforme Silva (2019), Souza (2020) e Costa (2021), o fenômeno já foi discutido; para Lima (2018) há convergências, e segundo Rocha (2017) também.'),
  ]
  const m = detectMap(paras)
  assert.equal(m.get(1), undefined, 'contexto é só por título; citações não disparam')
})
