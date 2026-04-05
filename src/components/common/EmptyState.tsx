import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@config/theme";

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <MaterialCommunityIcons
          name={icon as any}
          size={64}
          color={colors.gold}
        />
      </View>
      <Text variant="titleLarge" style={styles.title}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="bodyMedium" style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          mode="contained"
          onPress={onAction}
          style={styles.button}
          buttonColor={colors.primary}
        >
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  iconWrapper: {
    backgroundColor: colors.card,
    borderRadius: 40,
    padding: 16,
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    marginTop: 16,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  button: {
    marginTop: 24,
  },
});
