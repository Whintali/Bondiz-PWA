import { DESIGN } from "@/constants/Design";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, View } from "react-native";

// Avancement du questionnaire : les étapes atteintes sont blanches.
export default function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.row} accessibilityLabel={`Étape ${step} sur ${total}`}>
      {Array.from({ length: total }, (_, index) => (
        <Image key={index} source={index < step ? DESIGN.dotActive : DESIGN.dotDim} style={styles.dot} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 24,
  },
  dot: {
    width: 8,
    height: 8,
  },
});
