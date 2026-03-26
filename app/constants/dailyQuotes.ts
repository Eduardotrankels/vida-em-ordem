import type { SupportedAppLanguage } from "./achievements";

export type QuotePeriod = "morning" | "afternoon" | "night";

export type DailyQuote = {
  id: string;
  text: string;
  period: QuotePeriod;
  source?: "app" | "livro";
};

type QuoteDefinition = {
  id: string;
  period: QuotePeriod;
  source?: "app" | "livro";
};

const BASE_QUOTES: QuoteDefinition[] = [
  { id: "m1", period: "morning", source: "app" },
  { id: "m2", period: "morning", source: "app" },
  { id: "m3", period: "morning", source: "app" },
  { id: "m4", period: "morning", source: "app" },
  { id: "m5", period: "morning", source: "livro" },
  { id: "m6", period: "morning", source: "app" },
  { id: "m7", period: "morning", source: "app" },
  { id: "m8", period: "morning", source: "app" },
  { id: "a1", period: "afternoon", source: "app" },
  { id: "a2", period: "afternoon", source: "app" },
  { id: "a3", period: "afternoon", source: "app" },
  { id: "a4", period: "afternoon", source: "app" },
  { id: "a5", period: "afternoon", source: "livro" },
  { id: "a6", period: "afternoon", source: "app" },
  { id: "a7", period: "afternoon", source: "app" },
  { id: "a8", period: "afternoon", source: "app" },
  { id: "n1", period: "night", source: "app" },
  { id: "n2", period: "night", source: "app" },
  { id: "n3", period: "night", source: "app" },
  { id: "n4", period: "night", source: "app" },
  { id: "n5", period: "night", source: "livro" },
  { id: "n6", period: "night", source: "app" },
  { id: "n7", period: "night", source: "app" },
  { id: "n8", period: "night", source: "app" },
];

