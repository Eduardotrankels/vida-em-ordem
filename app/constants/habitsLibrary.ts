import type { SupportedAppLanguage } from "./achievements";

export type HabitItem = {
  id: string;
  title: string;
  isPremium?: boolean;
};

export type HabitCategory = {
  id: string;
  title: string;
  items: HabitItem[];
};

const CATEGORY_TITLES: Record<
  string,
  Record<SupportedAppLanguage, string>
> = {
  rotina: {
    pt: "🌅 Rotina e Disciplina",
    en: "🌅 Routine and Discipline",
    es: "🌅 Rutina y disciplina",
    fr: "🌅 Routine et discipline",
    it: "🌅 Routine e disciplina",
  },
  saude: {
    pt: "💧 Saúde e Energia",
    en: "💧 Health and Energy",
    es: "💧 Salud y energía",
    fr: "💧 Santé et énergie",
    it: "💧 Salute ed energia",
  },
  mente: {
    pt: "🧠 Mente e Emoções",
    en: "🧠 Mind and Emotions",
    es: "🧠 Mente y emociones",
    fr: "🧠 Esprit et émotions",
    it: "🧠 Mente ed emozioni",
  },
  prod: {
    pt: "⚙️ Produtividade",
    en: "⚙️ Productivity",
    es: "⚙️ Productividad",
    fr: "⚙️ Productivité",
    it: "⚙️ Produttività",
  },
  cres: {
    pt: "📚 Crescimento Pessoal",
    en: "📚 Personal Growth",
    es: "📚 Crecimiento personal",
    fr: "📚 Développement personnel",
    it: "📚 Crescita personale",
  },
  fin: {
    pt: "💰 Finanças",
    en: "💰 Finances",
    es: "💰 Finanzas",
    fr: "💰 Finances",
    it: "💰 Finanze",
  },
};

