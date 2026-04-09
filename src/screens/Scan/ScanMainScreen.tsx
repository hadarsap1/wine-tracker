import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Button, Text } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import { detectText, analyzeLabelWithAI } from "@services/vision";
import { parseLabelText } from "@/utils/parseLabelText";
import { useSnackbarStore } from "@stores/snackbarStore";
import * as analytics from "@services/analytics";
import type { ScanMainScreenProps } from "@navigation/types";

export default function ScanMainScreen({ navigation }: ScanMainScreenProps) {
  const [processing, setProcessing] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const showSnackbar = useSnackbarStore((s) => s.show);

  const processImage = async (uri: string) => {
    setImageUri(uri);
    setProcessing(true);
    try {
      // Prefer AI-powered analysis (GPT-4o Vision) when available on server
      try {
        const parsedData = await analyzeLabelWithAI(uri);
        analytics.track.scanCompleted('ai', parsedData.confidence ?? 'low');
        navigation.navigate("ScanReview", {
          parsedData,
          imageUri: uri,
          rawText: "",
        });
        return;
      } catch {
        // AI not configured on server or failed — fall through to Vision API + regex fallback
      }

      // Fallback: Google Cloud Vision + regex parser
      const { fullText, error } = await detectText(uri);
      if (error) {
        analytics.track.scanFailed(error);
        showSnackbar(error, "error");
        return;
      }
      if (!fullText.trim()) {
        analytics.track.scanFailed('no_text_detected');
        showSnackbar(t.noTextFoundMsg, "error");
        return;
      }
      const parsedData = parseLabelText(fullText);
      analytics.track.scanCompleted('vision', parsedData.confidence ?? 'low');
      navigation.navigate("ScanReview", {
        parsedData,
        imageUri: uri,
        rawText: fullText,
      });
    } catch (e: unknown) {
      analytics.track.scanFailed((e as Error).message ?? 'unknown_error');
      showSnackbar((e as Error).message ?? t.scanError, "error");
    } finally {
      setProcessing(false);
      setImageUri(null);
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === "web") {
      showSnackbar(t.cameraNotAvailableWeb ?? "Camera capture is not supported in the browser. Please upload an image instead.", "info");
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showSnackbar(t.cameraPermissionMsg, "error");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showSnackbar(t.galleryPermissionMsg, "error");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
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
            {t.readingLabel}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        {t.scanLabel}
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        {t.scanSubtitle}
      </Text>

      <View style={styles.buttonsContainer}>
        {Platform.OS !== "web" && (
          <Button
            mode="contained"
            onPress={takePhoto}
            icon="camera"
            style={styles.button}
            buttonColor={colors.primary}
            contentStyle={styles.buttonContent}
          >
            {t.takePhoto}
          </Button>
        )}
        <Button
          mode="outlined"
          onPress={pickFromGallery}
          icon="image"
          style={styles.button}
          textColor={colors.primary}
          contentStyle={styles.buttonContent}
        >
          {t.chooseFromGallery}
        </Button>
      </View>
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
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 40,
  },
  buttonsContainer: {
    width: "100%",
    gap: 16,
  },
  button: {
    borderRadius: 8,
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
