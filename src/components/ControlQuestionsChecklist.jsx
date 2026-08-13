import { CONTROL_QUESTIONS, CONTROL_TOTAL, computeScore } from '../lib/refinement'

const ANSWERS = [
  { value: 'sim', label: 'Sim' },
  { value: 'não', label: 'Não' },
  { value: 'incerto', label: 'Incerto' },
]

/**
 * TAB 3 — the 8 control questions. Each answers 'sim' | 'não' | 'incerto';
 * 'não' and 'incerto' surface contextual feedback in real time. `value` is the
 * controlQuestions map; `onChange(questionId, answer)` patches one answer.
 */
export default function ControlQuestionsChecklist({ value, onChange }) {
  const score = computeScore(value)
  const answered = CONTROL_QUESTIONS.filter((q) => value[q.id]).length

  return (
    <div>
      <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
        <span className="text-xs text-slate-500">
          {answered}/{CONTROL_TOTAL} respondidas
        </span>
        <span className="text-sm font-semibold text-slate-700">
          Score{' '}
          <span className={score >= 6 ? 'text-emerald-600' : 'text-amber-600'}>
            {score}/{CONTROL_TOTAL}
          </span>
        </span>
      </div>

      <ul className="space-y-2.5">
        {CONTROL_QUESTIONS.map((q, i) => {
          const answer = value[q.id] || ''
          const feedback =
            answer === 'não'
              ? q.feedbackNo
              : answer === 'incerto'
                ? q.feedbackUncertain
                : null
          return (
            <li key={q.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-medium leading-snug text-slate-700">
                <span className="mr-1 text-slate-400">{i + 1}.</span>
                {q.text}
              </p>
              <div className="mt-2 flex gap-1.5">
                {ANSWERS.map((a) => {
                  const active = answer === a.value
                  const activeClass =
                    a.value === 'sim'
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : a.value === 'não'
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'bg-amber-500 text-white border-amber-500'
                  return (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => onChange(q.id, active ? '' : a.value)}
                      aria-pressed={active}
                      className={
                        'rounded-full border px-3 py-1 text-[11px] font-medium transition ' +
                        (active
                          ? activeClass
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50')
                      }
                    >
                      {a.label}
                    </button>
                  )
                })}
              </div>
              {feedback && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-700">
                  {feedback}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
