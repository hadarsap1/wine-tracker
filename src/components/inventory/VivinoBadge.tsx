import React from "react";
import { View, StyleSheet, Linking, Pressable } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import type { VivinoData } from "@/types/index";

interface Props {
  data: VivinoData | null | undefined;
  loading?: boolean;
}

/**
 * Displays a Vivino score badge. Shows a loading spinner while fetching,
 * nothing if not found, or a styled score card once data is available.
 */
export default function VivinoBadge({ data, loading }: Props) {
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text variant="labelSmall" style={styles.label}>
          {t.vivinoFetching}
        </Text>
      </View>
    );
  }

  // data === undefined means "not yet fetched"; data === null means "searched, not found"
  if (data === null) {
    return (
      <View style={styles.container}>
        <MaterialCommunityIcons name="information-outline" size={14} color={colors.textSecondary} />
        <Text variant="labelSmall" style={styles.label}>
          {t.vivinoNotFound}
        </Text>
      </View>
    );
  }

  if (data === undefined) return null;

  const stars = Math.round(data.score * 10) / 10;
  const ratingCount = data.ratings >= 1000
    ? `${(data.ratings / 1000).toFixed(1)}k`
    : String(data.ratings);

  const badgeContent = (
    <View style={[styles.badge, !!data.wineUrl && styles.badgeTappable]}>
      <View style={styles.logoMark}>
        <Text style={styles.logoText}>V</Text>
      </View>
      <View style={styles.info}>
        <Text variant="labelSmall" style={styles.source}>
          {t.vivinoRating}
        </Text>
        <View style={styles.scoreRow}>
          <Text variant="titleMedium" style={styles.score}>
            {stars.toFixed(1)}
          </Text>
          <Text variant="labelSmall" style={styles.count}>
            ({ratingCount})
          </Text>
        </View>
      </View>
      {data.wineUrl && (
        <MaterialCommunityIcons
          name="open-in-new"
          size={16}
          color={colors.textSecondary}
          style={styles.linkIcon}
        />
      )}
    </View>
  );

  if (data.wineUrl) {
    return (
      <Pressable onPress={() => Linking.openURL(data.wineUrl!)}>
        {badgeContent}
      </Pressable>
    );
  }

  return badgeContent;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  label: {
    color: colors.textSecondary,
    textAlign: "right",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeTappable: {
    borderColor: "#9b1c31",
  },
  info: {
    flex: 1,
  },
  linkIcon: {
    marginStart: 4,
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#9b1c31",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },
  source: {
    color: colors.textSecondary,
    textAlign: "right",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  score: {
    color: colors.text,
    fontWeight: "bold",
  },
  count: {
    color: colors.textSecondary,
  },
});
