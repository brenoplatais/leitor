// Refinement model for annotations: a structured critique workflow built on
// three tabs — classify the critique type, run the 6-move protocol, and answer
// 8 control questions. All copy lives here so components stay presentational.

/** 7 kinds of critique the reader can classify an annotation as. */
export const CRITIQUE_TYPES = [
  {
    id: 'internal',
    name: 'Crítica Interna',
    question: 'A conclusão decorre das premissas do próprio autor?',
    icon: '⚙️',
    description: 'Avalia coerência lógica dentro do quadro teórico do autor',
  },
  {
    id: 'empirical',
    name: 'Crítica Empírica',
    question: 'Existem casos relevantes que contradizem ou limitam a afirmação?',
    icon: '🔬',
    description: 'Busca contraexemplos ou evidências que refutam',
  },
  {
    id: 'scope',
    name: 'Crítica de Escopo',
    question: 'O autor generaliza além do que suas evidências permitem?',
    icon: '📏',
    description: 'Identifica quando a conclusão ultrapassa as evidências',
  },
  {
    id: 'conceptual',
    name: 'Crítica Conceitual',
    question: 'O termo é definido com precisão e usado consistentemente?',
    icon: '📖',
    description: 'Problematiza definições e usos de conceitos',
  },
  {
    id: 'political',
    name: 'Crítica Política/Genealógica',
    question: 'Que interesses, instituições ou relações de poder sustentam essa definição?',
    icon: '⚡',
    description: 'Questiona premissas políticas ou históricas',
  },
  {
    id: 'paradigmatic',
    name: 'Crítica Paradigmática',
    question: 'Outra tradição teórica concebe o problema de modo diferente?',
    icon: '🔄',
    description: 'Oferece perspectiva alternativa de outro paradigma',
  },
  {
    id: 'extension',
    name: 'Extensão Produtiva',
    question: 'A passagem permite pensar outro fenômeno que o autor não desenvolve?',
    icon: '💡',
    description: 'Não é crítica, mas potencial de desenvolvimento',
  },
]

/** The 6 moves of the critique protocol. Fields feed `refinement.protocol`. */
export const PROTOCOL_STEPS = [
  {
    id: 1,
    title: 'Reconstrua a Afirmação',
    instruction: 'Escreva o argumento do autor em uma frase que ele provavelmente aceitaria.',
    fieldType: 'textarea',
    fieldName: 'reconstruction',
    placeholder: 'O autor sustenta que X, porque Y, dentro do quadro teórico Z.',
    example:
      'O autor sustenta que turismo requer infraestrutura empresarial (hospedagem, restaurantes, atrativos), porque concebe sistema de objetos e ações integrados.',
    hint: 'Sem reconstruir o argumento, sua crítica pode atacar um espantalho. Preencha.',
    required: true,
  },
  {
    id: 2,
    title: 'Reconheça a Função da Passagem',
    instruction: 'Qual é a pretensão dessa passagem? O que ela tenta fazer?',
    fieldType: 'select',
    fieldName: 'function',
    options: [
      { value: 'define', label: 'Definir operacionalmente' },
      { value: 'explain', label: 'Explicar causalmente' },
      { value: 'category', label: 'Propor uma categoria analítica' },
      { value: 'describe', label: 'Descrever um caso' },
      { value: 'ontology', label: 'Estabelecer uma ontologia' },
      { value: 'hypothesis', label: 'Apenas abrir uma hipótese' },
    ],
    hint: 'Uma definição pode funcionar estatisticamente e ser insuficiente ontologicamente.',
    required: true,
  },
  {
    id: 3,
    title: 'Nomeie Precisamente o Problema',
    instruction: "Evite 'é reducionista' isoladamente. Especifique:",
    fieldType: 'textarea',
    fieldName: 'problem',
    checklist: [
      'redução de quê?',
      'exclusão de quais sujeitos ou práticas?',
      'generalização baseada em quais casos?',
      'salto entre quais premissas?',
      'mudança de sentido de qual conceito?',
    ],
    example:
      'Generaliza a infraestrutura empresarial (hospedagem, restaurantes, atrativos) como necessária, excluindo práticas como visitas a parentes, hospedagem solidária, peregrinações.',
    hint: 'Quanto mais específico, mais irrefutável sua crítica.',
    required: true,
  },
  {
    id: 4,
    title: 'Apresente o Fundamento',
    instruction: 'Sua objeção precisa de pelo menos um apoio.',
    fieldType: 'select+textarea',
    fieldName: 'foundation',
    detailFieldName: 'foundationDetail',
    options: [
      { value: 'counterexample', label: 'Contraexemplo' },
      { value: 'empirical', label: 'Evidência empírica' },
      { value: 'logical', label: 'Inconsistência lógica' },
      { value: 'comparison', label: 'Comparação conceitual' },
      { value: 'alternative_author', label: 'Autor alternativo' },
      { value: 'consequence', label: 'Consequência problemática' },
    ],
    example:
      'Visitas a parentes, hospedagem solidária, peregrinações, excursões autogestionadas são práticas turísticas sem infraestrutura empresarial necessária.',
    hint: 'Sem fundamento, é apenas opinião. Com ele, é argumentação.',
    required: true,
  },
  {
    id: 5,
    title: 'Delimite o Alcance',
    instruction: 'Sua objeção...',
    fieldType: 'radio',
    fieldName: 'scope',
    options: [
      {
        value: 'derruba',
        label: 'DERRUBA o argumento inteiro',
        explanation: 'Sua objeção demonstra que a tese do autor é falsa',
      },
      {
        value: 'restringe',
        label: 'RESTRINGE seu alcance',
        explanation: 'A tese é verdadeira, mas só para casos/contextos específicos',
      },
      {
        value: 'mostra_ausencia',
        label: 'MOSTRA uma dimensão ausente',
        explanation: 'O autor não discutiu algo importante, mas isso não torna sua tese errada',
      },
    ],
    hint: 'Essa é uma das operações mais importantes. Escolha uma.',
    required: true,
  },
  {
    id: 6,
    title: 'Ofereça Formulação Melhor',
    instruction: 'A crítica amadurece quando mostra como corrigir.',
    fieldType: 'textarea',
    fieldName: 'alternative',
    suggestions: [
      'A formulação seria defensável se fosse limitada a…',
      'Seria necessário distinguir…',
      'Uma alternativa seria articular X e Y…',
      'O argumento ganha força se incluir…',
    ],
    example:
      'Seria necessário ampliar os agentes (não só empresas), objetos (não só infraestrutura formal) e arranjos (não só integrados).',
    hint: 'Sem alternativa, você apenas nega. Com ela, você constrói.',
    required: false,
  },
]

