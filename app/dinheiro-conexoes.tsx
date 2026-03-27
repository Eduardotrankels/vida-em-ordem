import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AppAccount,
  AppTransaction,
  BankConnection,
  deleteItem,
  getBackendBaseUrl,
  getConnectionStatusLabel,
  listAppAccounts,
  listAppTransactions,
  listRegisteredItems,
  syncItem,
} from "./services/openFinanceApi";

import AppScreenHeader from "../components/AppScreenHeader";
import SubtlePremiumHint from "../components/SubtlePremiumHint";
import { useAppLanguage } from "./utils/languageContext";
import {
  formatCurrencyByLanguage,
  formatDateTimeByLanguage,
} from "./utils/locale";
import { pushInboxNotification } from "./utils/notificationInbox";
import { getScreenContentBottomPadding } from "./utils/safeArea";
import { useAppTheme } from "./utils/themeContext";

const PREMIUM_KEY = "@vida_em_ordem_subscription_plan_v1";

function getStatusColor(status: string | undefined, colors: any) {
  switch (status) {
    case "UPDATED":
    case "ACTIVE":
    case "active":
      return colors.success;
    case "UPDATING":
    case "LOGIN_IN_PROGRESS":
    case "WAITING_USER_INPUT":
      return colors.warning;
    case "ERROR":
    case "error":
    case "OUTDATED":
      return colors.danger;
    default:
      return colors.textMuted;
  }
}

