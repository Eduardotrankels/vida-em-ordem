import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
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
import { SafeAreaView } from "react-native-safe-area-context";
import {
  APP_SETTINGS_KEY,
  AppSettings,
  DEFAULT_SETTINGS,
  getThemeColors,
} from "../utils/appTheme";

type CheckinData = {
  createdAt: string;
  humor: number;
  energia: number;
  sono: number;
  foco: number;
  sugestao: string;
};

const STORAGE_KEY = "vidaemordem_checkins_v1";

function isSameDay(dateA: string, dateB: string) {
  const a = new Date(dateA);
  const b = new Date(dateB);

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getLevelLabel(value: number) {
  if (value <= 3) return "Baixo";
  if (value <= 6) return "Médio";
  if (value <= 8) return "Bom";
  return "Excelente";
}

export default function Checkin() {
  const [humor, setHumor] = useState(6);
  const [energia, setEnergia] = useState(6);
  const [sono, setSono] = useState(6);
  const [foco, setFoco] = useState(6);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [historico, setHistorico] = useState<CheckinData[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const isPremium = settings.plan === "premium";

  const loadSettings = useCallback(async () => {
    try {
      const rawSettings = await AsyncStorage.getItem(APP_SETTINGS_KEY);
      const parsedSettings = rawSettings
        ? JSON.parse(rawSettings)
        : DEFAULT_SETTINGS;

      setSettings({
        theme: parsedSettings?.theme === "light" ? "light" : "dark",
        accentColor:
          parsedSettings?.accentColor || DEFAULT_SETTINGS.accentColor,
        inactivityLockMinutes:
          parsedSettings?.inactivityLockMinutes === 1 ||
          parsedSettings?.inactivityLockMinutes === 3 ||
          parsedSettings?.inactivityLockMinutes === 5 ||
          parsedSettings?.inactivityLockMinutes === 10
            ? parsedSettings.inactivityLockMinutes
            : 0,
        plan: parsedSettings?.plan === "premium" ? "premium" : "free",
      });
    } catch (error) {
      console.log("Erro ao carregar configurações do check-in:", error);
      setSettings(DEFAULT_SETTINGS);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed: CheckinData[] = raw ? JSON.parse(raw) : [];
      setHistorico(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.log("Erro ao carregar histórico do check-in:", error);
      setHistorico([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
      loadHistory();
    }, [loadSettings, loadHistory])
  );

  const colors = useMemo(
    () => getThemeColors(settings.theme, settings.accentColor),
    [settings.theme, settings.accentColor]
  );

  const mediaHoje = useMemo(() => {
    return Math.round((humor + energia + sono + foco) / 4);
  }, [humor, energia, sono, foco]);

  const checkinHoje = useMemo(() => {
    return historico.find((item) => isSameDay(item.createdAt, new Date().toISOString()));
  }, [historico]);

  const freeLimitReached = !isPremium && !!checkinHoje;

  const ultimos7 = useMemo(() => historico.slice(0, 7), [historico]);

  const tendenciaPremium = useMemo(() => {
    if (!isPremium || ultimos7.length < 2) return null;

    const mediaHumor =
      ultimos7.reduce((acc, item) => acc + item.humor, 0) / ultimos7.length;
    const mediaEnergia =
      ultimos7.reduce((acc, item) => acc + item.energia, 0) / ultimos7.length;
    const mediaSono =
      ultimos7.reduce((acc, item) => acc + item.sono, 0) / ultimos7.length;
    const mediaFoco =
      ultimos7.reduce((acc, item) => acc + item.foco, 0) / ultimos7.length;

    const menor = Math.min(mediaHumor, mediaEnergia, mediaSono, mediaFoco);

    if (menor === mediaSono) {
      return "Seu sono merece mais atenção. Dormir melhor pode levantar todo o resto.";
    }

    if (menor === mediaEnergia) {
      return "Sua energia está pedindo recarga. Tente reduzir excessos e preservar pausas curtas.";
    }

    if (menor === mediaFoco) {
      return "Seu foco está oscilando. Experimente blocos curtos de concentração sem notificações.";
    }

    return "Seu humor merece cuidado especial. Um ajuste pequeno hoje pode mudar o tom do dia.";
  }, [isPremium, ultimos7]);

  const sugestao = useMemo(() => {
    if (sono <= 4 && energia <= 4) {
      return "Hoje vá com calma. Foque em apenas uma tarefa importante.";
    }

    if (foco <= 4) {
      return "Proteja seu foco. Trabalhe 25 minutos sem interrupção.";
    }

    if (humor <= 4) {
      return "Cuide de você hoje. Caminhe 10 minutos e respire fundo.";
    }

    if (energia >= 8 && foco >= 7) {
      return "Hoje é dia de avançar forte. Ataque seu objetivo principal.";
    }

    if (mediaHoje <= 5) {
      return "Seu dia pede leveza. Priorize o essencial e elimine o excesso.";
    }

    return "Mantenha o ritmo. Faça 3 tarefas importantes hoje.";
  }, [humor, energia, sono, foco, mediaHoje]);

  async function salvar() {
    try {
      if (freeLimitReached) {
        Alert.alert(
          "Limite do plano Free",
          "Você já fez seu check-in de hoje. No Premium, você desbloqueia check-ins ilimitados e mais insights."
        );
        return;
      }

      const novo: CheckinData = {
        createdAt: new Date().toISOString(),
        humor,
        energia,
        sono,
        foco,
        sugestao,
      };

      const atual = await AsyncStorage.getItem(STORAGE_KEY);
      const lista: CheckinData[] = atual ? JSON.parse(atual) : [];

      lista.unshift(novo);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));

      Alert.alert("Salvo ✅", "Seu check-in foi registrado.");
      router.back();
    } catch {
      Alert.alert("Erro", "Não foi possível salvar seu check-in.");
    }
  }

  const renderSliderBlock = (
    label: string,
    value: number,
    onChange: (value: number) => void
  ) => (
    <View style={styles.sliderBlock}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.text }]}>
          {label}: {value}
        </Text>
        <View
          style={[
            styles.levelBadge,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.levelBadgeText, { color: colors.textSecondary }]}>
            {getLevelLabel(value)}
          </Text>
        </View>
      </View>

      <Slider
        minimumValue={1}
        maximumValue={10}
        step={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.accent}
      />
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={[
            styles.backButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonText, { color: colors.text }]}>
            ← Voltar
          </Text>
        </Pressable>

        <Text style={[styles.title, { color: colors.text }]}>Check-in do Dia</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Registre como você está hoje e receba uma direção rápida para o dia.
        </Text>

        <View
          style={[
            styles.topCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.topCardLabel, { color: colors.textSecondary }]}>
            Estado geral de hoje
          </Text>
          <Text style={[styles.topCardValue, { color: colors.text }]}>
            {mediaHoje}/10
          </Text>
          <Text style={[styles.topCardHint, { color: colors.textSecondary }]}>
            {mediaHoje >= 8
              ? "Dia forte para avançar."
              : mediaHoje >= 6
              ? "Bom equilíbrio para seguir."
              : "Hoje vale pegar mais leve."}
          </Text>
        </View>

        {renderSliderBlock("Humor", humor, setHumor)}
        {renderSliderBlock("Energia", energia, setEnergia)}
        {renderSliderBlock("Sono", sono, setSono)}
        {renderSliderBlock("Foco", foco, setFoco)}

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Sugestão do dia
          </Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>
            {sugestao}
          </Text>
        </View>

        {isPremium ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Insight Premium
            </Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>
              {loadingHistory
                ? "Analisando seus últimos registros..."
                : tendenciaPremium ||
                  "Continue registrando seus dias para liberar leituras mais inteligentes do seu padrão."}
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.premiumCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.premiumTitle, { color: colors.text }]}>
              Desbloqueie o Premium
            </Text>
            <Text style={[styles.premiumText, { color: colors.textSecondary }]}>
              Tenha check-ins ilimitados no mesmo dia, mais leitura de padrão e insights mais profundos.
            </Text>

            <View
              style={[
                styles.limitBox,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.limitBoxText, { color: colors.text }]}>
                Free: 1 check-in por dia
              </Text>
              <Text style={[styles.limitBoxText, { color: colors.textSecondary }]}>
                Premium: check-ins ilimitados
              </Text>
            </View>

            <Pressable
              style={[
                styles.upgradeButton,
                {
                  backgroundColor: colors.accentButtonBackground,
                  borderColor: colors.accentButtonBorder,
                },
                colors.isWhiteAccentButton && styles.whiteAccentButton,
              ]}
              onPress={() => router.push("/perfil")}
            >
              <Text
                style={[
                  styles.upgradeButtonText,
                  { color: colors.accentButtonText },
                ]}
              >
                Ver plano Premium
              </Text>
            </Pressable>
          </View>
        )}

        {freeLimitReached && (
          <View
            style={[
              styles.warningCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.warningTitle, { color: colors.text }]}>
              Check-in de hoje já registrado
            </Text>
            <Text style={[styles.warningText, { color: colors.textSecondary }]}>
              Seu plano atual permite 1 check-in por dia. Amanhã você poderá registrar novamente, ou desbloquear o Premium para uso ilimitado.
            </Text>
          </View>
        )}

        <View style={styles.actionsRow}>
          <Pressable
            style={[
              styles.btn,
              styles.btnGhost,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => router.back()}
          >
            <Text style={[styles.btnGhostText, { color: colors.text }]}>
              Voltar
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.btn,
              styles.btnPrimary,
              {
                backgroundColor: freeLimitReached
                  ? colors.border
                  : colors.accentButtonBackground,
                borderColor: freeLimitReached
                  ? colors.border
                  : colors.accentButtonBorder,
                opacity: freeLimitReached ? 0.7 : 1,
              },
              !freeLimitReached &&
                colors.isWhiteAccentButton &&
                styles.whiteAccentButton,
            ]}
            onPress={salvar}
          >
            <Text
              style={[
                styles.btnPrimaryText,
                {
                  color: freeLimitReached
                    ? colors.textMuted
                    : colors.accentButtonText,
                },
              ]}
            >
              {freeLimitReached ? "Limite atingido" : "Salvar"}
            </Text>
          </Pressable>
        </View>
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
    paddingHorizontal: 25,
    paddingTop: 8,
    paddingBottom: 120,
  },

  backButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },

  backButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },

  topCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },

  topCardLabel: {
    fontSize: 13,
    fontWeight: "700",
  },

  topCardValue: {
    fontSize: 26,
    fontWeight: "900",
    marginTop: 6,
  },

  topCardHint: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },

  sliderBlock: {
    marginTop: 12,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  label: {
    marginTop: 8,
    fontWeight: "600",
  },

  levelBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  levelBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  card: {
    marginTop: 22,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },

  cardTitle: {
    fontWeight: "bold",
    fontSize: 15,
  },

  cardText: {
    marginTop: 6,
    lineHeight: 20,
    fontSize: 14,
  },

  premiumCard: {
    marginTop: 22,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },

  premiumTitle: {
    fontSize: 16,
    fontWeight: "800",
  },

  premiumText: {
    marginTop: 8,
    lineHeight: 20,
    fontSize: 14,
  },

  limitBox: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },

  limitBoxText: {
    fontSize: 13,
    fontWeight: "700",
  },

  upgradeButton: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },

  upgradeButtonText: {
    color: "white",
    fontWeight: "800",
    fontSize: 14,
  },

  warningCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },

  warningTitle: {
    fontSize: 14,
    fontWeight: "800",
  },

  warningText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },

  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },

  btnPrimary: {},

  btnPrimaryText: {
    color: "white",
    fontWeight: "800",
  },

  btnGhost: {},

  btnGhostText: {
    fontWeight: "700",
  },

  whiteAccentButton: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
});