/**
 * 8 control questions. Answers are 'sim' | 'não' | 'incerto'. Each is phrased as
 * an unambiguous proposition where **"sim" is always the healthy answer** — so
 * counting "sim" measures resolved controls, and "não"/"incerto" are pending
 * alerts. (An earlier version summed "sim" over questions whose healthy answer
 * was actually "não", which made the number meaningless.)
 */
export const CONTROL_QUESTIONS = [
  {
    id: 'q1',
    text: 'Minha crítica se dirige a algo efetivamente afirmado pelo autor (e não a algo que eu gostaria que ele tivesse discutido)?',
    feedbackNo:
      "Se ataca uma ausência, não uma contradição, revise a Etapa 5: talvez seja 'mostra dimensão ausente' em vez de 'derruba'.",
    feedbackUncertain:
      'Releia sua crítica. A diferença entre refutar e ampliar é crucial para uma crítica justa.',
  },
  {
    id: 'q2',
    text: 'Reconstruí a versão mais forte do argumento antes de criticá-lo (Etapa 1)?',
    feedbackNo:
      'Se não consegue reconstruir de forma que o autor aceitasse, sua crítica ainda está vulnerável. Retorne à Etapa 1.',
    feedbackUncertain:
      'Verifique se sua Reconstrução é realmente o que o texto diz, não uma versão enfraquecida.',
  },
  {
    id: 'q3',
    text: 'Identifiquei se minha objeção é interna ao quadro do autor ou vem de outro paradigma?',
    feedbackNo:
      "Identifique isso: se vem de outro paradigma, pode estar comparando maçã com laranja — 'Crítica Paradigmática' seria mais apropriado?",
    feedbackUncertain:
      'Decida: está testando a lógica interna do autor ou propondo um quadro alternativo?',
  },
  {
    id: 'q4',
    text: 'Se usei um contraexemplo, delimitei se ele refuta a tese ou apenas restringe seu alcance?',
    feedbackNo:
      "Contraexemplos geralmente restringem, não refutam. Revise a Etapa 5: 'restringe' em vez de 'derruba'?",
    feedbackUncertain:
      "Teste: se o autor dissesse 'minha tese é válida para este escopo específico', seu contraexemplo desapareceria?",
  },
  {
    id: 'q5',
    text: 'Distingui claramente a ausência de uma dimensão da falsidade do argumento?',
    feedbackNo:
      'O autor não discutir algo ≠ o autor estar errado sobre o que disse. São críticas diferentes.',
    feedbackUncertain:
      'Etapa 6: sua alternativa adiciona uma perspectiva ou refuta a anterior?',
  },
  {
    id: 'q6',
    text: "Evitei usar 'complexidade' como palavra de autoridade, nomeando relações concretas?",
    feedbackNo:
      "Evite 'é reducionista' sem especificar qual complexidade. Revise a Etapa 3.",
    feedbackUncertain:
      "Reescreva sua crítica sem usar 'complexidade'. Se desaparecer, estava funcionando como autoridade vazia.",
  },
  {
    id: 'q7',
    text: 'Consigo dizer o que precisaria mudar para a afirmação tornar-se defensável (Etapa 6)?',
    feedbackNo:
      'A Etapa 6 (Alternativa) é exatamente isso. Se não consegue, sua objeção está incompleta.',
    feedbackUncertain:
      "Tente completar: 'A afirmação seria defensável se [preenchimento aqui]'.",
  },
  {
    id: 'q8',
    text: 'Evitei substituir a demonstração por um juízo sobre o autor?',
    feedbackNo:
      'Releia: está argumentando ou apenas desaprovando? Remova adjetivos sobre o autor, mantenha a lógica.',
    feedbackUncertain:
      'Teste: sua objeção permaneceria válida se o autor fosse alguém que você admira?',
  },
]

