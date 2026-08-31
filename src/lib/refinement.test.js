// Dependency-free unit tests for the refinement logic. Run with:
//   node --test
// (uses Node's built-in test runner — no vitest/jest needed).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CRITIQUE_TYPES,
  PROTOCOL_STEPS,
  CONTROL_QUESTIONS,
  CONTROL_TOTAL,
  critiqueTypeOf,
  emptyProtocol,
  emptyControlQuestions,
  emptyRefinement,
  computeScore,
  computeControls,
  isStepComplete,
  isProtocolComplete,
  hasRefinementContent,
} from './refinement.js'

test('data shapes: 7 critique types, 6 protocol steps, 8 control questions', () => {
  assert.equal(CRITIQUE_TYPES.length, 7)
  assert.equal(PROTOCOL_STEPS.length, 6)
  assert.equal(CONTROL_QUESTIONS.length, 8)
  assert.equal(CONTROL_TOTAL, 8)
})

test('protocol: exactly step 6 is optional; the rest are required', () => {
  const required = PROTOCOL_STEPS.filter((s) => s.required).map((s) => s.id)
  assert.deepEqual(required, [1, 2, 3, 4, 5])
  assert.equal(PROTOCOL_STEPS.find((s) => s.id === 6).required, false)
})

test('every control question carries both feedback strings', () => {
  for (const q of CONTROL_QUESTIONS) {
    assert.ok(q.feedbackNo, `${q.id} missing feedbackNo`)
    assert.ok(q.feedbackUncertain, `${q.id} missing feedbackUncertain`)
  }
})

test('critiqueTypeOf resolves known ids and null otherwise', () => {
  assert.equal(critiqueTypeOf('internal').name, 'Crítica Interna')
  assert.equal(critiqueTypeOf('extension').name, 'Extensão Produtiva')
  assert.equal(critiqueTypeOf('nope'), null)
  assert.equal(critiqueTypeOf(undefined), null)
})

test('computeScore counts only "sim" answers', () => {
  assert.equal(computeScore(emptyControlQuestions()), 0)
  const mixed = { q1: 'sim', q2: 'não', q3: 'incerto', q4: 'sim', q5: 'sim' }
  assert.equal(computeScore(mixed), 3)
  const allYes = {}
  for (const q of CONTROL_QUESTIONS) allYes[q.id] = 'sim'
  assert.equal(computeScore(allYes), 8)
  assert.equal(computeScore(null), 0)
})

test('computeControls splits resolved (sim) from pending (não/incerto)', () => {
  const cq = { q1: 'sim', q2: 'não', q3: 'incerto', q4: 'sim' } // q5..q8 unanswered
  assert.deepEqual(computeControls(cq), { resolved: 2, pending: 2, answered: 4 })
  assert.deepEqual(computeControls(emptyControlQuestions()), {
    resolved: 0,
    pending: 0,
    answered: 0,
  })
  assert.deepEqual(computeControls(null), { resolved: 0, pending: 0, answered: 0 })
})

test('every control question reads with "sim" as the healthy answer', () => {
  // Guards the fix: q5 and q8 used to have "não" as the healthy answer.
  assert.match(CONTROL_QUESTIONS.find((q) => q.id === 'q5').text, /Distingui/)
  assert.match(CONTROL_QUESTIONS.find((q) => q.id === 'q8').text, /Evitei/)
})

test('isStepComplete: textarea/select need non-empty; select+textarea needs the select', () => {
  const p = emptyProtocol()
  const s1 = PROTOCOL_STEPS.find((s) => s.id === 1) // textarea
  const s2 = PROTOCOL_STEPS.find((s) => s.id === 2) // select
  const s4 = PROTOCOL_STEPS.find((s) => s.id === 4) // select+textarea

  assert.equal(isStepComplete(s1, p), false)
  assert.equal(isStepComplete(s1, { ...p, reconstruction: '   ' }), false)
  assert.equal(isStepComplete(s1, { ...p, reconstruction: 'algo' }), true)

  assert.equal(isStepComplete(s2, { ...p, function: 'define' }), true)

  // detail alone is not enough; the support-type select is what counts
  assert.equal(isStepComplete(s4, { ...p, foundationDetail: 'texto' }), false)
  assert.equal(isStepComplete(s4, { ...p, foundation: 'counterexample' }), true)
})

test('isProtocolComplete requires all 5 required steps', () => {
  const p = emptyProtocol()
  assert.equal(isProtocolComplete(p), false)
  const full = {
    ...p,
    reconstruction: 'x',
    function: 'define',
    problem: 'y',
    foundation: 'counterexample',
    scope: 'restringe',
    // alternative left blank — optional
  }
  assert.equal(isProtocolComplete(full), true)
  assert.equal(isProtocolComplete({ ...full, scope: '' }), false)
})

test('hasRefinementContent detects type, protocol, or control content', () => {
  assert.equal(hasRefinementContent(null), false)
  assert.equal(hasRefinementContent(emptyRefinement()), false)
  assert.equal(hasRefinementContent({ ...emptyRefinement(), type: 'internal' }), true)
  assert.equal(
    hasRefinementContent({
      ...emptyRefinement(),
      protocol: { ...emptyProtocol(), reconstruction: 'x' },
    }),
    true,
  )
  assert.equal(
    hasRefinementContent({
      ...emptyRefinement(),
      controlQuestions: { ...emptyControlQuestions(), q1: 'sim' },
    }),
    true,
  )
})

test('emptyRefinement has the full documented shape', () => {
  const r = emptyRefinement()
  assert.deepEqual(Object.keys(r).sort(), [
    'controlQuestions',
    'lastRefined',
    'protocol',
    'score',
    'type',
  ])
  assert.deepEqual(Object.keys(r.protocol).sort(), [
    'alternative',
    'foundation',
    'foundationDetail',
    'function',
    'problem',
    'reconstruction',
    'scope',
  ])
  assert.equal(Object.keys(r.controlQuestions).length, 8)
})
