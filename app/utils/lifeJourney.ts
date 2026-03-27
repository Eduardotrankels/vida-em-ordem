import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppLanguage, DEFAULT_APP_LANGUAGE } from "./i18n";

export const AI_ONBOARDING_KEY = "@vida_em_ordem_ai_onboarding_v1";
export const AI_PLAN_KEY = "@vida_em_ordem_ai_plan_v1";
export const AI_JOURNEY_PROGRESS_KEY = "@vida_em_ordem_ai_journey_progress_v1";
export const AI_EXPERIENCE_FEEDBACK_KEY =
  "@vida_em_ordem_ai_experience_feedback_v1";

const HABITS_KEY = "@vida_em_ordem_habitos_v1";
const MONEY_ENTRIES_KEY = "@vida_em_ordem_money_entries_v1";
const MONEY_FIXED_BILLS_KEY = "@vida_em_ordem_money_fixed_bills_v2";
const GOALS_KEY = "@vida_em_ordem_goals_v1";
const LEARNING_KEY = "@vida_em_ordem_aprendizado_v1";
const TIME_KEY = "@vida_em_ordem_tempo_v1";
const WORK_KEY = "@vida_em_ordem_trabalho_v1";
const LEISURE_KEY = "@vida_em_ordem_lazer_v1";
const SPIRITUAL_KEY = "@vida_em_ordem_spiritual_v1";
const MEDICATIONS_KEY = "@vida_em_ordem_health_medications_v1";
const CHECKIN_KEY = "vidaemordem_checkins_v1";

export type LifeArea =
  | "financeiro"
  | "saude"
  | "tempo"
  | "trabalho"
  | "aprendizado"
  | "habitos"
  | "lazer"
  | "espiritualidade";

export type JourneyStyle = "facil" | "urgente";

export type LifeJourneyAnswers = {
  financeiro: number;
  saude: number;
  tempo: number;
  trabalho: number;
  aprendizado: number;
  habitos: number;
  lazer: number;
  espiritualidade: number;
  concernArea: LifeArea;
  reliefArea: LifeArea;
  startStyle: JourneyStyle;
  createdAt: string;
};

export type LifeJourneyPlan = {
  primaryArea: LifeArea;
  secondaryArea: LifeArea;
  summaryTitle: string;
  summaryText: string;
  weeklyGoal: string;
  journeyDays: AIJourneyDay[];
  weeklyPlan: {
    day: number;
    title: string;
    action: string;
  }[];
  firstSteps: string[];
  recommendedRoute:
    | "/dinheiro"
    | "/saude"
    | "/tempo"
    | "/trabalho"
    | "/aprendizado"
    | "/habitos"
    | "/lazer"
    | "/espiritualidade";
  createdAt: string;
};

export type JourneyTaskValidationType =
  | "money_entries_total"
  | "money_entries_today"
  | "fixed_bills_total"
  | "goals_total"
  | "goals_today"
  | "learning_items_total"
  | "learning_today"
  | "time_items_total"
  | "time_today"
  | "work_items_total"
  | "work_today"
  | "leisure_items_total"
  | "leisure_today"
  | "spiritual_items_total"
  | "spiritual_today"
  | "habits_total"
  | "habits_completed_today"
  | "medications_total"
  | "medications_taken_today"
  | "checkin_today";

export type AIJourneyTask = {
  id: string;
  title: string;
  validationType: JourneyTaskValidationType;
  targetValue: number;
  currentValue: number;
  completed: boolean;
};

export type AIJourneyDay = {
  day: number;
  title: string;
  summary: string;
  rewardXp: number;
  tasks: AIJourneyTask[];
};

export type AIExperienceEntry = {
  id: string;
  createdAt: string;
  rating: number;
  note: string;
  day: number;
  primaryArea: LifeArea;
};

export type AIJourneyProgress = {
  currentDay: number;
  unlockedDays: number[];
  completedDays: number[];
  totalXp: number;
  startedAt: string;
  lastCompletedAt?: string;
  nextDayUnlockAt?: string;
  analysisStatus?: "idle" | "processing" | "ready";
  analysisStartedAt?: string;
  analysisCompletedAt?: string;
  pendingFeedbackTitle?: string;
  pendingFeedbackText?: string;
  latestFeedbackTitle?: string;
  latestFeedbackText?: string;
  lastAnalyzedDay?: number;
  finishedAt?: string;
};

export const LIFE_AREA_META: Record<
  LifeArea,
  {
    label: string;
    icon:
      | "wallet-outline"
      | "medical-outline"
      | "hourglass-outline"
      | "briefcase-outline"
      | "school-outline"
      | "checkmark-circle-outline"
      | "game-controller-outline"
      | "sparkles-outline";
    route: LifeJourneyPlan["recommendedRoute"];
    easyBoost: number;
    impactBoost: number;
  }
> = {
  financeiro: {
    label: "Financeiro",
    icon: "wallet-outline",
    route: "/dinheiro",
    easyBoost: 0.3,
    impactBoost: 1.2,
  },
  saude: {
    label: "Saúde",
    icon: "medical-outline",
    route: "/saude",
    easyBoost: 0.8,
    impactBoost: 1.15,
  },
  tempo: {
    label: "Tempo",
    icon: "hourglass-outline",
    route: "/tempo",
    easyBoost: 0.9,
    impactBoost: 1.3,
  },
  trabalho: {
    label: "Trabalho",
    icon: "briefcase-outline",
    route: "/trabalho",
    easyBoost: 0.4,
    impactBoost: 1.0,
  },
  aprendizado: {
    label: "Aprendizado",
    icon: "school-outline",
    route: "/aprendizado",
    easyBoost: 0.85,
    impactBoost: 0.95,
  },
  habitos: {
    label: "Hábitos",
    icon: "checkmark-circle-outline",
    route: "/habitos",
    easyBoost: 1.1,
    impactBoost: 1.1,
  },
  lazer: {
    label: "Lazer",
    icon: "game-controller-outline",
    route: "/lazer",
    easyBoost: 1.0,
    impactBoost: 0.75,
  },
  espiritualidade: {
    label: "Espiritualidade",
    icon: "sparkles-outline",
    route: "/espiritualidade",
    easyBoost: 0.95,
    impactBoost: 0.9,
  },
};

const LIFE_AREA_LABELS: Record<AppLanguage, Record<LifeArea, string>> = {
  pt: {
    financeiro: "Financeiro",
    saude: "Saúde",
    tempo: "Tempo",
    trabalho: "Trabalho",
    aprendizado: "Aprendizado",
    habitos: "Hábitos",
    lazer: "Lazer",
    espiritualidade: "Espiritualidade",
  },
  en: {
    financeiro: "Finances",
    saude: "Health",
    tempo: "Time",
    trabalho: "Work",
    aprendizado: "Learning",
    habitos: "Habits",
    lazer: "Leisure",
    espiritualidade: "Spirituality",
  },
  es: {
    financeiro: "Finanzas",
    saude: "Salud",
    tempo: "Tiempo",
    trabalho: "Trabajo",
    aprendizado: "Aprendizaje",
    habitos: "Hábitos",
    lazer: "Ocio",
    espiritualidade: "Espiritualidad",
  },
  fr: {
    financeiro: "Finances",
    saude: "Santé",
    tempo: "Temps",
    trabalho: "Travail",
    aprendizado: "Apprentissage",
    habitos: "Habitudes",
    lazer: "Loisirs",
    espiritualidade: "Spiritualité",
  },
  it: {
    financeiro: "Finanze",
    saude: "Salute",
    tempo: "Tempo",
    trabalho: "Lavoro",
    aprendizado: "Apprendimento",
    habitos: "Abitudini",
    lazer: "Svago",
    espiritualidade: "Spiritualità",
  },
};

const LANGUAGE_LOCALE: Record<AppLanguage, string> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  it: "it-IT",
};

export function getLifeAreaLabel(
  area: LifeArea,
  language: AppLanguage = DEFAULT_APP_LANGUAGE
) {
  return LIFE_AREA_LABELS[language][area];
}

export function getLifeAreaMeta(language: AppLanguage = DEFAULT_APP_LANGUAGE) {
  return (Object.keys(LIFE_AREA_META) as LifeArea[]).reduce((acc, area) => {
    acc[area] = {
      ...LIFE_AREA_META[area],
      label: getLifeAreaLabel(area, language),
    };
    return acc;
  }, {} as typeof LIFE_AREA_META);
}

function getLowerAreaLabel(
  area: LifeArea,
  language: AppLanguage = DEFAULT_APP_LANGUAGE
) {
  return getLifeAreaLabel(area, language).toLocaleLowerCase(
    LANGUAGE_LOCALE[language]
  );
}

type JourneyTaskTemplate = {
  title: string;
  validationType: JourneyTaskValidationType;
  targetValue: number;
};

const AREA_STEPS: Record<LifeArea, string[]> = {
  financeiro: [
    "Registrar entradas e saídas desta semana para tirar o dinheiro da névoa.",
    "Listar contas fixas e identificar vencimentos próximos para montar a base do mês.",
    "Transformar essa clareza em meta, hábito e organização de rotina para o dinheiro não depender só de esforço.",
  ],
  saude: [
    "Definir uma rotina mínima de cuidado para hoje.",
    "Organizar medicação, água ou descanso essencial.",
    "Criar um hábito simples que preserve sua energia.",
  ],
  tempo: [
    "Mapear o que mais consome seu dia hoje.",
    "Escolher só 3 prioridades reais para a semana.",
    "Criar blocos curtos de foco e descanso.",
  ],
  trabalho: [
    "Definir o ponto profissional que mais trava você agora.",
    "Escolher uma entrega-chave para esta semana.",
    "Organizar tarefas por impacto, não por urgência aparente.",
  ],
  aprendizado: [
    "Escolher um tema ou habilidade que faria diferença agora.",
    "Reservar um bloco curto e realista para estudar sem peso.",
    "Registrar o que foi aprendido para transformar estudo em avanço.",
  ],
  habitos: [
    "Começar por um hábito pequeno e muito viável.",
    "Escolher um gatilho fixo do dia para repetir.",
    "Marcar consistência antes de buscar intensidade.",
  ],
  lazer: [
    "Reservar um momento real de descanso nesta semana.",
    "Identificar o que recarrega sua energia de verdade.",
    "Proteger esse tempo como parte da sua organização.",
  ],
  espiritualidade: [
    "Criar um momento de silêncio, reflexão ou oração.",
    "Reduzir ruído mental por alguns minutos ao dia.",
    "Escolher uma prática simples para manter presença.",
  ],
};

const AREA_WEEKLY_GOAL: Record<LifeArea, string> = {
  financeiro: "Ganhar clareza financeira nos próximos 7 dias.",
  saude: "Recuperar energia e estabilidade física nesta semana.",
  tempo: "Voltar a sentir controle sobre sua rotina nos próximos dias.",
  trabalho: "Restabelecer direção e tração profissional nesta semana.",
  aprendizado: "Criar ritmo de aprendizado com evolução real nesta semana.",
  habitos: "Construir consistência real com pequenas vitórias diárias.",
  lazer: "Reintroduzir descanso de forma consciente na sua semana.",
  espiritualidade: "Criar mais presença e equilíbrio interior nesta semana.",
};

const AREA_WEEKLY_PLAN: Record<
  LifeArea,
  {
    title: string;
    action: string;
  }[]
> = {
  financeiro: [
    {
      title: "Raio-x da realidade",
      action: "Cadastre sua primeira conta fixa e registre as primeiras entradas e saídas reais do mês.",
    },
    {
      title: "Dinheiro com direção",
      action: "Depois da clareza inicial, vá ao módulo Metas e defina uma meta que dê rumo ao seu dinheiro.",
    },
    {
      title: "Hábitos que protegem",
      action: "Passe por Hábitos e Aprendizado para criar disciplina e repertório antes de mexer mais no financeiro.",
    },
    {
      title: "Tempo e trabalho alinhados",
      action: "Use Tempo e Trabalho para organizar rotina e avanço profissional, porque renda e execução também estabilizam o dinheiro.",
    },
    {
      title: "Respiro e percepção",
      action: "Passe por Lazer e Check-in para reduzir impulsos, sobrecarga e decisões financeiras tomadas no automático.",
    },
    {
      title: "Centro e estrutura",
      action: "Volte ao Dinheiro depois de fortalecer Espiritualidade e revisar suas contas fixas com mais presença.",
    },
    {
      title: "Vida financeira integrada",
      action: "Feche a semana revisando o dinheiro junto com hábitos, metas e rotina para decidir o próximo ajuste com mais maturidade.",
    },
  ],
  saude: [
    {
      title: "Base do cuidado",
      action: "Escolha um cuidado mínimo para hoje: água, sono, remédio ou pausa.",
    },
    {
      title: "Energia real",
      action: "Observe o que mais drena sua energia nesta rotina.",
    },
    {
      title: "Corpo em escuta",
      action: "Identifique um sinal do corpo que você vinha ignorando.",
    },
    {
      title: "Ritmo sustentável",
      action: "Monte uma rotina de cuidado que caiba na vida real.",
    },
    {
      title: "Microação saudável",
      action: "Crie um pequeno hábito de saúde para repetir hoje.",
    },
    {
      title: "Proteção de energia",
      action: "Reduza um excesso que está te desgastando.",
    },
    {
      title: "Nova base",
      action: "Revise a semana e defina qual cuidado deve permanecer.",
    },
  ],
  tempo: [
    {
      title: "Foto da rotina",
      action: "Observe como seu tempo foi usado nas últimas 24 horas.",
    },
    {
      title: "3 prioridades",
      action: "Escolha só três prioridades reais para esta semana.",
    },
    {
      title: "Corte de ruído",
      action: "Reduza uma distração que está roubando sua energia.",
    },
    {
      title: "Blocos de foco",
      action: "Crie um bloco curto de foco para uma tarefa importante.",
    },
    {
      title: "Espaço de respiro",
      action: "Proteja um pequeno momento de pausa no seu dia.",
    },
    {
      title: "Agenda intencional",
      action: "Organize amanhã com mais intenção do que urgência.",
    },
    {
      title: "Controle recuperado",
      action: "Revise o que devolveu mais controle à sua rotina.",
    },
  ],
  trabalho: [
    {
      title: "Ponto de travamento",
      action: "Defina o que mais está emperrando sua vida profissional.",
    },
    {
      title: "Entrega principal",
      action: "Escolha uma entrega que mereça foco nesta semana.",
    },
    {
      title: "Organização de tarefas",
      action: "Separe tarefas importantes das tarefas só urgentes.",
    },
    {
      title: "Movimento concreto",
      action: "Avance um passo real na sua prioridade profissional.",
    },
    {
      title: "Visão de progresso",
      action: "Registre o que você já destravou até aqui.",
    },
    {
      title: "Ritmo mais estável",
      action: "Monte um próximo bloco de trabalho mais sustentável.",
    },
    {
      title: "Direção renovada",
      action: "Feche a semana com clareza do próximo avanço.",
    },
  ],
  aprendizado: [
    {
      title: "Prioridade de aprendizado",
      action: "Defina o tema ou habilidade que mais faz sentido aprender agora.",
    },
    {
      title: "Bloco possível",
      action: "Reserve um bloco curto e realista de estudo para esta semana.",
    },
    {
      title: "Primeira sessão",
      action: "Faça uma sessão curta de leitura, estudo ou prática.",
    },
    {
      title: "Aprender fazendo",
      action: "Transforme o que estudou em nota, resumo ou pequena aplicação.",
    },
    {
      title: "Continuidade",
      action: "Repita o estudo em um ritmo leve, sem tentar compensar tudo de uma vez.",
    },
    {
      title: "Revisão rápida",
      action: "Revise o que você já absorveu e o que ainda precisa de atenção.",
    },
    {
      title: "Base criada",
      action: "Feche a semana definindo o próximo pequeno passo do seu aprendizado.",
    },
  ],
  habitos: [
    {
      title: "Hábito mínimo",
      action: "Escolha um hábito pequeno e impossível de ignorar.",
    },
    {
      title: "Gatilho certo",
      action: "Defina em que momento do dia esse hábito vai acontecer.",
    },
    {
      title: "Repetição simples",
      action: "Repita o hábito sem buscar perfeição.",
    },
    {
      title: "Ambiente favorável",
      action: "Ajuste o ambiente para facilitar a execução.",
    },
    {
      title: "Consistência acima de intensidade",
      action: "Mantenha o hábito mesmo que em versão pequena.",
    },
    {
      title: "Sequência viva",
      action: "Proteja sua sequência com uma ação rápida.",
    },
    {
      title: "Identidade nova",
      action: "Olhe a semana e reconheça o padrão que está nascendo.",
    },
  ],
  lazer: [
    {
      title: "Respirar de novo",
      action: "Abra espaço para um momento real de descanso hoje.",
    },
    {
      title: "Fonte de leveza",
      action: "Identifique algo que recarrega você de verdade.",
    },
    {
      title: "Descanso sem culpa",
      action: "Permita um tempo de lazer sem tratá-lo como prêmio.",
    },
    {
      title: "Redução da sobrecarga",
      action: "Tire uma obrigação desnecessária da semana.",
    },
    {
      title: "Prazer simples",
      action: "Escolha uma atividade leve que caiba no seu dia.",
    },
    {
      title: "Energia renovada",
      action: "Observe o que te devolveu presença e bem-estar.",
    },
    {
      title: "Semana mais humana",
      action: "Defina como o descanso vai continuar presente.",
    },
  ],
  espiritualidade: [
    {
      title: "Silêncio inicial",
      action: "Reserve alguns minutos para silêncio, oração ou reflexão.",
    },
    {
      title: "Presença",
      action: "Reduza estímulos por um momento e volte para si.",
    },
    {
      title: "Escuta interna",
      action: "Observe o que sua mente e seu coração estão pedindo.",
    },
    {
      title: "Prática simples",
      action: "Defina um ritual pequeno que você consegue sustentar.",
    },
    {
      title: "Centro no caos",
      action: "Use essa prática em um momento difícil do dia.",
    },
    {
      title: "Sentido",
      action: "Repare no que te deu mais paz ou clareza nesta semana.",
    },
    {
      title: "Equilíbrio vivo",
      action: "Decida como manter essa conexão nos próximos dias.",
    },
  ],
};

