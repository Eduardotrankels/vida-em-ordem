import { router, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { PluggyConnect } from "react-native-pluggy-connect";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  createConnectToken,
  getBackendBaseUrl,
  listConnectors,
  listRegisteredItems,
  registerItem,
} from "./services/openFinanceApi";
import AppScreenHeader from "../components/AppScreenHeader";
import SubtlePremiumHint from "../components/SubtlePremiumHint";
import { useAppLanguage } from "./utils/languageContext";
import {
  formatDateTimeByLanguage,
  getPluggyLanguage,
} from "./utils/locale";
import { getScreenContentBottomPadding } from "./utils/safeArea";
import { useAppTheme } from "./utils/themeContext";

const PREMIUM_KEY = "@vida_em_ordem_subscription_plan_v1";

type BankItemStatus = "disponivel" | "conectado" | "em_breve";

type BankItem = {
  id: string;
  name: string;
  logo: string;
  status: BankItemStatus;
  description: string;
  type: string;
};

type StoredBankConnection = {
  id: string;
  institutionId: string;
  institutionName: string;
  institutionLogo: string;
  status: string;
  lastSyncedAt?: string | null;
  consentExpiresAt?: string | null;
  accountCount?: number;
};

function getInstitutionDescription(name: string, type?: string) {
  return `Conecte ${name} para importar movimentações, saldo e evolução financeira automática${
    type ? ` • ${type}` : ""
  }.`;
}