const HABIT_TITLES: Record<string, Record<SupportedAppLanguage, string>> = {
  rot_01: {
    pt: "Acordar no mesmo horário",
    en: "Wake up at the same time",
    es: "Despertar a la misma hora",
    fr: "Se réveiller à la même heure",
    it: "Svegliarsi alla stessa ora",
  },
  rot_02: {
    pt: "Arrumar a cama",
    en: "Make the bed",
    es: "Tender la cama",
    fr: "Faire le lit",
    it: "Fare il letto",
  },
  rot_03: {
    pt: "Planejar o dia (3 prioridades)",
    en: "Plan the day (3 priorities)",
    es: "Planear el día (3 prioridades)",
    fr: "Planifier la journée (3 priorités)",
    it: "Pianificare la giornata (3 priorità)",
  },
  rot_04: {
    pt: "Organizar o ambiente por 5 min",
    en: "Tidy the space for 5 min",
    es: "Ordenar el espacio durante 5 min",
    fr: "Ranger l'espace pendant 5 min",
    it: "Sistemare l'ambiente per 5 min",
  },
  rot_05: {
    pt: "Dormir em horário fixo",
    en: "Sleep at a fixed time",
    es: "Dormir en un horario fijo",
    fr: "Dormir à heure fixe",
    it: "Dormire a un orario fisso",
  },
  rot_06: {
    pt: "Rotina matinal (10 min)",
    en: "Morning routine (10 min)",
    es: "Rutina matinal (10 min)",
    fr: "Routine matinale (10 min)",
    it: "Routine mattutina (10 min)",
  },
  sau_01: {
    pt: "Beber água",
    en: "Drink water",
    es: "Beber agua",
    fr: "Boire de l'eau",
    it: "Bere acqua",
  },
  sau_02: {
    pt: "Caminhar 10 minutos",
    en: "Walk for 10 minutes",
    es: "Caminar 10 minutos",
    fr: "Marcher 10 minutes",
    it: "Camminare per 10 minuti",
  },
  sau_03: {
    pt: "Alongar 5 minutos",
    en: "Stretch for 5 minutes",
    es: "Estirar 5 minutos",
    fr: "S'étirer 5 minutes",
    it: "Fare stretching per 5 minuti",
  },
  sau_04: {
    pt: "Comer uma fruta",
    en: "Eat one fruit",
    es: "Comer una fruta",
    fr: "Manger un fruit",
    it: "Mangiare un frutto",
  },
  sau_05: {
    pt: "Treino rápido (15 min)",
    en: "Quick workout (15 min)",
    es: "Entrenamiento rápido (15 min)",
    fr: "Entraînement rapide (15 min)",
    it: "Allenamento rapido (15 min)",
  },
  sau_06: {
    pt: "Dormir 7-8h",
    en: "Sleep 7-8h",
    es: "Dormir 7-8h",
    fr: "Dormir 7-8 h",
    it: "Dormire 7-8 ore",
  },
  men_01: {
    pt: "Respiração 2 minutos",
    en: "Breathing for 2 minutes",
    es: "Respiración durante 2 minutos",
    fr: "Respiration pendant 2 minutes",
    it: "Respirazione per 2 minuti",
  },
  men_02: {
    pt: "Gratidão (3 coisas)",
    en: "Gratitude (3 things)",
    es: "Gratitud (3 cosas)",
    fr: "Gratitude (3 choses)",
    it: "Gratitudine (3 cose)",
  },
  men_03: {
    pt: "Meditar 5 minutos",
    en: "Meditate for 5 minutes",
    es: "Meditar 5 minutos",
    fr: "Méditer 5 minutes",
    it: "Meditare 5 minuti",
  },
  men_04: {
    pt: "Journaling (5 min)",
    en: "Journaling (5 min)",
    es: "Escritura personal (5 min)",
    fr: "Journal personnel (5 min)",
    it: "Journaling (5 min)",
  },
  men_05: {
    pt: "Evitar reclamações hoje",
    en: "Avoid complaints today",
    es: "Evitar quejarse hoy",
    fr: "Éviter les plaintes aujourd'hui",
    it: "Evitare lamentele oggi",
  },
  pro_01: {
    pt: "Focar 25 min (Pomodoro)",
    en: "Focus for 25 min (Pomodoro)",
    es: "Enfocarse 25 min (Pomodoro)",
    fr: "Se concentrer 25 min (Pomodoro)",
    it: "Concentrarsi 25 min (Pomodoro)",
  },
  pro_02: {
    pt: "Organizar agenda do dia",
    en: "Organize today's agenda",
    es: "Organizar la agenda del día",
    fr: "Organiser l'agenda du jour",
    it: "Organizzare l'agenda del giorno",
  },
  pro_03: {
    pt: "Sem redes sociais por 1 hora",
    en: "No social media for 1 hour",
    es: "Sin redes sociales por 1 hora",
    fr: "Sans réseaux sociaux pendant 1 heure",
    it: "Niente social per 1 ora",
  },
  pro_04: {
    pt: "Bloco profundo 45 min",
    en: "Deep work block 45 min",
    es: "Bloque profundo de 45 min",
    fr: "Bloc de concentration 45 min",
    it: "Blocco profondo da 45 min",
  },
  cre_01: {
    pt: "Ler 10 minutos",
    en: "Read for 10 minutes",
    es: "Leer 10 minutos",
    fr: "Lire 10 minutes",
    it: "Leggere 10 minuti",
  },
  cre_02: {
    pt: "Estudar 15 minutos",
    en: "Study for 15 minutes",
    es: "Estudiar 15 minutos",
    fr: "Étudier 15 minutes",
    it: "Studiare 15 minuti",
  },
  cre_03: {
    pt: "Aprender algo novo",
    en: "Learn something new",
    es: "Aprender algo nuevo",
    fr: "Apprendre quelque chose de nouveau",
    it: "Imparare qualcosa di nuovo",
  },
  cre_04: {
    pt: "Revisar metas (2 min)",
    en: "Review goals (2 min)",
    es: "Revisar metas (2 min)",
    fr: "Revoir les objectifs (2 min)",
    it: "Rivedere gli obiettivi (2 min)",
  },
  fin_01: {
    pt: "Anotar gastos do dia",
    en: "Log today's expenses",
    es: "Anotar gastos del día",
    fr: "Noter les dépenses du jour",
    it: "Registrare le spese del giorno",
  },
  fin_02: {
    pt: "Separar 10% para reserva",
    en: "Set aside 10% for savings",
    es: "Separar un 10% para reserva",
    fr: "Mettre 10 % de côté pour la réserve",
    it: "Mettere da parte il 10% per la riserva",
  },
  fin_03: {
    pt: "Revisar assinaturas",
    en: "Review subscriptions",
    es: "Revisar suscripciones",
    fr: "Vérifier les abonnements",
    it: "Rivedere gli abbonamenti",
  },
};

