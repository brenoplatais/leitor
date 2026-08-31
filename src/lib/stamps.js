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
  { id: 'referencial', label: 'Referencial teórico' },
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

  // --- Referencial teórico (análise da revisão de literatura) --------------
  {
    id: 'rt_conceito',
    group: 'referencial',
    label: 'Conceito / definição',
    short: 'Conceito',
    icon: '📐',
    hex: '#4338ca',
    desc: 'Conceito central e como é definido/organizado. A escolha faz sentido para o tema e os objetivos?',
  },
  {
    id: 'rt_referencia',
    group: 'referencial',
    label: 'Referência-chave',
    short: 'Referência',
    icon: '📎',
    hex: '#2563eb',
    desc: 'Estudo/autor mobilizado. É nacional ou internacional? O que ele acrescenta à construção do estudo?',
  },
  {
    id: 'rt_articula',
    group: 'referencial',
    label: 'Articula (constrói argumento)',
    short: 'Articula',
    icon: '🪢',
    hex: '#059669',
    desc: 'Relaciona diferentes trabalhos/resultados e constrói um argumento — não apenas descreve.',
  },
  {
    id: 'rt_descreve',
    group: 'referencial',
    label: 'Só descreve',
    short: 'Só descreve',
    icon: '📋',
    hex: '#6b7280',
    desc: 'Apenas descreve o que outros pesquisadores fizeram, sem articular um argumento.',
  },
  {
    id: 'rt_tensao',
    group: 'referencial',
    label: 'Convergência / divergência / limitação',
    short: 'Converg./diverg.',
    icon: '⚖️',
    hex: '#b45309',
    desc: 'Identifica convergências, divergências, limitações ou questões ainda não resolvidas entre trabalhos.',
  },
  {
    id: 'rt_hipotese',
    group: 'referencial',
    label: 'Hipótese / proposição',
    short: 'Hipótese',
    icon: '💡',
    hex: '#d97706',
    desc: 'Hipótese ou proposição que decorre logicamente da revisão construída.',
  },
  {
    id: 'rt_lacuna_lit',
    group: 'referencial',
    label: 'Lacuna (da literatura)',
    short: 'Lacuna (lit.)',
    icon: '🚩',
    hex: '#be123c',
    desc: 'A lacuna de pesquisa é construída a partir da literatura apresentada?',
  },
  {
    id: 'rt_conexao_obj',
    group: 'referencial',
    label: 'Conexão → objetivo',
    short: '→ objetivo',
    icon: '🧭',
    hex: '#0891b2',
    desc: 'Conexão clara entre o referencial construído, o tema e os objetivos da pesquisa.',
  },
]

export function stampOf(id) {
  return STAMPS.find((s) => s.id === id) || null
}

/** Stamps belonging to a group id, in declared order. */
export function stampsInGroup(groupId) {
  return STAMPS.filter((s) => s.group === groupId)
}
