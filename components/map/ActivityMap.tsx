import { COLORS } from "@/constants/Colors";
import { FONTS } from "@/constants/Fonts";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ActivityMapProps } from "./types";

// iOS et Android : pas de module de carte natif dans l'app. Les lieux sont
// listés, et chacun s'ouvre dans l'application de cartes du téléphone.
const openInMaps = (latitude: number, longitude: number, label: string) => {
  const query = encodeURIComponent(label);
  const url =
    Platform.OS === "ios"
      ? `http://maps.apple.com/?ll=${latitude},${longitude}&q=${query}`
      : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${query})`;
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`)
  );
};

export default function ActivityMap({ activities, selectedId, onSelect }: ActivityMapProps & { userPosition?: unknown }) {
  return (
    <ScrollView contentContainerStyle={styles.list}>
      {activities.map((activity) => (
        <TouchableOpacity
          key={activity.id}
          style={[styles.row, activity.id === selectedId && styles.rowSelected]}
          onPress={() => onSelect(activity)}
          accessibilityRole="button"
        >
          <Feather name="map-pin" size={20} color={COLORS.purple} />
          <View style={styles.text}>
            <Text style={styles.title}>{activity.title}</Text>
            {activity.address ? <Text style={styles.address}>{activity.address}</Text> : null}
          </View>
          <TouchableOpacity
            onPress={() => openInMaps(activity.latitude, activity.longitude, activity.title)}
            accessibilityRole="button"
            accessibilityLabel={`Itinéraire vers ${activity.title}`}
          >
            <Feather name="navigation" size={20} color={COLORS.ink} />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 20,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowSelected: {
    borderColor: COLORS.purple,
  },
  text: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.ink,
  },
  address: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: "rgba(0, 0, 36, 0.6)",
  },
});
