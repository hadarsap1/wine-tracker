import React, { useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Button, Text, TextInput, HelperText } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "@stores/authStore";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import type { SignUpScreenProps } from "@navigation/types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpScreen({ navigation }: SignUpScreenProps) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const { signUp, signInWithGoogle, loading, error, clearError } = useAuthStore();

  const handleSignUp = async () => {
    let valid = true;
    if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError(t.invalidEmail);
      valid = false;
    }
    if (password.length < 6) {
      setPasswordError(t.passwordTooShort);
      valid = false;
    }
    if (!valid) return;
    try {
      await signUp(email.trim(), password, displayName.trim());
    } catch {
      // error is set in the store
    }
  };

  const handleFieldChange = (setter: (v: string) => void, clearFieldError?: () => void) => (text: string) => {
    if (error) clearError();
    clearFieldError?.();
    setter(text);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="bottle-wine"
              size={64}
              color={colors.gold}
            />
          </View>
          <Text variant="headlineLarge" style={styles.title}>
            {t.signUpTitle}
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            {t.signUpSubtitle}
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label={t.displayName}
            value={displayName}
            onChangeText={handleFieldChange(setDisplayName)}
            mode="outlined"
            autoCapitalize="words"
            autoComplete="name"
            left={<TextInput.Icon icon="account-outline" />}
            style={styles.input}
          />

          <TextInput
            label={t.email}
            value={email}
            onChangeText={handleFieldChange(setEmail, () => setEmailError(""))}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={!!emailError}
            left={<TextInput.Icon icon="email-outline" />}
            style={styles.input}
          />
          <HelperText type="error" visible={!!emailError}>
            {emailError}
          </HelperText>

          <TextInput
            label={t.password}
            value={password}
            onChangeText={handleFieldChange(setPassword, () => setPasswordError(""))}
            mode="outlined"
            secureTextEntry={!showPassword}
            error={!!passwordError}
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={showPassword ? "eye-off" : "eye"}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            style={styles.input}
          />
          <HelperText type="error" visible={!!passwordError}>
            {passwordError}
          </HelperText>

          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>

          <Button
            mode="contained"
            onPress={handleSignUp}
            loading={loading}
            disabled={loading || !displayName || !email || !password}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            {t.signUp}
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            style={styles.linkButton}
          >
            {t.hasAccount}
          </Button>

          <Text variant="labelSmall" style={styles.orText}>{t.orContinueWith}</Text>

          <Button
            mode="outlined"
            onPress={async () => { try { await signInWithGoogle(); } catch {} }}
            loading={loading}
            disabled={loading}
            icon="google"
            style={styles.googleButton}
          >
            {t.signInWithGoogle}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
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
  },
  form: {
    width: "100%",
  },
  input: {
    marginBottom: 8,
  },
  button: {
    marginTop: 16,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  linkButton: {
    marginTop: 12,
  },
  orText: {
    textAlign: "center",
    color: colors.textSecondary,
    marginVertical: 16,
  },
  googleButton: {
    borderColor: colors.border,
  },
});
