import { COLORS } from "@/constants/Colors";
import { DESIGN } from "@/constants/Design";
import { FONTS } from "@/constants/Fonts";
import { Activity, formatPrice } from "@/services/activities";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  activity: Activity;
  favorite: boolean;
  onToggleFavorite: () => void;
  onOpen: () => void;
  // "wide" : carte pleine largeur de l'onglet « Parcourir » ;
  // "tile" : vignette de la grille « Mes favoris ».
  variant?: "wide" | "tile";
};

export default function ActivityCard({ activity, favorite, onToggleFavorite, onOpen, variant = "wide" }: Props) {
  const tile = variant === "tile";
  const price = formatPrice(activity.price);
  const tags = [activity.category, !tile && activity.maxParticipants ? `${activity.maxParticipants} pers` : null].filter(
    Boolean
  ) as string[];

  return (
    // Les zones cliquables sont côte à côte, jamais imbriquées : un bouton
    // dans un bouton est interdit en HTML.
    <View style={[styles.card, tile ? styles.tile : styles.wide]}>
      <TouchableOpacity onPress={onOpen} activeOpacity={0.9} style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={activity.title}>
        {activity.image ? (
          <Image source={{ uri: activity.image }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.placeholder]} />
        )}
        <LinearGradient colors={["transparent", "rgba(0, 0, 36, 0.55)"]} style={styles.shade} />
      </TouchableOpacity>

      <View style={[styles.top, { pointerEvents: "box-none" }]}>
        <View style={[styles.tags, { pointerEvents: "none" }]}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          onPress={onToggleFavorite}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <Image source={tile ? DESIGN.iconHeartSmall : DESIGN.iconHeartOutlineWhite} style={tile ? styles.heartSmall : styles.heart} />
          {favorite && <Image source={DESIGN.iconHeartSmallFill} style={tile ? styles.heartFillSmall : styles.heartFill} contentFit="contain" />}
        </TouchableOpacity>
      </View>

      <View style={[styles.bottom, { pointerEvents: "box-none" }]}>
        <View style={[styles.texts, { pointerEvents: "none" }]}>
          <Text style={[styles.title, tile && styles.titleTile]} numberOfLines={2}>
            {activity.title}
          </Text>
          {!tile && activity.location ? (
            <View style={styles.meta}>
              <Feather name="map-pin" size={13} color={COLORS.white} />
              <Text style={styles.metaText} numberOfLines={1}>
                {activity.location}
              </Text>
            </View>
          ) : null}
          {!tile && price ? (
            <View style={styles.meta}>
              <Feather name="tag" size={14} color={COLORS.white} />
              <Text style={styles.metaText}>{price}</Text>
            </View>
          ) : null}
        </View>
        {!tile && (
          <TouchableOpacity style={styles.discover} onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Découvrir ${activity.title}`}>
            <Text style={styles.discoverText}>Découvrir</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const textShadow = Platform.select({
  web: { textShadow: "0px 3px 4px rgba(0, 0, 36, 0.5)" },
  default: { textShadowColor: "rgba(0, 0, 36, 0.5)", textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 4 },
}) as any;

const styles = StyleSheet.create({
  card: {
    borderWidth: 2.5,
    borderColor: COLORS.ink,
    borderRadius: 23,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  wide: {
    height: 228,
    boxShadow: "0px 4px 7px rgba(0, 0, 36, 0.3)",
  },
  tile: {
    width: "100%",
    height: 228,
    boxShadow: "0px 4px 4px rgba(0, 0, 36, 0.2)",
  },
  placeholder: {
    backgroundColor: COLORS.border,
  },
  shade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "60%",
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 17,
    paddingTop: 15,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    flex: 1,
  },
  tag: {
    height: 21,
    paddingHorizontal: 12,
    borderRadius: 50,
    backgroundColor: COLORS.pink,
    justifyContent: "center",
  },
  tagText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "white",
  },
  heart: {
    width: 20,
    height: 20,
  },
  heartFill: {
    position: "absolute",
    left: 1.25,
    top: 2.5,
    width: 16.9,
    height: 15,
  },
  heartSmall: {
    width: 16,
    height: 16,
  },
  heartFillSmall: {
    position: "absolute",
    left: 1,
    top: 2,
    width: 13.5,
    height: 12,
  },
  bottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingLeft: 26,
    paddingRight: 14,
    paddingBottom: 14,
    gap: 10,
  },
  texts: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 22,
    lineHeight: 31,
    color: COLORS.white,
    ...textShadow,
  },
  titleTile: {
    fontFamily: FONTS.semiBold,
    lineHeight: 24,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.white,
    ...textShadow,
  },
  discover: {
    width: 113,
    height: 31,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.ink,
    backgroundColor: COLORS.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  discoverText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.ink,
  },
});
