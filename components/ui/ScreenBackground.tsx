import { Image } from "expo-image";
import React from "react";
import { StyleSheet, View } from "react-native";

// Dégradé pastel de fond des écrans, posé en transparence sur du blanc.
export default function ScreenBackground({ source, opacity = 0.3 }: { source: any; opacity?: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      <Image source={source} style={[StyleSheet.absoluteFill, { opacity }]} contentFit="cover" />
    </View>
  );
}
