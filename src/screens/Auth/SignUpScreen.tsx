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
import type { SignUpScreenProps } from "@navigation/types";

export default function SignUpScreen({ navigation }: SignUpScreenProps) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { signUp, loading, error, clearError } = useAuthStore();

  const handleSignUp = async () => {
    try {
      await signUp(email.trim(), password, displayName.trim());
    } catch {
      // error is set in the store
    }
  };

  const handleFieldChange = (setter: (v: string) => void) => (text: string) => {
    if (error) clearError();
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
          <Text variant="headlineLarge" style={styles.title}>
            Create Account
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Start tracking your wine collection
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Display Name"
            value={displayName}
            onChangeText={handleFieldChange(setDisplayName)}
            mode="outlined"
            autoCapitalize="words"
            autoComplete="name"
            left={<TextInput.Icon icon="account-outline" />}
            style={styles.input}
          />

          <TextInput
            label="Email"
            value={email}
            onChangeText={handleFieldChange(setEmail)}
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
            onChangeText={handleFieldChange(setPassword)}
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
            onPress={handleSignUp}
            loading={loading}
            disabled={loading || !displayName || !email || !password}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Sign Up
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            style={styles.linkButton}
          >
            Already have an account? Sign In
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
