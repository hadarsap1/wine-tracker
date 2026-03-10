import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Button, Text } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { colors } from "@config/theme";
import { detectText } from "@services/vision";
import { parseLabelText } from "@/utils/parseLabelText";
import type { ScanMainScreenProps } from "@navigation/types";

export default function ScanMainScreen({ navigation }: ScanMainScreenProps) {
  const [processing, setProcessing] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const processImage = async (uri: string) => {
    setImageUri(uri);
    setProcessing(true);
    try {
      const { fullText, error } = await detectText(uri);
      if (error) {
        Alert.alert("Scan Error", error);
        setProcessing(false);
        setImageUri(null);
        return;
      }
      if (!fullText.trim()) {
        Alert.alert("No Text Found", "Could not detect any text on the label. Try a clearer photo.");
        setProcessing(false);
        setImageUri(null);
        return;
      }
      const parsedData = parseLabelText(fullText);
      navigation.navigate("ScanReview", {
        parsedData,
        imageUri: uri,
        rawText: fullText,
      });
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Something went wrong");
    } finally {
      setProcessing(false);
      setImageUri(null);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Camera access is required to scan wine labels.");
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
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Gallery access is required to select a photo.");
      return;
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
            Reading label...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Scan Wine Label
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Take a photo of a wine label to automatically fill in the details
      </Text>

      <View style={styles.buttonsContainer}>
        <Button
          mode="contained"
          onPress={takePhoto}
          icon="camera"
          style={styles.button}
          buttonColor={colors.primary}
          contentStyle={styles.buttonContent}
        >
          Take Photo
        </Button>
        <Button
          mode="outlined"
          onPress={pickFromGallery}
          icon="image"
          style={styles.button}
          textColor={colors.primary}
          contentStyle={styles.buttonContent}
        >
          Choose from Gallery
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
