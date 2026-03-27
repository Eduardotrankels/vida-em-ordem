import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AppScreenHeader from "../components/AppScreenHeader";
import {
  SupportTicket,
  SupportTicketCategory,
  createSupportTicket,
  listSupportTickets,
} from "./services/support";
import { readAppSession } from "./utils/appSession";
import { useAppLanguage } from "./utils/languageContext";
import { formatDateTimeByLanguage } from "./utils/locale";
import { getScreenContentBottomPadding } from "./utils/safeArea";
import { useAppTheme } from "./utils/themeContext";

const USER_PROFILE_KEY = "@vida_em_ordem_user_profile_v1";

const copyByLanguage = {
  pt: {
    title: "Ajuda e suporte",
    subtitle:
      "Fale com o suporte do app, registre problemas e acompanhe seus chamados sem sair do Vida em Ordem.",
    heroTitle: "Canal direto com o seu app",
    heroText:
      "Use este espaço para falar sobre cobrança, conexão bancária, bugs, acesso ou sugestões de melhoria.",
    responseHint: "Seu pedido fica registrado e também aparece no sino de alertas.",
    formTitle: "Abrir novo chamado",
    emailLabel: "E-mail para retorno",
    categoryLabel: "Categoria",
    subjectLabel: "Assunto",
    messageLabel: "Mensagem",
    subjectPlaceholder: "Conte em uma frase do que você precisa",
    messagePlaceholder: "Explique o que aconteceu, o que tentou fazer e como o app pode te ajudar.",
    submit: "Enviar chamado",
    sending: "Enviando...",
    historyTitle: "Seus chamados recentes",
    emptyTitle: "Nenhum chamado ainda",
    emptyText:
      "Quando você enviar seu primeiro pedido de ajuda, ele vai aparecer aqui com o status atual.",
    refresh: "Atualizar lista",
    successTitle: "Chamado enviado",
    successText: "Seu pedido foi registrado e já entrou na sua caixa de alertas.",
    validationCategory: "Escolha uma categoria para o chamado.",
    validationSubject: "Descreva um assunto curto para o suporte.",
    validationMessage: "Conte um pouco mais para o suporte conseguir te ajudar.",
    status: {
      open: "Recebido",
      answered: "Respondido",
      closed: "Encerrado",
    },
    categories: {
      app: "Ajuda geral",
      billing: "Cobrança",
      bank: "Banco",
      account: "Conta e acesso",
      bug: "Bug",
      suggestion: "Sugestão",
    },
  },
  en: {
    title: "Help and support",
    subtitle:
      "Talk to app support, report issues, and track your requests without leaving Vida em Ordem.",
    heroTitle: "A direct support channel inside the app",
    heroText:
      "Use this space for billing, bank connection, bugs, account access, or product suggestions.",
    responseHint: "Your request is saved and also appears in the alert bell inbox.",
    formTitle: "Open a new request",
    emailLabel: "Reply email",
    categoryLabel: "Category",
    subjectLabel: "Subject",
    messageLabel: "Message",
    subjectPlaceholder: "Describe what you need in one sentence",
    messagePlaceholder:
      "Explain what happened, what you tried, and how the app can help you.",
    submit: "Send request",
    sending: "Sending...",
    historyTitle: "Your recent requests",
    emptyTitle: "No requests yet",
    emptyText:
      "When you send your first support request, it will appear here with its current status.",
    refresh: "Refresh list",
    successTitle: "Request sent",
    successText: "Your request was recorded and also added to your alerts inbox.",
    validationCategory: "Choose a category for the request.",
    validationSubject: "Write a short subject for support.",
    validationMessage: "Please share a bit more so support can help you.",
    status: {
      open: "Received",
      answered: "Answered",
      closed: "Closed",
    },
    categories: {
      app: "General help",
      billing: "Billing",
      bank: "Bank",
      account: "Account and access",
      bug: "Bug",
      suggestion: "Suggestion",
    },
  },
  es: {
    title: "Ayuda y soporte",
    subtitle:
      "Habla con el soporte de la app, reporta problemas y sigue tus solicitudes sin salir de Vida em Ordem.",
    heroTitle: "Canal directo con tu app",
    heroText:
      "Usa este espacio para cobros, conexión bancaria, bugs, cuenta o sugerencias.",
    responseHint: "Tu solicitud queda registrada y también aparece en la campana de alertas.",
    formTitle: "Abrir nueva solicitud",
    emailLabel: "Correo para respuesta",
    categoryLabel: "Categoría",
    subjectLabel: "Asunto",
    messageLabel: "Mensaje",
    subjectPlaceholder: "Cuenta en una frase qué necesitas",
    messagePlaceholder:
      "Explica qué pasó, qué intentaste hacer y cómo la app puede ayudarte.",
    submit: "Enviar solicitud",
    sending: "Enviando...",
    historyTitle: "Tus solicitudes recientes",
    emptyTitle: "Aún no hay solicitudes",
    emptyText:
      "Cuando envíes tu primera solicitud de ayuda, aparecerá aquí con su estado actual.",
    refresh: "Actualizar lista",
    successTitle: "Solicitud enviada",
    successText: "Tu solicitud fue registrada y ya está en tu bandeja de alertas.",
    validationCategory: "Elige una categoría para la solicitud.",
    validationSubject: "Escribe un asunto corto para soporte.",
    validationMessage: "Cuenta un poco más para que soporte pueda ayudarte.",
    status: {
      open: "Recibido",
      answered: "Respondido",
      closed: "Cerrado",
    },
    categories: {
      app: "Ayuda general",
      billing: "Cobro",
      bank: "Banco",
      account: "Cuenta y acceso",
      bug: "Bug",
      suggestion: "Sugerencia",
    },
  },
  fr: {
    title: "Aide et support",
    subtitle:
      "Contactez le support de l'app, signalez un problème et suivez vos demandes sans quitter Vida em Ordem.",
    heroTitle: "Un canal direct dans l'app",
    heroText:
      "Utilisez cet espace pour la facturation, la connexion bancaire, les bugs, l'accès ou les suggestions.",
    responseHint: "Votre demande est enregistrée et apparaît aussi dans la cloche d'alertes.",
    formTitle: "Ouvrir une nouvelle demande",
    emailLabel: "E-mail de retour",
    categoryLabel: "Catégorie",
    subjectLabel: "Sujet",
    messageLabel: "Message",
    subjectPlaceholder: "Décrivez en une phrase ce dont vous avez besoin",
    messagePlaceholder:
      "Expliquez ce qui s'est passé, ce que vous avez essayé et comment l'app peut vous aider.",
    submit: "Envoyer la demande",
    sending: "Envoi...",
    historyTitle: "Vos demandes récentes",
    emptyTitle: "Aucune demande pour l'instant",
    emptyText:
      "Quand vous enverrez votre première demande d'aide, elle apparaîtra ici avec son statut.",
    refresh: "Actualiser la liste",
    successTitle: "Demande envoyée",
    successText: "Votre demande a été enregistrée et ajoutée à votre boîte d'alertes.",
    validationCategory: "Choisissez une catégorie pour la demande.",
    validationSubject: "Écrivez un sujet court pour le support.",
    validationMessage: "Expliquez un peu plus pour que le support puisse aider.",
    status: {
      open: "Reçu",
      answered: "Répondu",
      closed: "Clôturé",
    },
    categories: {
      app: "Aide générale",
      billing: "Facturation",
      bank: "Banque",
      account: "Compte et accès",
      bug: "Bug",
      suggestion: "Suggestion",
    },
  },
  it: {
    title: "Aiuto e supporto",
    subtitle:
      "Parla con il supporto dell'app, segnala problemi e segui le tue richieste senza uscire da Vida em Ordem.",
    heroTitle: "Canale diretto con l'app",
    heroText:
      "Usa questo spazio per pagamenti, connessioni bancarie, bug, accesso o suggerimenti.",
    responseHint: "La tua richiesta viene registrata e appare anche nel campanello degli avvisi.",
    formTitle: "Apri una nuova richiesta",
    emailLabel: "E-mail per la risposta",
    categoryLabel: "Categoria",
    subjectLabel: "Oggetto",
    messageLabel: "Messaggio",
    subjectPlaceholder: "Racconta in una frase cosa ti serve",
    messagePlaceholder:
      "Spiega cosa è successo, cosa hai provato a fare e come l'app può aiutarti.",
    submit: "Invia richiesta",
    sending: "Invio...",
    historyTitle: "Le tue richieste recenti",
    emptyTitle: "Nessuna richiesta per ora",
    emptyText:
      "Quando invierai la tua prima richiesta di aiuto, apparirà qui con lo stato attuale.",
    refresh: "Aggiorna elenco",
    successTitle: "Richiesta inviata",
    successText: "La tua richiesta è stata registrata ed è entrata negli avvisi dell'app.",
    validationCategory: "Scegli una categoria per la richiesta.",
    validationSubject: "Scrivi un oggetto breve per il supporto.",
    validationMessage: "Racconta qualcosa in più per aiutare il supporto.",
    status: {
      open: "Ricevuto",
      answered: "Risposto",
      closed: "Chiuso",
    },
    categories: {
      app: "Aiuto generale",
      billing: "Pagamenti",
      bank: "Banca",
      account: "Account e accesso",
      bug: "Bug",
      suggestion: "Suggerimento",
    },
  },
} as const;

