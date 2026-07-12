import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Platform } from "react-native";
import {
  Button,
  Text,
  TextInput,
  HelperText,
  Dialog,
  Portal,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "@stores/authStore";
import { useSnackbarStore } from "@stores/snackbarStore";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import { authErrorMessage } from "@utils/authErrors";
import type { LoginScreenProps } from "@navigation/types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { signIn, signInWithGoogle, sendPasswordReset, loading } = useAuthStore();
  const showSnackbar = useSnackbarStore((s) => s.show);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");

  const [resetVisible, setResetVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSending, setResetSending] = useState(false);

  const handleEmailSignIn = async () => {
    setFormError("");
    if (!EMAIL_REGEX.test(email.trim())) {
      setFormError(t.invalidEmail);
      return;
    }
    if (password.length < 6) {
      setFormError(t.passwordTooShort);
      return;
    }
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setFormError(authErrorMessage(e));
    }
  };

  const handleGoogle = async () => {
    setFormError("");
    try {
      await signInWithGoogle();
    } catch (e) {
      setFormError(authErrorMessage(e));
    }
  };

  const handleReset = async () => {
    setResetError("");
    if (!EMAIL_REGEX.test(resetEmail.trim())) {
      setResetError(t.invalidEmail);
      return;
    }
    setResetSending(true);
    try {
      await sendPasswordReset(resetEmail.trim());
      setResetVisible(false);
      showSnackbar(t.resetPasswordSent, "success");
    } catch (e) {
      setResetError(authErrorMessage(e));
    } finally {
      setResetSending(false);
    }
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="glass-wine" size={64} color={colors.gold} />
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
                name={feature.icon as keyof typeof MaterialCommunityIcons.glyphMap}
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
        <TextInput
          label={t.email}
          value={email}
          onChangeText={(v) => {
            setFormError("");
            setEmail(v);
          }}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          left={<TextInput.Icon icon="email-outline" />}
          style={styles.input}
          accessibilityLabel={t.email}
        />
        <TextInput
          label={t.password}
          value={password}
          onChangeText={(v) => {
            setFormError("");
            setPassword(v);
          }}
          mode="outlined"
          secureTextEntry={!showPassword}
          autoComplete="current-password"
          left={<TextInput.Icon icon="lock-outline" />}
          right={
            <TextInput.Icon
              icon={showPassword ? "eye-off" : "eye"}
              onPress={() => setShowPassword(!showPassword)}
            />
          }
          style={styles.input}
          accessibilityLabel={t.password}
          onSubmitEditing={handleEmailSignIn}
        />

        <HelperText type="error" visible={!!formError}>
          {formError}
        </HelperText>

        <Button
          mode="contained"
          onPress={handleEmailSignIn}
          loading={loading}
          disabled={loading || !email || !password}
          buttonColor={colors.primary}
          textColor={colors.onPrimary}
          contentStyle={styles.buttonContent}
          accessibilityLabel={t.signInWithEmail}
        >
          {t.signIn}
        </Button>

        <Button
          mode="text"
          onPress={() => {
            setResetEmail(email.trim());
            setResetError("");
            setResetVisible(true);
          }}
          textColor={colors.textSecondary}
          compact
          style={styles.forgotBtn}
        >
          {t.forgotPassword}
        </Button>

        <Text variant="labelSmall" style={styles.orText}>
          {t.orContinueWith}
        </Text>

        <Button
          mode="outlined"
          onPress={handleGoogle}
          loading={loading}
          disabled={loading}
          icon="google"
          style={styles.googleButton}
          textColor={colors.text}
          contentStyle={styles.buttonContent}
          accessibilityLabel={t.signInWithGoogle}
        >
          {t.signInWithGoogle}
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate("SignUp")}
          textColor={colors.gold}
          style={styles.signupLink}
        >
          {t.noAccount}
        </Button>
      </View>

      <Portal>
        <Dialog
          visible={resetVisible}
          onDismiss={() => setResetVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>{t.resetPasswordTitle}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={styles.dialogText}>
              {t.resetPasswordMsg}
            </Text>
            <TextInput
              label={t.email}
              value={resetEmail}
              onChangeText={(v) => {
                setResetError("");
                setResetEmail(v);
              }}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={styles.dialogInput}
              accessibilityLabel={t.email}
            />
            <HelperText type="error" visible={!!resetError}>
              {resetError}
            </HelperText>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setResetVisible(false)} textColor={colors.textSecondary}>
              {t.cancel}
            </Button>
            <Button onPress={handleReset} loading={resetSending} textColor={colors.primary}>
              {t.resetPasswordSend}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    marginBottom: 24,
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
    width: "100%",
    maxWidth: Platform.OS === "web" ? 420 : undefined,
    alignSelf: "center",
    marginBottom: 24,
    gap: 14,
  },
  featureRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: colors.text,
    textAlign: "right",
  },
  featureDesc: {
    color: colors.textSecondary,
    textAlign: "right",
  },
  formCard: {
    width: "100%",
    maxWidth: Platform.OS === "web" ? 420 : undefined,
    alignSelf: "center",
  },
  input: {
    marginBottom: 4,
    backgroundColor: colors.card,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  forgotBtn: {
    alignSelf: "center",
    marginTop: 4,
  },
  orText: {
    textAlign: "center",
    color: colors.textSecondary,
    marginVertical: 16,
  },
  googleButton: {
    borderColor: colors.border,
  },
  signupLink: {
    marginTop: 12,
  },
  dialog: {
    backgroundColor: colors.card,
  },
  dialogTitle: {
    color: colors.text,
  },
  dialogText: {
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: "right",
  },
  dialogInput: {
    backgroundColor: colors.card,
  },
});
