import React from "react";
import {
  View,
  ScrollView,
  Image,
  Pressable,
  Alert,
  StyleSheet,
} from "react-native";
import { Text } from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import * as ImagePicker from "expo-image-picker";
import { colors } from "@config/theme";

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
      Alert.alert("Permission needed", "Camera access is required to take photos.");
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
    Alert.alert("Add Photo", "Choose a source", [
      { text: "Camera", onPress: pickFromCamera },
      { text: "Gallery", onPress: pickFromGallery },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <View>
      <Text variant="labelLarge" style={styles.label}>
        Photos ({images.length}/{max})
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
