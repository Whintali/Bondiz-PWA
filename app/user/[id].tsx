import BackButton from "@/components/ui/BackButton";
import InterestChip from "@/components/ui/InterestChip";
import { COLORS } from "@/constants/Colors";
import { DESIGN } from "@/constants/Design";
import { FONTS } from "@/constants/Fonts";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/services/api";
import { showAlert } from "@/utils/alert";
import { displayName, getAvatarUrl } from "@/utils/media";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MatchNotification from "../components/MatchNotification";

// Fiche « À propos » d'un profil découvert : photo en fond teinté de violet,
// puis un panneau blanc avec la bio et les centres d'intérêt.
export default function UserProfileScreen() {
  const { id, liked } = useLocalSearchParams<{ id: string; liked?: string }>();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(liked === "1");
  const [match, setMatch] = useState<{ visible: boolean; matchId: string | null }>({ visible: false, matchId: null });

  useEffect(() => {
    // La session est relue de façon asynchrone : sans jeton, l'API refuse la requête.
    if (!token) return;
    const load = async () => {
      try {
        const data = await apiFetch<any>(`/users/${id}?populate[0]=self_image&populate[1]=interestTags`, {}, token);
        setProfile(data);
      } catch (error) {
        console.error("Chargement du profil impossible", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, token]);

  const like = async () => {
    if (isLiked || !profile) return;
    setIsLiked(true);
    try {
      const res = await apiFetch<any>("/likes", {
        method: "POST",
        body: JSON.stringify({ data: { toUser: profile.id } }),
      }, token!);
      if (res.meta?.matched) {
        setMatch({ visible: true, matchId: res.meta?.match?.documentId ?? null });
      }
    } catch (error) {
      console.error("Erreur lors du Like", error);
      setIsLiked(false);
      showAlert("Erreur", "Impossible d'envoyer votre Like pour le moment.");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.purple} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.center]}>
        <BackButton tone="dark" style={[styles.back, { top: insets.top + 23 }]} />
        <Text style={styles.missing}>Ce profil n’est plus disponible.</Text>
      </View>
    );
  }

  const photo = getAvatarUrl(profile);
  const name = displayName(profile);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {photo ? <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { paddingTop: insets.top }]}>
          <Text style={styles.name}>{name}</Text>
          {profile.city ? <Text style={styles.city}>{profile.city}</Text> : null}
          <TouchableOpacity onPress={like} disabled={isLiked} style={styles.heart} accessibilityRole="button" accessibilityLabel={isLiked ? "Déjà aimé" : "J’aime"}>
            {isLiked ? (
              <Image source={DESIGN.iconHeartFilled} style={styles.heartIcon} />
            ) : (
              <Feather name="heart" size={40} color="white" />
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 40 }]}>
          <Image source={DESIGN.sheetHandle} style={styles.handle} contentFit="contain" />
          <Text style={styles.sectionTitle}>À PROPOS</Text>
          <Text style={styles.bio}>{profile.bio || `${name} n’a pas encore écrit de présentation.`}</Text>

          {(profile.interestTags ?? []).length > 0 && (
            <>
              <Text style={styles.subTitle}>Centres d’intérêt</Text>
              <View style={styles.chips}>
                {profile.interestTags.map((tag: { id: number; name: string }) => (
                  <InterestChip key={tag.id} label={tag.name} />
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <BackButton style={[styles.back, { top: insets.top + 23 }]} />

      <MatchNotification
        visible={match.visible}
        matchedUser={profile}
        matchId={match.matchId}
        onClose={() => setMatch((value) => ({ ...value, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
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
  scroll: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  hero: {
    // Au-dessus du halo violet du panneau, pour garder le nom en blanc.
    zIndex: 1,
    minHeight: 420,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 40,
  },
  name: {
    fontFamily: FONTS.display,
    fontSize: 35,
    color: "white",
    textAlign: "center",
  },
  city: {
    marginTop: -6,
    fontFamily: FONTS.medium,
    fontSize: 20,
    color: "rgba(255, 255, 255, 0.7)",
  },
  heart: {
    marginTop: 18,
  },
  heartIcon: {
    width: 40,
    height: 40,
  },
  sheet: {
    backgroundColor: "white",
    borderRadius: 30,
    paddingHorizontal: 34,
    paddingTop: 15,
    // Halo violet de la maquette, qui teinte la photo au-dessus du panneau.
    boxShadow: "0px 4px 100px 300px rgba(132, 50, 254, 0.45)",
  },
  handle: {
    alignSelf: "center",
    width: 57,
    height: 4,
  },
  sectionTitle: {
    marginTop: 20,
    fontFamily: FONTS.display,
    fontSize: 20,
    color: "black",
  },
  bio: {
    marginTop: 7,
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: "black",
  },
  subTitle: {
    marginTop: 17,
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.muted,
  },
  chips: {
    marginTop: 5,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
});
