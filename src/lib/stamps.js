// Reading stamps ("carimbos"): one-click marks the reader drops on a passage
// while reading. The nine categories come from the user's
// "carimbos_leitura_academica" folder set. A stamp is stored as a lightweight
// annotation (kind: 'stamp') so it reuses anchoring, markers, the panel,
// persistence and export.
export const STAMPS = [
  { id: 'kit_essencial', label: 'Essencial', short: 'Essencial', icon: '⭐', hex: '#ca8a04' },
  { id: 'operacoes_conceituais', label: 'Operação conceitual', short: 'Conceitual', icon: '🧩', hex: '#4f46e5' },
  { id: 'epistemologia', label: 'Epistemologia', short: 'Epistem.', icon: '🔎', hex: '#0891b2' },
  { id: 'forca_intelectual', label: 'Força intelectual', short: 'Força', icon: '💥', hex: '#db2777' },
  { id: 'demonstracao_argumento', label: 'Demonstração / argumento', short: 'Argumento', icon: '🧠', hex: '#7c3aed' },
  { id: 'teoria_metodo_empiria', label: 'Teoria–método–empiria', short: 'Teoria/mét.', icon: '⚗️', hex: '#059669' },
  { id: 'repertorio_dificuldade', label: 'Repertório / dificuldade', short: 'Dificuldade', icon: '⚠️', hex: '#e11d48' },
  { id: 'uso_futuro', label: 'Uso futuro', short: 'Uso futuro', icon: '📌', hex: '#ea580c' },
  { id: 'conexoes_autorais', label: 'Conexões autorais', short: 'Conexão', icon: '🔗', hex: '#2563eb' },
]

export function stampOf(id) {
  return STAMPS.find((s) => s.id === id) || null
}
