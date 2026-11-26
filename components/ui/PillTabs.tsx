import { COLORS } from "@/constants/Colors";
import { FONTS } from "@/constants/Fonts";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Tab<T extends string> = { key: T; label: string };

// Onglets en pilules : l'onglet actif est violet avec un contour foncé.
export default function PillTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab<T>[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            aria-selected={isActive}
            style={[styles.tab, isActive && styles.tabActive]}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 5,
  },
  tab: {
    flexGrow: 1,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 4px 4px rgba(163, 163, 163, 0.2)",
  },
  tabActive: {
    backgroundColor: COLORS.purple,
    borderWidth: 2,
    borderColor: COLORS.ink,
  },
  label: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.ink,
  },
  labelActive: {
    color: COLORS.white,
  },
});