export const HABITS_LIBRARY: HabitCategory[] = [
  {
    id: "rotina",
    title: CATEGORY_TITLES.rotina.pt,
    items: [
      { id: "rot_01", title: HABIT_TITLES.rot_01.pt },
      { id: "rot_02", title: HABIT_TITLES.rot_02.pt },
      { id: "rot_03", title: HABIT_TITLES.rot_03.pt },
      { id: "rot_04", title: HABIT_TITLES.rot_04.pt },
      { id: "rot_05", title: HABIT_TITLES.rot_05.pt, isPremium: true },
      { id: "rot_06", title: HABIT_TITLES.rot_06.pt, isPremium: true },
    ],
  },
  {
    id: "saude",
    title: CATEGORY_TITLES.saude.pt,
    items: [
      { id: "sau_01", title: HABIT_TITLES.sau_01.pt },
      { id: "sau_02", title: HABIT_TITLES.sau_02.pt },
      { id: "sau_03", title: HABIT_TITLES.sau_03.pt },
      { id: "sau_04", title: HABIT_TITLES.sau_04.pt },
      { id: "sau_05", title: HABIT_TITLES.sau_05.pt, isPremium: true },
      { id: "sau_06", title: HABIT_TITLES.sau_06.pt, isPremium: true },
    ],
  },
  {
    id: "mente",
    title: CATEGORY_TITLES.mente.pt,
    items: [
      { id: "men_01", title: HABIT_TITLES.men_01.pt },
      { id: "men_02", title: HABIT_TITLES.men_02.pt },
      { id: "men_03", title: HABIT_TITLES.men_03.pt, isPremium: true },
      { id: "men_04", title: HABIT_TITLES.men_04.pt, isPremium: true },
      { id: "men_05", title: HABIT_TITLES.men_05.pt, isPremium: true },
    ],
  },
  {
    id: "prod",
    title: CATEGORY_TITLES.prod.pt,
    items: [
      { id: "pro_01", title: HABIT_TITLES.pro_01.pt },
      { id: "pro_02", title: HABIT_TITLES.pro_02.pt },
      { id: "pro_03", title: HABIT_TITLES.pro_03.pt, isPremium: true },
      { id: "pro_04", title: HABIT_TITLES.pro_04.pt, isPremium: true },
    ],
  },
  {
    id: "cres",
    title: CATEGORY_TITLES.cres.pt,
    items: [
      { id: "cre_01", title: HABIT_TITLES.cre_01.pt },
      { id: "cre_02", title: HABIT_TITLES.cre_02.pt, isPremium: true },
      { id: "cre_03", title: HABIT_TITLES.cre_03.pt, isPremium: true },
      { id: "cre_04", title: HABIT_TITLES.cre_04.pt, isPremium: true },
    ],
  },
  {
    id: "fin",
    title: CATEGORY_TITLES.fin.pt,
    items: [
      { id: "fin_01", title: HABIT_TITLES.fin_01.pt, isPremium: true },
      { id: "fin_02", title: HABIT_TITLES.fin_02.pt, isPremium: true },
      { id: "fin_03", title: HABIT_TITLES.fin_03.pt, isPremium: true },
    ],
  },
];

export function getLocalizedHabitsLibrary(
  language: SupportedAppLanguage
): HabitCategory[] {
  return HABITS_LIBRARY.map((category) => ({
    ...category,
    title: CATEGORY_TITLES[category.id]?.[language] ?? category.title,
    items: category.items.map((item) => ({
      ...item,
      title: HABIT_TITLES[item.id]?.[language] ?? item.title,
    })),
  }));
}

export const FREE_POLICY = {
  showLockedPremiumItems: true,
};
