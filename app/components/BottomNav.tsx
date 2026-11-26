import { COLORS } from "@/constants/Colors";
import { DESIGN } from "@/constants/Design";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type NavRoute = "home" | "activity" | "map" | "messages" | "profile";

// Icônes Feather, la famille utilisée par la maquette.
const TABS: { route: NavRoute; icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { route: "home", icon: "home", label: "Accueil" },
  { route: "activity", icon: "compass", label: "Activités" },
  { route: "map", icon: "map-pin", label: "Carte" },
  { route: "messages", icon: "message-circle", label: "Messages" },
  { route: "profile", icon: "user", label: "Profil" },
];

// Barre de navigation flottante : pilule blanche, onglet actif dans une
// pastille violette.
const BottomNav = ({ currentRoute }: { currentRoute: NavRoute }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { bottom: 26 + insets.bottom, pointerEvents: "box-none" }]}>
      <View style={styles.bar} accessibilityRole="tablist">
        {TABS.map(({ route, icon, label }) => {
          const active = route === currentRoute;
          return (
            <TouchableOpacity
              key={route}
              style={styles.item}
              onPress={() => !active && router.replace(`/${route}`)}
              accessibilityRole="tab"
              accessibilityLabel={label}
              aria-selected={active}
            >
              {active && <Image source={DESIGN.navActiveBubble} style={styles.bubble} />}
              <Feather name={icon} size={25} color={active ? "white" : COLORS.purple} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default BottomNav;

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  bar: {
    width: 334,
    height: 59,
    borderRadius: 100,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    gap: 26,
    paddingLeft: 18.5,
    boxShadow: "0px 4px 4px rgba(163, 163, 163, 0.3)",
  },
  item: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    position: "absolute",
    width: 40,
    height: 40,
  },
});
