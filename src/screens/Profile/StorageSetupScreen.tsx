import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Text,
  Button,
  TextInput,
  SegmentedButtons,
  IconButton,
  Dialog,
  Portal,
  ActivityIndicator,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "@stores/authStore";
import { useCellarStore } from "@stores/cellarStore";
import { useSnackbarStore } from "@stores/snackbarStore";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import type { StorageSetupScreenProps } from "@navigation/types";
import type { StorageUnitType, AppStorageUnit } from "@/types/index";

type FormMode = "add" | "edit";

interface UnitForm {
  name: string;
  type: StorageUnitType;
  rows: string;
  cols: string;
}

const EMPTY_FORM: UnitForm = { name: "", type: "fridge", rows: "5", cols: "5" };

export default function StorageSetupScreen({}: StorageSetupScreenProps): React.ReactElement {
  const profile = useAuthStore((s) => s.profile);
  const { units, loading, loadUnits, addUnit, updateUnit, deleteUnit } =
    useCellarStore();
  const showSnackbar = useSnackbarStore((s) => s.show);

  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("add");
  const [editingUnit, setEditingUnit] = useState<AppStorageUnit | null>(null);
  const [form, setForm] = useState<UnitForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteDialogUnit, setDeleteDialogUnit] =
    useState<AppStorageUnit | null>(null);
  const [deleting, setDeleting] = useState(false);

  const householdId = profile?.householdIds?.[0];

  useEffect(() => {
    if (householdId) loadUnits(householdId);
  }, [householdId, loadUnits]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingUnit(null);
    setFormMode("add");
    setFormVisible(true);
  };

  const openEdit = (unit: AppStorageUnit) => {
    setForm({
      name: unit.name,
      type: unit.type,
      rows: String(unit.rows),
      cols: String(unit.cols),
    });
    setEditingUnit(unit);
    setFormMode("edit");
    setFormVisible(true);
  };

  const handleSave = async () => {
    if (!householdId) return;
    const rows = parseInt(form.rows, 10);
    const cols = parseInt(form.cols, 10);
    if (!form.name.trim()) {
      showSnackbar(t.storageUnitNameRequired, "error");
      return;
    }
    if (isNaN(rows) || rows < 1 || rows > 20) {
      showSnackbar(t.storageUnitRowsInvalid, "error");
      return;
    }
    if (isNaN(cols) || cols < 1 || cols > 20) {
      showSnackbar(t.storageUnitColsInvalid, "error");
      return;
    }

    setSaving(true);
    try {
      if (formMode === "add") {
        await addUnit(householdId, {
          name: form.name.trim(),
          type: form.type,
          rows,
          cols,
        });
      } else if (editingUnit) {
        await updateUnit(householdId, editingUnit.id, {
          name: form.name.trim(),
          rows,
          cols,
        });
      }
      setFormVisible(false);
    } catch (e) {
      showSnackbar((e as Error).message || t.error, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!householdId || !deleteDialogUnit) return;
    setDeleting(true);
    try {
      await deleteUnit(householdId, deleteDialogUnit.id);
      setDeleteDialogUnit(null);
    } catch (e) {
      showSnackbar((e as Error).message || t.error, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Button
          mode="contained"
          icon="plus"
          onPress={openAdd}
          buttonColor={colors.primary}
          style={styles.addButton}
        >
          {t.addStorageUnit}
        </Button>

        {loading && units.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : units.length === 0 ? (
          <Text style={styles.emptyText}>{t.noStorageUnits}</Text>
        ) : (
          units.map((unit) => (
            <View key={unit.id} style={styles.unitRow}>
              <MaterialCommunityIcons
                name={unit.type === "fridge" ? "fridge-outline" : "bookshelf"}
                size={24}
                color={colors.primary}
                style={styles.unitIcon}
              />
              <View style={styles.unitInfo}>
                <Text variant="bodyLarge" style={styles.unitName}>
                  {unit.name}
                </Text>
                <Text variant="labelSmall" style={styles.unitMeta}>
                  {unit.type === "fridge" ? t.storageUnitFridge : t.storageUnitRack} —{" "}
                  {unit.rows} {t.storageUnitRows} × {unit.cols} {t.storageUnitCols}
                </Text>
              </View>
              <IconButton
                icon="pencil-outline"
                iconColor={colors.textSecondary}
                size={20}
                onPress={() => openEdit(unit)}
              />
              <IconButton
                icon="trash-can-outline"
                iconColor={colors.error}
                size={20}
                onPress={() => setDeleteDialogUnit(unit)}
              />
            </View>
          ))
        )}

        {/* Inline Add/Edit Form */}
        {formVisible && (
          <View style={styles.formCard}>
            <Text variant="titleSmall" style={styles.formTitle}>
              {formMode === "add" ? t.addStorageUnit : t.edit}
            </Text>
            <TextInput
              label={t.storageUnitName}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              style={styles.input}
              contentStyle={styles.inputContent}
              textColor={colors.text}
            />
            {formMode === "add" && (
              <>
                <Text variant="labelLarge" style={styles.sectionLabel}>
                  {t.storageUnitType}
                </Text>
                <SegmentedButtons
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, type: v as StorageUnitType }))
                  }
                  buttons={[
                    { value: "fridge", label: t.storageUnitFridge },
                    { value: "rack", label: t.storageUnitRack },
                  ]}
                  style={styles.typeButtons}
                />
              </>
            )}
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text variant="labelSmall" style={styles.fieldLabel}>{t.storageUnitRows}</Text>
                <TextInput
                  value={form.rows}
                  onChangeText={(v) => setForm((f) => ({ ...f, rows: v }))}
                  keyboardType="numeric"
                  style={styles.input}
                  contentStyle={styles.inputContent}
                  textColor={colors.text}
                />
              </View>
              <View style={styles.gap} />
              <View style={styles.flex}>
                <Text variant="labelSmall" style={styles.fieldLabel}>{t.storageUnitCols}</Text>
                <TextInput
                  value={form.cols}
                  onChangeText={(v) => setForm((f) => ({ ...f, cols: v }))}
                  keyboardType="numeric"
                  style={styles.input}
                  contentStyle={styles.inputContent}
                  textColor={colors.text}
                />
              </View>
            </View>
            <View style={styles.formActions}>
              <Button
                mode="outlined"
                onPress={() => setFormVisible(false)}
                textColor={colors.textSecondary}
                style={styles.cancelButton}
              >
                {t.cancel}
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={saving}
                disabled={saving}
                buttonColor={colors.primary}
                style={styles.saveButton}
              >
                {t.storageUnitSave}
              </Button>
            </View>
          </View>
        )}
      </ScrollView>

      <Portal>
        <Dialog
          visible={deleteDialogUnit !== null}
          onDismiss={() => setDeleteDialogUnit(null)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>
            {t.storageUnitDelete}
          </Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              {t.storageUnitDeleteConfirm}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setDeleteDialogUnit(null)}
              textColor={colors.textSecondary}
            >
              {t.cancel}
            </Button>
            <Button
              onPress={handleDelete}
              loading={deleting}
              textColor={colors.error}
            >
              {t.delete}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  addButton: {
    marginBottom: 16,
  },
  loader: {
    marginTop: 32,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 32,
  },
  unitRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  unitIcon: {
    marginEnd: 12,
  },
  unitInfo: {
    flex: 1,
  },
  unitName: {
    color: colors.text,
    textAlign: "right",
    fontWeight: "600",
  },
  unitMeta: {
    color: colors.textSecondary,
    textAlign: "right",
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  formTitle: {
    color: colors.gold,
    marginBottom: 12,
    textAlign: "right",
  },
  input: {
    marginBottom: 12,
    backgroundColor: colors.surfaceVariant,
  },
  inputContent: {
    textAlign: "right",
  },
  sectionLabel: {
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: "right",
  },
  fieldLabel: {
    color: colors.textSecondary,
    marginBottom: 4,
    textAlign: "right",
  },
  typeButtons: {
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
  },
  flex: {
    flex: 1,
  },
  gap: {
    width: 12,
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    borderColor: colors.border,
  },
  saveButton: {
    flex: 1,
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
});
