import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getBackendBaseUrl } from "../services/openFinanceApi";
import {
  APP_SETTINGS_KEY,
  AppSettings,
  DEFAULT_SETTINGS,
  getThemeColors,
} from "../utils/appTheme";

type BankConnection = {
  id: string;
  bankName: string;
  lastSync: string;
};

const BANK_CONNECTIONS_KEY = "@vida_em_ordem_bank_connections_v2";

export default function DinheiroConexoes() {
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const loadData = useCallback(async () => {
    try {
      const [connectionsRaw, settingsRaw] = await Promise.all([
        AsyncStorage.getItem(BANK_CONNECTIONS_KEY),
        AsyncStorage.getItem(APP_SETTINGS_KEY),
      ]);

      const parsedConnections = connectionsRaw
        ? JSON.parse(connectionsRaw)
        : [];

      const parsedSettings = settingsRaw
        ? JSON.parse(settingsRaw)
        : DEFAULT_SETTINGS;

      setConnections(
        Array.isArray(parsedConnections) ? parsedConnections : []
      );

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
          plan: parsedSettings?.plan === "premium" ? "premium" : "free"
      });
    } catch (error) {
      console.log("Erro ao carregar conexões:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const colors = useMemo(
    () => getThemeColors(settings.theme, settings.accentColor),
    [settings]
  );

  function connectBank() {
    router.push("/dinheiro-conectar-banco");
  }

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
          <Text style={[styles.backText, { color: colors.text }]}>
            ← Voltar
          </Text>
        </Pressable>

        <Text style={[styles.title, { color: colors.text }]}>
          Conexões Bancárias
        </Text>

       <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
  Conecte suas contas para importar movimentações automaticamente e
  deixar o módulo Dinheiro muito mais inteligente.
</Text>

<Text style={[styles.subtitle, { color: colors.textSecondary, marginTop: 6 }]}>
  Backend: {getBackendBaseUrl()}
</Text>

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Seus dados são protegidos por criptografia e Open Finance.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Bancos conectados
        </Text>

        {connections.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhum banco conectado ainda.
            </Text>
          </View>
        ) : (
          connections.map((bank) => (
            <View
              key={bank.id}
              style={[
                styles.bankCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.bankName, { color: colors.text }]}>
                {bank.bankName}
              </Text>

              <Text
                style={[
                  styles.bankMeta,
                  { color: colors.textSecondary },
                ]}
              >
                Última sincronização: {bank.lastSync}
              </Text>
            </View>
          ))
        )}

        <Pressable
          style={[
            styles.connectButton,
            { backgroundColor: colors.accent },
          ]}
          onPress={connectBank}
        >
          <Text
            style={[
              styles.connectButtonText,
              { color: colors.accentContrast },
            ]}
          >
            Conectar novo banco
          </Text>
        </Pressable>
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

  backText: {
    fontWeight: "800",
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
  },

  subtitle: {
    marginTop: 6,
    marginBottom: 20,
  },

  infoCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 20,
  },

  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },

  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
  },

  emptyText: {
    fontSize: 13,
  },

  bankCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },

  bankName: {
    fontSize: 16,
    fontWeight: "800",
  },

  bankMeta: {
    fontSize: 12,
    marginTop: 4,
  },

  connectButton: {
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  connectButtonText: {
    color: "white",
    fontWeight: "900",
    fontSize: 15,
  },
});