const QUOTE_TEXTS: Record<string, Record<SupportedAppLanguage, string>> = {
  m1: {
    pt: "Bom dia. Recomeçar com coragem também é vencer.",
    en: "Good morning. Starting again with courage is also a victory.",
    es: "Buenos días. Volver a empezar con valentía también es vencer.",
    fr: "Bonjour. Recommencer avec courage, c'est aussi gagner.",
    it: "Buongiorno. Ricominciare con coraggio è già una vittoria.",
  },
  m2: {
    pt: "Seu futuro começa nas escolhas discretas desta manhã.",
    en: "Your future begins in the quiet choices of this morning.",
    es: "Tu futuro comienza en las decisiones discretas de esta mañana.",
    fr: "Votre avenir commence dans les choix discrets de ce matin.",
    it: "Il tuo futuro inizia nelle scelte discrete di questa mattina.",
  },
  m3: {
    pt: "Hoje não precisa ser perfeito. Precisa ser feito.",
    en: "Today does not need to be perfect. It needs to be done.",
    es: "Hoy no tiene que ser perfecto. Tiene que hacerse.",
    fr: "Aujourd'hui n'a pas besoin d'être parfait. Il a besoin d'être fait.",
    it: "Oggi non deve essere perfetto. Deve solo essere fatto.",
  },
  m4: {
    pt: "Disciplina é levantar com propósito, mesmo sem aplausos.",
    en: "Discipline is getting up with purpose, even without applause.",
    es: "La disciplina es levantarse con propósito, incluso sin aplausos.",
    fr: "La discipline, c'est se lever avec un but, même sans applaudissements.",
    it: "La disciplina è alzarsi con uno scopo, anche senza applausi.",
  },
  m5: {
    pt: "Quem não desiste de si mesmo já começou a vencer.",
    en: "Whoever does not give up on themselves has already begun to win.",
    es: "Quien no se rinde consigo mismo ya empezó a vencer.",
    fr: "Celui qui ne renonce pas à lui-même a déjà commencé à gagner.",
    it: "Chi non rinuncia a se stesso ha già iniziato a vincere.",
  },
  m6: {
    pt: "Toda transformação grande começa em um pequeno gesto repetido.",
    en: "Every big transformation begins with one small repeated act.",
    es: "Toda gran transformación comienza con un pequeño gesto repetido.",
    fr: "Toute grande transformation commence par un petit geste répété.",
    it: "Ogni grande trasformazione inizia con un piccolo gesto ripetuto.",
  },
  m7: {
    pt: "Amanhecer é convite. Sua resposta é ação.",
    en: "Dawn is an invitation. Your answer is action.",
    es: "El amanecer es una invitación. Tu respuesta es acción.",
    fr: "L'aube est une invitation. Votre réponse, c'est l'action.",
    it: "L'alba è un invito. La tua risposta è l'azione.",
  },
  m8: {
    pt: "Hoje pode ser o dia em que sua constância fica mais forte que sua desculpa.",
    en: "Today can be the day your consistency becomes stronger than your excuse.",
    es: "Hoy puede ser el día en que tu constancia sea más fuerte que tu excusa.",
    fr: "Aujourd'hui peut être le jour où votre constance devient plus forte que votre excuse.",
    it: "Oggi può essere il giorno in cui la tua costanza diventa più forte della tua scusa.",
  },
  a1: {
    pt: "Persistir no meio do caminho é o que separa intenção de transformação.",
    en: "Persisting halfway through is what separates intention from transformation.",
    es: "Persistir a mitad del camino es lo que separa la intención de la transformación.",
    fr: "Persévérer au milieu du chemin, c'est ce qui sépare l'intention de la transformation.",
    it: "Perseverare a metà strada è ciò che separa l'intenzione dalla trasformazione.",
  },
  a2: {
    pt: "A disciplina da tarde protege o sonho que nasceu de manhã.",
    en: "Afternoon discipline protects the dream that was born in the morning.",
    es: "La disciplina de la tarde protege el sueño que nació por la mañana.",
    fr: "La discipline de l'après-midi protège le rêve né le matin.",
    it: "La disciplina del pomeriggio protegge il sogno nato al mattino.",
  },
  a3: {
    pt: "Seu progresso não precisa de pressa. Precisa de continuidade.",
    en: "Your progress does not need speed. It needs continuity.",
    es: "Tu progreso no necesita prisa. Necesita continuidad.",
    fr: "Votre progrès n'a pas besoin de vitesse. Il a besoin de continuité.",
    it: "Il tuo progresso non ha bisogno di fretta. Ha bisogno di continuità.",
  },
  a4: {
    pt: "Não pare no meio. Grandes mudanças gostam de continuidade.",
    en: "Do not stop halfway. Big changes thrive on continuity.",
    es: "No te detengas a mitad. Los grandes cambios aman la continuidad.",
    fr: "Ne vous arrêtez pas au milieu. Les grands changements aiment la continuité.",
    it: "Non fermarti a metà. I grandi cambiamenti amano la continuità.",
  },
  a5: {
    pt: "Persistir em silêncio também é vencer.",
    en: "Persisting in silence is also a form of victory.",
    es: "Persistir en silencio también es vencer.",
    fr: "Persister en silence, c'est aussi gagner.",
    it: "Perseverare in silenzio è comunque vincere.",
  },
  a6: {
    pt: "A metade do dia ainda pode carregar a força do dia inteiro.",
    en: "The middle of the day can still carry the strength of the whole day.",
    es: "La mitad del día todavía puede llevar la fuerza del día entero.",
    fr: "Le milieu de la journée peut encore porter la force de la journée entière.",
    it: "La metà della giornata può ancora portare la forza dell'intera giornata.",
  },
  a7: {
    pt: "Continue. A constância faz hoje parecer pequeno e o resultado parecer inevitável.",
    en: "Keep going. Consistency makes today feel small and the result feel inevitable.",
    es: "Sigue. La constancia hace que hoy parezca pequeño y el resultado inevitable.",
    fr: "Continuez. La constance rend aujourd'hui petit et le résultat inévitable.",
    it: "Continua. La costanza rende oggi piccolo e il risultato inevitabile.",
  },
  a8: {
    pt: "Quem honra o processo cresce mesmo quando ninguém percebe.",
    en: "Whoever honors the process grows even when no one notices.",
    es: "Quien honra el proceso crece incluso cuando nadie lo nota.",
    fr: "Celui qui honore le processus grandit même quand personne ne le remarque.",
    it: "Chi onora il processo cresce anche quando nessuno se ne accorge.",
  },
  n1: {
    pt: "Feche o dia com dignidade. Um passo também conta como avanço.",
    en: "Close the day with dignity. One step still counts as progress.",
    es: "Cierra el día con dignidad. Un paso también cuenta como avance.",
    fr: "Terminez la journée avec dignité. Un pas compte aussi comme un progrès.",
    it: "Chiudi la giornata con dignità. Anche un passo conta come progresso.",
  },
  n2: {
    pt: "A noite não é derrota. É balanço, aprendizado e preparo.",
    en: "Night is not defeat. It is reflection, learning, and preparation.",
    es: "La noche no es derrota. Es balance, aprendizaje y preparación.",
    fr: "La nuit n'est pas une défaite. C'est du bilan, de l'apprentissage et de la préparation.",
    it: "La notte non è una sconfitta. È bilancio, apprendimento e preparazione.",
  },
  n3: {
    pt: "Consistência vence intensidade. E hoje ainda pode terminar com consistência.",
    en: "Consistency beats intensity. And today can still end with consistency.",
    es: "La constancia vence a la intensidad. Y hoy todavía puede terminar con constancia.",
    fr: "La constance bat l'intensité. Et aujourd'hui peut encore se terminer avec constance.",
    it: "La costanza batte l'intensità. E oggi può ancora finire con costanza.",
  },
  n4: {
    pt: "Mesmo um dia difícil pode terminar com uma decisão certa.",
    en: "Even a hard day can end with one right decision.",
    es: "Incluso un día difícil puede terminar con una decisión correcta.",
    fr: "Même une journée difficile peut se terminer par une bonne décision.",
    it: "Anche una giornata difficile può finire con una decisione giusta.",
  },
  n5: {
    pt: "Quem se recusou a desistir aprendeu a vencer no escuro também.",
    en: "Who refused to give up learned how to win in the dark as well.",
    es: "Quien se negó a rendirse aprendió a vencer también en la oscuridad.",
    fr: "Celui qui a refusé d'abandonner a appris à gagner dans l'obscurité aussi.",
    it: "Chi si è rifiutato di mollare ha imparato a vincere anche nel buio.",
  },
  n6: {
    pt: "Antes de dormir, honre a pessoa que você está construindo.",
    en: "Before sleeping, honor the person you are becoming.",
    es: "Antes de dormir, honra a la persona que estás construyendo.",
    fr: "Avant de dormir, honorez la personne que vous êtes en train de devenir.",
    it: "Prima di dormire, onora la persona che stai costruendo.",
  },
  n7: {
    pt: "Seu dia não precisa terminar perfeito. Só precisa terminar melhor do que começou.",
    en: "Your day does not need to end perfect. It just needs to end better than it started.",
    es: "Tu día no necesita terminar perfecto. Solo necesita terminar mejor de lo que empezó.",
    fr: "Votre journée n'a pas besoin de finir parfaite. Elle doit seulement finir mieux qu'elle n'a commencé.",
    it: "La tua giornata non deve finire perfetta. Deve solo finire meglio di come è iniziata.",
  },
  n8: {
    pt: "A rotina certa pode reconstruir uma vida inteira.",
    en: "The right routine can rebuild an entire life.",
    es: "La rutina correcta puede reconstruir una vida entera.",
    fr: "La bonne routine peut reconstruire une vie entière.",
    it: "La routine giusta può ricostruire un'intera vita.",
  },
};

