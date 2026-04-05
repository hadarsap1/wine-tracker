import React from "react";
import {
  View,
  ScrollView,
  Image,
  Pressable,
  Alert,
  Platform,
  StyleSheet,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colors } from "@config/theme";
import { t } from "@i18n/index";

interface ImagePickerSectionProps {
  images: string[];
  onAdd: (uri: string) => void;
  onRemove: (index: number) => void;
  max?: number;
}

export default function ImagePickerSection({
  images,
  onAdd,
  onRemove,
  max = 5,
}: ImagePickerSectionProps) {
  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      onAdd(result.assets[0].uri);
    }
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t.permissionDenied, t.cameraPermissionPhoto);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      onAdd(result.assets[0].uri);
    }
  };

  const handleAdd = () => {
    if (Platform.OS === "web") {
      pickFromGallery();
      return;
    }
    Alert.alert(t.addPhoto, t.chooseSource, [
      { text: t.camera, onPress: pickFromCamera },
      { text: t.gallery, onPress: pickFromGallery },
      { text: t.cancel, style: "cancel" },
    ]);
  };

  return (
    <View>
      <Text variant="labelLarge" style={styles.label}>
        {t.photos} ({images.length}/{max})
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {images.map((uri, index) => (
          <View key={uri + index} style={styles.thumbWrapper}>
            <Image source={{ uri }} style={styles.thumb} />
            <Pressable
              style={styles.removeBtn}
              onPress={() => onRemove(index)}
              hitSlop={6}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={22}
                color={colors.error}
              />
            </Pressable>
          </View>
        ))}
        {images.length < max && (
          <Pressable style={styles.addBtn} onPress={handleAdd}>
            <MaterialCommunityIcons
              name="camera-plus"
              size={32}
              color={colors.textSecondary}
            />
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.text,
    marginBottom: 8,
    textAlign: "right",
  },
  scroll: {
    gap: 10,
    paddingVertical: 4,
  },
  thumbWrapper: {
    position: "relative",
  },
  thumb: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: colors.card,
    borderRadius: 11,
  },
  addBtn: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
});
