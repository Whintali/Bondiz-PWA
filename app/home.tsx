import { COLORS } from "@/constants/Colors";
import { DESIGN } from "@/constants/Design";
import { FONTS } from "@/constants/Fonts";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../services/api";
import { showAlert } from "../utils/alert";
import { displayName, getUserImages } from "../utils/media";
import BottomNav from "./components/BottomNav";
import MatchNotification from "./components/MatchNotification";

const HomeScreen = () => {
  const router = useRouter();
  const { user, token } = useAuth();
  const { width, height } = useWindowDimensions();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentLikeIds, setSentLikeIds] = useState<number[]>([]);
  const [matchInfo, setMatchInfo] = useState<{ visible: boolean; matchedUser: any; matchId: string | null }>({
    visible: false,
    matchedUser: null,
    matchId: null,
  });

  useEffect(() => {
    if (!user) {
      router.replace("/welcome");
      return;
    }
    fetchUsers();
  }, [user]);

  // /discover/pools renvoie les profils recommandés, calculés dans Redis.
  // Liste vide en cas d'échec, pour que fetchUsers passe au repli.
  const fetchPool = async (): Promise<any[]> => {
    try {
      const res = await apiFetch<any>(`/discover/pools`, {}, token!);
      return Array.isArray(res.data) ? res.data.filter((profil: any) => profil?.id) : [];
    } catch (error) {
      console.warn("Pool Redis indisponible", error);
      return [];
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let profils = await fetchPool();
      if (profils.length === 0) {
        // Repli : /discover renvoie les profils à découvrir : sans soi-même,
        // sans les profils déjà likés et sans les comptes bloqués.
        const res = await apiFetch<any>(`/discover?pageSize=50`, {}, token!);
        profils = res.data || [];
      }
      setUsers(profils);
      setSentLikeIds([]);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Suivi des profils vus ────────────────────────────────────────────────
  // Les consultations sont mises en file puis envoyées par lots : un profil
  // qui défile ne doit pas déclencher une requête à lui seul.

  const vuesEnAttente = useRef<{ viewed: number; action: "seen" | "skipped" }[]>([]);
  const dejaEnvoyees = useRef<Set<string>>(new Set());
  const profilAffiche = useRef<number | null>(null);

  const enregistrerVue = (viewed: number, action: "seen" | "skipped") => {
    const cle = `${viewed}:${action}`;
    if (dejaEnvoyees.current.has(cle)) return;
    dejaEnvoyees.current.add(cle);

    vuesEnAttente.current.push({ viewed, action });
    if (vuesEnAttente.current.length >= 5) envoyerVues();
  };

  const envoyerVues = async () => {
    if (vuesEnAttente.current.length === 0 || !token) return;

    const lot = vuesEnAttente.current;
    vuesEnAttente.current = [];

    try {
      await apiFetch("/profile-views", {
        method: "POST",
        body: JSON.stringify({ data: { views: lot } }),
      }, token);
    } catch (error) {
      // Une statistique perdue ne doit jamais gêner la navigation.
      console.error("Enregistrement des profils vus impossible", error);
    }
  };

  // Le profil occupe tout l'écran : il est « vu » dès qu'il est majoritairement
  // visible. Celui qu'on quitte sans l'avoir liké est marqué « passé ».
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    const visible = viewableItems[0]?.item;
    if (!visible || visible.id === profilAffiche.current) return;

    const precedent = profilAffiche.current;
    profilAffiche.current = visible.id;

    enregistrerVue(visible.id, "seen");
    if (precedent !== null && !sentLikeIdsRef.current.includes(precedent)) {
      enregistrerVue(precedent, "skipped");
    }
  }).current;

  // onViewableItemsChanged doit rester stable : il lit les likes via une
  // référence plutôt que par fermeture sur l'état.
  const sentLikeIdsRef = useRef<number[]>([]);
  useEffect(() => {
    sentLikeIdsRef.current = sentLikeIds;
  }, [sentLikeIds]);

  // Envoi de ce qui reste en quittant l'écran.
  useEffect(() => {
    return () => {
      void envoyerVues();
    };
  }, []);

  const handleLike = async (targetUserId: number) => {
    if (!user || sentLikeIds.includes(targetUserId)) return;

    // Mise à jour optimiste
    setSentLikeIds((prev) => [...prev, targetUserId]);

    try {
      // L'auteur du like est déduit du token côté serveur,
      // qui crée aussi le match si le like est réciproque.
      const likeRes = await apiFetch<any>("/likes", {
        method: "POST",
        body: JSON.stringify({ data: { toUser: targetUserId } }),
      }, token!);

      if (likeRes.meta?.matched) {
        setMatchInfo({
          visible: true,
          matchedUser: users.find((u) => u.id === targetUserId) || { username: "ton nouveau contact" },
          matchId: likeRes.meta?.match?.documentId ?? null,
        });
      }
    } catch (error) {
      console.error("Erreur lors du Like", error);
      setSentLikeIds((prev) => prev.filter((id) => id !== targetUserId));
      showAlert("Erreur", "Impossible d'envoyer votre Like pour le moment.");
    }
  };

  const openProfile = (target: any) => {
    router.push({
      pathname: "/user/[id]",
      params: { id: String(target.id), liked: sentLikeIds.includes(target.id) ? "1" : "0" },
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.purple} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <FlatList
        data={users}
        renderItem={({ item }) => (
          <UserCard
            profile={item}
            width={width}
            height={height}
            isLiked={sentLikeIds.includes(item.id)}
            onLike={() => handleLike(item.id)}
            onOpen={() => openProfile(item)}
          />
        )}
        keyExtractor={(item: any) => item.id.toString()}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        ListEmptyComponent={
          <View style={[{ width, height }, styles.center, styles.empty]}>
            <Text style={styles.emptyText}>Aucun profil à découvrir autour de toi pour le moment.</Text>
          </View>
        }
      />

      <MatchNotification
        visible={matchInfo.visible}
        matchedUser={matchInfo.matchedUser}
        matchId={matchInfo.matchId}
        onClose={() => setMatchInfo((prev) => ({ ...prev, visible: false }))}
      />

      <BottomNav currentRoute="home" />
    </View>
  );
};

