import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, Share, Platform } from "react-native";
import { Text, Button, Dialog, Portal, TextInput, ActivityIndicator } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "@stores/authStore";
import * as inviteService from "@services/invite";
import * as householdService from "@services/household";
import { useSnackbarStore } from "@stores/snackbarStore";
import { colors } from "@config/theme";
import { env } from "@config/env";
import { t } from "@i18n/index";
import type { ManageHouseholdScreenProps } from "@navigation/types";

interface HouseholdInfo {
  id: string;
  name: string;
}

export default function ManageHouseholdScreen({
  navigation,
}: ManageHouseholdScreenProps) {
  const { user, profile, renameHousehold, createAdditionalHousehold, setActiveHousehold } = useAuthStore();
  const showSnackbar = useSnackbarStore((s) => s.show);

  const [households, setHouseholds] = useState<HouseholdInfo[]>([]);
  const [loadingHouseholds, setLoadingHouseholds] = useState(true);

  // Rename dialog
  const [renameTarget, setRenameTarget] = useState<HouseholdInfo | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);

  // Create dialog
  const [createVisible, setCreateVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  // Invite
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeHouseholdId = profile?.householdIds?.[0];

  // Load all household names
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const ids = profile?.householdIds ?? [];
      if (ids.length === 0) { setLoadingHouseholds(false); return; }
      try {
        const results = await Promise.all(ids.map((id) => householdService.getHousehold(id)));
        if (!cancelled) {
          setHouseholds(
            results
              .filter(Boolean)
              .map((h) => ({ id: h!.id, name: h!.name }))
          );
        }
      } finally {
        if (!cancelled) setLoadingHouseholds(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [profile?.householdIds]);

  const handleRenameOpen = (h: HouseholdInfo) => {
    setRenameTarget(h);
    setRenameValue(h.name);
  };

  const handleRenameSave = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    setRenameSaving(true);
    try {
      await renameHousehold(renameTarget.id, renameValue.trim());
      setHouseholds((prev) =>
        prev.map((h) => h.id === renameTarget.id ? { ...h, name: renameValue.trim() } : h)
      );
      showSnackbar(t.cellarRenamed, "success");
      setRenameTarget(null);
    } catch (e) {
      showSnackbar((e as Error).message || t.error, "error");
    } finally {
      setRenameSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createAdditionalHousehold(newName.trim());
      showSnackbar(t.cellarCreated, "success");
      setCreateVisible(false);
      setNewName("");
      // Reload household list
      const ids = useAuthStore.getState().profile?.householdIds ?? [];
      const results = await Promise.all(ids.map((id) => householdService.getHousehold(id)));
      setHouseholds(results.filter(Boolean).map((h) => ({ id: h!.id, name: h!.name })));
    } catch (e) {
      showSnackbar((e as Error).message || t.error, "error");
    } finally {
      setCreating(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await setActiveHousehold(id);
      showSnackbar(t.cellarActivated, "success");
    } catch (e) {
      showSnackbar((e as Error).message || t.error, "error");
    }
  };

  const handleGenerateInvite = async () => {
    if (!activeHouseholdId || !user) return;
    setGenerating(true);
    try {
      const code = await inviteService.createInvite(activeHouseholdId, user.uid);
      setInviteCode(code);
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  };

  const inviteLink = inviteCode ? `${env.appUrl}/join/${inviteCode}` : null;

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        showSnackbar(t.linkCopied, "success");
      } else {
        showSnackbar(t.error, "error");
      }
    } catch {
      showSnackbar(t.error, "error");
    }
  };

  const handleShare = async () => {
    if (!inviteLink) return;
    await Share.share({ message: inviteLink });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Cellars Section ── */}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        {t.myCellars}
      </Text>

      {loadingHouseholds ? (
        <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
      ) : (
        <>
          {households.map((h) => {
            const isActive = h.id === activeHouseholdId;
            return (
              <View key={h.id} style={[styles.cellarCard, isActive && styles.cellarCardActive]}>
                <View style={styles.cellarLeft}>
                  {isActive && (
                    <View style={styles.activeBadge}>
                      <Text variant="labelSmall" style={styles.activeBadgeText}>
                        {t.activeCellar}
                      </Text>
                    </View>
                  )}
                  <Text variant="bodyLarge" style={styles.cellarName} numberOfLines={1}>
                    {h.name}
                  </Text>
                </View>
                <View style={styles.cellarActions}>
                  {!isActive && (
                    <Button
                      mode="outlined"
                      onPress={() => handleActivate(h.id)}
                      textColor={colors.primary}
                      style={styles.activateBtn}
                      compact
                    >
                      {t.activate}
                    </Button>
                  )}
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={20}
                    color={colors.textSecondary}
                    onPress={() => handleRenameOpen(h)}
                    style={styles.editIcon}
                  />
                </View>
              </View>
            );
          })}

          <Button
            mode="outlined"
            onPress={() => setCreateVisible(true)}
            icon="plus"
            style={styles.createBtn}
            textColor={colors.primary}
          >
            {t.createNewCellar}
          </Button>
        </>
      )}

      <View style={styles.divider} />

      {/* ── Invite Section ── */}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        {t.inviteLink}
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        {t.inviteLinkSubtitle}
      </Text>

      {inviteCode ? (
        <View style={styles.linkBox}>
          <Text variant="bodySmall" style={styles.linkText} selectable>
            {inviteLink}
          </Text>
          <Text variant="labelSmall" style={styles.expiry}>
            {t.inviteExpiry}
          </Text>
          <View style={styles.linkActions}>
            <Button
              mode="contained"
              onPress={handleCopy}
              buttonColor={copied ? colors.textSecondary : colors.primary}
              style={styles.actionBtn}
              icon="content-copy"
            >
              {copied ? t.linkCopied : t.copyLink}
            </Button>
            {Platform.OS !== "web" && (
              <Button
                mode="outlined"
                onPress={handleShare}
                textColor={colors.primary}
                style={styles.actionBtn}
                icon="share-variant"
              >
                {t.shareLink}
              </Button>
            )}
          </View>
        </View>
      ) : (
        <Button
          mode="contained"
          onPress={handleGenerateInvite}
          loading={generating}
          disabled={generating}
          buttonColor={colors.primary}
          style={styles.generateBtn}
          icon="link-variant"
        >
          {t.generateInvite}
        </Button>
      )}

      <View style={styles.divider} />

      {/* ── Join Section ── */}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        {t.joinHousehold}
      </Text>
      <Button
        mode="outlined"
        onPress={() => navigation.navigate("JoinHousehold")}
        textColor={colors.primary}
        icon="account-plus"
        style={styles.joinBtn}
      >
        {t.joinBtn}
      </Button>

      {/* ── Rename Dialog ── */}
      <Portal>
        <Dialog
          visible={!!renameTarget}
          onDismiss={() => setRenameTarget(null)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>{t.renameCellar}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              label={t.cellarName}
              style={styles.dialogInput}
              contentStyle={styles.dialogInputContent}
              textColor={colors.text}
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRenameTarget(null)} textColor={colors.textSecondary}>
              {t.cancel}
            </Button>
            <Button
              onPress={handleRenameSave}
              loading={renameSaving}
              disabled={renameSaving || !renameValue.trim()}
              textColor={colors.primary}
            >
              {t.saveName}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* ── Create Dialog ── */}
      <Portal>
        <Dialog
          visible={createVisible}
          onDismiss={() => setCreateVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>{t.createNewCellar}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              label={t.newCellarName}
              style={styles.dialogInput}
              contentStyle={styles.dialogInputContent}
              textColor={colors.text}
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCreateVisible(false)} textColor={colors.textSecondary}>
              {t.cancel}
            </Button>
            <Button
              onPress={handleCreate}
              loading={creating}
              disabled={creating || !newName.trim()}
              textColor={colors.primary}
            >
              {t.createCellar}
            </Button>
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: colors.text,
    marginBottom: 12,
    textAlign: "right",
  },
  subtitle: {
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
    textAlign: "right",
  },
  loader: {
    marginVertical: 16,
  },
  cellarCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cellarCardActive: {
    borderColor: colors.primary,
  },
  cellarLeft: {
    flex: 1,
    alignItems: "flex-end",
    gap: 4,
  },
  activeBadge: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-end",
  },
  activeBadgeText: {
    color: colors.onPrimary,
  },
  cellarName: {
    color: colors.text,
    textAlign: "right",
  },
  cellarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginStart: 12,
  },
  activateBtn: {
    borderColor: colors.primary,
  },
  editIcon: {
    padding: 4,
  },
  createBtn: {
    borderColor: colors.primary,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 28,
  },
  linkBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  linkText: {
    color: colors.text,
    fontFamily: "monospace",
  },
  expiry: {
    color: colors.textSecondary,
  },
  linkActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
  },
  generateBtn: {
    marginTop: 8,
  },
  joinBtn: {
    borderColor: colors.primary,
  },
  dialog: {
    backgroundColor: colors.card,
  },
  dialogTitle: {
    color: colors.text,
    textAlign: "right",
  },
  dialogInput: {
    backgroundColor: colors.background,
  },
  dialogInputContent: {
    textAlign: "right",
  },
});
