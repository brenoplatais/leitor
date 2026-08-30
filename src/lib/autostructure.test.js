// Unit tests for the structural section detector. Run with: node --test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectStructure } from './autostructure.js'

const P = (text) => ({ text, page: 1 })
const MARK = (n) => ({ text: `Página ${n}`, page: n, pageMarker: true })

function detectMap(paragraphs) {
  const out = new Map()
  for (const s of detectStructure(paragraphs)) out.set(s.paragraphIndex, s.stampId)
  return out
}

test('detects the core sections by their cue phrases', () => {
  const paras = [
    MARK(1),
    P('Este artigo trata do turismo de base comunitária no litoral nordestino.'), // 1: tema (opening)
    P('O turismo cresce cada vez mais no Brasil; dados da OMT apontam aumento expressivo.'), // 2: relevância
    P('Segundo autores como Silva (2019), o fenômeno já foi tratado na literatura da área.'), // 3: contexto teórico
    P('Ainda assim, poucos estudos abordaram essa relação, evidenciando uma lacuna de pesquisa.'), // 4: lacuna
    P('O objetivo deste trabalho é analisar as práticas de hospedagem solidária.'), // 5: objetivo
    P('A metodologia adotada foi qualitativa, com entrevistas e análise de conteúdo.'), // 6: metodologia
    P('Este trabalho contribui para o campo do turismo ao ampliar o conceito.'), // 7: contribuições
  ]
  const m = detectMap(paras)
  assert.equal(m.get(1), 'tema_central')
  assert.equal(m.get(2), 'relevancia_social')
  assert.equal(m.get(3), 'contexto_teorico')
  assert.equal(m.get(4), 'lacuna_pesquisa')
  assert.equal(m.get(5), 'objetivo')
  assert.equal(m.get(6), 'metodologia')
  assert.equal(m.get(7), 'contribuicoes')
})

test('unique sections keep only the strongest paragraph', () => {
  const paras = [
    P('O objetivo deste trabalho é X.'),
    P('Além disso, o objetivo deste estudo é também Y, de forma ainda mais explícita e detalhada.'),
    P('Texto qualquer sem pistas relevantes de estrutura.'),
  ]
  const objetivos = detectStructure(paras).filter((s) => s.stampId === 'objetivo')
  assert.equal(objetivos.length, 1, 'objetivo é único (max 1)')
})

test('page markers are never tagged', () => {
  const paras = [MARK(1), P('Este artigo investiga o tema.'), MARK(2), P('conteúdo.')]
  const idxs = detectStructure(paras).map((s) => s.paragraphIndex)
  assert.ok(!idxs.includes(0) && !idxs.includes(2), 'marcadores de página não são marcados')
})

test('plain prose with no cues yields no false positives (beyond the opening theme)', () => {
  const paras = [
    P('Uma frase de abertura neutra sobre o assunto.'), // opening → tema is allowed
    P('Outra frase comum, apenas descrevendo a paisagem observada.'),
    P('Mais texto corrido, narrando o cotidiano da região visitada.'),
  ]
  const detected = detectStructure(paras)
  const nonTheme = detected.filter((s) => s.stampId !== 'tema_central')
  assert.equal(nonTheme.length, 0, 'sem falsos positivos além do tema de abertura')
})
