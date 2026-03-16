import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { Text, Button, Dialog, Portal } from "react-native-paper";
import { useAuthStore } from "@stores/authStore";
import * as householdService from "@services/household";
import { ProfileHeader, SettingsRow } from "@components/profile";
import { colors } from "@config/theme";
import { WineType } from "@/types/index";
import type { ProfileMainScreenProps } from "@navigation/types";

const WINE_TYPE_OPTIONS = Object.values(WineType);

export default function ProfileMainScreen({
  navigation,
}: ProfileMainScreenProps) {
  const { profile, signOut, updatePreferences, loading: authLoading } = useAuthStore();
  const [householdName, setHouseholdName] = useState<string>("");
  const [householdLoading, setHouseholdLoading] = useState(true);
  const [signOutDialogVisible, setSignOutDialogVisible] = useState(false);
  const [wineTypeDialogVisible, setWineTypeDialogVisible] = useState(false);
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
          Unable to load profile
        </Text>
        <Button mode="contained" onPress={() => signOut()} buttonColor={colors.primary}>
          Sign Out & Try Again
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {signOutError ? (
        <Text variant="bodySmall" style={styles.errorBanner}>
          Sign out failed: {signOutError}
        </Text>
      ) : null}
      <ProfileHeader
        displayName={profile.displayName}
        email={profile.email}
      />

      {/* Collection */}
      <Text variant="labelLarge" style={styles.sectionHeader}>
        Collection
      </Text>
      <SettingsRow
        icon="home-group"
        label="Household"
        value={householdLoading ? "Loading…" : householdName || "—"}
        showChevron={false}
      />

      {/* Preferences */}
      <Text variant="labelLarge" style={styles.sectionHeader}>
        Preferences
      </Text>
      <SettingsRow
        icon="glass-wine"
        label="Default Wine Type"
        value={profile.preferences.defaultWineType || "None"}
        onPress={() => setWineTypeDialogVisible(true)}
      />
      <SettingsRow
        icon="currency-usd"
        label="Currency"
        value={profile.preferences.currency}
        showChevron={false}
      />

      {/* Account */}
      <Text variant="labelLarge" style={styles.sectionHeader}>
        Account
      </Text>
      <SettingsRow
        icon="account-edit"
        label="Edit Profile"
        onPress={() => navigation.navigate("EditProfile")}
      />
      <SettingsRow
        icon="logout"
        label="Sign Out"
        onPress={() => setSignOutDialogVisible(true)}
        showChevron={false}
      />

      <Text variant="bodySmall" style={styles.version}>
        Wine Tracker v1.0.0
      </Text>

      {/* Sign Out Dialog */}
      <Portal>
        <Dialog
          visible={signOutDialogVisible}
          onDismiss={() => setSignOutDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Sign Out</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Are you sure you want to sign out?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setSignOutDialogVisible(false)}
              textColor={colors.textSecondary}
            >
              Cancel
            </Button>
            <Button
              onPress={handleSignOut}
              loading={authLoading}
              textColor={colors.primary}
            >
              Sign Out
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
            Default Wine Type
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
                {type}
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
    textTransform: "uppercase",
    letterSpacing: 1,
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