export default function DinheiroConexoesScreen() {
  const { colors } = useAppTheme();
  const { language } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const neverSyncedLabel = useMemo(
    () =>
      ({
        pt: "Nunca sincronizado",
        en: "Never synced",
        es: "Nunca sincronizado",
        fr: "Jamais synchronise",
        it: "Mai sincronizzato",
      })[language],
    [language]
  );

  const formatCurrency = useCallback(
    (value?: number, currencyCode?: string | null) =>
      formatCurrencyByLanguage(Number(value || 0), language, currencyCode),
    [language]
  );

  const formatDateTime = useCallback(
    (value?: string | null) =>
      formatDateTimeByLanguage(value, language, undefined, neverSyncedLabel),
    [language, neverSyncedLabel]
  );

  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [accounts, setAccounts] = useState<AppAccount[]>([]);
  const [transactions, setTransactions] = useState<AppTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const loadScreenData = useCallback(async () => {
    try {
      setLoading(true);

      const [premiumRaw, itemsResponse, accountsResponse, txResponse] =
        await Promise.all([
          AsyncStorage.getItem(PREMIUM_KEY),
          listRegisteredItems(),
          listAppAccounts(),
          listAppTransactions(),
        ]);

      const effectivePlan: "free" | "premium" =
        premiumRaw === "premium" ? "premium" : "free";

      setIsPremium(effectivePlan === "premium");

      const allAccounts = accountsResponse?.accounts || [];
      const allTransactions = txResponse?.transactions || [];

      const mappedConnections: BankConnection[] = (itemsResponse?.items || []).map(
        (item: any) => ({
          id: item.itemId,
          institutionId: String(item.connectorId ?? item.itemId),
          institutionName: item.institutionName || "Instituição conectada",
          institutionLogo: "",
          institutionType: "Conta conectada",
          status: (item.status as any) || "active",
          accountCount: allAccounts.filter(
            (account) => account.itemId === item.itemId
          ).length,
          connectedAt: item.createdAt,
          lastSyncedAt: item.updatedAt || item.createdAt,
          consentExpiresAt: null,
        })
      );

      const freeConnections = mappedConnections.slice(0, 1);
      const freeAccounts = allAccounts.slice(0, 1);
      const freeTransactions = [...allTransactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);

      const premiumMode = effectivePlan === "premium";

      setConnections(premiumMode ? mappedConnections : freeConnections);
      setAccounts(premiumMode ? allAccounts : freeAccounts);
      setTransactions(premiumMode ? allTransactions : freeTransactions);
    } catch (error) {
      console.log("Erro ao carregar conexões bancárias:", error);
      setIsPremium(false);
      setConnections([]);
      setAccounts([]);
      setTransactions([]);
    } finally {
      setLoading(false);
      setIsHydrated(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isHydrated) {
        loadScreenData();
      }
    }, [isHydrated, loadScreenData])
  );

  const surfaceMuted =
    (colors as any).surfaceMuted || colors.surfaceAlt || colors.surface;

  const totalBalance = useMemo(() => {
    return accounts.reduce(
      (acc, account) => acc + Number(account.balance || 0),
      0
    );
  }, [accounts]);

  const latestTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, isPremium ? 8 : 3);
  }, [transactions, isPremium]);

  const handleGoPremium = useCallback(() => {
    router.push("/assinatura");
  }, []);

  const handleOpenConnectionFlow = useCallback(async () => {
    try {
      const premiumRaw = await AsyncStorage.getItem(PREMIUM_KEY);
      const premiumNow = premiumRaw === "premium";
      const freeLimitReachedNow = !premiumNow && connections.length >= 1;

      if (freeLimitReachedNow) {
        Alert.alert(
          "Recurso Premium 🔒",
          "No plano Free você pode conectar apenas 1 banco. Faça upgrade para conectar múltiplos bancos.",
          [
            { text: "Agora não", style: "cancel" },
            { text: "Ver Premium", onPress: handleGoPremium },
          ]
        );
        return;
      }

      router.push("/dinheiro-conectar-banco");
    } catch (error) {
      console.log("Erro ao validar plano para abrir conexão:", error);
      Alert.alert("Erro", "Não foi possível validar seu plano agora.");
    }
  }, [connections.length, handleGoPremium]);

  const handleSyncConnection = useCallback(
    async (connectionId: string) => {
      if (!isPremium) {
        Alert.alert(
          "Recurso Premium 🔒",
          "Sincronização manual é exclusiva do Premium.",
          [
            { text: "Agora não", style: "cancel" },
            { text: "Ver Premium", onPress: handleGoPremium },
          ]
        );
        return;
      }

      try {
        setSyncingId(connectionId);
        await syncItem(connectionId);
        await loadScreenData();

        await pushInboxNotification({
          kind: "bank",
          title: "Sincronizacao concluida",
          message:
            "Contas e transacoes foram atualizadas com sucesso no modulo Dinheiro.",
          actionRoute: "/dinheiro-conexoes",
          source: "open-finance",
          sourceId: `bank-sync-${connectionId}-${new Date().toISOString().slice(0, 16)}`,
        });

        Alert.alert(
          "Sincronização concluída 🔄",
          "Contas e transações foram atualizadas com sucesso."
        );
      } catch (error) {
        console.log("Erro ao sincronizar conexão:", error);
        Alert.alert("Erro", "Não foi possível sincronizar esta conexão.");
      } finally {
        setSyncingId(null);
      }
    },
    [handleGoPremium, isPremium, loadScreenData]
  );

  const handleRemoveConnection = useCallback(
    (connection: BankConnection) => {
      if (!isPremium) {
        Alert.alert(
          "Recurso Premium 🔒",
          "Remover conexões é um recurso do Premium.",
          [
            { text: "Agora não", style: "cancel" },
            { text: "Ver Premium", onPress: handleGoPremium },
          ]
        );
        return;
      }

      Alert.alert(
        "Remover conexão",
        `Deseja remover a conexão com ${connection.institutionName}?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Remover",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteItem(connection.id);
                await loadScreenData();

                await pushInboxNotification({
                  kind: "bank",
                  title: "Conexao removida",
                  message: `${connection.institutionName} foi removido das conexoes bancarias do app.`,
                  actionRoute: "/dinheiro-conexoes",
                  source: "open-finance",
                  sourceId: `bank-remove-${connection.id}-${new Date()
                    .toISOString()
                    .slice(0, 16)}`,
                });
              } catch (error) {
                console.log("Erro ao remover conexão:", error);
                Alert.alert("Erro", "Não foi possível remover a conexão.");
              }
            },
          },
        ]
      );
    },
    [handleGoPremium, isPremium, loadScreenData]
  );

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
        showsVerticalScrollIndicator={false}
      >
        <AppScreenHeader
          title="Conexões bancárias"
          subtitle="Acompanhe contas, sincronizações e transações importadas no mesmo padrão visual da Home."
          icon="business-outline"
          badgeLabel={isHydrated ? (isPremium ? "Premium" : "Free") : undefined}
          badgeTone={isPremium ? "success" : "accent"}
        />

        <Text style={[styles.backendText, { color: colors.textSecondary }]}> 
          Backend: {getBackendBaseUrl()}
        </Text>

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.accentBorder,
            },
          ]}
        >
          <Text style={[styles.heroEyebrow, { color: colors.accent }]}> 
            Open Finance
          </Text>

          <Text style={[styles.heroTitle, { color: colors.text }]}> 
            Seu financeiro conectado com segurança
          </Text>

          <Text style={[styles.heroText, { color: colors.textSecondary }]}> 
            Veja conexões, contas, saldo consolidado e as últimas transações
            importadas do backend.
          </Text>

          <View style={styles.heroStatsRow}>
            <View
              style={[
                styles.heroStatBox,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.heroStatValue, { color: colors.text }]}>
                {connections.length}
              </Text>
              <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>
                conexões
              </Text>
            </View>

            <View
              style={[
                styles.heroStatBox,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.heroStatValue, { color: colors.text }]}>
                {accounts.length}
              </Text>
              <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>
                contas
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.balanceCard,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.balanceLabel, { color: colors.textMuted }]}> 
              Saldo consolidado
            </Text>
            <Text style={[styles.balanceValue, { color: colors.text }]}> 
              {formatCurrency(totalBalance)}
            </Text>
          </View>

          <Pressable
            style={[
              styles.openFlowButton,
              {
                backgroundColor: colors.accentButtonBackground,
                borderColor: colors.accentButtonBorder,
              },
              colors.isWhiteAccentButton && styles.whiteAccentButton,
            ]}
            onPress={handleOpenConnectionFlow}
          >
            <Text
              style={[
                styles.openFlowButtonText,
                { color: colors.accentButtonText },
              ]}
            >
              {isPremium || connections.length === 0
                ? "Abrir fluxo de conexão"
                : "Adicionar mais bancos (Premium)"}
            </Text>
          </Pressable>
        </View>

        {isHydrated && !isPremium ? (
          <View style={styles.subtleHintWrap}>
            <SubtlePremiumHint
              title="Comece simples e evolua no seu ritmo"
              text="No Free você já acompanha uma prévia real das conexões. O Premium entra quando fizer sentido ampliar bancos, sync manual e histórico."
              ctaLabel="Conhecer Premium"
              onPress={handleGoPremium}
            />
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { color: colors.text }]}> 
          Contas conectadas
        </Text>

        {loading ? (
          <View
            style={[
              styles.emptyBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.text }]}> 
              Carregando contas...
            </Text>
          </View>
        ) : accounts.length === 0 ? (
          <View
            style={[
              styles.emptyBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.text }]}> 
              Nenhuma conta sincronizada ainda
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}> 
              Conecte um banco e sincronize para carregar as contas aqui.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {accounts.map((account) => (
              <View
                key={account.id}
                style={[
                  styles.accountCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.accountTopRow}>
                  <View style={styles.accountMain}>
                    <Text style={[styles.accountName, { color: colors.text }]}>
                      {account.name}
                    </Text>
                    <Text
                      style={[
                        styles.accountMeta,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {account.type || "Conta"}{" "}
                      {account.subtype ? `• ${account.subtype}` : ""}
                    </Text>
                  </View>

                  <Text style={[styles.accountBalance, { color: colors.text }]}> 
                    {formatCurrency(account.balance, account.currencyCode)}
                  </Text>
                </View>
              </View>
            ))}

            {isHydrated && !isPremium ? (
              <View
                style={[
                  styles.lockedCard,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.lockedTitle, { color: colors.text }]}> 
                  Mais contas ficam disponíveis no Premium
                </Text>
                <Text
                  style={[styles.lockedText, { color: colors.textSecondary }]}
                >
                  O plano Free mostra apenas uma prévia. Desbloqueie todas as
                  contas conectadas no Premium.
                </Text>
                <Pressable
                  style={[
                    styles.lockedButton,
                    {
                      backgroundColor: colors.accentButtonBackground,
                      borderColor: colors.accentButtonBorder,
                    },
                    colors.isWhiteAccentButton && styles.whiteAccentButton,
                  ]}
                  onPress={handleGoPremium}
                >
                  <Text
                    style={[
                      styles.lockedButtonText,
                      { color: colors.accentButtonText },
                    ]}
                  >
                    Conhecer Premium
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}> 
          Conexões ativas
        </Text>

        {loading ? (
          <View
            style={[
              styles.emptyBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.text }]}> 
              Carregando conexões...
            </Text>
          </View>
        ) : connections.length === 0 ? (
          <View
            style={[
              styles.emptyBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.text }]}> 
              Nenhuma conexão ainda
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}> 
              Conecte seu primeiro banco para começar a importar dados
              automaticamente.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {connections.map((connection) => {
              const statusColor = getStatusColor(connection.status, colors);
              const isSyncing = syncingId === connection.id;

              return (
                <View
                  key={connection.id}
                  style={[
                    styles.connectionCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.connectionTopRow}>
                    <View style={styles.connectionLeft}>
                      <View
                        style={[
                          styles.connectionIconBadge,
                          {
                            backgroundColor: colors.accentSoft,
                            borderColor: colors.accentBorder,
                          },
                        ]}
                      >
                        <Ionicons
                          name="business-outline"
                          size={20}
                          color={colors.accent}
                        />
                      </View>

                      <View style={styles.connectionInfo}>
                        <Text
                          style={[styles.connectionName, { color: colors.text }]}
                        >
                          {connection.institutionName}
                        </Text>

                        <Text
                          style={[
                            styles.connectionMeta,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Última sync: {formatDateTime(connection.lastSyncedAt)}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: surfaceMuted,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.statusBadgeText, { color: statusColor }]}
                      >
                        {getConnectionStatusLabel(connection.status as any)}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.connectionDetails,
                      {
                        backgroundColor: colors.surfaceAlt,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.connectionDetailsText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      • Contas vinculadas: {connection.accountCount}
                    </Text>
                  </View>

                  <View style={styles.connectionActionsRow}>
                    <Pressable
                      style={[
                        styles.syncButton,
                        {
                          backgroundColor: isPremium
                            ? colors.accentButtonBackground
                            : colors.textMuted,
                          borderColor: isPremium
                            ? colors.accentButtonBorder
                            : colors.textMuted,
                          opacity: isSyncing ? 0.7 : 1,
                        },
                        isPremium &&
                          colors.isWhiteAccentButton &&
                          styles.whiteAccentButton,
                      ]}
                      onPress={() => handleSyncConnection(connection.id)}
                      disabled={isSyncing}
                    >
                      <Text
                        style={[
                          styles.syncButtonText,
                          {
                            color: isPremium
                              ? colors.accentButtonText
                              : colors.surface,
                          },
                        ]}
                      >
                        {isPremium
                          ? isSyncing
                            ? "Sincronizando..."
                            : "Sincronizar agora"
                          : "Sync Premium"}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.removeButton,
                        {
                          backgroundColor: colors.surfaceAlt,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => handleRemoveConnection(connection)}
                    >
                      <Text
                        style={[styles.removeButtonText, { color: colors.danger }]}
                      >
                        {isPremium ? "Remover" : "Premium"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}

            {isHydrated && !isPremium ? (
              <View
                style={[
                  styles.lockedCard,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.lockedTitle, { color: colors.text }]}> 
                  Ações avançadas ficam prontas no Premium
                </Text>
                <Text
                  style={[styles.lockedText, { color: colors.textSecondary }]}
                >
                  Sincronização manual, remoção de conexões e múltiplos bancos
                  ficam liberados no plano Premium.
                </Text>
                <Pressable
                  style={[
                    styles.lockedButton,
                    {
                      backgroundColor: colors.accentButtonBackground,
                      borderColor: colors.accentButtonBorder,
                    },
                    colors.isWhiteAccentButton && styles.whiteAccentButton,
                  ]}
                  onPress={handleGoPremium}
                >
                  <Text
                    style={[
                      styles.lockedButtonText,
                      { color: colors.accentButtonText },
                    ]}
                  >
                    Conhecer Premium
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}> 
          Últimas transações
        </Text>

        {loading ? (
          <View
            style={[
              styles.emptyBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.text }]}> 
              Carregando transações...
            </Text>
          </View>
        ) : latestTransactions.length === 0 ? (
          <View
            style={[
              styles.emptyBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.text }]}> 
              Nenhuma transação ainda
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}> 
              Sincronize uma conexão para começar a ver movimentações aqui.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {latestTransactions.map((tx) => {
              const isPositive = Number(tx.amount) >= 0;

              return (
                <View
                  key={tx.id}
                  style={[
                    styles.transactionCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.transactionMain}>
                    <Text
                      style={[styles.transactionTitle, { color: colors.text }]}
                    >
                      {tx.description}
                    </Text>
                    <Text
                      style={[
                        styles.transactionMeta,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {formatDateTime(tx.date)}{" "}
                      {tx.category ? `• ${tx.category}` : ""}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.transactionAmount,
                      { color: isPositive ? colors.success : colors.danger },
                    ]}
                  >
                    {isPositive ? "+" : ""}
                    {formatCurrency(tx.amount, tx.currencyCode)}
                  </Text>
                </View>
              );
            })}

            {isHydrated && !isPremium ? (
              <View
                style={[
                  styles.lockedCard,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.lockedTitle, { color: colors.text }]}> 
                  Histórico completo fica disponível no Premium
                </Text>
                <Text
                  style={[styles.lockedText, { color: colors.textSecondary }]}
                >
                  No Free você vê só as últimas 3 transações. O Premium abre o
                  histórico ampliado.
                </Text>
                <Pressable
                  style={[
                    styles.lockedButton,
                    {
                      backgroundColor: colors.accentButtonBackground,
                      borderColor: colors.accentButtonBorder,
                    },
                    colors.isWhiteAccentButton && styles.whiteAccentButton,
                  ]}
                  onPress={handleGoPremium}
                >
                  <Text
                    style={[
                      styles.lockedButtonText,
                      { color: colors.accentButtonText },
                    ]}
                  >
                    Conhecer Premium
                  </Text>
                </Pressable>
              </View>
            ) : null}
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

  subtleHintWrap: {
    marginBottom: 22,
  },

  backendText: {
    marginTop: -6,
    marginBottom: 18,
    fontSize: 13,
    lineHeight: 18,
  },

  planCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 18,
  },

  planTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },

  planTitle: {
    fontSize: 17,
    fontWeight: "900",
    flex: 1,
  },

  planBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  planBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },

  planText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },

  planButton: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 14,
    borderWidth: 1,
  },

  planButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
  },

  heroCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 22,
  },

  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
  },

  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 10,
  },

  heroText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },

  heroStatsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },

  heroStatBox: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },

  heroStatValue: {
    fontSize: 24,
    fontWeight: "900",
  },

  heroStatLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },

  balanceCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginTop: 12,
  },

  balanceLabel: {
    fontSize: 12,
    fontWeight: "700",
  },

  balanceValue: {
    fontSize: 24,
    fontWeight: "900",
    marginTop: 6,
  },

  openFlowButton: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },

  openFlowButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },

  list: {
    gap: 12,
    marginBottom: 24,
  },

  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },

  accountCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },

  accountTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },

  accountMain: {
    flex: 1,
  },

  accountName: {
    fontSize: 15,
    fontWeight: "900",
  },

  accountMeta: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },

  accountBalance: {
    fontSize: 16,
    fontWeight: "900",
    textAlign: "right",
    maxWidth: 150,
  },

  connectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },

  connectionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },

  connectionLeft: {
    flexDirection: "row",
    flex: 1,
  },

  connectionIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },

  connectionInfo: {
    flex: 1,
  },

  connectionName: {
    fontSize: 15,
    fontWeight: "900",
  },

  connectionMeta: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
    lineHeight: 17,
  },

  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },

  statusBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },

  connectionDetails: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: 14,
    gap: 6,
  },

  connectionDetailsText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },

  connectionActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  syncButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1,
  },

  syncButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
  },

  removeButton: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  removeButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },

  transactionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },

  transactionMain: {
    flex: 1,
  },

  transactionTitle: {
    fontSize: 14,
    fontWeight: "800",
  },

  transactionMeta: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },

  transactionAmount: {
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
    maxWidth: 120,
  },

  lockedCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },

  lockedTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  lockedText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },

  lockedButton: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
  },

  lockedButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
  },

  whiteAccentButton: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
});