const categoryOrder: SupportTicketCategory[] = [
  "app",
  "billing",
  "bank",
  "account",
  "bug",
  "suggestion",
];

export default function AjudaSuporteScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { language, t } = useAppLanguage();
  const copy = copyByLanguage[language];
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [sending, setSending] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<SupportTicketCategory>("app");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const loadContactEmail = useCallback(async () => {
    const [profileRaw, session] = await Promise.all([
      AsyncStorage.getItem(USER_PROFILE_KEY),
      readAppSession(),
    ]);

    const profileEmail = profileRaw ? JSON.parse(profileRaw)?.email : null;
    const nextEmail = profileEmail || session?.email || "";
    setContactEmail(typeof nextEmail === "string" ? nextEmail : "");
  }, []);

  const loadTickets = useCallback(async () => {
    try {
      setLoadingTickets(true);
      const nextTickets = await listSupportTickets();
      setTickets(nextTickets);
    } catch (error: any) {
      Alert.alert(t("common.error"), error?.message || "Erro ao carregar suporte.");
    } finally {
      setLoadingTickets(false);
    }
  }, [t]);

  useEffect(() => {
    void loadContactEmail();
    void loadTickets();
  }, [loadContactEmail, loadTickets]);

  const handleSubmit = useCallback(async () => {
    if (!selectedCategory) {
      Alert.alert(t("common.attention"), copy.validationCategory);
      return;
    }

    if (subject.trim().length < 6) {
      Alert.alert(t("common.attention"), copy.validationSubject);
      return;
    }

    if (message.trim().length < 12) {
      Alert.alert(t("common.attention"), copy.validationMessage);
      return;
    }

    try {
      setSending(true);
      const created = await createSupportTicket({
        contactEmail: contactEmail.trim() || null,
        category: selectedCategory,
        subject: subject.trim(),
        message: message.trim(),
      });

      if (created) {
        setTickets((current) => [created, ...current]);
      }

      setSubject("");
      setMessage("");
      Alert.alert(copy.successTitle, copy.successText);
    } catch (error: any) {
      Alert.alert(t("common.error"), error?.message || "Erro ao enviar chamado.");
    } finally {
      setSending(false);
    }
  }, [
    contactEmail,
    copy.successText,
    copy.successTitle,
    copy.validationCategory,
    copy.validationMessage,
    copy.validationSubject,
    message,
    selectedCategory,
    subject,
    t,
  ]);

  const statusLabel = useCallback(
    (status: string) => {
      return copy.status[status as keyof typeof copy.status] || status;
    },
    [copy]
  );

  const categoryLabel = useCallback(
    (category: SupportTicketCategory) => {
      return copy.categories[category];
    },
    [copy]
  );

  const recentTickets = useMemo(() => tickets.slice(0, 8), [tickets]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getScreenContentBottomPadding(insets.bottom) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppScreenHeader
          title={copy.title}
          subtitle={copy.subtitle}
          icon="help-buoy-outline"
        />

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.accentBorder,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <View
            style={[
              styles.heroGlow,
              { backgroundColor: colors.accentSoft },
            ]}
          />
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {copy.heroTitle}
          </Text>
          <Text style={[styles.heroText, { color: colors.textSecondary }]}>
            {copy.heroText}
          </Text>
          <View
            style={[
              styles.heroHintBadge,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={14}
              color={colors.accent}
            />
            <Text style={[styles.heroHintText, { color: colors.textMuted }]}>
              {copy.responseHint}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {copy.formTitle}
          </Text>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            {copy.emailLabel}
          </Text>
          <TextInput
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="voce@exemplo.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            {copy.categoryLabel}
          </Text>
          <View style={styles.categoryGrid}>
            {categoryOrder.map((category) => {
              const active = selectedCategory === category;

              return (
                <Pressable
                  key={category}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: active
                        ? colors.accentSoft
                        : colors.surfaceAlt,
                      borderColor: active ? colors.accentBorder : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryCardText,
                      { color: active ? colors.accent : colors.text },
                    ]}
                  >
                    {categoryLabel(category)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            {copy.subjectLabel}
          </Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder={copy.subjectPlaceholder}
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            {copy.messageLabel}
          </Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={copy.messagePlaceholder}
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            style={[
              styles.textarea,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />

          <Pressable
            style={[
              styles.primaryButton,
              {
                backgroundColor: colors.accentButtonBackground,
                borderColor: colors.accentButtonBorder,
              },
              colors.isWhiteAccentButton && styles.whiteAccentButton,
            ]}
            onPress={handleSubmit}
            disabled={sending}
          >
            <Text
              style={[
                styles.primaryButtonText,
                { color: colors.accentButtonText },
              ]}
            >
              {sending ? copy.sending : copy.submit}
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {copy.historyTitle}
          </Text>

          <Pressable
            style={[
              styles.refreshButton,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
              },
            ]}
            onPress={() => {
              void loadTickets();
            }}
          >
            <Text style={[styles.refreshButtonText, { color: colors.text }]}>
              {copy.refresh}
            </Text>
          </Pressable>
        </View>

        {loadingTickets ? null : recentTickets.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {copy.emptyTitle}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {copy.emptyText}
            </Text>
          </View>
        ) : (
          <View style={styles.ticketList}>
            {recentTickets.map((ticket) => (
              <View
                key={ticket.publicId}
                style={[
                  styles.ticketCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor:
                      ticket.status === "open" ? colors.accentBorder : colors.border,
                  },
                ]}
              >
                <View style={styles.ticketTopRow}>
                  <View
                    style={[
                      styles.ticketBadge,
                      {
                        backgroundColor: colors.surfaceAlt,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.ticketBadgeText,
                        { color: colors.textMuted },
                      ]}
                    >
                      {categoryLabel(ticket.category)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.ticketStatusBadge,
                      {
                        backgroundColor:
                          ticket.status === "open"
                            ? colors.accentSoft
                            : colors.successSoft,
                        borderColor:
                          ticket.status === "open"
                            ? colors.accentBorder
                            : colors.success,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.ticketStatusText,
                        {
                          color:
                            ticket.status === "open"
                              ? colors.accent
                              : colors.success,
                        },
                      ]}
                    >
                      {statusLabel(ticket.status)}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.ticketSubject, { color: colors.text }]}>
                  {ticket.subject}
                </Text>
                <Text
                  style={[styles.ticketMessage, { color: colors.textSecondary }]}
                >
                  {ticket.message}
                </Text>
                <Text style={[styles.ticketMeta, { color: colors.textMuted }]}>
                  {ticket.publicId} • {formatDateTimeByLanguage(ticket.createdAt, language)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    marginBottom: 18,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  heroGlow: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 999,
    top: -48,
    right: -24,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  heroText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  heroHintBadge: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroHintText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  card: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 18,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  textarea: {
    minHeight: 128,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryCard: {
    minWidth: "47%",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  categoryCardText: {
    fontSize: 13,
    fontWeight: "900",
  },
  primaryButton: {
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
  },
  refreshButton: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },
  emptyCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  ticketList: {
    gap: 12,
  },
  ticketCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  ticketTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  ticketBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ticketBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  ticketStatusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ticketStatusText: {
    fontSize: 11,
    fontWeight: "900",
  },
  ticketSubject: {
    fontSize: 15,
    fontWeight: "900",
    marginTop: 14,
  },
  ticketMessage: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  ticketMeta: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 12,
  },
  whiteAccentButton: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
});
