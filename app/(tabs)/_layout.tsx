import { Tabs } from "expo-router";
import React from "react";
import TabBarIcon from "@expo/vector-icons/Ionicons";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppLanguage } from "../utils/languageContext";
import { useAppTheme } from "../utils/themeContext";

const tabsCopyByLanguage = {
  pt: {
    home: "Home",
    bankConnections: "Conexões bancárias",
    history: "Histórico",
    habits: "Hábitos",
    achievements: "Conquistas",
    checkin: "Check-in",
  },
  en: {
    home: "Home",
    bankConnections: "Bank connections",
    history: "History",
    habits: "Habits",
    achievements: "Achievements",
    checkin: "Check-in",
  },
  es: {
    home: "Inicio",
    bankConnections: "Conexiones bancarias",
    history: "Historial",
    habits: "Hábitos",
    achievements: "Logros",
    checkin: "Check-in",
  },
  fr: {
    home: "Accueil",
    bankConnections: "Connexions bancaires",
    history: "Historique",
    habits: "Habitudes",
    achievements: "Réussites",
    checkin: "Check-in",
  },
  it: {
    home: "Home",
    bankConnections: "Connessioni bancarie",
    history: "Storico",
    habits: "Abitudini",
    achievements: "Conquiste",
    checkin: "Check-in",
  },
} as const;

function TabIcon({
  focused,
  activeColor,
  inactiveColor,
  activeIcon,
  inactiveIcon,
}: {
  focused: boolean;
  activeColor: string;
  inactiveColor: string;
  activeIcon: keyof typeof TabBarIcon.glyphMap;
  inactiveIcon: keyof typeof TabBarIcon.glyphMap;
}) {
  return (
    <View
      style={[
        styles.iconWrap,
        focused && {
          backgroundColor: `${activeColor}16`,
          borderColor: `${activeColor}30`,
          transform: [{ translateY: -2 }],
        },
      ]}
    >
      <TabBarIcon
        name={focused ? activeIcon : inactiveIcon}
        size={20}
        color={focused ? activeColor : inactiveColor}
      />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { language } = useAppLanguage();
  const tabsCopy = tabsCopyByLanguage[language];
  const activeTabColor = colors.isWhiteAccentButton
    ? "#111827"
    : colors.accent;
  const tabBarBg = colors.isDark ? "rgba(15,17,21,0.96)" : "rgba(252,252,253,0.96)";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: {
            backgroundColor: colors.background,
          },
          tabBarActiveTintColor: activeTabColor,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            position: "absolute",
            left: 14,
            right: 14,
            bottom: 12,
            height: 78 + insets.bottom,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 12),
            paddingHorizontal: 8,
            backgroundColor: tabBarBg,
            borderTopWidth: 0,
            borderWidth: 1,
            borderColor: colors.isWhiteAccentButton
              ? "rgba(15,23,42,0.08)"
              : colors.border,
            borderRadius: 26,
            ...styles.tabShadow,
          },
          tabBarItemStyle: {
            marginHorizontal: 2,
            borderRadius: 18,
            paddingTop: 2,
            paddingBottom: 2,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "900",
            marginTop: 4,
            letterSpacing: 0.2,
          },
          tabBarBackground: () => (
            <View style={styles.tabBackground}>
              <View
                style={[
                  styles.tabGlow,
                  { backgroundColor: `${activeTabColor}14` },
                ]}
              />
              <View
                style={[
                  styles.tabBackgroundFill,
                  {
                    backgroundColor: tabBarBg,
                    borderRadius: 26,
                  },
                ]}
              />
            </View>
          ),
          tabBarLabelPosition: "below-icon",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: tabsCopy.home,
            tabBarIcon: ({ focused, color }) => (
              <TabIcon
                focused={focused}
                activeColor={activeTabColor}
                inactiveColor={color}
                activeIcon="home"
                inactiveIcon="home-outline"
              />
            ),
          }}
        />

        <Tabs.Screen
          name="dinheiro-conexoes"
          options={{
            href: null,
            title: tabsCopy.bankConnections,
            tabBarIcon: ({ focused, color }) => (
              <TabIcon
                focused={focused}
                activeColor={activeTabColor}
                inactiveColor={color}
                activeIcon="wallet"
                inactiveIcon="wallet-outline"
              />
            ),
          }}
        />

        <Tabs.Screen
          name="transacoes"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="historico"
          options={{
            title: tabsCopy.history,
            tabBarIcon: ({ focused, color }) => (
              <TabIcon
                focused={focused}
                activeColor={activeTabColor}
                inactiveColor={color}
                activeIcon="time"
                inactiveIcon="time-outline"
              />
            ),
          }}
        />

        <Tabs.Screen
          name="habitos"
          options={{
            title: tabsCopy.habits,
            tabBarIcon: ({ focused, color }) => (
              <TabIcon
                focused={focused}
                activeColor={activeTabColor}
                inactiveColor={color}
                activeIcon="leaf"
                inactiveIcon="leaf-outline"
              />
            ),
          }}
        />

        <Tabs.Screen
          name="conquistas"
          options={{
            title: tabsCopy.achievements,
            tabBarIcon: ({ focused, color }) => (
              <TabIcon
                focused={focused}
                activeColor={activeTabColor}
                inactiveColor={color}
                activeIcon="medal"
                inactiveIcon="medal-outline"
              />
            ),
          }}
        />

        <Tabs.Screen
          name="checkin"
          options={{
            href: null,
            title: tabsCopy.checkin,
            tabBarIcon: ({ focused, color }) => (
              <TabIcon
                focused={focused}
                activeColor={activeTabColor}
                inactiveColor={color}
                activeIcon="pulse"
                inactiveIcon="pulse-outline"
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  tabBackground: {
    flex: 1,
  },

  tabBackgroundFill: {
    flex: 1,
  },

  tabGlow: {
    position: "absolute",
    width: 180,
    height: 72,
    borderRadius: 999,
    top: -14,
    alignSelf: "center",
  },

  iconWrap: {
    minWidth: 42,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: 10,
    marginTop: 1,
  },

  tabShadow: Platform.select({
    ios: {
      shadowColor: "#000000",
      shadowOpacity: 0.09,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },
    android: {
      elevation: 18,
    },
    default: {},
  }),
});
