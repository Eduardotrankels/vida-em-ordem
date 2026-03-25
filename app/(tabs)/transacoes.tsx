import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getTransactions } from "../services/openFinance";
import { useAppLanguage } from "../utils/languageContext";
import {
  formatCurrencyByLanguage,
  formatDateByLanguage,
} from "../utils/locale";

const uiByLanguage = {
  pt: {
    fallbackTitle: "Transação",
    loading: "Carregando transações...",
    empty: "Nenhuma transação encontrada",
  },
  en: {
    fallbackTitle: "Transaction",
    loading: "Loading transactions...",
    empty: "No transactions found",
  },
  es: {
    fallbackTitle: "Transacción",
    loading: "Cargando transacciones...",
    empty: "No se encontraron transacciones",
  },
  fr: {
    fallbackTitle: "Transaction",
    loading: "Chargement des transactions...",
    empty: "Aucune transaction trouvée",
  },
  it: {
    fallbackTitle: "Transazione",
    loading: "Caricamento transazioni...",
    empty: "Nessuna transazione trovata",
  },
} as const;

export default function TransacoesScreen() {
  const { language } = useAppLanguage();
  const ui = uiByLanguage[language];
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await getTransactions();
      setTransactions(res.transactions || []);
    } catch (err) {
      console.log("Erro ao buscar transações:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const renderItem = ({ item }: any) => {
    const isEntrada = item.amount > 0;

    return (
      <View style={styles.card}>
        <View>
          <Text style={styles.title}>{item.description || ui.fallbackTitle}</Text>
          <Text style={styles.date}>
            {formatDateByLanguage(item.date, language)}
          </Text>
        </View>

        <Text
          style={[
            styles.amount,
            { color: isEntrada ? "#16a34a" : "#dc2626" },
          ]}
        >
          {formatCurrencyByLanguage(item.amount, language)}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>{ui.loading}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>{ui.empty}</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#111",
    marginBottom: 10,
  },
  title: {
    color: "#fff",
    fontWeight: "600",
  },
  date: {
    color: "#aaa",
    fontSize: 12,
  },
  amount: {
    fontWeight: "bold",
    fontSize: 16,
  },
  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#aaa",
  },
});
