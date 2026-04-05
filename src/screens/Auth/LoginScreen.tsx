import React from "react";
import { View, StyleSheet } from "react-native";
import { Button, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "@stores/authStore";
import { colors } from "@config/theme";
import { t } from "@i18n/index";

export default function LoginScreen() {
  const { signInWithGoogle, loading, error } = useAuthStore();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="glass-wine"
            size={64}
            color={colors.gold}
          />
        </View>
        <Text variant="headlineLarge" style={styles.title}>
          {t.signInTitle}
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          {t.signInSubtitle}
        </Text>
      </View>

      <View style={styles.formCard}>
        {error ? (
          <Text variant="bodySmall" style={styles.errorText}>
            {error}
          </Text>
        ) : null}

        <Button
          mode="contained"
          onPress={async () => {
            try {
              await signInWithGoogle();
            } catch {}
          }}
          loading={loading}
          disabled={loading}
          icon="google"
          style={styles.googleButton}
          buttonColor={colors.primary}
          textColor={colors.onPrimary}
          contentStyle={styles.buttonContent}
        >
          {t.signInWithGoogle}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.gold + "40",
  },
  title: {
    color: colors.gold,
    fontWeight: "bold",
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "right",
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
  },
  errorText: {
    color: colors.error,
    textAlign: "center",
    marginBottom: 16,
  },
  googleButton: {
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 6,
  },
});