const AREA_JOURNEY_TEMPLATES: Record<
  LifeArea,
  {
    title: string;
    summary: string;
    rewardXp: number;
    tasks: JourneyTaskTemplate[];
  }[]
> = {
  financeiro: [
    {
      title: "Base real do dinheiro",
      summary: "Alimente o app com os dados que a IA precisa para começar a organizar sua vida financeira.",
      rewardXp: 60,
      tasks: [
        {
          title: "Cadastrar 1 conta fixa",
          validationType: "fixed_bills_total",
          targetValue: 1,
        },
        {
          title: "Registrar 2 movimentações",
          validationType: "money_entries_total",
          targetValue: 2,
        },
      ],
    },
    {
      title: "Leitura integrada da sua vida",
      summary: "Depois da base financeira, a IA libera um dia que conecta dinheiro, saúde, rotina, trabalho e crescimento.",
      rewardXp: 90,
      tasks: [
        {
          title: "Ter ao menos 3 movimentações registradas",
          validationType: "money_entries_total",
          targetValue: 3,
        },
        {
          title: "Registrar 1 meta hoje",
          validationType: "goals_today",
          targetValue: 1,
        },
        {
          title: "Cadastrar 1 cuidado de saúde",
          validationType: "medications_total",
          targetValue: 1,
        },
        {
          title: "Organizar o dia no módulo Tempo",
          validationType: "time_today",
          targetValue: 1,
        },
        {
          title: "Organizar o foco no módulo Trabalho",
          validationType: "work_today",
          targetValue: 1,
        },
        {
          title: "Registrar 1 passo de aprendizado hoje",
          validationType: "learning_today",
          targetValue: 1,
        },
        {
          title: "Criar 1 hábito de base",
          validationType: "habits_total",
          targetValue: 1,
        },
        {
          title: "Registrar 1 momento de lazer hoje",
          validationType: "leisure_today",
          targetValue: 1,
        },
        {
          title: "Registrar 1 prática de espiritualidade hoje",
          validationType: "spiritual_today",
          targetValue: 1,
        },
        {
          title: "Fazer o check-in do dia",
          validationType: "checkin_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Ritmo com presença",
      summary: "Agora a organização do dinheiro acontece junto com constância, saúde, trabalho, aprendizado e tempo bem usado.",
      rewardXp: 95,
      tasks: [
        {
          title: "Ter ao menos 4 movimentações registradas",
          validationType: "money_entries_total",
          targetValue: 4,
        },
        {
          title: "Registrar 1 meta hoje",
          validationType: "goals_today",
          targetValue: 1,
        },
        {
          title: "Concluir 1 cuidado de saúde hoje",
          validationType: "medications_taken_today",
          targetValue: 1,
        },
        {
          title: "Passar pelo módulo Tempo hoje",
          validationType: "time_today",
          targetValue: 1,
        },
        {
          title: "Passar pelo módulo Trabalho hoje",
          validationType: "work_today",
          targetValue: 1,
        },
        {
          title: "Passar pelo módulo Aprendizado hoje",
          validationType: "learning_today",
          targetValue: 1,
        },
        {
          title: "Concluir 1 hábito hoje",
          validationType: "habits_completed_today",
          targetValue: 1,
        },
        {
          title: "Registrar 1 momento de lazer hoje",
          validationType: "leisure_today",
          targetValue: 1,
        },
        {
          title: "Registrar 1 prática de espiritualidade hoje",
          validationType: "spiritual_today",
          targetValue: 1,
        },
        {
          title: "Fazer o check-in do dia",
          validationType: "checkin_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Organização que se sustenta",
      summary: "Seu dinheiro começa a estabilizar quando cada área do app devolve mais clareza para o dia.",
      rewardXp: 100,
      tasks: [
        {
          title: "Ter ao menos 5 movimentações registradas",
          validationType: "money_entries_total",
          targetValue: 5,
        },
        {
          title: "Manter 2 contas fixas cadastradas",
          validationType: "fixed_bills_total",
          targetValue: 2,
        },
        {
          title: "Registrar 1 meta hoje",
          validationType: "goals_today",
          targetValue: 1,
        },
        {
          title: "Concluir 1 cuidado de saúde hoje",
          validationType: "medications_taken_today",
          targetValue: 1,
        },
        {
          title: "Passar pelo módulo Tempo hoje",
          validationType: "time_today",
          targetValue: 1,
        },
        {
          title: "Passar pelo módulo Trabalho hoje",
          validationType: "work_today",
          targetValue: 1,
        },
        {
          title: "Passar pelo módulo Aprendizado hoje",
          validationType: "learning_today",
          targetValue: 1,
        },
        {
          title: "Concluir 1 hábito hoje",
          validationType: "habits_completed_today",
          targetValue: 1,
        },
        {
          title: "Registrar 1 momento de lazer hoje",
          validationType: "leisure_today",
          targetValue: 1,
        },
        {
          title: "Registrar 1 prática de espiritualidade hoje",
          validationType: "spiritual_today",
          targetValue: 1,
        },
        {
          title: "Fazer o check-in do dia",
          validationType: "checkin_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Decisões melhores",
      summary: "Com mais dados e rotina, a IA consegue te orientar com mais maturidade e menos achismo.",
      rewardXp: 110,
      tasks: [
        {
          title: "Ter ao menos 6 movimentações registradas",
          validationType: "money_entries_total",
          targetValue: 6,
        },
        {
          title: "Manter 2 contas fixas cadastradas",
          validationType: "fixed_bills_total",
          targetValue: 2,
        },
        {
          title: "Registrar 1 meta hoje",
          validationType: "goals_today",
          targetValue: 1,
        },
        {
          title: "Concluir 1 cuidado de saúde hoje",
          validationType: "medications_taken_today",
          targetValue: 1,
        },
        {
          title: "Passar pelo módulo Tempo hoje",
          validationType: "time_today",
          targetValue: 1,
        },
        {
          title: "Passar pelo módulo Trabalho hoje",
          validationType: "work_today",
          targetValue: 1,
        },
        {
          title: "Passar pelo módulo Aprendizado hoje",
          validationType: "learning_today",
          targetValue: 1,
        },
        {
          title: "Concluir 1 hábito hoje",
          validationType: "habits_completed_today",
          targetValue: 1,
        },
        {
          title: "Registrar 1 momento de lazer hoje",
          validationType: "leisure_today",
          targetValue: 1,
        },
        {
          title: "Registrar 1 prática de espiritualidade hoje",
          validationType: "spiritual_today",
          targetValue: 1,
        },
        {
          title: "Fazer o check-in do dia",
          validationType: "checkin_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Vida em ordem pelo sistema",
      summary: "Feche a primeira semana usando dinheiro, metas, saúde, rotina e crescimento como um mesmo sistema.",
      rewardXp: 130,
      tasks: [
        {
          title: "Ter ao menos 7 movimentações registradas",
          validationType: "money_entries_total",
          targetValue: 7,
        },
        {
          title: "Manter 2 contas fixas cadastradas",
          validationType: "fixed_bills_total",
          targetValue: 2,
        },
        {
          title: "Registrar 1 meta hoje",
          validationType: "goals_today",
          targetValue: 1,
        },
        {
          title: "Concluir 1 cuidado de saúde hoje",
          validationType: "medications_taken_today",
          targetValue: 1,
        },
        {
          title: "Passar pelo módulo Tempo hoje",
          validationType: "time_today",
          targetValue: 1,
        },
        {
          title: "Passar pelo módulo Trabalho hoje",
          validationType: "work_today",
          targetValue: 1,
        },
        {
          title: "Passar pelo módulo Aprendizado hoje",
          validationType: "learning_today",
          targetValue: 1,
        },
        {
          title: "Concluir 1 hábito hoje",
          validationType: "habits_completed_today",
          targetValue: 1,
        },
        {
          title: "Registrar 1 momento de lazer hoje",
          validationType: "leisure_today",
          targetValue: 1,
        },
        {
          title: "Registrar 1 prática de espiritualidade hoje",
          validationType: "spiritual_today",
          targetValue: 1,
        },
        {
          title: "Fazer o check-in do dia",
          validationType: "checkin_today",
          targetValue: 1,
        },
      ],
    },
  ],
  saude: [
    {
      title: "Mapa do cuidado",
      summary: "Defina sua base mínima de cuidado pessoal.",
      rewardXp: 40,
      tasks: [
        {
          title: "Cadastrar 1 cuidado ou medicação",
          validationType: "medications_total",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Cuidado ativo",
      summary: "Comece a executar o que foi organizado.",
      rewardXp: 45,
      tasks: [
        {
          title: "Marcar 1 cuidado concluído hoje",
          validationType: "medications_taken_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Consciência do corpo",
      summary: "Observe como você está se sentindo de verdade.",
      rewardXp: 50,
      tasks: [
        {
          title: "Fazer o check-in do dia",
          validationType: "checkin_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Rotina de energia",
      summary: "Junte cuidado e percepção no mesmo dia.",
      rewardXp: 55,
      tasks: [
        {
          title: "Concluir 1 cuidado hoje",
          validationType: "medications_taken_today",
          targetValue: 1,
        },
        {
          title: "Fazer check-in hoje",
          validationType: "checkin_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Estrutura mínima",
      summary: "Dê mais forma ao seu sistema de saúde.",
      rewardXp: 60,
      tasks: [
        {
          title: "Ter 2 cuidados ou medicações cadastrados",
          validationType: "medications_total",
          targetValue: 2,
        },
      ],
    },
    {
      title: "Saúde em movimento",
      summary: "Sustente a prática em vez da intenção.",
      rewardXp: 65,
      tasks: [
        {
          title: "Concluir 1 cuidado hoje",
          validationType: "medications_taken_today",
          targetValue: 1,
        },
        {
          title: "Fazer check-in hoje",
          validationType: "checkin_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Base viva de cuidado",
      summary: "Feche a semana com uma rotina mínima funcional.",
      rewardXp: 80,
      tasks: [
        {
          title: "Ter 2 cuidados cadastrados",
          validationType: "medications_total",
          targetValue: 2,
        },
        {
          title: "Concluir 1 cuidado hoje",
          validationType: "medications_taken_today",
          targetValue: 1,
        },
      ],
    },
  ],
  tempo: [
    {
      title: "Tomada de consciência",
      summary: "Comece observando como seu dia está de verdade.",
      rewardXp: 40,
      tasks: [
        {
          title: "Fazer o check-in do dia",
          validationType: "checkin_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Rotina mínima",
      summary: "Criar uma pequena estrutura já devolve controle.",
      rewardXp: 45,
      tasks: [
        {
          title: "Criar 1 hábito de organização",
          validationType: "habits_total",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Primeira execução",
      summary: "O tempo começa a mudar quando algo sai do papel.",
      rewardXp: 50,
      tasks: [
        {
          title: "Concluir 1 hábito hoje",
          validationType: "habits_completed_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Mais tração",
      summary: "Agora junte percepção e ação no mesmo dia.",
      rewardXp: 55,
      tasks: [
        {
          title: "Fazer check-in hoje",
          validationType: "checkin_today",
          targetValue: 1,
        },
        {
          title: "Concluir 1 hábito hoje",
          validationType: "habits_completed_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Sistema pessoal",
      summary: "Fortaleça a base da sua rotina com mais estrutura.",
      rewardXp: 60,
      tasks: [
        {
          title: "Ter 2 hábitos cadastrados",
          validationType: "habits_total",
          targetValue: 2,
        },
      ],
    },
    {
      title: "Ritmo estável",
      summary: "Transforme intenção em organização prática.",
      rewardXp: 65,
      tasks: [
        {
          title: "Concluir 2 hábitos hoje",
          validationType: "habits_completed_today",
          targetValue: 2,
        },
      ],
    },
    {
      title: "Semana no controle",
      summary: "Feche a semana com uma rotina mais clara.",
      rewardXp: 80,
      tasks: [
        {
          title: "Fazer check-in hoje",
          validationType: "checkin_today",
          targetValue: 1,
        },
        {
          title: "Concluir 2 hábitos hoje",
          validationType: "habits_completed_today",
          targetValue: 2,
        },
      ],
    },
  ],
  trabalho: [
    {
      title: "Direção profissional",
      summary: "Comece criando uma base de execução.",
      rewardXp: 40,
      tasks: [
        {
          title: "Criar 1 hábito ligado ao trabalho",
          validationType: "habits_total",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Entrar em ação",
      summary: "Um passo feito vale mais do que dez planos.",
      rewardXp: 45,
      tasks: [
        {
          title: "Concluir 1 hábito hoje",
          validationType: "habits_completed_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Leitura do estado atual",
      summary: "Entender energia e foco ajuda a ajustar a rota.",
      rewardXp: 50,
      tasks: [
        {
          title: "Fazer check-in hoje",
          validationType: "checkin_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Ritmo com clareza",
      summary: "Sustente ação e consciência no mesmo dia.",
      rewardXp: 55,
      tasks: [
        {
          title: "Fazer check-in hoje",
          validationType: "checkin_today",
          targetValue: 1,
        },
        {
          title: "Concluir 1 hábito hoje",
          validationType: "habits_completed_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Base de disciplina",
      summary: "Monte um sistema mínimo de avanço profissional.",
      rewardXp: 60,
      tasks: [
        {
          title: "Ter 2 hábitos cadastrados",
          validationType: "habits_total",
          targetValue: 2,
        },
      ],
    },
    {
      title: "Tração crescente",
      summary: "Seu trabalho começa a sair da inércia.",
      rewardXp: 65,
      tasks: [
        {
          title: "Concluir 2 hábitos hoje",
          validationType: "habits_completed_today",
          targetValue: 2,
        },
      ],
    },
    {
      title: "Semana de movimento",
      summary: "Feche a semana com prova real de avanço.",
      rewardXp: 80,
      tasks: [
        {
          title: "Fazer check-in hoje",
          validationType: "checkin_today",
          targetValue: 1,
        },
        {
          title: "Concluir 2 hábitos hoje",
          validationType: "habits_completed_today",
          targetValue: 2,
        },
      ],
    },
  ],
  aprendizado: [
    {
      title: "Escolha com intenção",
      summary: "Defina por onde seu aprendizado realmente deve começar.",
      rewardXp: 40,
      tasks: [
        {
          title: "Criar 1 hábito de aprendizado",
          validationType: "habits_total",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Primeira sessão",
      summary: "Transforme vontade de aprender em prática real.",
      rewardXp: 45,
      tasks: [
        {
          title: "Concluir 1 hábito hoje",
          validationType: "habits_completed_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Leitura do momento",
      summary: "Perceber como você aprende ajuda a sustentar evolução.",
      rewardXp: 50,
      tasks: [
        {
          title: "Fazer check-in hoje",
          validationType: "checkin_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Aprender em ritmo",
      summary: "Junte prática e consciência no mesmo dia.",
      rewardXp: 55,
      tasks: [
        {
          title: "Fazer check-in hoje",
          validationType: "checkin_today",
          targetValue: 1,
        },
        {
          title: "Concluir 1 hábito hoje",
          validationType: "habits_completed_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Base de estudo",
      summary: "Dê mais forma ao seu sistema pessoal de aprendizado.",
      rewardXp: 60,
      tasks: [
        {
          title: "Ter 2 hábitos cadastrados",
          validationType: "habits_total",
          targetValue: 2,
        },
      ],
    },
    {
      title: "Evolução contínua",
      summary: "O aprendizado ganha corpo quando você repete com leveza.",
      rewardXp: 65,
      tasks: [
        {
          title: "Concluir 2 hábitos hoje",
          validationType: "habits_completed_today",
          targetValue: 2,
        },
      ],
    },
    {
      title: "Semana de avanço",
      summary: "Feche a semana com prova concreta de desenvolvimento.",
      rewardXp: 80,
      tasks: [
        {
          title: "Fazer check-in hoje",
          validationType: "checkin_today",
          targetValue: 1,
        },
        {
          title: "Concluir 2 hábitos hoje",
          validationType: "habits_completed_today",
          targetValue: 2,
        },
      ],
    },
  ],
  habitos: [
    {
      title: "Primeira semente",
      summary: "Comece com um hábito simples e possível.",
      rewardXp: 40,
      tasks: [
        {
          title: "Criar 1 hábito",
          validationType: "habits_total",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Primeira execução",
      summary: "Agora faça o hábito sair do papel.",
      rewardXp: 45,
      tasks: [
        {
          title: "Concluir 1 hábito hoje",
          validationType: "habits_completed_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Autoconsciência",
      summary: "Olhar para si ajuda a sustentar consistência.",
      rewardXp: 50,
      tasks: [
        {
          title: "Fazer check-in hoje",
          validationType: "checkin_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Pequena sequência",
      summary: "Junte percepção com prática no mesmo dia.",
      rewardXp: 55,
      tasks: [
        {
          title: "Fazer check-in hoje",
          validationType: "checkin_today",
          targetValue: 1,
        },
        {
          title: "Concluir 1 hábito hoje",
          validationType: "habits_completed_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Sistema mínimo",
      summary: "Amplie um pouco a sua base de hábitos.",
      rewardXp: 60,
      tasks: [
        {
          title: "Ter 2 hábitos cadastrados",
          validationType: "habits_total",
          targetValue: 2,
        },
      ],
    },
    {
      title: "Mais consistência",
      summary: "Seu sistema começa a ganhar corpo.",
      rewardXp: 65,
      tasks: [
        {
          title: "Concluir 2 hábitos hoje",
          validationType: "habits_completed_today",
          targetValue: 2,
        },
      ],
    },
    {
      title: "Semana de consistência",
      summary: "Feche a jornada com hábitos vivos na rotina.",
      rewardXp: 80,
      tasks: [
        {
          title: "Fazer check-in hoje",
          validationType: "checkin_today",
          targetValue: 1,
        },
        {
          title: "Concluir 2 hábitos hoje",
          validationType: "habits_completed_today",
          targetValue: 2,
        },
      ],
    },
  ],
  lazer: [
    {
      title: "Respirar de novo",
      summary: "Comece abrindo espaço para leveza.",
      rewardXp: 40,
      tasks: [
        {
          title: "Fazer check-in hoje",
          validationType: "checkin_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Leveza protegida",
      summary: "Crie um hábito pequeno ligado ao seu bem-estar.",
      rewardXp: 45,
      tasks: [
        {
          title: "Criar 1 hábito de bem-estar",
          validationType: "habits_total",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Pausa real",
      summary: "Faça o cuidado virar ação concreta.",
      rewardXp: 50,
      tasks: [
        {
          title: "Concluir 1 hábito hoje",
          validationType: "habits_completed_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Descanso com consciência",
      summary: "Junte prática e percepção do seu estado.",
      rewardXp: 55,
      tasks: [
        {
          title: "Fazer check-in hoje",
          validationType: "checkin_today",
          targetValue: 1,
        },
        {
          title: "Concluir 1 hábito hoje",
          validationType: "habits_completed_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Mais espaço interno",
      summary: "Amplie seu espaço de respiro com constância.",
      rewardXp: 60,
      tasks: [
        {
          title: "Ter 2 hábitos cadastrados",
          validationType: "habits_total",
          targetValue: 2,
        },
      ],
    },
    {
      title: "Leveza sustentada",
      summary: "Reforçar o descanso também é organização.",
      rewardXp: 65,
      tasks: [
        {
          title: "Concluir 2 hábitos hoje",
          validationType: "habits_completed_today",
          targetValue: 2,
        },
      ],
    },
    {
      title: "Semana mais humana",
      summary: "Feche essa etapa com mais leveza de verdade.",
      rewardXp: 80,
      tasks: [
        {
          title: "Fazer check-in hoje",
          validationType: "checkin_today",
          targetValue: 1,
        },
        {
          title: "Concluir 2 hábitos hoje",
          validationType: "habits_completed_today",
          targetValue: 2,
        },
      ],
    },
  ],
  espiritualidade: [
    {
      title: "Voltar ao centro",
      summary: "Comece pela presença.",
      rewardXp: 40,
      tasks: [
        {
          title: "Fazer check-in hoje",
          validationType: "checkin_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Prática pequena",
      summary: "Crie um hábito simples de reconexão.",
      rewardXp: 45,
      tasks: [
        {
          title: "Criar 1 hábito de presença",
          validationType: "habits_total",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Presença em ação",
      summary: "Tire a prática da ideia e leve para o dia.",
      rewardXp: 50,
      tasks: [
        {
          title: "Concluir 1 hábito hoje",
          validationType: "habits_completed_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Escuta e constância",
      summary: "Junte prática e percepção em um mesmo ciclo.",
      rewardXp: 55,
      tasks: [
        {
          title: "Fazer check-in hoje",
          validationType: "checkin_today",
          targetValue: 1,
        },
        {
          title: "Concluir 1 hábito hoje",
          validationType: "habits_completed_today",
          targetValue: 1,
        },
      ],
    },
    {
      title: "Base interior",
      summary: "Amplie a estrutura da sua prática.",
      rewardXp: 60,
      tasks: [
        {
          title: "Ter 2 hábitos cadastrados",
          validationType: "habits_total",
          targetValue: 2,
        },
      ],
    },
    {
      title: "Presença sustentada",
      summary: "Comece a sentir mais estabilidade por dentro.",
      rewardXp: 65,
      tasks: [
        {
          title: "Concluir 2 hábitos hoje",
          validationType: "habits_completed_today",
          targetValue: 2,
        },
      ],
    },
    {
      title: "Semana com mais centro",
      summary: "Feche essa etapa com mais clareza interior.",
      rewardXp: 80,
      tasks: [
        {
          title: "Fazer check-in hoje",
          validationType: "checkin_today",
          targetValue: 1,
        },
        {
          title: "Concluir 2 hábitos hoje",
          validationType: "habits_completed_today",
          targetValue: 2,
        },
      ],
    },
  ],
};

const JOURNEY_DAY_TITLES: Record<AppLanguage, string[]> = {
  pt: [
    "Clareza inicial",
    "Estrutura mínima",
    "Primeira ação real",
    "Ritmo e constância",
    "Revisão do progresso",
    "Ajuste inteligente",
    "Fechamento da semana",
  ],
  en: [
    "Initial clarity",
    "Minimum structure",
    "First real action",
    "Rhythm and consistency",
    "Progress review",
    "Smart adjustment",
    "End of the week",
  ],
  es: [
    "Claridad inicial",
    "Estructura mínima",
    "Primera acción real",
    "Ritmo y constancia",
    "Revisión del progreso",
    "Ajuste inteligente",
    "Cierre de la semana",
  ],
  fr: [
    "Clarté initiale",
    "Structure minimale",
    "Première action réelle",
    "Rythme et constance",
    "Revue du progrès",
    "Ajustement intelligent",
    "Fin de semaine",
  ],
  it: [
    "Chiarezza iniziale",
    "Struttura minima",
    "Prima azione reale",
    "Ritmo e costanza",
    "Revisione dei progressi",
    "Aggiustamento intelligente",
    "Chiusura della settimana",
  ],
};

const GENERIC_FIRST_STEP_TEMPLATES: Record<AppLanguage, string[]> = {
  pt: [
    "Entender com honestidade o que está acontecendo em {{area}} hoje.",
    "Criar uma base pequena e sustentável para esta área nesta semana.",
    "Fazer uma ação concreta antes de tentar organizar tudo ao mesmo tempo.",
  ],
  en: [
    "Understand honestly what is happening in {{area}} today.",
    "Build a small and sustainable base for this area this week.",
    "Take one concrete action before trying to organize everything at once.",
  ],
  es: [
    "Entender con honestidad lo que está pasando en {{area}} hoy.",
    "Crear una base pequeña y sostenible para esta área esta semana.",
    "Hacer una acción concreta antes de intentar organizar todo al mismo tiempo.",
  ],
  fr: [
    "Comprendre honnêtement ce qui se passe dans {{area}} aujourd'hui.",
    "Créer une base petite et durable pour ce domaine cette semaine.",
    "Faire une action concrète avant d'essayer de tout organiser en même temps.",
  ],
  it: [
    "Capire con onestà cosa sta succedendo in {{area}} oggi.",
    "Creare una base piccola e sostenibile per quest'area questa settimana.",
    "Fare un'azione concreta prima di provare a organizzare tutto insieme.",
  ],
};

const GENERIC_WEEKLY_GOAL_TEMPLATES: Record<AppLanguage, string> = {
  pt: "Criar mais clareza e estabilidade em {{area}} nos próximos 7 dias.",
  en: "Build more clarity and stability in {{area}} over the next 7 days.",
  es: "Crear más claridad y estabilidad en {{area}} durante los próximos 7 días.",
  fr: "Créer plus de clarté et de stabilité dans {{area}} au cours des 7 prochains jours.",
  it: "Creare più chiarezza e stabilità in {{area}} nei prossimi 7 giorni.",
};

const GENERIC_WEEKLY_PLAN_TITLES: Record<AppLanguage, string[]> = {
  pt: [
    "Foto da realidade",
    "Base mínima",
    "Ação concreta",
    "Constância",
    "Leitura do progresso",
    "Ajuste fino",
    "Próximo passo",
  ],
  en: [
    "Reality snapshot",
    "Minimum base",
    "Concrete action",
    "Consistency",
    "Progress reading",
    "Fine adjustment",
    "Next step",
  ],
  es: [
    "Foto de la realidad",
    "Base mínima",
    "Acción concreta",
    "Constancia",
    "Lectura del progreso",
    "Ajuste fino",
    "Siguiente paso",
  ],
  fr: [
    "Photo de la réalité",
    "Base minimale",
    "Action concrète",
    "Constance",
    "Lecture du progrès",
    "Ajustement fin",
    "Prochaine étape",
  ],
  it: [
    "Foto della realtà",
    "Base minima",
    "Azione concreta",
    "Costanza",
    "Lettura dei progressi",
    "Rifinitura",
    "Passo successivo",
  ],
};

const GENERIC_WEEKLY_PLAN_ACTIONS: Record<AppLanguage, string[]> = {
  pt: [
    "Observe com calma como {{area}} está hoje, sem tentar resolver tudo de uma vez.",
    "Monte uma base simples e sustentável para {{area}} nesta semana.",
    "Dê um passo concreto em {{area}} ainda hoje.",
    "Repita o essencial e reduza a fricção dessa área na rotina.",
    "Perceba o que já melhorou e o que ainda pesa em {{area}}.",
    "Faça um ajuste pequeno, mas inteligente, em {{area}}.",
    "Feche a semana com clareza e defina o próximo movimento em {{area}}.",
  ],
  en: [
    "Calmly observe how {{area}} looks today without trying to solve everything at once.",
    "Set up a simple and sustainable base for {{area}} this week.",
    "Take one concrete step in {{area}} today.",
    "Repeat what matters and reduce friction around this area in your routine.",
    "Notice what is already improving and what still feels heavy in {{area}}.",
    "Make one small but smart adjustment in {{area}}.",
    "Close the week with clarity and define the next move in {{area}}.",
  ],
  es: [
    "Observa con calma cómo está {{area}} hoy sin intentar resolverlo todo de una vez.",
    "Crea una base simple y sostenible para {{area}} esta semana.",
    "Da un paso concreto en {{area}} todavía hoy.",
    "Repite lo esencial y reduce la fricción de esta área en tu rutina.",
    "Percibe qué ya mejoró y qué sigue pesando en {{area}}.",
    "Haz un ajuste pequeño, pero inteligente, en {{area}}.",
    "Cierra la semana con claridad y define el próximo movimiento en {{area}}.",
  ],
  fr: [
    "Observez calmement l'état de {{area}} aujourd'hui sans vouloir tout résoudre d'un coup.",
    "Mettez en place une base simple et durable pour {{area}} cette semaine.",
    "Faites une action concrète dans {{area}} dès aujourd'hui.",
    "Répétez l'essentiel et réduisez la friction de ce domaine dans votre routine.",
    "Voyez ce qui s'est déjà amélioré et ce qui pèse encore dans {{area}}.",
    "Faites un petit ajustement, mais intelligent, dans {{area}}.",
    "Terminez la semaine avec de la clarté et définissez le prochain mouvement dans {{area}}.",
  ],
  it: [
    "Osserva con calma come sta {{area}} oggi senza cercare di risolvere tutto insieme.",
    "Costruisci una base semplice e sostenibile per {{area}} questa settimana.",
    "Fai un passo concreto in {{area}} già oggi.",
    "Ripeti l'essenziale e riduci l'attrito di quest'area nella routine.",
    "Nota cosa sta già migliorando e cosa pesa ancora in {{area}}.",
    "Fai un piccolo ma intelligente aggiustamento in {{area}}.",
    "Chiudi la settimana con chiarezza e definisci il prossimo movimento in {{area}}.",
  ],
};

function interpolate(message: string, params: Record<string, string | number>) {
  return Object.entries(params).reduce((result, [key, value]) => {
    return result.replaceAll(`{{${key}}}`, String(value));
  }, message);
}

function getJourneyDayTitle(
  language: AppLanguage,
  dayIndex: number
) {
  return (
    JOURNEY_DAY_TITLES[language][dayIndex] ||
    JOURNEY_DAY_TITLES[DEFAULT_APP_LANGUAGE][dayIndex]
  );
}

function getJourneyDaySummary(
  language: AppLanguage,
  area: LifeArea,
  dayIndex: number
) {
  const areaLabel = getLowerAreaLabel(area, language);
  const templates: Record<AppLanguage, string[]> = {
    pt: [
      "Ganhe uma primeira leitura honesta de {{area}}.",
      "Monte uma estrutura pequena que você consiga sustentar.",
      "Transforme intenção em ação concreta em {{area}}.",
      "Comece a criar ritmo e reduzir esforço nessa frente.",
      "Observe o que já está melhorando em {{area}}.",
      "Ajuste a rota sem perder a simplicidade.",
      "Feche esta etapa com mais clareza e estabilidade.",
    ],
    en: [
      "Build a first honest reading of {{area}}.",
      "Set up a small structure you can actually sustain.",
      "Turn intention into concrete action in {{area}}.",
      "Start creating rhythm and reducing effort in this area.",
      "Notice what is already improving in {{area}}.",
      "Adjust the route without losing simplicity.",
      "Close this stage with more clarity and stability.",
    ],
    es: [
      "Construye una primera lectura honesta de {{area}}.",
      "Monta una estructura pequeña que realmente puedas sostener.",
      "Convierte la intención en una acción concreta en {{area}}.",
      "Empieza a crear ritmo y a reducir esfuerzo en esta área.",
      "Observa lo que ya está mejorando en {{area}}.",
      "Ajusta la ruta sin perder la simplicidad.",
      "Cierra esta etapa con más claridad y estabilidad.",
    ],
    fr: [
      "Obtenez une première lecture honnête de {{area}}.",
      "Mettez en place une petite structure que vous pouvez vraiment tenir.",
      "Transformez l'intention en action concrète dans {{area}}.",
      "Commencez à créer du rythme et à réduire l'effort dans ce domaine.",
      "Observez ce qui s'améliore déjà dans {{area}}.",
      "Ajustez la route sans perdre la simplicité.",
      "Terminez cette étape avec plus de clarté et de stabilité.",
    ],
    it: [
      "Costruisci una prima lettura onesta di {{area}}.",
      "Imposta una piccola struttura che tu possa davvero sostenere.",
      "Trasforma l'intenzione in un'azione concreta in {{area}}.",
      "Inizia a creare ritmo e a ridurre lo sforzo in quest'area.",
      "Osserva ciò che sta già migliorando in {{area}}.",
      "Aggiusta la rotta senza perdere semplicità.",
      "Chiudi questa fase con più chiarezza e stabilità.",
    ],
  };

  return interpolate(
    templates[language][dayIndex] || templates[DEFAULT_APP_LANGUAGE][dayIndex],
    { area: areaLabel }
  );
}

function getTaskTitle(
  language: AppLanguage,
  validationType: JourneyTaskValidationType,
  targetValue: number
) {
  const templates: Record<
    JourneyTaskValidationType,
    Record<AppLanguage, string>
  > = {
    money_entries_total: {
      pt: "Registrar {{count}} movimentações no total",
      en: "Register {{count}} entries in total",
      es: "Registrar {{count}} movimientos en total",
      fr: "Enregistrer {{count}} mouvements au total",
      it: "Registrare {{count}} movimenti in totale",
    },
    money_entries_today: {
      pt: "Registrar {{count}} movimentação(ões) hoje",
      en: "Register {{count}} money entry/entries today",
      es: "Registrar {{count}} movimiento(s) hoy",
      fr: "Enregistrer {{count}} mouvement(s) aujourd'hui",
      it: "Registrare {{count}} movimento/i oggi",
    },
    fixed_bills_total: {
      pt: "Cadastrar {{count}} conta(s) fixa(s)",
      en: "Add {{count}} fixed bill(s)",
      es: "Registrar {{count}} cuenta(s) fija(s)",
      fr: "Ajouter {{count}} facture(s) fixe(s)",
      it: "Registrare {{count}} spesa/e fissa/e",
    },
    goals_total: {
      pt: "Definir {{count}} meta(s)",
      en: "Set {{count}} goal(s)",
      es: "Definir {{count}} meta(s)",
      fr: "Définir {{count}} objectif(s)",
      it: "Definire {{count}} obiettivo/i",
    },
    goals_today: {
      pt: "Registrar {{count}} meta(s) hoje",
      en: "Register {{count}} goal(s) today",
      es: "Registrar {{count}} meta(s) hoy",
      fr: "Enregistrer {{count}} objectif(s) aujourd'hui",
      it: "Registrare {{count}} obiettivo/i oggi",
    },
    learning_items_total: {
      pt: "Registrar {{count}} passo(s) de aprendizado",
      en: "Register {{count}} learning step(s)",
      es: "Registrar {{count}} paso(s) de aprendizaje",
      fr: "Enregistrer {{count}} étape(s) d'apprentissage",
      it: "Registrare {{count}} passo/i di apprendimento",
    },
    learning_today: {
      pt: "Passar pelo módulo Aprendizado hoje",
      en: "Use the Learning module today",
      es: "Pasar por el módulo Aprendizaje hoy",
      fr: "Passer par le module Apprentissage aujourd'hui",
      it: "Passare dal modulo Apprendimento oggi",
    },
    time_items_total: {
      pt: "Organizar {{count}} passo(s) no módulo Tempo",
      en: "Organize {{count}} step(s) in Time",
      es: "Organizar {{count}} paso(s) en Tiempo",
      fr: "Organiser {{count}} étape(s) dans Temps",
      it: "Organizzare {{count}} passo/i in Tempo",
    },
    time_today: {
      pt: "Passar pelo módulo Tempo hoje",
      en: "Use the Time module today",
      es: "Pasar por el módulo Tiempo hoy",
      fr: "Passer par le module Temps aujourd'hui",
      it: "Passare dal modulo Tempo oggi",
    },
    work_items_total: {
      pt: "Definir {{count}} avanço(s) no Trabalho",
      en: "Define {{count}} work progress step(s)",
      es: "Definir {{count}} avance(s) en Trabajo",
      fr: "Définir {{count}} avancée(s) dans Travail",
      it: "Definire {{count}} progresso/i in Lavoro",
    },
    work_today: {
      pt: "Passar pelo módulo Trabalho hoje",
      en: "Use the Work module today",
      es: "Pasar por el módulo Trabajo hoy",
      fr: "Passer par le module Travail aujourd'hui",
      it: "Passare dal modulo Lavoro oggi",
    },
    leisure_items_total: {
      pt: "Registrar {{count}} momento(s) de lazer",
      en: "Register {{count}} leisure moment(s)",
      es: "Registrar {{count}} momento(s) de ocio",
      fr: "Enregistrer {{count}} moment(s) de loisir",
      it: "Registrare {{count}} momento/i di svago",
    },
    leisure_today: {
      pt: "Registrar {{count}} momento(s) de lazer hoje",
      en: "Register {{count}} leisure moment(s) today",
      es: "Registrar {{count}} momento(s) de ocio hoy",
      fr: "Enregistrer {{count}} moment(s) de loisir aujourd'hui",
      it: "Registrare {{count}} momento/i di svago oggi",
    },
    spiritual_items_total: {
      pt: "Registrar {{count}} prática(s) de espiritualidade",
      en: "Register {{count}} spirituality practice(s)",
      es: "Registrar {{count}} práctica(s) de espiritualidad",
      fr: "Enregistrer {{count}} pratique(s) de spiritualité",
      it: "Registrare {{count}} pratica/he di spiritualità",
    },
    spiritual_today: {
      pt: "Registrar {{count}} prática(s) de espiritualidade hoje",
      en: "Register {{count}} spirituality practice(s) today",
      es: "Registrar {{count}} práctica(s) de espiritualidad hoy",
      fr: "Enregistrer {{count}} pratique(s) de spiritualité aujourd'hui",
      it: "Registrare {{count}} pratica/he di spiritualità oggi",
    },
    habits_total: {
      pt: "Ter {{count}} hábito(s) cadastrado(s)",
      en: "Have {{count}} habit(s) created",
      es: "Tener {{count}} hábito(s) creado(s)",
      fr: "Avoir {{count}} habitude(s) créée(s)",
      it: "Avere {{count}} abitudine/i creata/e",
    },
    habits_completed_today: {
      pt: "Concluir {{count}} hábito(s) hoje",
      en: "Complete {{count}} habit(s) today",
      es: "Completar {{count}} hábito(s) hoy",
      fr: "Terminer {{count}} habitude(s) aujourd'hui",
      it: "Completare {{count}} abitudine/i oggi",
    },
    medications_total: {
      pt: "Cadastrar {{count}} cuidado(s) ou medicação(ões)",
      en: "Add {{count}} care item(s) or medication(s)",
      es: "Registrar {{count}} cuidado(s) o medicación(es)",
      fr: "Ajouter {{count}} soin(s) ou médicament(s)",
      it: "Registrare {{count}} cura/e o farmaco/i",
    },
    medications_taken_today: {
      pt: "Concluir {{count}} cuidado(s) hoje",
      en: "Complete {{count}} care item(s) today",
      es: "Completar {{count}} cuidado(s) hoy",
      fr: "Terminer {{count}} soin(s) aujourd'hui",
      it: "Completare {{count}} cura/e oggi",
    },
    checkin_today: {
      pt: "Fazer o check-in do dia",
      en: "Complete today's check-in",
      es: "Hacer el check-in del día",
      fr: "Faire le check-in du jour",
      it: "Fare il check-in del giorno",
    },
  };

  return interpolate(
    templates[validationType][language] ||
      templates[validationType][DEFAULT_APP_LANGUAGE],
    { count: targetValue }
  );
}

function getFirstSteps(language: AppLanguage, area: LifeArea) {
  const areaLabel = getLowerAreaLabel(area, language);
  return GENERIC_FIRST_STEP_TEMPLATES[language].map((item) =>
    interpolate(item, { area: areaLabel })
  );
}

function getWeeklyGoal(language: AppLanguage, area: LifeArea) {
  return interpolate(
    GENERIC_WEEKLY_GOAL_TEMPLATES[language] ||
      GENERIC_WEEKLY_GOAL_TEMPLATES[DEFAULT_APP_LANGUAGE],
    { area: getLowerAreaLabel(area, language) }
  );
}

function getWeeklyPlan(language: AppLanguage, area: LifeArea) {
  if (area === "financeiro") {
    const localizedPlan = {
      pt: [
        {
          title: "Base real do mês",
          action:
            "No primeiro dia, alimente o app com contas fixas e movimentações reais para a IA entender como seu dinheiro está hoje.",
        },
        {
          title: "Vida financeira conectada",
          action:
            "Depois da base, a IA libera tarefas em metas, saúde, tempo, trabalho, aprendizado, hábitos, lazer e espiritualidade para organizar sua vida como sistema.",
        },
        {
          title: "Ritmo que sustenta",
          action:
            "Repita o cuidado diário pelos módulos e mantenha o dinheiro ligado à sua rotina, não só ao saldo.",
        },
        {
          title: "Decisões com contexto",
          action:
            "A cada dia concluído, a IA usa o que você preencheu para ajustar o próximo passo e orientar melhor suas decisões.",
        },
        {
          title: "Organização sem isolamento",
          action:
            "O Dinheiro continua sendo a base, mas o plano exige ação nos outros módulos para atacar a causa do caos e não apenas o sintoma.",
        },
        {
          title: "Leitura madura da sua semana",
          action:
            "Com mais módulos alimentados, a IA passa a ler seu momento com mais precisão e mostra o que ainda trava sua vida.",
        },
        {
          title: "Fechamento em sistema",
          action:
            "Você encerra a semana com o dinheiro conectado a metas, hábitos, saúde, tempo, trabalho, aprendizado, lazer e espiritualidade.",
        },
      ],
      en: [
        {
          title: "Real monthly base",
          action:
            "On day one, feed the app with fixed bills and real transactions so the AI can understand your current financial picture.",
        },
        {
          title: "Connected financial life",
          action:
            "After the base is ready, the AI unlocks tasks in goals, health, time, work, learning, habits, leisure, and spirituality to organize your life as one system.",
        },
        {
          title: "A rhythm that holds",
          action:
            "Repeat the daily care across modules and keep money connected to your routine, not only to your balance.",
        },
        {
          title: "Decisions with context",
          action:
            "With each completed day, the AI uses what you filled in to adjust the next step and guide your decisions better.",
        },
        {
          title: "Organization without silos",
          action:
            "Money remains the base, but the plan asks for action in the other modules so you address causes, not only symptoms.",
        },
        {
          title: "A mature weekly reading",
          action:
            "With more modules filled in, the AI reads your moment more accurately and highlights what is still blocking your life.",
        },
        {
          title: "System-level close",
          action:
            "You finish the week with money connected to goals, habits, health, time, work, learning, leisure, and spirituality.",
        },
      ],
      es: [
        {
          title: "Base real del mes",
          action:
            "En el primer día, alimenta la app con cuentas fijas y movimientos reales para que la IA entienda cómo está hoy tu dinero.",
        },
        {
          title: "Vida financiera conectada",
          action:
            "Después de la base, la IA desbloquea tareas en metas, salud, tiempo, trabajo, aprendizaje, hábitos, ocio y espiritualidad para organizar tu vida como un sistema.",
        },
        {
          title: "Ritmo que sostiene",
          action:
            "Repite el cuidado diario entre módulos y mantén el dinero conectado a tu rutina, no solo al saldo.",
        },
        {
          title: "Decisiones con contexto",
          action:
            "Con cada día completado, la IA usa lo que registraste para ajustar el siguiente paso y orientar mejor tus decisiones.",
        },
        {
          title: "Organización sin aislar áreas",
          action:
            "Dinero sigue siendo la base, pero el plan exige acción en los otros módulos para atacar la causa del caos y no solo el síntoma.",
        },
        {
          title: "Lectura madura de la semana",
          action:
            "Con más módulos alimentados, la IA pasa a leer tu momento con más precisión y muestra qué sigue bloqueando tu vida.",
        },
        {
          title: "Cierre como sistema",
          action:
            "Cierras la semana con el dinero conectado a metas, hábitos, salud, tiempo, trabajo, aprendizaje, ocio y espiritualidad.",
        },
      ],
      fr: [
        {
          title: "Base réelle du mois",
          action:
            "Le premier jour, alimentez l'app avec vos charges fixes et vos mouvements réels pour que l'IA comprenne votre situation financière actuelle.",
        },
        {
          title: "Vie financière connectée",
          action:
            "Après cette base, l'IA débloque des tâches dans objectifs, santé, temps, travail, apprentissage, habitudes, loisirs et spiritualité pour organiser votre vie comme un système.",
        },
        {
          title: "Un rythme qui tient",
          action:
            "Répétez ce soin quotidien dans les modules et gardez l'argent lié à votre routine, pas seulement à votre solde.",
        },
        {
          title: "Décisions avec contexte",
          action:
            "À chaque jour terminé, l'IA utilise ce que vous avez rempli pour ajuster l'étape suivante et mieux guider vos décisions.",
        },
        {
          title: "Organisation sans silos",
          action:
            "L'Argent reste la base, mais le plan demande des actions dans les autres modules pour traiter la cause du désordre, pas seulement le symptôme.",
        },
        {
          title: "Lecture plus mature de la semaine",
          action:
            "Avec plus de modules alimentés, l'IA lit votre moment avec davantage de précision et montre ce qui bloque encore votre vie.",
        },
        {
          title: "Clôture en système",
          action:
            "Vous terminez la semaine avec l'argent connecté aux objectifs, habitudes, santé, temps, travail, apprentissage, loisirs et spiritualité.",
        },
      ],
      it: [
        {
          title: "Base reale del mese",
          action:
            "Nel primo giorno, alimenta l'app con spese fisse e movimenti reali così l'IA può capire com'è davvero la tua situazione finanziaria.",
        },
        {
          title: "Vita finanziaria connessa",
          action:
            "Dopo la base, l'IA sblocca attività in obiettivi, salute, tempo, lavoro, apprendimento, abitudini, svago e spiritualità per organizzare la tua vita come un sistema.",
        },
        {
          title: "Un ritmo che regge",
          action:
            "Ripeti questa cura quotidiana nei moduli e mantieni il denaro collegato alla tua routine, non solo al saldo.",
        },
        {
          title: "Decisioni con contesto",
          action:
            "Ogni giorno completato permette all'IA di usare ciò che hai compilato per regolare il passo successivo e guidare meglio le tue decisioni.",
        },
        {
          title: "Organizzazione senza silos",
          action:
            "Il Denaro resta la base, ma il piano richiede azione anche negli altri moduli per affrontare la causa del caos e non solo il sintomo.",
        },
        {
          title: "Lettura più matura della settimana",
          action:
            "Con più moduli alimentati, l'IA legge il tuo momento con maggiore precisione e mostra cosa sta ancora bloccando la tua vita.",
        },
        {
          title: "Chiusura come sistema",
          action:
            "Chiudi la settimana con il denaro collegato a obiettivi, abitudini, salute, tempo, lavoro, apprendimento, svago e spiritualità.",
        },
      ],
    } as const;

    return localizedPlan[language].map((item, index) => ({
      day: index + 1,
      title: item.title,
      action: item.action,
    }));
  }

  const areaLabel = getLowerAreaLabel(area, language);

  return GENERIC_WEEKLY_PLAN_TITLES[language].map((title, index) => ({
    day: index + 1,
    title,
    action: interpolate(GENERIC_WEEKLY_PLAN_ACTIONS[language][index], {
      area: areaLabel,
    }),
  }));
}

function buildSummaryText(
  primaryArea: LifeArea,
  secondaryArea: LifeArea,
  language: AppLanguage = DEFAULT_APP_LANGUAGE
) {
  const primaryLabel = getLifeAreaLabel(primaryArea, language);
  const secondaryLabel = getLowerAreaLabel(secondaryArea, language);

  switch (primaryArea) {
    case "financeiro":
      return {
        pt: `Seu melhor ponto de partida hoje é ${primaryLabel}. Quando o dinheiro sai da névoa, a ansiedade baixa e você ganha mais clareza para organizar ${secondaryLabel}.`,
        en: `Your best starting point today is ${primaryLabel}. When money becomes clearer, anxiety goes down and it gets easier to organize ${secondaryLabel}.`,
        es: `Tu mejor punto de partida hoy es ${primaryLabel}. Cuando el dinero sale de la niebla, baja la ansiedad y ganas más claridad para organizar ${secondaryLabel}.`,
        fr: `Votre meilleur point de départ aujourd'hui est ${primaryLabel}. Quand l'argent devient plus clair, l'anxiété baisse et il devient plus facile d'organiser ${secondaryLabel}.`,
        it: `Il tuo miglior punto di partenza oggi è ${primaryLabel}. Quando il denaro esce dalla nebbia, l'ansia si abbassa e diventa più facile organizzare ${secondaryLabel}.`,
      }[language];
    case "saude":
      return {
        pt: `Seu corpo e sua energia precisam entrar no eixo primeiro. Ao começar por ${primaryLabel}, você cria base para sustentar melhor ${secondaryLabel}.`,
        en: `Your body and energy need to come back into alignment first. By starting with ${primaryLabel}, you create a base to support ${secondaryLabel} better.`,
        es: `Tu cuerpo y tu energía necesitan volver al eje primero. Al empezar por ${primaryLabel}, creas una base para sostener mejor ${secondaryLabel}.`,
        fr: `Votre corps et votre énergie doivent d'abord retrouver leur équilibre. En commençant par ${primaryLabel}, vous créez une base pour mieux soutenir ${secondaryLabel}.`,
        it: `Il tuo corpo e la tua energia devono prima ritrovare equilibrio. Iniziando da ${primaryLabel}, crei una base per sostenere meglio ${secondaryLabel}.`,
      }[language];
    case "tempo":
      return {
        pt: `Seu maior destravador agora parece ser ${primaryLabel}. Quando a rotina se organiza, fica mais fácil avançar também em ${secondaryLabel}.`,
        en: `Your biggest unlock right now seems to be ${primaryLabel}. When your routine gets organized, it becomes easier to move forward in ${secondaryLabel} as well.`,
        es: `Tu mayor desbloqueo ahora parece ser ${primaryLabel}. Cuando la rutina se organiza, también se vuelve más fácil avanzar en ${secondaryLabel}.`,
        fr: `Votre plus grand levier en ce moment semble être ${primaryLabel}. Quand la routine s'organise, il devient aussi plus facile d'avancer en ${secondaryLabel}.`,
        it: `Il tuo maggiore sblocco in questo momento sembra essere ${primaryLabel}. Quando la routine si organizza, diventa più facile avanzare anche in ${secondaryLabel}.`,
      }[language];
    case "trabalho":
      return {
        pt: `A área profissional está pedindo direção. Começar por ${primaryLabel} tende a devolver ritmo e refletir positivamente em ${secondaryLabel}.`,
        en: `Your professional area is asking for direction. Starting with ${primaryLabel} should restore momentum and positively influence ${secondaryLabel}.`,
        es: `El área profesional está pidiendo dirección. Empezar por ${primaryLabel} tiende a devolverte ritmo y reflejarse positivamente en ${secondaryLabel}.`,
        fr: `Le domaine professionnel demande de la direction. Commencer par ${primaryLabel} devrait redonner du rythme et avoir un impact positif sur ${secondaryLabel}.`,
        it: `L'area professionale chiede direzione. Iniziare da ${primaryLabel} tende a restituire ritmo e a riflettersi positivamente su ${secondaryLabel}.`,
      }[language];
    case "aprendizado":
      return {
        pt: `Seu crescimento agora pede direção. Ao começar por ${primaryLabel}, você ganha repertório e confiança para avançar melhor também em ${secondaryLabel}.`,
        en: `Your growth now needs direction. By starting with ${primaryLabel}, you build knowledge and confidence to move forward in ${secondaryLabel} as well.`,
        es: `Tu crecimiento ahora necesita dirección. Al empezar por ${primaryLabel}, ganas repertorio y confianza para avanzar mejor también en ${secondaryLabel}.`,
        fr: `Votre croissance a maintenant besoin de direction. En commençant par ${primaryLabel}, vous gagnez en repères et en confiance pour avancer aussi en ${secondaryLabel}.`,
        it: `La tua crescita ora ha bisogno di direzione. Iniziando da ${primaryLabel}, costruisci competenze e fiducia per avanzare meglio anche in ${secondaryLabel}.`,
      }[language];
    case "habitos":
      return {
        pt: `Seu caminho mais inteligente agora é fortalecer ${primaryLabel}. Pequenas repetições bem feitas podem destravar ${secondaryLabel}.`,
        en: `Your smartest move right now is to strengthen ${primaryLabel}. Well-executed small repetitions can unlock ${secondaryLabel}.`,
        es: `Tu camino más inteligente ahora es fortalecer ${primaryLabel}. Pequeñas repeticiones bien hechas pueden destrabar ${secondaryLabel}.`,
        fr: `Votre choix le plus intelligent maintenant est de renforcer ${primaryLabel}. De petites répétitions bien faites peuvent débloquer ${secondaryLabel}.`,
        it: `La tua scelta più intelligente adesso è rafforzare ${primaryLabel}. Piccole ripetizioni fatte bene possono sbloccare ${secondaryLabel}.`,
      }[language];
    case "lazer":
      return {
        pt: `Antes de apertar mais, você precisa recuperar espaço mental. Organizar ${primaryLabel} agora tende a devolver fôlego também para ${secondaryLabel}.`,
        en: `Before pushing harder, you need to recover mental space. Organizing ${primaryLabel} now should also give you more breathing room for ${secondaryLabel}.`,
        es: `Antes de exigirte más, necesitas recuperar espacio mental. Organizar ${primaryLabel} ahora también debería devolverte aire para ${secondaryLabel}.`,
        fr: `Avant d'en faire plus, vous devez retrouver de l'espace mental. Organiser ${primaryLabel} maintenant devrait aussi redonner du souffle à ${secondaryLabel}.`,
        it: `Prima di spingere di più, hai bisogno di recuperare spazio mentale. Organizzare ${primaryLabel} adesso dovrebbe restituire respiro anche a ${secondaryLabel}.`,
      }[language];
    case "espiritualidade":
      return {
        pt: `Seu momento pede mais centro e presença. Ao começar por ${primaryLabel}, você deve tomar decisões melhores inclusive em ${secondaryLabel}.`,
        en: `This moment asks for more center and presence. By starting with ${primaryLabel}, you should make better decisions even in ${secondaryLabel}.`,
        es: `Tu momento pide más centro y presencia. Al empezar por ${primaryLabel}, deberías tomar mejores decisiones incluso en ${secondaryLabel}.`,
        fr: `Ce moment demande plus de centre et de présence. En commençant par ${primaryLabel}, vous devriez prendre de meilleures décisions même en ${secondaryLabel}.`,
        it: `Questo momento richiede più centro e presenza. Iniziando da ${primaryLabel}, dovresti prendere decisioni migliori anche in ${secondaryLabel}.`,
      }[language];
    default:
      return {
        pt: `Sua jornada começa por ${primaryLabel}. Esse foco tende a abrir caminho para melhorar também ${secondaryLabel}.`,
        en: `Your journey begins with ${primaryLabel}. This focus should also open the way to improve ${secondaryLabel}.`,
        es: `Tu jornada comienza por ${primaryLabel}. Este enfoque también tiende a abrir camino para mejorar ${secondaryLabel}.`,
        fr: `Votre parcours commence par ${primaryLabel}. Cet axe devrait aussi ouvrir la voie pour améliorer ${secondaryLabel}.`,
        it: `Il tuo percorso inizia da ${primaryLabel}. Questo focus tende anche ad aprire la strada per migliorare ${secondaryLabel}.`,
      }[language];
  }
}

function buildJourneyDays(
  primaryArea: LifeArea,
  language: AppLanguage = DEFAULT_APP_LANGUAGE
): AIJourneyDay[] {
  return AREA_JOURNEY_TEMPLATES[primaryArea].map((item, index) => ({
    day: index + 1,
    title: getJourneyDayTitle(language, index),
    summary: getJourneyDaySummary(language, primaryArea, index),
    rewardXp: item.rewardXp,
    tasks: item.tasks.map((task, taskIndex) => ({
      id: `${primaryArea}_day_${index + 1}_task_${taskIndex + 1}`,
      title: getTaskTitle(language, task.validationType, task.targetValue),
      validationType: task.validationType,
      targetValue: task.targetValue,
      currentValue: 0,
      completed: false,
    })),
  }));
}

export function buildLifeJourneyPlan(
  answers: Omit<LifeJourneyAnswers, "createdAt">,
  language: AppLanguage = DEFAULT_APP_LANGUAGE
): LifeJourneyPlan {
  const areas = Object.keys(LIFE_AREA_META) as LifeArea[];

  const scored = areas.map((area) => {
    const raw = answers[area];
    const need = 6 - raw;
    const concernBoost = answers.concernArea === area ? 1.6 : 0;
    const reliefBoost = answers.reliefArea === area ? 1.25 : 0;
    const styleBoost =
      answers.startStyle === "facil"
        ? LIFE_AREA_META[area].easyBoost
        : LIFE_AREA_META[area].impactBoost;

    return {
      area,
      score: need * 1.8 + concernBoost + reliefBoost + styleBoost,
    };
  });

  const ranked = scored.sort((a, b) => b.score - a.score);
  const primaryArea = ranked[0].area;
  const secondaryArea = ranked[1]?.area ?? ranked[0].area;

  return {
    primaryArea,
    secondaryArea,
    summaryTitle: {
      pt: `Sua jornada começa por ${getLifeAreaLabel(primaryArea, language)}`,
      en: `Your journey begins with ${getLifeAreaLabel(primaryArea, language)}`,
      es: `Tu jornada comienza por ${getLifeAreaLabel(primaryArea, language)}`,
      fr: `Votre parcours commence par ${getLifeAreaLabel(primaryArea, language)}`,
      it: `Il tuo percorso inizia da ${getLifeAreaLabel(primaryArea, language)}`,
    }[language],
    summaryText: buildSummaryText(primaryArea, secondaryArea, language),
    weeklyGoal: getWeeklyGoal(language, primaryArea) || AREA_WEEKLY_GOAL[primaryArea],
    journeyDays: buildJourneyDays(primaryArea, language),
    weeklyPlan:
      getWeeklyPlan(language, primaryArea) ||
      AREA_WEEKLY_PLAN[primaryArea].map((item, index) => ({
        day: index + 1,
        title: item.title,
        action: item.action,
      })),
    firstSteps: getFirstSteps(language, primaryArea) || AREA_STEPS[primaryArea],
    recommendedRoute: LIFE_AREA_META[primaryArea].route,
    createdAt: new Date().toISOString(),
  };
}

export function normalizeLifeJourneyPlan(
  raw: Partial<LifeJourneyPlan> | null | undefined,
  language: AppLanguage = DEFAULT_APP_LANGUAGE
) {
  if (!raw?.primaryArea || !raw?.secondaryArea) {
    return null;
  }

  const primaryArea = raw.primaryArea;
  const secondaryArea = raw.secondaryArea;
  const normalizedDaysBase = buildJourneyDays(primaryArea, language);
  const normalizedWeeklyPlanBase = getWeeklyPlan(language, primaryArea);

  return {
    primaryArea,
    secondaryArea,
    summaryTitle: {
      pt: `Sua jornada começa por ${getLifeAreaLabel(primaryArea, language)}`,
      en: `Your journey begins with ${getLifeAreaLabel(primaryArea, language)}`,
      es: `Tu jornada comienza por ${getLifeAreaLabel(primaryArea, language)}`,
      fr: `Votre parcours commence par ${getLifeAreaLabel(primaryArea, language)}`,
      it: `Il tuo percorso inizia da ${getLifeAreaLabel(primaryArea, language)}`,
    }[language],
    summaryText: buildSummaryText(primaryArea, secondaryArea, language),
    weeklyGoal: getWeeklyGoal(language, primaryArea) || AREA_WEEKLY_GOAL[primaryArea],
    journeyDays: normalizedDaysBase.map((day, index) => ({
      ...day,
      title: getJourneyDayTitle(language, index),
      summary: getJourneyDaySummary(language, primaryArea, index),
      tasks: day.tasks.map((task, taskIndex) => ({
        ...task,
        id: `${primaryArea}_day_${index + 1}_task_${taskIndex + 1}`,
        title: getTaskTitle(language, task.validationType, task.targetValue),
      })),
    })),
    weeklyPlan: normalizedWeeklyPlanBase.map((day, index) => {
      return {
        day: day.day || index + 1,
        title: day.title,
        action: day.action,
      };
    }),
    firstSteps: getFirstSteps(language, primaryArea) || AREA_STEPS[primaryArea],
    recommendedRoute:
      raw.recommendedRoute || LIFE_AREA_META[primaryArea].route,
    createdAt: raw.createdAt || new Date().toISOString(),
  } satisfies LifeJourneyPlan;
}

export function createInitialJourneyProgress(): AIJourneyProgress {
  return {
    currentDay: 1,
    unlockedDays: [1],
    completedDays: [],
    totalXp: 0,
    startedAt: new Date().toISOString(),
    analysisStatus: "idle",
    analysisStartedAt: undefined,
    analysisCompletedAt: undefined,
    nextDayUnlockAt: undefined,
    pendingFeedbackTitle: undefined,
    pendingFeedbackText: undefined,
    latestFeedbackTitle: undefined,
    latestFeedbackText: undefined,
    lastAnalyzedDay: undefined,
  };
}

export function normalizeJourneyProgress(
  raw: Partial<AIJourneyProgress> | null | undefined
) {
  if (!raw) {
    return createInitialJourneyProgress();
  }

  return {
    currentDay: raw.currentDay || 1,
    unlockedDays:
      raw.unlockedDays && raw.unlockedDays.length > 0 ? raw.unlockedDays : [1],
    completedDays: raw.completedDays || [],
    totalXp: raw.totalXp || 0,
    startedAt: raw.startedAt || new Date().toISOString(),
    lastCompletedAt: raw.lastCompletedAt,
    analysisStatus: raw.analysisStatus || "idle",
    analysisStartedAt: raw.analysisStartedAt,
    analysisCompletedAt: raw.analysisCompletedAt,
    nextDayUnlockAt: raw.nextDayUnlockAt,
    pendingFeedbackTitle: raw.pendingFeedbackTitle,
    pendingFeedbackText: raw.pendingFeedbackText,
    latestFeedbackTitle: raw.latestFeedbackTitle,
    latestFeedbackText: raw.latestFeedbackText,
    lastAnalyzedDay: raw.lastAnalyzedDay,
    finishedAt: raw.finishedAt,
  } satisfies AIJourneyProgress;
}

function getTodayDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isSameDayIso(dateA?: string, dateB?: string) {
  if (!dateA || !dateB) return false;

  return getTodayDateKey(new Date(dateA)) === getTodayDateKey(new Date(dateB));
}

type JourneyContext = {
  moneyEntriesCount: number;
  moneyEntriesTodayCount: number;
  fixedBillsCount: number;
  goalsCount: number;
  goalsTodayCount: number;
  learningItemsCount: number;
  learningTodayCount: number;
  timeItemsCount: number;
  timeTodayCount: number;
  workItemsCount: number;
  workTodayCount: number;
  leisureItemsCount: number;
  leisureTodayCount: number;
  spiritualItemsCount: number;
  spiritualTodayCount: number;
  habitsCount: number;
  habitsCompletedToday: number;
  medicationsCount: number;
  medicationsTakenToday: number;
  checkinTodayCount: number;
  latestExperienceRating: number | null;
  latestExperienceNote: string;
};

async function readJourneyContext(): Promise<JourneyContext> {
  const [
    moneyRaw,
    billsRaw,
    goalsRaw,
    learningRaw,
    timeRaw,
    workRaw,
    leisureRaw,
    spiritualRaw,
    habitsRaw,
    medsRaw,
    checkinRaw,
    experienceRaw,
  ] =
    await Promise.all([
      AsyncStorage.getItem(MONEY_ENTRIES_KEY),
      AsyncStorage.getItem(MONEY_FIXED_BILLS_KEY),
      AsyncStorage.getItem(GOALS_KEY),
      AsyncStorage.getItem(LEARNING_KEY),
      AsyncStorage.getItem(TIME_KEY),
      AsyncStorage.getItem(WORK_KEY),
      AsyncStorage.getItem(LEISURE_KEY),
      AsyncStorage.getItem(SPIRITUAL_KEY),
      AsyncStorage.getItem(HABITS_KEY),
      AsyncStorage.getItem(MEDICATIONS_KEY),
      AsyncStorage.getItem(CHECKIN_KEY),
      AsyncStorage.getItem(AI_EXPERIENCE_FEEDBACK_KEY),
    ]);

  const today = getTodayDateKey();
  const nowIso = new Date().toISOString();

  const moneyEntries = moneyRaw ? JSON.parse(moneyRaw) : [];
  const bills = billsRaw ? JSON.parse(billsRaw) : [];
  const goals = goalsRaw ? JSON.parse(goalsRaw) : [];
  const learning = learningRaw ? JSON.parse(learningRaw) : [];
  const timeItems = timeRaw ? JSON.parse(timeRaw) : [];
  const workItems = workRaw ? JSON.parse(workRaw) : [];
  const leisureItems = leisureRaw ? JSON.parse(leisureRaw) : [];
  const spiritualItems = spiritualRaw ? JSON.parse(spiritualRaw) : [];
  const habits = habitsRaw ? JSON.parse(habitsRaw) : [];
  const medications = medsRaw ? JSON.parse(medsRaw) : [];
  const checkins = checkinRaw ? JSON.parse(checkinRaw) : [];
  const experienceEntries = experienceRaw ? JSON.parse(experienceRaw) : [];
  const latestExperienceEntry = Array.isArray(experienceEntries)
    ? [...experienceEntries]
        .sort(
          (a: any, b: any) =>
            new Date(b?.createdAt || 0).getTime() -
            new Date(a?.createdAt || 0).getTime()
        )[0] ?? null
    : null;

  const habitsCompletedToday = Array.isArray(habits)
    ? habits.reduce((acc: number, habit: any) => {
        const completedDates = Array.isArray(habit?.completedDates)
          ? habit.completedDates
          : [];
        return acc + (completedDates.includes(today) ? 1 : 0);
      }, 0)
    : 0;

  const medicationsTakenToday = Array.isArray(medications)
    ? medications.reduce((acc: number, item: any) => {
        const takenDates = Array.isArray(item?.takenTodayDates)
          ? item.takenTodayDates
          : [];
        return acc + (takenDates.includes(today) ? 1 : 0);
      }, 0)
    : 0;

  const checkinTodayCount = Array.isArray(checkins)
    ? checkins.filter((item: any) => isSameDayIso(item?.createdAt, new Date().toISOString()))
        .length
    : 0;

  const goalsTodayCount = Array.isArray(goals)
    ? goals.filter((item: any) => isSameDayIso(item?.createdAt, nowIso)).length
    : 0;

  const moneyEntriesTodayCount = Array.isArray(moneyEntries)
    ? moneyEntries.filter((item: any) => isSameDayIso(item?.createdAt, nowIso))
        .length
    : 0;

  const learningTodayCount = Array.isArray(learning)
    ? learning.filter(
        (item: any) =>
          item?.dateKey === today &&
          (String(item?.objective || "").trim().length > 0 ||
            (Array.isArray(item?.tasks) && item.tasks.length > 0))
      ).length
    : 0;

  const timeTodayCount = Array.isArray(timeItems)
    ? timeItems.filter(
        (item: any) =>
          item?.dateKey === today &&
          (String(item?.focus || "").trim().length > 0 ||
            (Array.isArray(item?.tasks) && item.tasks.length > 0))
      ).length
    : 0;

  const workTodayCount = Array.isArray(workItems)
    ? workItems.filter(
        (item: any) =>
          item?.dateKey === today &&
          (String(item?.objective || "").trim().length > 0 ||
            (Array.isArray(item?.tasks) && item.tasks.length > 0))
      ).length
    : 0;

  const leisureTodayCount = Array.isArray(leisureItems)
    ? leisureItems.filter((item: any) => isSameDayIso(item?.createdAt, nowIso))
        .length
    : 0;

  const spiritualTodayCount = Array.isArray(spiritualItems)
    ? spiritualItems.filter((item: any) => isSameDayIso(item?.createdAt, nowIso))
        .length
    : 0;

  return {
    moneyEntriesCount: Array.isArray(moneyEntries) ? moneyEntries.length : 0,
    moneyEntriesTodayCount,
    fixedBillsCount: Array.isArray(bills) ? bills.length : 0,
    goalsCount: Array.isArray(goals) ? goals.length : 0,
    goalsTodayCount,
    learningItemsCount: Array.isArray(learning) ? learning.length : 0,
    learningTodayCount,
    timeItemsCount: Array.isArray(timeItems) ? timeItems.length : 0,
    timeTodayCount,
    workItemsCount: Array.isArray(workItems) ? workItems.length : 0,
    workTodayCount,
    leisureItemsCount: Array.isArray(leisureItems) ? leisureItems.length : 0,
    leisureTodayCount,
    spiritualItemsCount: Array.isArray(spiritualItems)
      ? spiritualItems.length
      : 0,
    spiritualTodayCount,
    habitsCount: Array.isArray(habits) ? habits.length : 0,
    habitsCompletedToday,
    medicationsCount: Array.isArray(medications) ? medications.length : 0,
    medicationsTakenToday,
    checkinTodayCount,
    latestExperienceRating:
      typeof latestExperienceEntry?.rating === "number"
        ? latestExperienceEntry.rating
        : null,
    latestExperienceNote:
      typeof latestExperienceEntry?.note === "string"
        ? latestExperienceEntry.note.trim()
        : "",
  };
}

function getTaskCurrentValue(
  task: AIJourneyTask,
  context: JourneyContext
): number {
  switch (task.validationType) {
    case "money_entries_total":
      return context.moneyEntriesCount;
    case "money_entries_today":
      return context.moneyEntriesTodayCount;
    case "fixed_bills_total":
      return context.fixedBillsCount;
    case "goals_total":
      return context.goalsCount;
    case "goals_today":
      return context.goalsTodayCount;
    case "learning_items_total":
      return context.learningItemsCount;
    case "learning_today":
      return context.learningTodayCount;
    case "time_items_total":
      return context.timeItemsCount;
    case "time_today":
      return context.timeTodayCount;
    case "work_items_total":
      return context.workItemsCount;
    case "work_today":
      return context.workTodayCount;
    case "leisure_items_total":
      return context.leisureItemsCount;
    case "leisure_today":
      return context.leisureTodayCount;
    case "spiritual_items_total":
      return context.spiritualItemsCount;
    case "spiritual_today":
      return context.spiritualTodayCount;
    case "habits_total":
      return context.habitsCount;
    case "habits_completed_today":
      return context.habitsCompletedToday;
    case "medications_total":
      return context.medicationsCount;
    case "medications_taken_today":
      return context.medicationsTakenToday;
    case "checkin_today":
      return context.checkinTodayCount;
    default:
      return 0;
  }
}

type FinanceJourneyModuleKey =
  | "financeiro"
  | "saude"
  | "metas"
  | "aprendizado"
  | "habitos"
  | "tempo"
  | "trabalho"
  | "lazer"
  | "espiritualidade";

const FINANCE_JOURNEY_MODULE_ORDER: FinanceJourneyModuleKey[] = [
  "financeiro",
  "saude",
  "metas",
  "aprendizado",
  "habitos",
  "tempo",
  "trabalho",
  "lazer",
  "espiritualidade",
];

function getNextLocalMidnightIso(baseDate = new Date()) {
  const next = new Date(baseDate);
  next.setHours(24, 0, 0, 0);
  return next.toISOString();
}

const JOURNEY_ANALYSIS_DELAY_MS = 2400;

function getFinanceJourneyModuleLabels(
  language: AppLanguage = DEFAULT_APP_LANGUAGE
) {
  return {
    financeiro: {
      pt: "Dinheiro",
      en: "Money",
      es: "Dinero",
      fr: "Argent",
      it: "Denaro",
    }[language],
    saude: {
      pt: "Saúde",
      en: "Health",
      es: "Salud",
      fr: "Santé",
      it: "Salute",
    }[language],
    metas: {
      pt: "Metas",
      en: "Goals",
      es: "Metas",
      fr: "Objectifs",
      it: "Obiettivi",
    }[language],
    aprendizado: {
      pt: "Aprendizado",
      en: "Learning",
      es: "Aprendizaje",
      fr: "Apprentissage",
      it: "Apprendimento",
    }[language],
    habitos: {
      pt: "Hábitos",
      en: "Habits",
      es: "Hábitos",
      fr: "Habitudes",
      it: "Abitudini",
    }[language],
    tempo: {
      pt: "Tempo",
      en: "Time",
      es: "Tiempo",
      fr: "Temps",
      it: "Tempo",
    }[language],
    trabalho: {
      pt: "Trabalho",
      en: "Work",
      es: "Trabajo",
      fr: "Travail",
      it: "Lavoro",
    }[language],
    lazer: {
      pt: "Lazer",
      en: "Leisure",
      es: "Ocio",
      fr: "Loisirs",
      it: "Svago",
    }[language],
    espiritualidade: {
      pt: "Espiritualidade",
      en: "Spirituality",
      es: "Espiritualidad",
      fr: "Spiritualité",
      it: "Spiritualità",
    }[language],
  } satisfies Record<FinanceJourneyModuleKey, string>;
}

function getExperienceNoteBias(note: string) {
  const normalized = note
    .toLocaleLowerCase(LANGUAGE_LOCALE.pt)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!normalized) {
    return {} as Partial<Record<FinanceJourneyModuleKey, number>>;
  }

  const noteBias: Partial<Record<FinanceJourneyModuleKey, number>> = {};

  const applyBias = (
    key: FinanceJourneyModuleKey,
    value: number,
    patterns: RegExp[]
  ) => {
    if (patterns.some((pattern) => pattern.test(normalized))) {
      noteBias[key] = Math.min((noteBias[key] ?? 0) + value, 0);
    }
  };

  applyBias("financeiro", -0.7, [
    /dinhe/,
    /finan/,
    /gasto/,
    /divid/,
    /debt/,
    /money/,
    /budget/,
    /saldo/,
  ]);
  applyBias("saude", -0.7, [
    /saud/,
    /health/,
    /sleep/,
    /sono/,
    /dor/,
    /cansa/,
    /energy/,
    /energia/,
  ]);
  applyBias("tempo", -0.7, [
    /tempo/,
    /time/,
    /agenda/,
    /rush/,
    /correria/,
    /rotina/,
    /rutina/,
    /schedule/,
  ]);
  applyBias("trabalho", -0.65, [
    /trabal/,
    /work/,
    /job/,
    /career/,
    /carreira/,
    /lavor/,
  ]);
  applyBias("aprendizado", -0.55, [
    /aprend/,
    /learn/,
    /study/,
    /estud/,
    /curso/,
    /course/,
  ]);
  applyBias("habitos", -0.55, [
    /habit/,
    /consisten/,
    /ritmo/,
    /disciplin/,
  ]);
  applyBias("lazer", -0.55, [
    /lazer/,
    /ocio/,
    /loisir/,
    /svago/,
    /descans/,
    /rest/,
  ]);
  applyBias("espiritualidade", -0.55, [
    /espirit/,
    /orac/,
    /pray/,
    /faith/,
    /fe\b/,
    /medita/,
    /paz/,
    /peace/,
  ]);

  return noteBias;
}

function getFinanceJourneyModuleRank(
  context: JourneyContext,
  language: AppLanguage = DEFAULT_APP_LANGUAGE,
  primaryArea: LifeArea = "financeiro"
) {
  const labels = getFinanceJourneyModuleLabels(language);
  const lowExperienceBias =
    context.latestExperienceRating !== null && context.latestExperienceRating <= 2
      ? {
          saude: -0.8,
          lazer: -0.7,
          espiritualidade: -0.65,
          tempo: -0.55,
          habitos: -0.45,
        }
      : {};
  const highExperienceBias =
    context.latestExperienceRating !== null && context.latestExperienceRating >= 4
      ? {
          trabalho: -0.7,
          aprendizado: -0.6,
          metas: -0.55,
          financeiro: -0.4,
        }
      : {};
  const noteBias = getExperienceNoteBias(context.latestExperienceNote);
  const experienceBias = {
    ...lowExperienceBias,
    ...highExperienceBias,
    ...noteBias,
  } as Partial<Record<FinanceJourneyModuleKey, number>>;
  const getBias = (key: FinanceJourneyModuleKey) =>
    (experienceBias[key] ?? 0) + (key === primaryArea ? -0.45 : 0);

  return [
    {
      key: "financeiro" as const,
      label: labels.financeiro,
      score:
        Math.min(4, context.fixedBillsCount + context.moneyEntriesCount) +
        getBias("financeiro"),
    },
    {
      key: "saude" as const,
      label: labels.saude,
      score:
        Math.min(2, context.medicationsCount + context.medicationsTakenToday) +
        getBias("saude"),
    },
    {
      key: "metas" as const,
      label: labels.metas,
      score:
        Math.min(2, context.goalsCount + context.goalsTodayCount) +
        getBias("metas"),
    },
    {
      key: "aprendizado" as const,
      label: labels.aprendizado,
      score:
        Math.min(2, context.learningItemsCount + context.learningTodayCount) +
        getBias("aprendizado"),
    },
    {
      key: "habitos" as const,
      label: labels.habitos,
      score:
        Math.min(2, context.habitsCount + context.habitsCompletedToday) +
        getBias("habitos"),
    },
    {
      key: "tempo" as const,
      label: labels.tempo,
      score:
        Math.min(2, context.timeItemsCount + context.timeTodayCount) +
        getBias("tempo"),
    },
    {
      key: "trabalho" as const,
      label: labels.trabalho,
      score:
        Math.min(2, context.workItemsCount + context.workTodayCount) +
        getBias("trabalho"),
    },
    {
      key: "lazer" as const,
      label: labels.lazer,
      score:
        Math.min(2, context.leisureItemsCount + context.leisureTodayCount) +
        getBias("lazer"),
    },
    {
      key: "espiritualidade" as const,
      label: labels.espiritualidade,
      score:
        Math.min(2, context.spiritualItemsCount + context.spiritualTodayCount) +
        getBias("espiritualidade"),
    },
  ].sort((a, b) => a.score - b.score);
}

function buildFinanceDynamicTaskMap(context: JourneyContext): Record<FinanceJourneyModuleKey, JourneyTaskTemplate> {
  return {
    financeiro: {
      title: "",
      validationType: "money_entries_today",
      targetValue: 1,
    },
    saude:
      context.medicationsCount > 0
        ? {
            title: "",
            validationType: "medications_taken_today",
            targetValue: 1,
          }
        : {
            title: "",
            validationType: "medications_total",
            targetValue: 1,
          },
    metas:
      context.goalsCount > 0
        ? {
            title: "",
            validationType: "goals_today",
            targetValue: 1,
          }
        : {
            title: "",
            validationType: "goals_total",
            targetValue: 1,
          },
    aprendizado:
      context.learningItemsCount > 0
        ? {
            title: "",
            validationType: "learning_today",
            targetValue: 1,
          }
        : {
            title: "",
            validationType: "learning_items_total",
            targetValue: 1,
          },
    habitos:
      context.habitsCount > 0
        ? {
            title: "",
            validationType: "habits_completed_today",
            targetValue: 1,
          }
        : {
            title: "",
            validationType: "habits_total",
            targetValue: 1,
          },
    tempo:
      context.timeItemsCount > 0
        ? {
            title: "",
            validationType: "time_today",
            targetValue: 1,
          }
        : {
            title: "",
            validationType: "time_items_total",
            targetValue: 1,
          },
    trabalho:
      context.workItemsCount > 0
        ? {
            title: "",
            validationType: "work_today",
            targetValue: 1,
          }
        : {
            title: "",
            validationType: "work_items_total",
            targetValue: 1,
          },
    lazer:
      context.leisureItemsCount > 0
        ? {
            title: "",
            validationType: "leisure_today",
            targetValue: 1,
          }
        : {
            title: "",
            validationType: "leisure_items_total",
            targetValue: 1,
          },
    espiritualidade:
      context.spiritualItemsCount > 0
        ? {
            title: "",
            validationType: "spiritual_today",
            targetValue: 1,
          }
        : {
            title: "",
            validationType: "spiritual_items_total",
            targetValue: 1,
          },
  };
}

function buildFinanceJourneyDays(
  context: JourneyContext,
  language: AppLanguage = DEFAULT_APP_LANGUAGE,
  primaryArea: LifeArea = "financeiro"
): AIJourneyDay[] {
  const titles = {
    pt: [
      "Mapa inicial da sua vida",
      "Primeiro ajuste integrado",
      "Rotina que sustenta o sistema",
      "Direção com clareza",
      "Decisões mais conscientes",
      "Base mais estável",
      "Fechamento da primeira fase",
    ],
    en: [
      "Initial map of your life",
      "First integrated adjustment",
      "A routine that supports the system",
      "Direction with clarity",
      "More conscious decisions",
      "A more stable base",
      "Closing the first phase",
    ],
    es: [
      "Mapa inicial de tu vida",
      "Primer ajuste integrado",
      "Rutina que sostiene el sistema",
      "Dirección con claridad",
      "Decisiones más conscientes",
      "Base más estable",
      "Cierre de la primera fase",
    ],
    fr: [
      "Carte initiale de votre vie",
      "Premier ajustement intégré",
      "Une routine qui soutient le système",
      "Direction avec clarté",
      "Des décisions plus conscientes",
      "Une base plus stable",
      "Clôture de la première phase",
    ],
    it: [
      "Mappa iniziale della tua vita",
      "Primo aggiustamento integrato",
      "Una routine che sostiene il sistema",
      "Direzione con chiarezza",
      "Decisioni più consapevoli",
      "Base più stabile",
      "Chiusura della prima fase",
    ],
  } as const;

  const rankedModules = getFinanceJourneyModuleRank(
    context,
    language,
    primaryArea
  );
  const dynamicTaskMap = buildFinanceDynamicTaskMap(context);
  const labels = getFinanceJourneyModuleLabels(language);
  const primaryAreaLabel = getLifeAreaLabel(primaryArea, language);

  const intakeTasks: JourneyTaskTemplate[] = [
    { title: "", validationType: "fixed_bills_total", targetValue: 1 },
    { title: "", validationType: "money_entries_total", targetValue: 2 },
    { title: "", validationType: "medications_total", targetValue: 1 },
    { title: "", validationType: "goals_total", targetValue: 1 },
    { title: "", validationType: "learning_today", targetValue: 1 },
    { title: "", validationType: "habits_total", targetValue: 1 },
    { title: "", validationType: "time_today", targetValue: 1 },
    { title: "", validationType: "work_today", targetValue: 1 },
    { title: "", validationType: "leisure_today", targetValue: 1 },
    { title: "", validationType: "spiritual_today", targetValue: 1 },
  ];

  const intakeSummary = interpolate(
    {
      pt: "Alimente dinheiro, saúde, metas, aprendizado, hábitos, tempo, trabalho, lazer e espiritualidade para a IA entender sua vida real antes de sugerir o Dia 2 da sua jornada em {{primaryArea}}.",
      en: "Feed Money, Health, Goals, Learning, Habits, Time, Work, Leisure, and Spirituality so the AI can understand your real life before it suggests Day 2 of your {{primaryArea}} journey.",
      es: "Alimenta Dinero, Salud, Metas, Aprendizaje, Hábitos, Tiempo, Trabajo, Ocio y Espiritualidad para que la IA entienda tu vida real antes de sugerir el Día 2 de tu jornada en {{primaryArea}}.",
      fr: "Alimentez Argent, Santé, Objectifs, Apprentissage, Habitudes, Temps, Travail, Loisirs et Spiritualité pour que l'IA comprenne votre vie réelle avant de suggérer le Jour 2 de votre parcours en {{primaryArea}}.",
      it: "Alimenta Denaro, Salute, Obiettivi, Apprendimento, Abitudini, Tempo, Lavoro, Svago e Spiritualità così l'IA può capire la tua vita reale prima di suggerire il Giorno 2 del tuo percorso in {{primaryArea}}.",
    }[language],
    { primaryArea: primaryAreaLabel }
  );

  const followUpIntro = {
    pt: "A IA leu sua base e quer reforçar {{focusA}} e {{focusB}} para que sua jornada em {{primaryArea}} organize o restante da vida junto.",
    en: "The AI has read your base and wants to strengthen {{focusA}} and {{focusB}} so your {{primaryArea}} journey can organize the rest of your life together.",
    es: "La IA ya leyó tu base y quiere reforzar {{focusA}} y {{focusB}} para que tu jornada en {{primaryArea}} organice el resto de tu vida en conjunto.",
    fr: "L'IA a déjà lu votre base et veut renforcer {{focusA}} et {{focusB}} pour que votre parcours en {{primaryArea}} organise aussi le reste de votre vie.",
    it: "L'IA ha già letto la tua base e vuole rafforzare {{focusA}} e {{focusB}} perché il tuo percorso in {{primaryArea}} organizzi anche il resto della tua vita.",
  } as const;

  const rewardByDay = [120, 90, 95, 95, 100, 100, 110];

  const buildTask = (
    task: JourneyTaskTemplate,
    day: number,
    taskIndex: number
  ): AIJourneyTask => ({
    id: `${primaryArea}_day_${day}_task_${taskIndex + 1}`,
    title: getTaskTitle(language, task.validationType, task.targetValue),
    validationType: task.validationType,
    targetValue: task.targetValue,
    currentValue: 0,
    completed: false,
  });

  const days: AIJourneyDay[] = [
    {
      day: 1,
      title: titles[language][0],
      summary: intakeSummary,
      rewardXp: rewardByDay[0],
      tasks: intakeTasks.map((task, index) => buildTask(task, 1, index)),
    },
  ];

  for (let day = 2; day <= 7; day += 1) {
    const focusA =
      rankedModules[(day - 2) % rankedModules.length]?.key ?? "tempo";
    const focusB =
      rankedModules[(day - 1) % rankedModules.length]?.key ?? "trabalho";
    const orderedModules = Array.from(
      new Set<FinanceJourneyModuleKey>([
        focusA,
        focusB,
        ...FINANCE_JOURNEY_MODULE_ORDER,
      ])
    );

    const summary = interpolate(followUpIntro[language], {
      focusA: labels[focusA],
      focusB: labels[focusB],
      primaryArea: primaryAreaLabel,
    });

    days.push({
      day,
      title: titles[language][day - 1],
      summary,
      rewardXp: rewardByDay[day - 1],
      tasks: orderedModules.map((moduleKey, taskIndex) =>
        buildTask(dynamicTaskMap[moduleKey], day, taskIndex)
      ),
    });
  }

  return days;
}

function buildFinanceCompletionFeedback(
  completedDay: number,
  context: JourneyContext,
  language: AppLanguage = DEFAULT_APP_LANGUAGE,
  primaryArea: LifeArea = "financeiro"
) {
  const rankedModules = getFinanceJourneyModuleRank(
    context,
    language,
    primaryArea
  );
  const labels = getFinanceJourneyModuleLabels(language);
  const weakestA = rankedModules[0]?.label ?? labels.tempo;
  const weakestB = rankedModules[1]?.label ?? labels.trabalho;
  const strongest = [...rankedModules].sort((a, b) => b.score - a.score);
  const strongestA = strongest[0]?.label ?? labels.financeiro;
  const strongestB = strongest[1]?.label ?? labels.saude;
  const primaryAreaLabel = getLifeAreaLabel(primaryArea, language);
  const nextDay = Math.min(7, completedDay + 1);
  const noteSentence = context.latestExperienceNote
    ? {
        pt: "A IA também leu o que você compartilhou sobre a experiência de hoje para ajustar melhor o próximo dia.",
        en: "The AI also read what you shared about today's experience to better tune the next day.",
        es: "La IA también leyó lo que compartiste sobre la experiencia de hoy para ajustar mejor el próximo día.",
        fr: "L'IA a aussi lu ce que vous avez partagé sur l'expérience d'aujourd'hui afin d'ajuster au mieux le jour suivant.",
        it: "L'IA ha anche letto ciò che hai condiviso sull'esperienza di oggi per calibrare meglio il giorno successivo.",
      }[language]
    : "";
  const experienceSentence =
    context.latestExperienceRating === null
      ? {
          pt: "Se quiser, compartilhe na tela de evolução como foi o seu dia para a IA calibrar melhor o próximo passo.",
          en: "If you want, share in the evolution screen how your day felt so the AI can calibrate the next step better.",
          es: "Si quieres, comparte en la pantalla de evolución cómo se sintió tu día para que la IA calibre mejor el siguiente paso.",
          fr: "Si vous le souhaitez, partagez dans l'écran d'évolution comment votre journée s'est passée afin que l'IA calibre mieux l'étape suivante.",
          it: "Se vuoi, condividi nella schermata di evoluzione com'è andata la tua giornata così l'IA potrà calibrare meglio il passo successivo.",
        }[language]
      : context.latestExperienceRating <= 2
        ? {
            pt: "Como sua experiência recente pareceu mais pesada, a IA vai priorizar tarefas que devolvam base e alívio antes de aumentar a cobrança.",
            en: "Because your recent experience felt heavier, the AI will prioritize tasks that restore stability and relief before increasing the pressure.",
            es: "Como tu experiencia reciente se sintió más pesada, la IA priorizará tareas que devuelvan base y alivio antes de aumentar la exigencia.",
            fr: "Comme votre expérience récente a semblé plus lourde, l'IA priorisera des tâches qui redonnent base et soulagement avant d'augmenter l'exigence.",
            it: "Poiché la tua esperienza recente è sembrata più pesante, l'IA darà priorità a compiti che riportino base e sollievo prima di aumentare l'intensità.",
          }[language]
        : context.latestExperienceRating >= 4
          ? {
              pt: "Como sua experiência recente foi mais positiva, a IA pode elevar um pouco o ritmo sem perder a organização do sistema.",
              en: "Because your recent experience felt more positive, the AI can raise the pace a little without losing the system's organization.",
              es: "Como tu experiencia reciente fue más positiva, la IA puede subir un poco el ritmo sin perder la organización del sistema.",
              fr: "Comme votre expérience récente a été plus positive, l'IA peut augmenter légèrement le rythme sans perdre l'organisation du système.",
              it: "Poiché la tua esperienza recente è stata più positiva, l'IA può alzare leggermente il ritmo senza perdere l'organizzazione del sistema.",
            }[language]
          : {
              pt: "A IA também vai considerar como você está vivenciando a jornada para calibrar melhor a intensidade do próximo dia.",
              en: "The AI will also consider how you are experiencing the journey to better calibrate the intensity of the next day.",
              es: "La IA también tendrá en cuenta cómo estás viviendo la jornada para calibrar mejor la intensidad del próximo día.",
              fr: "L'IA tiendra aussi compte de la manière dont vous vivez le parcours pour mieux calibrer l'intensité du jour suivant.",
              it: "L'IA terrà conto anche di come stai vivendo il percorso per calibrare meglio l'intensità del giorno successivo.",
            }[language];
  const calibratedExperienceSentence = `${experienceSentence}${
    noteSentence ? ` ${noteSentence}` : ""
  }`;

  if (completedDay === 1) {
    return {
      title: {
        pt: "Leitura inicial concluída",
        en: "Initial reading completed",
        es: "Lectura inicial completada",
        fr: "Lecture initiale terminée",
        it: "Lettura iniziale completata",
      }[language],
      text: {
        pt: `A IA já recebeu uma primeira leitura da sua vida para fortalecer ${primaryAreaLabel}. Sua base está mais presente em ${strongestA} e ${strongestB}, enquanto ${weakestA} e ${weakestB} ainda pedem mais cuidado. O Dia ${nextDay} será programado com base nisso e só será liberado à meia-noite. ${calibratedExperienceSentence}`,
        en: `The AI has already received a first reading of your life to strengthen ${primaryAreaLabel}. Your base is stronger in ${strongestA} and ${strongestB}, while ${weakestA} and ${weakestB} still need more care. Day ${nextDay} will be programmed from that and will only unlock at midnight. ${calibratedExperienceSentence}`,
        es: `La IA ya recibió una primera lectura de tu vida para fortalecer ${primaryAreaLabel}. Tu base está más presente en ${strongestA} y ${strongestB}, mientras que ${weakestA} y ${weakestB} todavía necesitan más atención. El Día ${nextDay} se programará con base en eso y solo se liberará a la medianoche. ${calibratedExperienceSentence}`,
        fr: `L'IA a déjà reçu une première lecture de votre vie pour renforcer ${primaryAreaLabel}. Votre base est plus présente dans ${strongestA} et ${strongestB}, tandis que ${weakestA} et ${weakestB} demandent encore plus d'attention. Le Jour ${nextDay} sera programmé à partir de cela et ne sera libéré qu'à minuit. ${calibratedExperienceSentence}`,
        it: `L'IA ha già ricevuto una prima lettura della tua vita per rafforzare ${primaryAreaLabel}. La tua base è più presente in ${strongestA} e ${strongestB}, mentre ${weakestA} e ${weakestB} richiedono ancora più attenzione. Il Giorno ${nextDay} verrà programmato partendo da questo e sarà sbloccato solo a mezzanotte. ${calibratedExperienceSentence}`,
      }[language],
    };
  }

  return {
    title: {
      pt: `Dia ${completedDay} concluído`,
      en: `Day ${completedDay} completed`,
      es: `Día ${completedDay} completado`,
      fr: `Jour ${completedDay} terminé`,
      it: `Giorno ${completedDay} completato`,
    }[language],
    text: {
      pt: `A IA analisou tudo o que você concluiu hoje para fazer ${primaryAreaLabel} conversar com o resto da sua vida. O melhor sinal apareceu em ${strongestA} e ${strongestB}; a próxima atenção vai para ${weakestA} e ${weakestB}. O Dia ${nextDay} já está sendo programado e só será liberado à meia-noite. ${calibratedExperienceSentence}`,
      en: `The AI analyzed everything you completed today to make ${primaryAreaLabel} talk to the rest of your life. The strongest signal appeared in ${strongestA} and ${strongestB}; the next focus will be ${weakestA} and ${weakestB}. Day ${nextDay} is already being programmed and will only unlock at midnight. ${calibratedExperienceSentence}`,
      es: `La IA analizó todo lo que completaste hoy para hacer que ${primaryAreaLabel} converse con el resto de tu vida. La señal más fuerte apareció en ${strongestA} y ${strongestB}; la próxima atención irá a ${weakestA} y ${weakestB}. El Día ${nextDay} ya se está programando y solo se liberará a la medianoche. ${calibratedExperienceSentence}`,
      fr: `L'IA a analysé tout ce que vous avez terminé aujourd'hui pour faire dialoguer ${primaryAreaLabel} avec le reste de votre vie. Le signal le plus fort est apparu dans ${strongestA} et ${strongestB} ; l'attention suivante ira vers ${weakestA} et ${weakestB}. Le Jour ${nextDay} est déjà en cours de programmation et ne sera libéré qu'à minuit. ${calibratedExperienceSentence}`,
      it: `L'IA ha analizzato tutto ciò che hai completato oggi per fare in modo che ${primaryAreaLabel} dialoghi con il resto della tua vita. Il segnale più forte è apparso in ${strongestA} e ${strongestB}; la prossima attenzione andrà a ${weakestA} e ${weakestB}. Il Giorno ${nextDay} è già in programmazione e sarà sbloccato solo a mezzanotte. ${calibratedExperienceSentence}`,
    }[language],
  };
}

export async function evaluateJourney(
  rawPlan: Partial<LifeJourneyPlan> | null | undefined,
  rawProgress: Partial<AIJourneyProgress> | null | undefined,
  language: AppLanguage = DEFAULT_APP_LANGUAGE
) {
  const plan = normalizeLifeJourneyPlan(rawPlan, language);

  if (!plan) {
    return {
      plan: null,
      progress: createInitialJourneyProgress(),
    };
  }

  const progress = normalizeJourneyProgress(rawProgress);
  const context = await readJourneyContext();
  const baseJourneyDays = buildFinanceJourneyDays(
    context,
    language,
    plan.primaryArea
  );

  const now = new Date();
  let unlockedDays = Array.from(
    new Set(
      (progress.unlockedDays?.length ? progress.unlockedDays : [1]).filter(
        (day) => day >= 1 && day <= baseJourneyDays.length
      )
    )
  ).sort((a, b) => a - b);
  let nextDayUnlockAt = progress.nextDayUnlockAt;
  let analysisStatus = progress.analysisStatus || "idle";
  let analysisStartedAt = progress.analysisStartedAt;
  let analysisCompletedAt = progress.analysisCompletedAt;
  let pendingFeedbackTitle = progress.pendingFeedbackTitle;
  let pendingFeedbackText = progress.pendingFeedbackText;
  let latestFeedbackTitle = progress.latestFeedbackTitle;
  let latestFeedbackText = progress.latestFeedbackText;
  let lastAnalyzedDay = progress.lastAnalyzedDay;

  const completedBeforeRelease = [...new Set(progress.completedDays)].sort(
    (a, b) => a - b
  );
  const highestCompletedBeforeRelease = completedBeforeRelease.length
    ? completedBeforeRelease[completedBeforeRelease.length - 1]
    : 0;

  if (highestCompletedBeforeRelease === 0 && !unlockedDays.includes(1)) {
    unlockedDays = [1];
  }

  if (analysisStatus === "processing" && analysisCompletedAt) {
    const analysisMoment = new Date(analysisCompletedAt);

    if (now.getTime() >= analysisMoment.getTime()) {
      analysisStatus = "ready";
    }
  }

  if (nextDayUnlockAt && highestCompletedBeforeRelease > 0) {
    const unlockMoment = new Date(nextDayUnlockAt);

    if (now.getTime() >= unlockMoment.getTime()) {
      const nextDayNumber = Math.min(
        baseJourneyDays.length,
        highestCompletedBeforeRelease + 1
      );
      unlockedDays = Array.from(
        new Set([...unlockedDays, nextDayNumber, ...completedBeforeRelease, 1])
      ).sort((a, b) => a - b);
      nextDayUnlockAt = undefined;
      pendingFeedbackTitle = undefined;
      pendingFeedbackText = undefined;
      analysisStatus = "idle";
      analysisStartedAt = undefined;
      analysisCompletedAt = undefined;
    } else {
      unlockedDays = unlockedDays.filter((day) => day <= highestCompletedBeforeRelease);
    }
  }

  const journeyDays = baseJourneyDays.map((day) => ({
    ...day,
    tasks: day.tasks.map((task) => {
      const currentValue = getTaskCurrentValue(task, context);
      return {
        ...task,
        currentValue,
        completed: currentValue >= task.targetValue,
      };
    }),
  }));

  const nextCompletedDays = [...progress.completedDays];
  let totalXp = progress.totalXp;
  let lastCompletedAt = progress.lastCompletedAt;

  for (const day of journeyDays) {
    const unlocked = unlockedDays.includes(day.day);
    const finished = day.tasks.every((task) => task.completed);
    const alreadyCompleted = nextCompletedDays.includes(day.day);

    if (unlocked && finished && !alreadyCompleted) {
      nextCompletedDays.push(day.day);
      totalXp += day.rewardXp;
      lastCompletedAt = now.toISOString();

      if (day.day < journeyDays.length) {
        nextDayUnlockAt = getNextLocalMidnightIso(now);
        unlockedDays = unlockedDays.filter((value) => value <= day.day);
        const feedback = buildFinanceCompletionFeedback(
          day.day,
          context,
          language,
          plan.primaryArea
        );
        pendingFeedbackTitle = feedback.title;
        pendingFeedbackText = feedback.text;
        latestFeedbackTitle = feedback.title;
        latestFeedbackText = feedback.text;
        lastAnalyzedDay = day.day;
        analysisStatus = "processing";
        analysisStartedAt = now.toISOString();
        analysisCompletedAt = new Date(
          now.getTime() + JOURNEY_ANALYSIS_DELAY_MS
        ).toISOString();
      } else {
        nextDayUnlockAt = undefined;
        pendingFeedbackTitle = undefined;
        pendingFeedbackText = undefined;
        analysisStatus = "ready";
        analysisStartedAt = now.toISOString();
        analysisCompletedAt = now.toISOString();
      }
    }
  }

  const orderedCompleted = [...new Set(nextCompletedDays)].sort((a, b) => a - b);
  const highestCompleted = orderedCompleted.length
    ? orderedCompleted[orderedCompleted.length - 1]
    : 0;
  const resolvedUnlockedDays = Array.from(
    new Set([1, ...orderedCompleted, ...unlockedDays])
  ).sort((a, b) => a - b);
  const firstActionableDay =
    resolvedUnlockedDays.find((day) => !orderedCompleted.includes(day)) ?? 1;
  const waitingForNextRelease =
    Boolean(nextDayUnlockAt) && highestCompleted > 0 && highestCompleted < journeyDays.length;
  const currentDay =
    orderedCompleted.length >= journeyDays.length
      ? journeyDays.length
      : waitingForNextRelease
        ? highestCompleted
        : firstActionableDay;

  const nextProgress: AIJourneyProgress = {
    ...progress,
    currentDay,
    completedDays: orderedCompleted,
    unlockedDays: resolvedUnlockedDays,
    totalXp,
    lastCompletedAt,
    nextDayUnlockAt,
    analysisStatus,
    analysisStartedAt,
    analysisCompletedAt,
    pendingFeedbackTitle,
    pendingFeedbackText,
    latestFeedbackTitle,
    latestFeedbackText,
    lastAnalyzedDay,
    finishedAt:
      orderedCompleted.length === journeyDays.length
        ? progress.finishedAt || new Date().toISOString()
        : undefined,
  };

  return {
    plan: {
      ...plan,
      journeyDays,
    },
    progress: nextProgress,
  };
}