const QUOTE_LABELS: Record<SupportedAppLanguage, Record<QuotePeriod, string>> = {
  pt: {
    morning: "Frase da manhã",
    afternoon: "Frase da tarde",
    night: "Frase da noite",
  },
  en: {
    morning: "Morning quote",
    afternoon: "Afternoon quote",
    night: "Evening quote",
  },
  es: {
    morning: "Frase de la mañana",
    afternoon: "Frase de la tarde",
    night: "Frase de la noche",
  },
  fr: {
    morning: "Phrase du matin",
    afternoon: "Phrase de l'après-midi",
    night: "Phrase du soir",
  },
  it: {
    morning: "Frase del mattino",
    afternoon: "Frase del pomeriggio",
    night: "Frase della sera",
  },
};

export const DAILY_QUOTES: DailyQuote[] = BASE_QUOTES.map((quote) => ({
  ...quote,
  text: QUOTE_TEXTS[quote.id].pt,
}));

export function getCurrentQuotePeriod(date = new Date()): QuotePeriod {
  const hour = date.getHours();

  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "night";
}

export function getQuoteLabel(
  period: QuotePeriod,
  language: SupportedAppLanguage = "pt"
) {
  return QUOTE_LABELS[language][period];
}

export function getQuoteOfTheMoment(
  language: SupportedAppLanguage = "pt",
  date = new Date()
): DailyQuote {
  const period = getCurrentQuotePeriod(date);
  const daySeed = Number(
    `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`
  );

  const pool = BASE_QUOTES.filter((quote) => quote.period === period);
  const index = daySeed % pool.length;
  const quote = pool[index];

  return {
    ...quote,
    text: QUOTE_TEXTS[quote.id][language],
  };
}
