import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { Text, Button, Dialog, Portal } from "react-native-paper";
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
        icon="logout"
        label={t.signOut}
        onPress={() => setSignOutDialogVisible(true)}
        showChevron={false}
      />

      <Text variant="bodySmall" style={styles.version}>
        {t.appVersion}
      </Text>

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
  dialogTitle: {
    color: colors.text,
  },
  dialogText: {
    color: colors.textSecondary,
  },
  wineTypeButton: {
    marginVertical: 2,
  },
});
