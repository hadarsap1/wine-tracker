import React, { useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { useAuthStore } from "@stores/authStore";
import * as inviteService from "@services/invite";
import { useSnackbarStore } from "@stores/snackbarStore";
import * as analytics from "@services/analytics";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import type { JoinHouseholdScreenProps } from "@navigation/types";

export default function JoinHouseholdScreen({
  navigation,
}: JoinHouseholdScreenProps) {
  const { user, profile, reloadProfile } = useAuthStore();
  const showSnackbar = useSnackbarStore((s) => s.show);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    const trimmed = code.trim();
    if (!trimmed || !user || !profile) return;

    setJoining(true);
    try {
      await inviteService.redeemInvite(
        trimmed,
        user.uid,
        profile.displayName,
        profile.email
      );
      await reloadProfile();
      analytics.track.householdJoined();
      showSnackbar(t.joinSuccess, "success");
      navigation.goBack();
    } catch (e) {
      const msg = (e as Error).message;
      const display =
        msg === "invalid_invite" || msg === "invite_expired" || msg === "invite_used"
          ? t.invalidInvite
          : msg === "already_member"
            ? t.alreadyMember
            : t.joinFailed;
      Alert.alert(t.joinFailed, display);
    } finally {
      setJoining(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {t.joinHouseholdSubtitle}
        </Text>
        <TextInput
          label={t.inviteCode}
          value={code}
          onChangeText={setCode}
          style={styles.input}
          contentStyle={styles.inputContent}
          textColor={colors.text}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Button
          mode="contained"
          onPress={handleJoin}
          loading={joining}
          disabled={joining || !code.trim()}
          buttonColor={colors.primary}
          style={styles.btn}
        >
          {t.joinBtn}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 32,
  },
  subtitle: {
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: "right",
  },
  input: {
    marginBottom: 16,
    backgroundColor: colors.card,
  },
  inputContent: {
    textAlign: "right",
  },
  btn: {
    marginTop: 8,
  },
});
