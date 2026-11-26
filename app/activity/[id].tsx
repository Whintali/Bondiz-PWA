import BookingSheet from "@/components/activity/BookingSheet";
import BackButton from "@/components/ui/BackButton";
import { COLORS } from "@/constants/Colors";
import { DESIGN } from "@/constants/Design";
import { FONTS } from "@/constants/Fonts";
import { useAuth } from "@/context/AuthContext";
import { Activity, fetchActivity, formatPrice } from "@/services/activities";
import { showAlert } from "@/utils/alert";
import { favoriteKey, useFavorites } from "@/utils/favorites";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomNav from "../components/BottomNav";

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites(user?.id, token);

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    fetchActivity(id)
      .then(setActivity)
      .catch((error) => console.error("Chargement de l'activité impossible", error))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.purple} />
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={[styles.container, styles.center]}>
        <BackButton tone="dark" style={[styles.back, { top: insets.top + 23 }]} />
        <Text style={styles.missing}>Cette activité n’existe plus.</Text>
      </View>
    );
  }

  const favorite = isFavorite(favoriteKey(activity));
  const price = formatPrice(activity.price);
  const group = activity.maxParticipants && activity.maxParticipants > 2 ? "Duo & groupe" : activity.maxParticipants === 2 ? "Duo" : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.hero}>
        {activity.image ? <Image source={{ uri: activity.image }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 130 }]}>
          <View style={styles.pills}>
            {activity.category ? (
              <View style={[styles.pill, styles.pillCategory]}>
                <Text style={styles.pillText}>{activity.category}</Text>
              </View>
            ) : null}
            {group ? (
              <View style={styles.pill}>
                <Text style={styles.pillText}>{group}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={styles.favorite}
              onPress={() => toggleFavorite(favoriteKey(activity))}
              accessibilityRole="button"
              accessibilityLabel={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <Image source={DESIGN.iconHeartDetail} style={styles.favoriteIcon} />
              {favorite && <Image source={DESIGN.iconHeartSmallFill} style={styles.favoriteFill} contentFit="contain" />}
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>{activity.title}</Text>

          {activity.location || price ? (
            <View style={styles.meta}>
              {activity.location ? (
                <View style={styles.metaItem}>
                  <Feather name="map-pin" size={15} color={COLORS.purple} />
                  <Text style={styles.metaText}>{activity.location}</Text>
                </View>
              ) : null}
              {price ? (
                <View style={styles.metaItem}>
                  <Feather name="tag" size={15} color={COLORS.purple} />
                  <Text style={styles.metaText}>{price}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {activity.description ? <Text style={styles.description}>{activity.description}</Text> : null}

          <TouchableOpacity style={styles.book} onPress={() => setBooking(true)} accessibilityRole="button">
            <Text style={styles.bookText}>Réserver</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Dégradé violet du bas de la maquette, sous la barre de navigation. */}
      <LinearGradient colors={["rgba(255, 255, 255, 0)", "rgba(132, 50, 254, 0.45)"]} style={[styles.bottomGlow, { pointerEvents: "none" }]} />
      <BackButton style={[styles.back, { top: insets.top + 23 }]} />

      <BookingSheet
        visible={booking}
        activity={activity}
        onClose={() => setBooking(false)}
        onBooked={() => {
          setBooking(false);
          showAlert("Réservation envoyée", "Tu la retrouves dans « Mes réservations ».");
        }}
      />

      <BottomNav currentRoute="activity" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  missing: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.ink,
  },
  back: {
    position: "absolute",
    left: 29,
  },
  hero: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 415,
    backgroundColor: COLORS.border,
  },
  scroll: {
    flexGrow: 1,
    paddingTop: 357,
  },
  sheet: {
    flexGrow: 1,
    backgroundColor: "white",
    borderRadius: 40,
    paddingHorizontal: 25,
    paddingTop: 33,
  },
  pills: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pill: {
    height: 36,
    paddingHorizontal: 24,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "rgba(0, 0, 36, 0.19)",
    justifyContent: "center",
  },
  pillCategory: {
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  pillText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.ink,
  },
  favorite: {
    marginLeft: "auto",
    width: 36,
    height: 36,
    borderRadius: 50,
    backgroundColor: COLORS.pink,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteIcon: {
    width: 20,
    height: 20,
  },
  favoriteFill: {
    position: "absolute",
    left: 9.25,
    top: 10.5,
    width: 16.9,
    height: 15,
  },
  title: {
    marginTop: 30,
    fontFamily: FONTS.display,
    fontSize: 30,
    color: COLORS.purple,
  },
  meta: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.ink,
  },
  description: {
    marginTop: 16,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: "black",
  },
  book: {
    marginTop: 30,
    width: 175,
    height: 36,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.ink,
    backgroundColor: COLORS.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  bookText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.ink,
  },
  bottomGlow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 160,
  },
});
