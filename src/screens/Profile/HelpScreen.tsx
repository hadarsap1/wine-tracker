import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@config/theme";
import { t } from "@i18n/index";

export default function HelpScreen() {
  const [expanded, setExpanded] = useState<number | null>(0);

  const toggle = (index: number) => {
    setExpanded((prev) => (prev === index ? null : index));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="bodyMedium" style={styles.subtitle}>
        {t.helpSubtitle}
      </Text>

      {t.helpSections.map((section, index) => {
        const isOpen = expanded === index;
        return (
          <View key={index} style={styles.card}>
            <Pressable
              onPress={() => toggle(index)}
              style={({ pressed }) => [
                styles.cardHeader,
                pressed && styles.cardHeaderPressed,
              ]}
            >
              <View style={styles.headerLeft}>
                <View style={styles.iconWrap}>
                  <MaterialCommunityIcons
                    name={section.icon as any}
                    size={20}
                    color={colors.gold}
                  />
                </View>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  {section.title}
                </Text>
              </View>
              <MaterialCommunityIcons
                name={isOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>

            {isOpen && (
              <View style={styles.cardBody}>
                <Text variant="bodyMedium" style={styles.bodyText}>
                  {section.body}
                </Text>
              </View>
            )}
          </View>
        );
      })}

      <Text variant="labelSmall" style={styles.footer}>
        {t.appVersion}
      </Text>
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
  subtitle: {
    color: colors.textSecondary,
    textAlign: "right",
    marginBottom: 20,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  cardHeaderPressed: {
    opacity: 0.7,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  bodyText: {
    color: colors.textSecondary,
    textAlign: "right",
    lineHeight: 22,
  },
  footer: {
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 16,
  },
});
