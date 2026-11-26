import { DESIGN } from "@/constants/Design";
import { Image } from "expo-image";
import React from "react";
import { View } from "react-native";

// Illustration des écrans d'accueil : le fantôme au centre d'un anneau,
// entouré de photos sur un cercle pointillé. Positions reprises de la
// maquette (bloc de 285 × 317), mises à l'échelle avec `scale`.
const BOX = { width: 285, height: 317 };

const ITEMS: { source: any; x: number; y: number; size: number; height?: number }[] = [
  { source: DESIGN.heroDashed, x: 1, y: 13, size: 284 },
  { source: DESIGN.heroRing, x: 40, y: 52, size: 206, height: 207 },
  { source: DESIGN.heroPin, x: 196, y: 13, size: 42 },
  { source: DESIGN.heroChat, x: 32, y: 249, size: 43, height: 35 },
  { source: DESIGN.heroAvatar1, x: 11, y: -2, size: 76 },
  { source: DESIGN.heroAvatar2, x: 115, y: 29, size: 45 },
  { source: DESIGN.heroAvatar3, x: 250, y: 196, size: 37 },
  { source: DESIGN.heroAvatar4, x: 145, y: 271, size: 46 },
  { source: DESIGN.heroAvatar5, x: -2, y: 190, size: 36 },
];

export default function HeroIllustration({ scale = 1 }: { scale?: number }) {
  return (
    <View style={{ width: BOX.width * scale, height: BOX.height * scale }} accessible={false}>
      {ITEMS.map((item, index) => (
        <Image
          key={index}
          source={item.source}
          style={{
            position: "absolute",
            left: item.x * scale,
            top: item.y * scale,
            width: item.size * scale,
            height: (item.height ?? item.size) * scale,
          }}
          contentFit="contain"
        />
      ))}
      <Image
        source={DESIGN.logo}
        style={{ position: "absolute", left: 114 * scale, top: 122 * scale, width: 58 * scale, height: 67 * scale }}
        contentFit="contain"
      />
    </View>
  );
}