export default function DinheiroConectarBancoScreen() {
  const { settings, colors } = useAppTheme();
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
  const formatDateTime = useCallback(
    (value?: string | null) =>
      formatDateTimeByLanguage(value, language, undefined, neverSyncedLabel),
    [language, neverSyncedLabel]
  );

  const [institutions, setInstitutions] = useState<BankItem[]>([]);
  const [connections, setConnections] = useState<StoredBankConnection[]>([]);
  const [selectedBank, setSelectedBank] = useState<BankItem | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectingBankId, setConnectingBankId] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [bankSearch, setBankSearch] = useState("");

  const [pluggyOpen, setPluggyOpen] = useState(false);
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [selectedConnectorId, setSelectedConnectorId] = useState<number | null>(
    null
  );

  const goToPremium = useCallback(() => {
    router.push("/assinatura");
  }, []);

  const loadScreenData = useCallback(async () => {
    try {
      setLoading(true);

      const [premiumRaw, connectorsData, registeredItems] = await Promise.all([
        AsyncStorage.getItem(PREMIUM_KEY),
        listConnectors(),
        listRegisteredItems(),
      ]);

      const effectivePlan: "free" | "premium" =
        premiumRaw === "premium" ? "premium" : "free";

      setIsPremium(effectivePlan === "premium");

      const storedConnections: StoredBankConnection[] = Array.isArray(
        registeredItems?.items
      )
        ? registeredItems.items.map((item: any) => ({
            id: String(item.itemId ?? item.id ?? ""),
            institutionId: String(
              item.connectorId ?? item.itemId ?? item.id ?? ""
            ),
            institutionName: item.institutionName || "Instituição conectada",
            institutionLogo: "",
            status: item.status || "active",
            lastSyncedAt: item.updatedAt || item.createdAt || null,
            consentExpiresAt: null,
            accountCount: Number(item.accountCount ?? 1),
          }))
        : [];

      const connectedNames = new Set(
        storedConnections.map((connection) =>
          connection.institutionName.toLowerCase()
        )
      );

      const mappedInstitutions: BankItem[] = Array.isArray(
        connectorsData?.results
      )
        ? connectorsData.results.map((institution: any) => {
            const bankName = String(institution.name ?? "Banco");

            return {
              id: String(institution.id),
              name: bankName,
              logo: "",
              status: connectedNames.has(bankName.toLowerCase())
                ? "conectado"
                : "disponivel",
              description: getInstitutionDescription(bankName, institution.type),
              type: institution.type || "Banco",
            };
          })
        : [];

      setInstitutions(mappedInstitutions);
      setConnections(storedConnections);
    } catch (error) {
      console.log("Erro ao carregar tela de conexão bancária:", error);
      setIsPremium(false);
      setInstitutions([]);
      setConnections([]);
    } finally {
      setLoading(false);
      setIsHydrated(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadScreenData();
    }, [loadScreenData])
  );

  const availableBanks = useMemo(() => institutions, [institutions]);
  const normalizedBankSearch = bankSearch.trim().toLowerCase();
  const filteredBanks = useMemo(() => {
    if (!normalizedBankSearch) return [];

    return availableBanks.filter((institution) => {
      const haystack = `${institution.name} ${institution.type} ${institution.description}`.toLowerCase();
      return haystack.includes(normalizedBankSearch);
    });
  }, [availableBanks, normalizedBankSearch]);
  const connectedCount = connections.length;

  const openConnectModal = useCallback(
    async (bank: BankItem) => {
      if (bank.status === "em_breve") {
        Alert.alert(
          "Em breve",
          `${bank.name} ainda está em preparação para conexão automática.`
        );
        return;
      }

      if (bank.status === "conectado") {
        Alert.alert("Já conectado", `${bank.name} já está conectado ao app.`);
        return;
      }

      try {
        const premiumRaw = await AsyncStorage.getItem(PREMIUM_KEY);
        const premiumNow = premiumRaw === "premium";
        const freeLimitReachedNow = !premiumNow && connections.length >= 1;

        if (freeLimitReachedNow) {
          Alert.alert(
            "Limite do plano Free 🔒",
            "No plano Free você pode conectar apenas 1 banco. Faça upgrade para o Premium e libere múltiplas conexões.",
            [
              { text: "Agora não", style: "cancel" },
              { text: "Ver Premium", onPress: goToPremium },
            ]
          );
          return;
        }

        setSelectedBank(bank);
        setConfirmModalOpen(true);
      } catch (error) {
        console.log("Erro ao validar plano antes de abrir conexão:", error);
        Alert.alert("Erro", "Não foi possível validar seu plano agora.");
      }
    },
    [connections.length, goToPremium]
  );

  const closeConnectModal = useCallback(() => {
    setConfirmModalOpen(false);
    setSelectedBank(null);
  }, []);

  const refreshAfterAction = useCallback(async () => {
    await loadScreenData();
  }, [loadScreenData]);

  const confirmConnect = useCallback(async () => {
    if (!selectedBank) return;

    try {
      setConnectingBankId(selectedBank.id);

      const tokenResponse = await createConnectToken();
      setConnectToken(tokenResponse.accessToken);
      setSelectedConnectorId(Number(selectedBank.id));

      closeConnectModal();
      setPluggyOpen(true);
    } catch (error: any) {
      console.log("Erro ao iniciar conexão do banco:", error);
      Alert.alert(
        "Erro",
        error?.message || "Não foi possível iniciar a conexão deste banco."
      );
    } finally {
      setConnectingBankId(null);
    }
  }, [selectedBank, closeConnectModal]);

  const handlePluggySuccess = useCallback(
    async (data: any) => {
      try {
        const item = data?.item;

        if (!item?.id) {
          throw new Error("Item retornado pela Pluggy não veio com id.");
        }

        await registerItem({
          itemId: String(item.id),
          connectorId: item.connector?.id ?? selectedConnectorId ?? 0,
          institutionName:
            item.connector?.name || selectedBank?.name || "Banco conectado",
          status: item.status || "active",
        });

        setPluggyOpen(false);
        setConnectToken(null);
        setSelectedConnectorId(null);

        await refreshAfterAction();

        Alert.alert(
          "Banco conectado ✅",
          `${
            item.connector?.name || selectedBank?.name || "Banco"
          } conectado com sucesso.`
        );

        router.replace("/dinheiro-conexoes");
      } catch (error: any) {
        console.log("Erro ao registrar item conectado:", error);
        Alert.alert(
          "Erro",
          error?.message ||
            "A conexão foi criada, mas não conseguimos registrar o item."
        );
      }
    },
    [refreshAfterAction, selectedBank?.name, selectedConnectorId]
  );

  const handlePluggyError = useCallback((error: any) => {
    console.log("Erro Pluggy Connect:", error);

    Alert.alert(
      "Erro na conexão",
      error?.message || "Não foi possível concluir a conexão com o banco."
    );
  }, []);

  const handlePluggyClose = useCallback(() => {
    setPluggyOpen(false);
    setConnectToken(null);
    setSelectedConnectorId(null);
  }, []);

  const selectedBankDescription = selectedBank?.description ?? "";

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
          title="Conectar banco"
          subtitle="Centralize suas finanças e prepare o app para importar movimentações automaticamente."
          icon="link-outline"
          badgeLabel={isHydrated && isPremium !== null ? (isPremium ? "Premium" : "Free") : undefined}
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
              shadowColor: colors.shadow,
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <Text style={[styles.heroEyebrow, { color: colors.accent }]}>
              Open Finance
            </Text>

            <View
              style={[
                styles.heroBadge,
                {
                  backgroundColor: colors.accentSoft,
                  borderColor: colors.accentBorder,
                },
              ]}
            >
              <Text style={[styles.heroBadgeText, { color: colors.accent }]}>
                {connectedCount} conectado{connectedCount === 1 ? "" : "s"}
              </Text>
            </View>
          </View>

          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Seu app, agora com motor de fintech
          </Text>

          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Conecte bancos para evoluir o módulo Dinheiro com importação de
            transações, saldos e sincronização inteligente.
          </Text>

          <View style={styles.heroMiniGrid}>
            <View
              style={[
                styles.heroMiniCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.heroMiniLabel, { color: colors.textMuted }]}>
                Bancos ativos
              </Text>
              <Text style={[styles.heroMiniValue, { color: colors.text }]}>
                {connectedCount}
              </Text>
            </View>

            <View
              style={[
                styles.heroMiniCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.heroMiniLabel, { color: colors.textMuted }]}>
                Plano
              </Text>
              <Text
                style={[
                  styles.heroMiniValue,
                  { color: isPremium ? colors.success : colors.accent },
                ]}
              >
                {isHydrated && isPremium !== null
                  ? isPremium
                    ? "Premium"
                    : "Free"
                  : "--"}
              </Text>
            </View>
          </View>
        </View>

        {isHydrated && !isPremium ? (
          <View style={styles.subtleHintWrap}>
            <SubtlePremiumHint
              title="Conexão bancária sem pressão"
              text="No Free você já testa o fluxo real com 1 banco. O Premium entra quando quiser ampliar conexões e montar um painel financeiro mais completo."
              ctaLabel="Conhecer Premium"
              onPress={goToPremium}
            />
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Bancos conectados
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
              Nenhum banco conectado ainda
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Quando você conectar seu primeiro banco, ele aparecerá aqui com
              data da última sincronização.
            </Text>
          </View>
        ) : (
          <View style={styles.connectedList}>
            {connections.map((connection) => (
              <View
                key={connection.id}
                style={[
                  styles.connectedCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.connectedTop}>
                  <View style={styles.connectedLeft}>
                    <View
                      style={[
                        styles.institutionBadge,
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
                    <View style={styles.connectedMain}>
                      <Text
                        style={[styles.connectedBankName, { color: colors.text }]}
                      >
                        {connection.institutionName}
                      </Text>
                      <Text
                        style={[
                          styles.connectedMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Última sync: {formatDateTime(connection.lastSyncedAt)}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.connectedStatusBadge,
                      {
                        backgroundColor: colors.successSoft,
                        borderColor: colors.success,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.connectedStatusText,
                        { color: colors.success },
                      ]}
                    >
                      Ativo
                    </Text>
                  </View>
                </View>

                <Text
                  style={[styles.connectedSyncText, { color: colors.textMuted }]}
                >
                  Contas vinculadas: {connection.accountCount ?? 0}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Escolha um banco
        </Text>

        <View
          style={[
            styles.searchCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.searchTitle, { color: colors.text }]}>
            Pesquise o banco desejado
          </Text>
          <Text style={[styles.searchHint, { color: colors.textSecondary }]}>
            Digite o nome do banco para exibir as opções abaixo.
          </Text>

          <TextInput
            value={bankSearch}
            onChangeText={setBankSearch}
            placeholder="Ex.: Nubank, Itaú, Inter..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
            style={[
              styles.searchInput,
              {
                backgroundColor: colors.surfaceAlt,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
          />
        </View>

        {normalizedBankSearch && filteredBanks.length === 0 ? (
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
              Nenhum banco encontrado
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Tente pesquisar com outro nome ou uma parte do nome do banco.
            </Text>
          </View>
        ) : (
          <View style={styles.bankGrid}>
            {filteredBanks.map((institution) => {
            const isConnected = institution.status === "conectado";
            const isSoon = institution.status === "em_breve";

            return (
              <Pressable
                key={institution.id}
                style={[
                  styles.bankCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  isConnected && {
                    backgroundColor: colors.successSoft,
                    borderColor: colors.success,
                  },
                  isSoon && {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                    opacity: 0.88,
                  },
                ]}
                onPress={() => openConnectModal(institution)}
              >
                <View style={styles.bankCardTop}>
                  <View
                    style={[
                      styles.institutionBadge,
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

                  <View
                    style={[
                      styles.bankStatusBadge,
                      isConnected && {
                        backgroundColor: colors.successSoft,
                        borderColor: colors.success,
                      },
                      !isConnected &&
                        !isSoon && {
                          backgroundColor: colors.accentSoft,
                          borderColor: colors.accentBorder,
                        },
                      isSoon && {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.bankStatusBadgeText,
                        isConnected && { color: colors.success },
                        !isConnected && !isSoon && { color: colors.accent },
                        isSoon && { color: colors.textMuted },
                      ]}
                    >
                      {isConnected
                        ? "Conectado"
                        : isSoon
                          ? "Em breve"
                          : "Disponível"}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.bankName, { color: colors.text }]}>
                  {institution.name}
                </Text>

                <Text
                  style={[
                    styles.bankDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  {institution.description}
                </Text>
              </Pressable>
            );
            })}
          </View>
        )}

        {isHydrated && !isPremium && connectedCount >= 1 ? (
          <View
            style={[
              styles.lockedCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.warning,
              },
            ]}
          >
            <Text style={[styles.lockedTitle, { color: colors.text }]}>
              Limite do Free atingido
            </Text>
            <Text style={[styles.lockedText, { color: colors.textSecondary }]}>
              Você já conectou 1 banco no plano Free. Para conectar mais bancos,
              ative o Premium.
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
              onPress={goToPremium}
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

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.infoTitle, { color: colors.text }]}>
            Próximo salto
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Esta tela gera token real e abre o Pluggy Connect. Depois disso, o
            próximo passo é sincronizar contas e transações no app.
          </Text>
        </View>
      </ScrollView>

      <Modal visible={confirmModalOpen} transparent animationType="slide">
        <View
          style={[
            styles.modalBackdrop,
            {
              backgroundColor: colors.overlay,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                paddingBottom: 18 + Math.max(insets.bottom, 12),
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Confirmar conexão
            </Text>

            <View
              style={[
                styles.modalInstitutionBadge,
                {
                  backgroundColor: colors.accentSoft,
                  borderColor: colors.accentBorder,
                },
              ]}
            >
              <Ionicons
                name="business-outline"
                size={30}
                color={colors.accent}
              />
            </View>

            <Text style={[styles.modalBankName, { color: colors.text }]}>
              {selectedBank?.name ?? ""}
            </Text>

            <Text
              style={[styles.modalDescription, { color: colors.textSecondary }]}
            >
              {selectedBankDescription}
            </Text>

            <Text style={[styles.modalWarning, { color: colors.textMuted }]}>
              Agora o app vai abrir o fluxo real do Open Finance com Pluggy.
            </Text>

            <Pressable
              style={[
                styles.modalPrimaryButton,
                {
                  backgroundColor: colors.accentButtonBackground,
                  borderColor: colors.accentButtonBorder,
                  opacity: connectingBankId ? 0.7 : 1,
                },
                colors.isWhiteAccentButton && styles.whiteAccentButton,
              ]}
              onPress={confirmConnect}
              disabled={!!connectingBankId}
            >
              <Text
                style={[
                  styles.modalPrimaryButtonText,
                  { color: colors.accentButtonText },
                ]}
              >
                {connectingBankId ? "Conectando..." : "Conectar banco"}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.modalSecondaryButton,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
              onPress={closeConnectModal}
            >
              <Text
                style={[
                  styles.modalSecondaryButtonText,
                  { color: colors.textMuted },
                ]}
              >
                Cancelar
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {pluggyOpen && connectToken ? (
        <PluggyConnect
          connectToken={connectToken}
          includeSandbox={false}
          selectedConnectorId={selectedConnectorId ?? undefined}
          language={getPluggyLanguage(language)}
          theme={settings.theme === "dark" ? "dark" : "light"}
          onSuccess={handlePluggySuccess}
          onError={handlePluggyError}
          onClose={handlePluggyClose}
        />
      ) : null}
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
    marginBottom: 18,
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
    gap: 10,
  },

  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },

  planTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
  },

  planBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  planBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },

  planText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },

  planButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14,
    borderWidth: 1,
  },

  planButtonText: {
    color: "white",
    fontWeight: "900",
    fontSize: 14,
  },

  heroCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 18,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },

  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
  },

  heroBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  heroBadgeText: {
    fontSize: 12,
    fontWeight: "900",
  },

  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 12,
  },

  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },

  heroMiniGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },

  heroMiniCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },

  heroMiniLabel: {
    fontSize: 12,
    fontWeight: "700",
  },

  heroMiniValue: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 8,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },

  searchCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
  },

  searchTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  searchHint: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 12,
  },

  searchInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    fontWeight: "700",
  },

  emptyBox: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 18,
  },

  emptyTitle: {
    fontWeight: "800",
    fontSize: 15,
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },

  connectedList: {
    gap: 10,
    marginBottom: 18,
  },

  connectedCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },

  connectedTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },

  connectedLeft: {
    flexDirection: "row",
    flex: 1,
    gap: 10,
  },

  institutionBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  connectedBankName: {
    fontSize: 15,
    fontWeight: "900",
  },

  connectedMeta: {
    fontSize: 12,
    marginTop: 4,
  },

  connectedStatusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  connectedStatusText: {
    fontSize: 11,
    fontWeight: "800",
  },

  connectedSyncText: {
    fontSize: 12,
    marginTop: 10,
    lineHeight: 17,
  },

  bankGrid: {
    gap: 10,
  },

  bankCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },

  bankCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },

  bankStatusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  bankStatusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },

  bankName: {
    fontSize: 15,
    fontWeight: "900",
  },

  bankDescription: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },

  lockedCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginTop: 18,
  },

  lockedTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  lockedText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },

  lockedButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
  },

  lockedButtonText: {
    color: "white",
    fontWeight: "900",
    fontSize: 14,
  },

  infoCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginTop: 18,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 6,
  },

  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
    borderWidth: 1,
    maxHeight: "88%",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
    textAlign: "center",
  },

  modalInstitutionBadge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 6,
  },

  connectedMain: {
    flex: 1,
  },

  modalBankName: {
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 10,
  },

  modalDescription: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 8,
  },

  modalWarning: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 18,
  },

  modalPrimaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
  },

  modalPrimaryButtonText: {
    color: "white",
    fontWeight: "900",
    fontSize: 14,
  },

  modalSecondaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },

  modalSecondaryButtonText: {
    fontWeight: "800",
    fontSize: 13,
  },

  whiteAccentButton: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
});