/** Total number of control questions. */
export const CONTROL_TOTAL = CONTROL_QUESTIONS.length

export function critiqueTypeOf(id) {
  return CRITIQUE_TYPES.find((t) => t.id === id) || null
}

/** An empty protocol object with every field present. */
export function emptyProtocol() {
  return {
    reconstruction: '',
    function: '',
    problem: '',
    foundation: '',
    foundationDetail: '',
    scope: '',
    alternative: '',
  }
}

/** An empty controlQuestions map (q1..qN → ''). */
export function emptyControlQuestions() {
  return CONTROL_QUESTIONS.reduce((acc, q) => {
    acc[q.id] = ''
    return acc
  }, {})
}

/** A blank refinement, used when opening the modal for an unrefined annotation. */
export function emptyRefinement() {
  return {
    type: null,
    protocol: emptyProtocol(),
    controlQuestions: emptyControlQuestions(),
    score: 0,
    lastRefined: null,
  }
}

/**
 * Resolved controls = questions answered 'sim'. Now that every question is
 * phrased so 'sim' is the healthy answer, this count is meaningful (it was not
 * before). Ranges 0..CONTROL_TOTAL. Kept as `computeScore` for compatibility
 * with the stored `refinement.score` field.
 */
export function computeScore(controlQuestions) {
  if (!controlQuestions) return 0
  return CONTROL_QUESTIONS.reduce(
    (sum, q) => sum + (controlQuestions[q.id] === 'sim' ? 1 : 0),
    0,
  )
}

/**
 * Controls summary: `resolved` = 'sim'; `pending` = 'não'/'incerto' (alerts to
 * address); `answered` = any non-empty answer.
 */
export function computeControls(controlQuestions) {
  const cq = controlQuestions || {}
  let resolved = 0
  let pending = 0
  let answered = 0
  for (const q of CONTROL_QUESTIONS) {
    const a = cq[q.id]
    if (!a) continue
    answered += 1
    if (a === 'sim') resolved += 1
    else pending += 1
  }
  return { resolved, pending, answered }
}

/** Whether a required protocol step is satisfied for the given protocol draft. */
export function isStepComplete(step, protocol) {
  if (!protocol) return false
  if (step.fieldType === 'select+textarea') {
    // The chosen support type is what makes the move present; detail is optional.
    return !!protocol[step.fieldName]
  }
  return !!(protocol[step.fieldName] && String(protocol[step.fieldName]).trim())
}

/** True once every required protocol step has content. */
export function isProtocolComplete(protocol) {
  return PROTOCOL_STEPS.filter((s) => s.required).every((s) => isStepComplete(s, protocol))
}

/**
 * True when the refinement holds enough to be worth saving: a critique type OR
 * any protocol content OR any answered control question.
 */
export function hasRefinementContent(refinement) {
  if (!refinement) return false
  if (refinement.type) return true
  const p = refinement.protocol || {}
  if (Object.values(p).some((v) => v && String(v).trim())) return true
  const c = refinement.controlQuestions || {}
  if (Object.values(c).some((v) => v && String(v).trim())) return true
  return false
}
