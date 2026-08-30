// Unit tests for the pure AI-structure helpers (no network). Run: node --test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildStructurePrompt, parseAiStructure } from './aiStructure.js'

const P = (text) => ({ text, page: 1 })
const MARK = (n) => ({ text: `Página ${n}`, page: n, pageMarker: true })

test('buildStructurePrompt lists body paragraphs by global index, skips markers', () => {
  const paras = [MARK(1), P('Primeiro corpo.'), MARK(2), P('Segundo corpo.')]
  const { system, user } = buildStructurePrompt(paras)
  // Taxonomy ids present in the system prompt.
  assert.match(system, /objetivo/)
  assert.match(system, /metodologia/)
  // Body paragraphs referenced by their GLOBAL index (1 and 3), markers absent.
  assert.match(user, /\[1\] Primeiro corpo\./)
  assert.match(user, /\[3\] Segundo corpo\./)
  assert.doesNotMatch(user, /Página/)
})

test('parseAiStructure validates ids and indices, dedupes, tolerates surrounding text', () => {
  const validStamps = new Set(['objetivo', 'metodologia'])
  const validIdx = new Set([1, 3, 5])

  const good = parseAiStructure(
    'Aqui está: [{"i":1,"s":"objetivo"},{"i":3,"s":"metodologia"}] pronto.',
    validStamps,
    validIdx,
  )
  assert.deepEqual(good, [
    { paragraphIndex: 1, stampId: 'objetivo', score: 90 },
    { paragraphIndex: 3, stampId: 'metodologia', score: 90 },
  ])

  // Unknown stamp, out-of-range index, and a duplicate are all dropped.
  const filtered = parseAiStructure(
    '[{"i":1,"s":"objetivo"},{"i":1,"s":"metodologia"},{"i":9,"s":"objetivo"},{"i":3,"s":"inexistente"}]',
    validStamps,
    validIdx,
  )
  assert.deepEqual(filtered, [{ paragraphIndex: 1, stampId: 'objetivo', score: 90 }])
})

test('parseAiStructure returns [] on non-JSON or non-array', () => {
  assert.deepEqual(parseAiStructure('desculpe, não sei', new Set(['objetivo']), new Set([1])), [])
  assert.deepEqual(parseAiStructure('{"i":1,"s":"objetivo"}', new Set(['objetivo']), new Set([1])), [])
})
