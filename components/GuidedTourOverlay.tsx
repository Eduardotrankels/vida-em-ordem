import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type TourTargetRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type GuidedTourOverlayProps = {
  visible: boolean;
  title: string;
  description: string;
  stepLabel: string;
  mode?: "spotlight" | "intro";
  icon: React.ComponentProps<typeof Ionicons>["name"];
  accentColor: string;
  surfaceColor: string;
  borderColor: string;
  textColor: string;
  textSecondaryColor: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  targetRect?: TourTargetRect | null;
};

export default function GuidedTourOverlay({
  visible,
  title,
  description,
  stepLabel,
  mode = "spotlight",
  icon,
  accentColor,
  surfaceColor,
  borderColor,
  textColor,
  textSecondaryColor,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  targetRect,
}: GuidedTourOverlayProps) {
  const screen = Dimensions.get("window");
  const spotlightPadding = 10;
  const cardHorizontalInset = 18;
  const cardWidth = screen.width - cardHorizontalInset * 2;
  const safeTarget = targetRect
    ? {
        x: Math.max(targetRect.x - spotlightPadding, 0),
        y: Math.max(targetRect.y - spotlightPadding, 0),
        width: targetRect.width + spotlightPadding * 2,
        height: targetRect.height + spotlightPadding * 2,
      }
    : null;
  const isIntro = mode === "intro" || !safeTarget;

  const cardTop = safeTarget
    ? Math.min(safeTarget.y + safeTarget.height + 18, screen.height - 260)
    : screen.height - 300;
  const placeCardAbove =
    safeTarget &&
    safeTarget.y > screen.height * 0.55 &&
    safeTarget.y - 220 > 24;
  const cardBottom = placeCardAbove
    ? Math.max(screen.height - safeTarget.y + 18, 28)
    : undefined;
  const pointerLeft = safeTarget
    ? Math.max(
        24,
        Math.min(
          safeTarget.x + safeTarget.width / 2 - cardHorizontalInset - 12,
          cardWidth - 48
        )
      )
    : cardWidth / 2 - 12;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        {!isIntro && safeTarget ? (
          <>
            <View
              style={[
                styles.backdropBlock,
                {
                  left: 0,
                  top: 0,
                  width: screen.width,
                  height: safeTarget.y,
                },
              ]}
            />
            <View
              style={[
                styles.backdropBlock,
                {
                  left: 0,
                  top: safeTarget.y,
                  width: safeTarget.x,
                  height: safeTarget.height,
                },
              ]}
            />
            <View
              style={[
                styles.backdropBlock,
                {
                  left: safeTarget.x + safeTarget.width,
                  top: safeTarget.y,
                  width: Math.max(
                    screen.width - (safeTarget.x + safeTarget.width),
                    0
                  ),
                  height: safeTarget.height,
                },
              ]}
            />
            <View
              style={[
                styles.backdropBlock,
                {
                  left: 0,
                  top: safeTarget.y + safeTarget.height,
                  width: screen.width,
                  height: Math.max(
                    screen.height - (safeTarget.y + safeTarget.height),
                    0
                  ),
                },
              ]}
            />

            <View
              style={[
                styles.spotlightRing,
                {
                  left: safeTarget.x,
                  top: safeTarget.y,
                  width: safeTarget.width,
                  height: safeTarget.height,
                  borderColor: `${accentColor}D9`,
                  shadowColor: accentColor,
                },
              ]}
            />
          </>
        ) : (
          <View style={styles.fullBackdrop} />
        )}

        <View
          style={[
            styles.card,
            {
              backgroundColor: surfaceColor,
              borderColor: `${accentColor}55`,
              left: cardHorizontalInset,
              right: cardHorizontalInset,
              top: isIntro ? undefined : placeCardAbove ? undefined : cardTop,
              bottom: isIntro ? undefined : cardBottom,
              alignSelf: isIntro ? "center" : undefined,
            },
            isIntro ? styles.cardIntro : null,
          ]}
        >
          {!isIntro ? (
            <View
              style={[
                styles.pointer,
                placeCardAbove ? styles.pointerBottom : styles.pointerTop,
                {
                  left: pointerLeft,
                  backgroundColor: surfaceColor,
                  borderColor: `${accentColor}55`,
                },
              ]}
            />
          ) : null}

          <View style={styles.header}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: `${accentColor}20`,
                  borderColor: `${accentColor}55`,
                },
              ]}
            >
              <Ionicons name={icon} size={20} color={accentColor} />
            </View>

            <View style={styles.headerTextWrap}>
              <Text style={[styles.stepLabel, { color: accentColor }]}>
                {stepLabel}
              </Text>
              <Text style={[styles.title, { color: textColor }]}>{title}</Text>
            </View>
          </View>

          <Text style={[styles.description, { color: textSecondaryColor }]}>
            {description}
          </Text>

          <Pressable
            style={[
              styles.primaryButton,
              {
                backgroundColor: accentColor,
                borderColor: accentColor,
              },
            ]}
            onPress={onPrimary}
          >
            <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
          </Pressable>

          {secondaryLabel && onSecondary ? (
            <Pressable
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: surfaceColor,
                  borderColor,
                },
              ]}
              onPress={onSecondary}
            >
              <Text
                style={[styles.secondaryButtonText, { color: textSecondaryColor }]}
              >
                {secondaryLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    position: "relative",
  },
  fullBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 23, 0.9)",
  },
  backdropBlock: {
    position: "absolute",
    backgroundColor: "rgba(2, 6, 23, 0.9)",
  },
  spotlightRing: {
    position: "absolute",
    borderRadius: 22,
    borderWidth: 2,
    backgroundColor: "rgba(255,255,255,0.06)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 22,
  },
  card: {
    position: "absolute",
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.32,
    shadowRadius: 28,
    elevation: 16,
  },
  cardIntro: {
    position: "relative",
    top: "24%",
  },
  pointer: {
    position: "absolute",
    width: 24,
    height: 24,
    borderWidth: 1,
    transform: [{ rotate: "45deg" }],
  },
  pointerTop: {
    top: -12,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  pointerBottom: {
    bottom: -12,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: "900",
  },
  title: {
    fontSize: 19,
    fontWeight: "900",
    marginTop: 6,
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 14,
  },
  primaryButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  secondaryButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
});
