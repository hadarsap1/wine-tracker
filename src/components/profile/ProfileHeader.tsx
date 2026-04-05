import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@config/theme";

interface ProfileHeaderProps {
  displayName: string;
  email: string;
  size?: number;
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfileHeader({
  displayName,
  email,
  size = 80,
}: ProfileHeaderProps): React.ReactElement {
  return (
    <View style={styles.card}>
      <View style={styles.avatarRow}>
        <View
          style={[
            styles.avatar,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
            {getInitials(displayName)}
          </Text>
        </View>
        <MaterialCommunityIcons
          name="glass-wine"
          size={32}
          color={colors.gold}
          style={styles.wineIcon}
        />
      </View>
      <Text variant="headlineMedium" style={styles.name}>
        {displayName}
      </Text>
      <Text variant="bodyMedium" style={styles.email}>
        {email}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    margin: 16,
    padding: 20,
    alignItems: "center",
    borderTopWidth: 3,
    borderTopColor: colors.primary,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  avatar: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  wineIcon: {
    marginStart: 8,
    marginBottom: 4,
  },
  initials: {
    color: colors.onPrimary,
    fontWeight: "700",
  },
  name: {
    color: colors.text,
    fontWeight: "600",
  },
  email: {
    color: colors.textSecondary,
    marginTop: 4,
  },
});
