// AI-mode settings, stored per-browser in localStorage. The API key never
// leaves the user's browser except to go directly to the Anthropic API when a
// detection runs. Offline heuristic stays the default; AI is opt-in.

const K_ENABLED = 'leitor.ai.enabled'
const K_KEY = 'leitor.ai.apiKey'
const K_MODEL = 'leitor.ai.model'

// Anthropic API model as default per the API guidance; cheaper options offered.
export const AI_MODELS = [
  { id: 'claude-opus-5', label: 'Claude Opus 5 — máxima qualidade ($$$)' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 — equilíbrio ($$)' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 — rápido e barato ($)' },
]
export const DEFAULT_MODEL = 'claude-opus-5'

function read(key, fallback = '') {
  try {
    const v = localStorage.getItem(key)
    return v == null ? fallback : v
  } catch {
    return fallback
  }
}
function write(key, value) {
  try {
    if (value == null || value === '') localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* private mode / storage blocked — ignore */
  }
}

export function loadAiConfig() {
  const model = read(K_MODEL, DEFAULT_MODEL)
  return {
    enabled: read(K_ENABLED) === '1',
    apiKey: read(K_KEY),
    model: AI_MODELS.some((m) => m.id === model) ? model : DEFAULT_MODEL,
  }
}

export function saveAiConfig({ enabled, apiKey, model }) {
  write(K_ENABLED, enabled ? '1' : '')
  write(K_KEY, apiKey || '')
  write(K_MODEL, model || DEFAULT_MODEL)
  return loadAiConfig()
}

/** AI detection is usable only when enabled and a key is present. */
export function isAiReady(cfg) {
  return !!(cfg && cfg.enabled && cfg.apiKey && cfg.apiKey.trim())
}
