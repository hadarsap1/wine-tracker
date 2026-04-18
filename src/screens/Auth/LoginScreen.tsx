import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Button, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "@stores/authStore";
import { colors } from "@config/theme";
import { t } from "@i18n/index";

export default function LoginScreen() {
  const { signInWithGoogle, loading, error } = useAuthStore();

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
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
        <Text variant="bodyLarge" style={styles.tagline}>
          {t.loginTagline}
        </Text>
      </View>

      <View style={styles.features}>
        {t.loginFeatures.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <View style={styles.featureIconWrap}>
              <MaterialCommunityIcons
                name={feature.icon as any}
                size={22}
                color={colors.gold}
              />
            </View>
            <View style={styles.featureText}>
              <Text variant="titleSmall" style={styles.featureTitle}>
                {feature.title}
              </Text>
              <Text variant="bodySmall" style={styles.featureDesc}>
                {feature.desc}
              </Text>
            </View>
          </View>
        ))}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingVertical: 48,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
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
  tagline: {
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  features: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  featureIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary + "33",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
    alignItems: "flex-end",
  },
  featureTitle: {
    color: colors.text,
    fontWeight: "bold",
    textAlign: "right",
  },
  featureDesc: {
    color: colors.textSecondary,
    marginTop: 2,
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
