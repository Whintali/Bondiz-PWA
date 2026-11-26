import ActivityMap from "@/components/map/ActivityMap";
import type { PlacedActivity } from "@/components/map/types";
import ScreenBackground from "@/components/ui/ScreenBackground";
import { COLORS } from "@/constants/Colors";
import { DESIGN } from "@/constants/Design";
import { FONTS } from "@/constants/Fonts";
import { Activity, fetchActivities, formatPrice, hasPosition } from "@/services/activities";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomNav from "./components/BottomNav";

type Position = { latitude: number; longitude: number };

// Onglet « Carte » : les activités placées à l'adresse de leur partenaire.
export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PlacedActivity | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    fetchActivities()
      .then(setActivities)
      .catch((err) => {
        console.error("Chargement des activités impossible", err);
        setError("Impossible de charger les activités. Vérifie ta connexion.");
      })
      .finally(() => setLoading(false));
  }, []);

  const placed = useMemo(() => activities.filter(hasPosition), [activities]);
  const unplaced = activities.length - placed.length;

  const canLocate = Platform.OS === "web" && typeof navigator !== "undefined" && "geolocation" in navigator;
  const locate = () => {
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ latitude: coords.latitude, longitude: coords.longitude });
        setLocating(false);
      },
      () => {
        setError("Position indisponible. Autorise la localisation dans ton navigateur.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 }
    );
  };

  const open = (activity: Activity) => router.push(`/activity/${activity.documentId ?? activity.id}`);

  return (
    <View style={styles.container}>
      <ScreenBackground source={DESIGN.mapBg} />
      <Text style={[styles.title, { marginTop: insets.top + 26 }]}>CARTE</Text>

      <View style={styles.mapFrame}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.purple} style={styles.center} />
        ) : placed.length === 0 ? (
          <View style={styles.center}>
            <Feather name="map-pin" size={40} color={COLORS.purple} />
            <Text style={styles.emptyText}>{error ?? "Aucune activité n’a encore d’adresse sur la carte."}</Text>
          </View>
        ) : (
          <ActivityMap activities={placed} selectedId={selected?.id ?? null} onSelect={setSelected} userPosition={position} />
        )}

        {canLocate && placed.length > 0 && (
          <TouchableOpacity style={styles.locate} onPress={locate} disabled={locating} accessibilityRole="button">
            {locating ? <ActivityIndicator size="small" color={COLORS.ink} /> : <Feather name="crosshair" size={16} color={COLORS.ink} />}
            <Text style={styles.locateText}>Autour de moi</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && placed.length > 0 ? <Text style={styles.notice}>{error}</Text> : null}
      {!loading && unplaced > 0 && !selected ? (
        <TouchableOpacity onPress={() => router.push("/activity")} accessibilityRole="link" style={styles.noticeLink}>
          <Text style={styles.noticeText}>
            {unplaced} activité{unplaced > 1 ? "s" : ""} sans adresse précise : voir la liste
          </Text>
        </TouchableOpacity>
      ) : null}

      {selected && (
        <View style={[styles.card, { bottom: insets.bottom + 110 }]} accessibilityRole="summary" aria-label={selected.title}>
          <View style={styles.cardImage}>
            {selected.image ? <Image source={{ uri: selected.image }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {selected.title}
            </Text>
            {selected.address ? (
              <Text style={styles.cardText} numberOfLines={2}>
                {selected.address}
              </Text>
            ) : null}
            {formatPrice(selected.price) ? <Text style={styles.cardPrice}>{formatPrice(selected.price)}</Text> : null}
            <TouchableOpacity
              style={styles.discover}
              onPress={() => open(selected)}
              accessibilityRole="button"
              accessibilityLabel={`Découvrir ${selected.title}`}
            >
              <Text style={styles.discoverText}>Découvrir</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setSelected(null)} style={styles.close} accessibilityRole="button" accessibilityLabel="Fermer">
            <Feather name="x" size={18} color={COLORS.ink} />
          </TouchableOpacity>
        </View>
      )}

      <BottomNav currentRoute="map" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 25,
    color: COLORS.ink,
    textAlign: "center",
  },
  mapFrame: {
    flex: 1,
    marginTop: 20,
    marginHorizontal: 12,
    marginBottom: 110,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.ink,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: "rgba(0, 0, 36, 0.6)",
    textAlign: "center",
  },
  locate: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 1000,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.yellow,
    borderWidth: 1.5,
    borderColor: COLORS.ink,
  },
  locateText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.ink,
  },
  notice: {
    position: "absolute",
    alignSelf: "center",
    bottom: 122,
    zIndex: 1000,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.ink,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  noticeLink: {
    position: "absolute",
    alignSelf: "center",
    bottom: 122,
    zIndex: 1000,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
  },
  noticeText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.ink,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  card: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 1000,
    flexDirection: "row",
    gap: 12,
    padding: 10,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: COLORS.ink,
  },
  cardImage: {
    width: 90,
    height: 90,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: COLORS.ink,
    paddingRight: 22,
  },
  cardText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "rgba(0, 0, 36, 0.7)",
  },
  cardPrice: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.purple,
  },
  discover: {
    marginTop: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: COLORS.yellow,
    borderWidth: 1.5,
    borderColor: COLORS.ink,
  },
  discoverText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.ink,
  },
  close: {
    position: "absolute",
    top: 8,
    right: 8,
  },
});
