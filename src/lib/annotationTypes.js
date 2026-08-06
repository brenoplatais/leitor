// Annotation categories. Colors are hex (used as inline styles) so Tailwind's
// purge never strips dynamically-chosen classes.
export const ANNOTATION_TYPES = [
  { id: 'note', label: 'Nota', hex: '#4f46e5' },
  { id: 'question', label: 'Pergunta', hex: '#d97706' },
  { id: 'insight', label: 'Insight', hex: '#059669' },
  { id: 'connection', label: 'Conexão', hex: '#7c3aed' },
  { id: 'critique', label: 'Crítica', hex: '#e11d48' },
]

export const DEFAULT_TYPE = 'note'

export function typeOf(id) {
  return ANNOTATION_TYPES.find((t) => t.id === id) || ANNOTATION_TYPES[0]
}

/**
 * A short excerpt of `text` around `offset` (a few words each side), for the
 * annotation's context snippet.
 */
export function contextAround(text, offset, radius = 42) {
  if (!text) return ''
  const o = Math.max(0, Math.min(offset ?? 0, text.length))
  let start = Math.max(0, o - radius)
  let end = Math.min(text.length, o + radius)
  // Snap to word boundaries so we don't cut words in half.
  while (start > 0 && !/\s/.test(text[start - 1])) start--
  while (end < text.length && !/\s/.test(text[end])) end++
  const prefix = start > 0 ? '…' : ''
  const suffix = end < text.length ? '…' : ''
  return (prefix + text.slice(start, end).trim() + suffix).trim()
}