type UserCardProps = {
  profile: any;
  width: number;
  height: number;
  isLiked: boolean;
  onLike: () => void;
  onOpen: () => void;
};

// Profil plein écran : photo, nom en Archivo Black, ville, et à droite les
// actions « J'aime », « Voir le profil » et « Plus ».
const UserCard = ({ profile, width, height, isLiked, onLike, onOpen }: UserCardProps) => {
  const images = getUserImages(profile);

  return (
    <View style={{ width, height }}>
      {images.length > 0 ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={StyleSheet.absoluteFill}>
          {images.map((uri, index) => (
            <Image key={index} source={{ uri }} style={{ width, height }} contentFit="cover" />
          ))}
        </ScrollView>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]} />
      )}

      <LinearGradient colors={["transparent", "rgba(0, 0, 0, 0.45)"]} style={[styles.gradient, { pointerEvents: "none" }]} />

      <View style={[styles.info, { pointerEvents: "box-none" }]}>
        <TouchableOpacity onPress={onOpen} style={styles.identity} accessibilityRole="button" accessibilityLabel={`Voir le profil de ${displayName(profile)}`}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName(profile)}
          </Text>
          {profile.city ? <Text style={styles.city}>{profile.city}</Text> : null}
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity onPress={onLike} disabled={isLiked} accessibilityRole="button" accessibilityLabel={isLiked ? "Déjà aimé" : "J’aime"}>
            {isLiked ? (
              <Image source={DESIGN.iconHeartFilled} style={styles.actionIcon} />
            ) : (
              <Feather name="heart" size={38} color="white" style={styles.iconShadow} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={onOpen} accessibilityRole="button" accessibilityLabel="Voir le profil">
            <Image source={DESIGN.iconEye} style={styles.eyeIcon} contentFit="contain" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onOpen} accessibilityRole="button" accessibilityLabel="Plus d’informations">
            <Image source={DESIGN.iconMore} style={styles.moreIcon} contentFit="contain" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    paddingHorizontal: 40,
  },
  emptyText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.ink,
    textAlign: "center",
  },
  placeholder: {
    backgroundColor: COLORS.surface,
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "45%",
  },
  info: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 103,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingLeft: 35,
    paddingRight: 6,
  },
  identity: {
    flex: 1,
    paddingBottom: 10,
  },
  name: {
    fontFamily: FONTS.display,
    fontSize: 35,
    color: "white",
  },
  city: {
    marginTop: -4,
    fontFamily: FONTS.medium,
    fontSize: 20,
    color: "rgba(255, 255, 255, 0.7)",
  },
  actions: {
    alignItems: "center",
    gap: 13,
  },
  actionIcon: {
    width: 38,
    height: 38,
  },
  iconShadow: Platform.select({
    web: { textShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)" },
    default: { textShadowColor: "rgba(0, 0, 0, 0.25)", textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 4 },
  }) as any,
  eyeIcon: {
    width: 45.3,
    height: 40.9,
  },
  moreIcon: {
    width: 48,
    height: 48,
  },
});
