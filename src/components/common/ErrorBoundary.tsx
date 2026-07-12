import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import * as analytics from "@services/analytics";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Top-level error boundary. Without one, a single render error white-screens
 * the whole app. Catches render/lifecycle errors, reports them to analytics,
 * and shows a recoverable fallback.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    analytics.captureError(error, {
      componentStack: info.componentStack ?? undefined,
      boundary: "root",
    });
  }

  handleReload = (): void => {
    if (typeof window !== "undefined" && window.location) {
      window.location.reload();
    } else {
      this.setState({ hasError: false });
    }
  };

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <MaterialCommunityIcons name="alert-circle-outline" size={56} color={colors.gold} />
        <Text variant="headlineSmall" style={styles.title}>
          {t.errorBoundaryTitle}
        </Text>
        <Text variant="bodyMedium" style={styles.message}>
          {t.errorBoundaryMsg}
        </Text>
        <Button
          mode="contained"
          onPress={this.handleReload}
          buttonColor={colors.primary}
          textColor={colors.onPrimary}
          style={styles.button}
        >
          {t.errorBoundaryReload}
        </Button>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  title: {
    color: colors.text,
    textAlign: "center",
  },
  message: {
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
  },
});
