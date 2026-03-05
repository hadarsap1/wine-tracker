import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
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
}: ProfileHeaderProps) {
  return (
    <View style={styles.container}>
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
        <Text
          style={[styles.initials, { fontSize: size * 0.4 }]}
        >
          {getInitials(displayName)}
        </Text>
      </View>
      <Text variant="headlineSmall" style={styles.name}>
        {displayName}
      </Text>
      <Text variant="bodyMedium" style={styles.email}>
        {email}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 24,
  },
  avatar: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
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
