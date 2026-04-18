import React, { useEffect, useRef, useState } from "react";
import { Platform, View, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { Text, Button, Dialog, Portal, TextInput } from "react-native-paper";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@config/firebase";
import { useAuthStore } from "@stores/authStore";
import * as householdService from "@services/household";
import { ProfileHeader, SettingsRow } from "@components/profile";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import { WineType } from "@/types/index";
import type { ProfileMainScreenProps } from "@navigation/types";

const WINE_TYPE_OPTIONS = Object.values(WineType);
const CURRENCY_OPTIONS = ["USD", "EUR", "ILS", "GBP", "CAD", "AUD", "JPY", "CHF"];

export default function ProfileMainScreen({
  navigation,
}: ProfileMainScreenProps) {
  const { profile, signOut, updatePreferences, loading: authLoading } = useAuthStore();
  const [householdName, setHouseholdName] = useState<string>("");
  const [householdLoading, setHouseholdLoading] = useState(true);
  const [signOutDialogVisible, setSignOutDialogVisible] = useState(false);
  const [wineTypeDialogVisible, setWineTypeDialogVisible] = useState(false);
  const [currencyDialogVisible, setCurrencyDialogVisible] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [installDialogVisible, setInstallDialogVisible] = useState(false);
  const [feedbackDialogVisible, setFeedbackDialogVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const deferredInstallPrompt = useRef<any>(null);
  const isStandalone =
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    window.matchMedia("(display-mode: standalone)").matches;

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = (e: Event) => {
      e.preventDefault();
      deferredInstallPrompt.current = e;
    };
    window.addEventListener("beforeinstallprompt", handler as EventListener);
    return () => window.removeEventListener("beforeinstallprompt", handler as EventListener);
  }, []);

  const handleInstall = () => {
    if (deferredInstallPrompt.current) {
      deferredInstallPrompt.current.prompt();
      deferredInstallPrompt.current = null;
    } else {
      setInstallDialogVisible(true);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchHousehold = async () => {
      const householdId = profile?.householdIds?.[0];
      if (!householdId) {
        if (isMounted) setHouseholdLoading(false);
        return;
      }
      try {
        const household = await householdService.getHousehold(householdId);
        if (isMounted && household) setHouseholdName(household.name);
      } finally {
        if (isMounted) setHouseholdLoading(false);
      }
    };
    fetchHousehold();
    return () => {
      isMounted = false;
    };
  }, [profile?.householdIds]);

  const handleSignOut = async () => {
    setSignOutDialogVisible(false);
    setSignOutError(null);
    try {
      await signOut();
    } catch (e) {
      setSignOutError((e as Error).message);
    }
  };

  const handleSelectWineType = async (type: WineType) => {
    setWineTypeDialogVisible(false);
    await updatePreferences({ defaultWineType: type });
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim() || !profile) return;
    setFeedbackSending(true);
    try {
      await addDoc(collection(db, "feedback"), {
        message: feedbackText.trim(),
        email: profile.email,
        userId: profile.uid,
        createdAt: serverTimestamp(),
      });
      setFeedbackSuccess(true);
      setFeedbackText("");
    } catch {
      // keep dialog open so user can retry
    } finally {
      setFeedbackSending(false);
    }
  };

  const closeFeedbackDialog = () => {
    setFeedbackDialogVisible(false);
    setFeedbackSuccess(false);
    setFeedbackText("");
  };

  if (!profile && authLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text variant="bodyLarge" style={{ color: colors.text, marginBottom: 16 }}>
          {t.unableToLoadProfile}
        </Text>
        <Button mode="contained" onPress={() => signOut()} buttonColor={colors.primary}>
          {t.signOutAndRetry}
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {signOutError ? (
        <Text variant="bodySmall" style={styles.errorBanner}>
          {t.signOutFailed}: {signOutError}
        </Text>
      ) : null}
      <ProfileHeader
        displayName={profile.displayName}
        email={profile.email}
      />

      {/* Collection */}
      <Text variant="labelLarge" style={styles.sectionHeader}>
        {t.collection}
      </Text>
      <SettingsRow
        icon="home-group"
        label={t.household}
        value={householdLoading ? t.loading : householdName || "—"}
        showChevron={false}
      />

      {/* Preferences */}
      <Text variant="labelLarge" style={styles.sectionHeader}>
        {t.preferences}
      </Text>
      <SettingsRow
        icon="glass-wine"
        label={t.defaultWineType}
        value={profile.preferences.defaultWineType
          ? (t.wineTypeLabels[profile.preferences.defaultWineType] ?? profile.preferences.defaultWineType)
          : t.noneOption}
        onPress={() => setWineTypeDialogVisible(true)}
      />
      <SettingsRow
        icon="currency-usd"
        label={t.currency}
        value={profile.preferences.currency}
        onPress={() => setCurrencyDialogVisible(true)}
      />

      {/* Storage */}
      <Text variant="labelLarge" style={styles.sectionHeader}>
        {t.storageMap}
      </Text>
      <SettingsRow
        icon="fridge-outline"
        label={t.storageSetup}
        onPress={() => navigation.navigate("StorageSetup")}
      />

      {/* Account */}
      <Text variant="labelLarge" style={styles.sectionHeader}>
        {t.account}
      </Text>
      <SettingsRow
        icon="account-edit"
        label={t.editProfile}
        onPress={() => navigation.navigate("EditProfile")}
      />
      <SettingsRow
        icon="account-multiple-plus"
        label={t.manageHousehold}
        onPress={() => navigation.navigate("ManageHousehold")}
      />

      {/* Admin — only visible to hadarsap@gmail.com */}
      {profile.email === "hadarsap@gmail.com" && (
        <>
          <Text variant="labelLarge" style={styles.sectionHeader}>
            {t.adminSection}
          </Text>
          <SettingsRow
            icon="chart-bar"
            label={t.adminDashboard}
            onPress={() => navigation.navigate("AdminDashboard")}
          />
        </>
      )}

      {/* Support */}
      <Text variant="labelLarge" style={styles.sectionHeader}>
        {t.help}
      </Text>
      <SettingsRow
        icon="help-circle-outline"
        label={t.help}
        onPress={() => navigation.navigate("Help")}
      />
      <SettingsRow
        icon="message-text-outline"
        label={t.sendFeedback}
        onPress={() => setFeedbackDialogVisible(true)}
      />
      {Platform.OS === "web" && !isStandalone && (
        <SettingsRow
          icon="cellphone-arrow-down"
          label={t.installApp}
          onPress={handleInstall}
        />
      )}
      <SettingsRow
        icon="logout"
        label={t.signOut}
        onPress={() => setSignOutDialogVisible(true)}
        showChevron={false}
      />

      <Text variant="bodySmall" style={styles.version}>
        {t.appVersion}
      </Text>

      {/* Install App Dialog */}
      <Portal>
        <Dialog
          visible={installDialogVisible}
          onDismiss={() => setInstallDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>{t.installApp}</Dialog.Title>
          <Dialog.Content>
            <Text variant="labelMedium" style={[styles.dialogText, styles.dialogTextRtl, { marginBottom: 8 }]}>
              {t.installAppIosTitle}
            </Text>
            <Text variant="bodySmall" style={[styles.dialogText, styles.dialogTextRtl, { marginBottom: 16 }]}>
              {t.installAppIosMsg}
            </Text>
            <Text variant="labelMedium" style={[styles.dialogText, styles.dialogTextRtl, { marginBottom: 8 }]}>
              {t.installAppAndroidTitle}
            </Text>
            <Text variant="bodySmall" style={[styles.dialogText, styles.dialogTextRtl]}>
              {t.installAppAndroidMsg}
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={() => setInstallDialogVisible(false)} textColor={colors.primary}>
              {t.cancel}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Sign Out Dialog */}
      <Portal>
        <Dialog
          visible={signOutDialogVisible}
          onDismiss={() => setSignOutDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>{t.signOutConfirm}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              {t.signOutConfirmMsg}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setSignOutDialogVisible(false)}
              textColor={colors.textSecondary}
            >
              {t.cancel}
            </Button>
            <Button
              onPress={handleSignOut}
              loading={authLoading}
              textColor={colors.primary}
            >
              {t.signOut}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Wine Type Picker Dialog */}
      <Portal>
        <Dialog
          visible={wineTypeDialogVisible}
          onDismiss={() => setWineTypeDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>
            {t.defaultWineType}
          </Dialog.Title>
          <Dialog.Content>
            {WINE_TYPE_OPTIONS.map((type) => (
              <Button
                key={type}
                mode={
                  profile.preferences.defaultWineType === type
                    ? "contained"
                    : "text"
                }
                onPress={() => handleSelectWineType(type)}
                style={styles.wineTypeButton}
                textColor={
                  profile.preferences.defaultWineType === type
                    ? colors.onPrimary
                    : colors.text
                }
                buttonColor={
                  profile.preferences.defaultWineType === type
                    ? colors.primary
                    : undefined
                }
              >
                {t.wineTypeLabels[type] ?? type}
              </Button>
            ))}
          </Dialog.Content>
        </Dialog>
      </Portal>

      {/* Currency Picker Dialog */}
      <Portal>
        <Dialog
          visible={currencyDialogVisible}
          onDismiss={() => setCurrencyDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>
            {t.currency}
          </Dialog.Title>
          <Dialog.Content>
            {CURRENCY_OPTIONS.map((currency) => (
              <Button
                key={currency}
                mode={profile.preferences.currency === currency ? "contained" : "text"}
                onPress={async () => {
                  setCurrencyDialogVisible(false);
                  await updatePreferences({ currency });
                }}
                style={styles.wineTypeButton}
                textColor={profile.preferences.currency === currency ? colors.onPrimary : colors.text}
                buttonColor={profile.preferences.currency === currency ? colors.primary : undefined}
              >
                {currency}
              </Button>
            ))}
          </Dialog.Content>
        </Dialog>
      </Portal>

      {/* Feedback Dialog */}
      <Portal>
        <Dialog
          visible={feedbackDialogVisible}
          onDismiss={closeFeedbackDialog}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>{t.sendFeedback}</Dialog.Title>
          <Dialog.Content>
            {feedbackSuccess ? (
              <Text style={[styles.dialogText, { color: "#4caf50", textAlign: "center" }]}>
                {t.feedbackSent}
              </Text>
            ) : (
              <TextInput
                mode="outlined"
                placeholder={t.feedbackPlaceholder}
                value={feedbackText}
                onChangeText={setFeedbackText}
                multiline
                numberOfLines={4}
                style={styles.feedbackInput}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.text}
                placeholderTextColor={colors.textSecondary}
              />
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeFeedbackDialog} textColor={colors.textSecondary}>
              {feedbackSuccess ? t.close : t.cancel}
            </Button>
            {!feedbackSuccess && (
              <Button
                onPress={handleSendFeedback}
                loading={feedbackSending}
                disabled={feedbackSending || !feedbackText.trim()}
                textColor={colors.primary}
              >
                {t.send}
              </Button>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorBanner: {
    color: colors.error,
    textAlign: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    color: colors.textSecondary,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
    letterSpacing: 0.5,
    textAlign: "right",
  },
  version: {
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: 24,
  },
  dialog: {
    backgroundColor: colors.card,
  },
  feedbackInput: {
    backgroundColor: colors.background,
    minHeight: 100,
  },
  dialogTitle: {
    color: colors.text,
  },
  dialogText: {
    color: colors.textSecondary,
  },
  dialogTextRtl: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  dialogActions: {
    justifyContent: "flex-start",
  },
  wineTypeButton: {
    marginVertical: 2,
  },
});
