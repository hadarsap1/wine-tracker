import React, { useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Button, Text, TextInput, HelperText } from "react-native-paper";
import { useAuthStore } from "@stores/authStore";
import { colors } from "@config/theme";
import type { LoginScreenProps } from "@navigation/types";

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, loading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    try {
      await signIn(email.trim(), password);
    } catch {
      // error is set in the store
    }
  };

  const handleEmailChange = (text: string) => {
    if (error) clearError();
    setEmail(text);
  };

  const handlePasswordChange = (text: string) => {
    if (error) clearError();
    setPassword(text);
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
          <Text variant="headlineLarge" style={styles.title}>
            Wine Tracker
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Sign in to your account
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={handleEmailChange}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            left={<TextInput.Icon icon="email-outline" />}
            style={styles.input}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={handlePasswordChange}
            mode="outlined"
            secureTextEntry={!showPassword}
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={showPassword ? "eye-off" : "eye"}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            style={styles.input}
          />

          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading || !email || !password}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Sign In
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate("SignUp")}
            style={styles.linkButton}
          >
            Don't have an account? Sign Up
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
    marginBottom: 48,
  },
  title: {
    color: colors.primary,
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
});
