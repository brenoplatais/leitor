// Reading stamps ("carimbos"): one-click marks the reader drops on a passage
// while reading. A stamp is stored as a lightweight annotation (kind: 'stamp')
// so it reuses anchoring, markers, the panel, persistence and export.
//
// Two groups:
//  - "Leitura": analytical reading operations (the academic-reading folder set).
//  - "Estrutura do artigo": the anatomy of a paper's introduction, for tagging
//    where the author presents theme, relevance, gap, objective, method, etc.
export const STAMP_GROUPS = [
  { id: 'leitura', label: 'Leitura' },
  { id: 'estrutura', label: 'Estrutura do artigo' },
]

export const STAMPS = [
  // --- Leitura -------------------------------------------------------------
  { id: 'kit_essencial', group: 'leitura', label: 'Essencial', short: 'Essencial', icon: '⭐', hex: '#ca8a04' },
  { id: 'operacoes_conceituais', group: 'leitura', label: 'Operação conceitual', short: 'Conceitual', icon: '🧩', hex: '#4f46e5' },
  { id: 'epistemologia', group: 'leitura', label: 'Epistemologia', short: 'Epistem.', icon: '🔎', hex: '#0891b2' },
  { id: 'forca_intelectual', group: 'leitura', label: 'Força intelectual', short: 'Força', icon: '💥', hex: '#db2777' },
  { id: 'demonstracao_argumento', group: 'leitura', label: 'Demonstração / argumento', short: 'Argumento', icon: '🧠', hex: '#7c3aed' },
  { id: 'teoria_metodo_empiria', group: 'leitura', label: 'Teoria–método–empiria', short: 'Teoria/mét.', icon: '⚗️', hex: '#059669' },
  { id: 'repertorio_dificuldade', group: 'leitura', label: 'Repertório / dificuldade', short: 'Dificuldade', icon: '⚠️', hex: '#e11d48' },
  { id: 'uso_futuro', group: 'leitura', label: 'Uso futuro', short: 'Uso futuro', icon: '📌', hex: '#ea580c' },
  { id: 'conexoes_autorais', group: 'leitura', label: 'Conexões autorais', short: 'Conexão', icon: '🔗', hex: '#2563eb' },

  // --- Estrutura do artigo -------------------------------------------------
  {
    id: 'tema_central',
    group: 'estrutura',
    label: 'Tema central da pesquisa',
    short: 'Tema central',
    icon: '📢',
    hex: '#4338ca',
    desc: 'Apresentação do tema central da pesquisa.',
  },
  {
    id: 'relevancia_social',
    group: 'estrutura',
    label: 'Relevância social',
    short: 'Relevância social',
    icon: '📊',
    hex: '#0d9488',
    desc: 'Relevância no contexto social: interesse da sociedade, tema em crescimento, dados e estatísticas atuais que demonstrem a importância.',
  },
  {
    id: 'contexto_teorico',
    group: 'estrutura',
    label: 'Contexto teórico/acadêmico',
    short: 'Contexto teórico',
    icon: '📚',
    hex: '#7e22ce',
    desc: 'Como autores e pesquisas anteriores trataram a questão no turismo — inclusive no Brasil —, com referências relevantes.',
  },
  {
    id: 'lacuna_pesquisa',
    group: 'estrutura',
    label: 'Lacuna de pesquisa',
    short: 'Lacuna',
    icon: '🕳️',
    hex: '#be123c',
    desc: 'Lacuna de pesquisa que o trabalho busca preencher.',
  },
  {
    id: 'objetivo',
    group: 'estrutura',
    label: 'Objetivo central',
    short: 'Objetivo',
    icon: '🎯',
    hex: '#047857',
    desc: 'Objetivo central do trabalho: o que se pretende alcançar com o estudo.',
  },
  {
    id: 'metodologia',
    group: 'estrutura',
    label: 'Metodologia',
    short: 'Metodologia',
    icon: '🧪',
    hex: '#b45309',
    desc: 'Metodologia adotada.',
  },
  {
    id: 'contribuicoes',
    group: 'estrutura',
    label: 'Contribuições',
    short: 'Contribuições',
    icon: '🎓',
    hex: '#1d4ed8',
    desc: 'Contribuições para o conhecimento na área do turismo/hotelaria.',
  },
]

export function stampOf(id) {
  return STAMPS.find((s) => s.id === id) || null
}

/** Stamps belonging to a group id, in declared order. */
export function stampsInGroup(groupId) {
  return STAMPS.filter((s) => s.group === groupId)
}
