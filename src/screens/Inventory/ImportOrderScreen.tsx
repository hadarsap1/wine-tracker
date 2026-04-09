import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { Button, Text } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import { detectText } from "@services/vision";
import { parseOrderText } from "@/utils/parseOrderText";
import { useSnackbarStore } from "@stores/snackbarStore";
import type { ImportOrderScreenProps } from "@navigation/types";

export default function ImportOrderScreen({ navigation }: ImportOrderScreenProps) {
  const [processing, setProcessing] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const showSnackbar = useSnackbarStore((s) => s.show);

  const processImage = async (uri: string) => {
    setImageUri(uri);
    setProcessing(true);
    try {
      const { fullText, error } = await detectText(uri);
      if (error) {
        showSnackbar(error, "error");
        return;
      }
      if (!fullText.trim()) {
        showSnackbar(t.noTextFoundMsg, "error");
        return;
      }
      const items = parseOrderText(fullText);
      if (items.length === 0) {
        showSnackbar(t.importOrderNoItemsMsg, "error");
        return;
      }
      navigation.navigate("ImportOrderReview", { items, rawText: fullText });
    } catch (e: unknown) {
      showSnackbar((e as Error).message ?? t.scanError, "error");
    } finally {
      setProcessing(false);
      setImageUri(null);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.9,
      allowsEditing: false,
      mediaTypes: ["images"],
    });
    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  };

  if (processing && imageUri) {
    return (
      <View style={styles.processingContainer}>
        <Image source={{ uri: imageUri }} style={styles.processingImage} />
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="titleMedium" style={styles.processingText}>
            {t.importOrderProcessing}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        {t.importOrder}
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        {t.importOrderSubtitle}
      </Text>
      <Button
        mode="contained"
        onPress={pickImage}
        icon="image-plus"
        style={styles.button}
        buttonColor={colors.primary}
        contentStyle={styles.buttonContent}
      >
        {t.importOrderUpload}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
  },
  button: {
    borderRadius: 8,
    width: "100%",
  },
  buttonContent: {
    paddingVertical: 8,
  },
  processingContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  processingImage: {
    flex: 1,
    width: "100%",
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  processingText: {
    color: colors.text,
    marginTop: 16,
  },
});
