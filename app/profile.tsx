import { COLORS } from "@/constants/Colors";
import { DESIGN } from "@/constants/Design";
import { FONTS } from "@/constants/Fonts";
import InterestChip from "@/components/ui/InterestChip";
import ScreenBackground from "@/components/ui/ScreenBackground";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import Animated, { 
  FadeIn, 
  FadeOut, 
  Layout, 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  runOnJS
} from "react-native-reanimated";
import { 
  Gesture, 
  GestureDetector,
  GestureHandlerRootView
} from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Modal,
  TextInput,
  Pressable
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { apiFetch, STRAPI_BASE_URL } from "../services/api";
import { appendImage } from "../utils/upload";
import BottomNav from "./components/BottomNav";

const { width, height } = Dimensions.get("window");

export default function ProfileScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();
  const [profileData, setProfileData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [orderedIds, setOrderedIds] = React.useState<number[]>([]);
  const [editModalVisible, setEditModalVisible] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editBio, setEditBio] = React.useState("");
  const [savingProfile, setSavingProfile] = React.useState(false);

  // Modal swipe state
  const modalY = useSharedValue(0);

  React.useEffect(() => {
    if (user && token) {
      fetchProfile();
    }
  }, [user, token]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<any>(`/users/me?populate=*`, {}, token!);
      setProfileData(data);
    } catch (error) {
      console.error("Failed to fetch profile data", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Désolé, nous avons besoin des permissions pour accéder à vos photos !");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setLoading(true);
      const formData = new FormData();
      await appendImage(formData, "files", uri, "profile_photo");

      const uploadResponse = await apiFetch<any[]>("/upload", {
        method: "POST",
        body: formData,
      }, token!);

      if (uploadResponse && uploadResponse.length > 0) {
        const newImageId = uploadResponse[0].id;
        const currentImages = profileData?.self_image || [];
        const currentImageIds = currentImages.map((img: any) => img.id);
        const newIds = [...currentImageIds, newImageId];
        
        await apiFetch(`/users/${user?.id}`, {
          method: "PUT",
          body: JSON.stringify({ self_image: newIds }),
        }, token!);

        setOrderedIds([]); 
        await fetchProfile();
      }
    } catch (error) {
      console.error("Failed to upload image", error);
      alert("Erreur lors de l'envoi de l'image.");
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = (fromIndex: number, toIndex: number) => {
    const rawImages: any[] = profileData?.self_image || [];
    const baseIds = orderedIds.length > 0 ? orderedIds : rawImages.map(img => img.id);
    const newIds = [...baseIds];
    [newIds[fromIndex], newIds[toIndex]] = [newIds[toIndex], newIds[fromIndex]];
    setOrderedIds(newIds);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveAll = async () => {
    try {
      setSavingProfile(true);
      const rawImages: any[] = profileData?.self_image || [];
      await apiFetch<any>(`/users/${user?.id}`, {
        method: "PUT",
        body: JSON.stringify({
          firstName: editName.trim(),
          bio: editBio,
          self_image: orderedIds.length > 0 ? orderedIds : rawImages.map(img => img.id)
        }),
      }, token!);
      await fetchProfile();
      setEditModalVisible(false);
    } catch (error) {
      console.error("Failed to save profile", error);
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setSavingProfile(false);
    }
  };

  const swipeGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        modalY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 150 || e.velocityY > 600) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
        runOnJS(setEditModalVisible)(false);
      }
      modalY.value = withSpring(0);
    });

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalY.value }]
  }));

  // Les contenus avec brouillon existent en deux versions (brouillon et
  // publiée) : on compte les documents, pas les lignes.
  const countDocuments = (...lists: any[][]) =>
    new Set(lists.flatMap((list) => (list ?? []).map((item: any) => item.documentId ?? item.id))).size;
  const stats = {
    likes: countDocuments(profileData?.likes),
    connexions: countDocuments(profileData?.matches, profileData?.matches2),
    activities: countDocuments(profileData?.organizedBookings, profileData?.participatedBookings),
  };

  const rawImages: any[] = profileData?.self_image || [];
  const orderedImages = orderedIds.length > 0
    ? orderedIds.map(id => rawImages.find((img: any) => img.id === id)).filter(Boolean)
    : rawImages;

  const photos = orderedImages.map((img: any) => {
    const url = img.url || img.attributes?.url || img.data?.attributes?.url;
    if (!url) return null;
    return url.startsWith("http") ? url : `${STRAPI_BASE_URL}${url}`;
  }).filter((url: string | null) => url !== null) || [];

  const avatarUrl = photos.length > 0 ? photos[0] : null;
  const fullName = [profileData?.firstName, profileData?.lastName].filter(Boolean).join(" ") || profileData?.username || user?.username || "";
  const interests: { id: number; name: string }[] = profileData?.interestTags || [];

  // Semaine en cours, du lundi au dimanche, pour la carte « Agenda ».
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  if (loading && !profileData) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.purple} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenBackground source={DESIGN.profileBg} opacity={0.5} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>MON PROFIL</Text>
          <TouchableOpacity onPress={() => router.push("/settings")} accessibilityRole="button" accessibilityLabel="Paramètres">
            <Image source={DESIGN.iconSettings} style={styles.settingsIcon} contentFit="contain" />
          </TouchableOpacity>
        </View>

        <View style={styles.identityCard}>
          <View style={styles.avatarRing}>
            {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" /> : <View style={styles.avatar} />}
          </View>
          <View style={styles.identity}>
            <Text style={styles.userName} numberOfLines={1}>{fullName}</Text>
            {profileData?.username ? <Text style={styles.handle} numberOfLines={1}>{profileData.username}</Text> : null}
            <View style={styles.chips}>
              {interests.slice(0, 4).map((interest) => (
                <InterestChip key={interest.id} label={interest.name} size="small" />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          {[
            { value: stats.likes, label: "Likes" },
            { value: stats.connexions, label: "Connexions" },
            { value: stats.activities, label: "Activités" },
          ].map((stat) => (
            <View key={stat.label} style={styles.statBox}>
              <Text style={styles.statNumber}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            setEditName(profileData?.firstName || profileData?.username || "");
            setEditBio(profileData?.bio || "");
            setEditModalVisible(true);
            modalY.value = 0;
          }}
          accessibilityRole="button"
        >
          <Text style={styles.editButtonText}>Modifier mon profil</Text>
        </TouchableOpacity>

        <View style={styles.photos}>
          {photos.slice(0, 5).map((uri: string, index: number) => (
            <Image key={uri} source={{ uri }} style={styles.photoTile} contentFit="cover" accessibilityLabel={`Photo ${index + 1}`} />
          ))}
          <TouchableOpacity style={[styles.photoTile, styles.addTile]} onPress={handlePickImage} accessibilityRole="button" accessibilityLabel="Ajouter une photo">
            <Text style={styles.addTileText}>+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.agenda} onPress={() => router.push("/activity")} accessibilityRole="button" accessibilityLabel="Voir mes réservations">
          <Text style={styles.agendaTitle}>AGENDA</Text>
          <View style={styles.weekRow}>
            {week.map((d) => {
              const isToday = d.toDateString() === today.toDateString();
              return (
                <View key={d.toDateString()} style={styles.weekDay}>
                  <Text style={styles.weekLetter}>{"DLMMJVS"[d.getDay()]}</Text>
                  <View style={styles.weekCircle}>
                    <Image source={isToday ? DESIGN.agendaDayActive : DESIGN.agendaDay} style={StyleSheet.absoluteFill} />
                    <Text style={[styles.weekNumber, isToday && styles.weekNumberToday]}>{d.getDate()}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </TouchableOpacity>

        <Modal
          animationType="slide"
          transparent={true}
          visible={editModalVisible}
          onRequestClose={() => setEditModalVisible(false)}
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.modalOverlay}>
              <Pressable 
                style={StyleSheet.absoluteFill} 
                onPress={() => setEditModalVisible(false)} 
              />
              <Animated.View style={[styles.modalContent, modalStyle]}>
                <GestureDetector gesture={swipeGesture}>
                  <View style={{ width: "100%", paddingBottom: 10, paddingTop: 5, alignItems: "center" }}>
                    <View style={styles.modalHandle} />
                    <Text style={styles.modalTitle}>Modifier mon profil</Text>
                  </View>
                </GestureDetector>

                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Prénom</Text>
                  <TextInput style={styles.textInput} value={editName} onChangeText={setEditName} placeholder="Ton prénom" />
                  
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput style={[styles.textInput, { height: 100, textAlignVertical: "top" }]} value={editBio} onChangeText={setEditBio} placeholder="Décrivez-vous..." multiline />

                  <View style={{ marginTop: 20, marginBottom: 20 }}>
                    <Text style={styles.inputLabel}>Mes Photos (restez appuyé pour glisser)</Text>
                    <View style={styles.photoGridModal}>
                      {photos.map((item: string, index: number) => (
                        <DraggablePhoto 
                          key={item} 
                          uri={item} 
                          index={index}
                          onSwap={handleSwap}
                          totalCount={photos.length}
                        />
                      ))}
                      <TouchableOpacity style={styles.addPhotoSquareModal} onPress={handlePickImage} activeOpacity={0.7}>
                        <Ionicons name="add" size={30} color={COLORS.black} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.purple }]} onPress={handleSaveAll} disabled={savingProfile}>
                    {savingProfile ? <ActivityIndicator size="small" color="white" /> : <Text style={{ color: "white", fontFamily: "Poppins_700Bold" }}>Enregistrer</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#eee" }]} onPress={() => setEditModalVisible(false)}>
                    <Text style={{ color: COLORS.black, fontFamily: "Poppins_700Bold" }}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
          </GestureHandlerRootView>
        </Modal>
      </ScrollView>
      <BottomNav currentRoute="profile" />
    </View>
  );
}

const DraggablePhoto = ({ uri, index, onSwap, totalCount }: any) => {
  const isDragging = useSharedValue(false);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(1);

  const gesture = Gesture.Pan()
    .activateAfterLongPress(300)
    .onStart(() => {
      isDragging.value = true;
      scale.value = withSpring(1.1);
      zIndex.value = 100;
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const GRID_SIZE = (width - 100) / 3 + 10;
      const colShift = Math.round(e.translationX / GRID_SIZE);
      const rowShift = Math.round(e.translationY / GRID_SIZE);
      const newIndex = index + colShift + (rowShift * 3);
      const clampedIndex = Math.max(0, Math.min(totalCount - 1, newIndex));

      if (clampedIndex !== index) {
        runOnJS(onSwap)(index, clampedIndex);
      }

      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      isDragging.value = false;
      zIndex.value = 1;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value }
    ],
    zIndex: zIndex.value,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View layout={Layout.springify()} entering={FadeIn} exiting={FadeOut} style={[styles.photoContainerModal, animatedStyle]}>
        <Image source={{ uri }} style={styles.photoImage} />
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  center: { alignItems: "center", justifyContent: "center" },
  scrollContent: { paddingHorizontal: 15 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingLeft: 8, paddingRight: 10, marginTop: 46 },
  headerTitle: { fontFamily: FONTS.display, fontSize: 25, color: COLORS.ink },
  settingsIcon: { width: 30, height: 30 },
  identityCard: {
    marginTop: 18,
    backgroundColor: "white",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 19,
    paddingVertical: 17,
    gap: 20,
    boxShadow: "0px 4px 4px rgba(163, 163, 163, 0.3)",
  },
  avatarRing: { width: 129, height: 130, borderRadius: 65, borderWidth: 6, borderColor: COLORS.purple, overflow: "hidden", backgroundColor: COLORS.border },
  avatar: { width: "100%", height: "100%", backgroundColor: COLORS.border },
  identity: { flex: 1 },
  userName: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.purple },
  handle: { fontFamily: FONTS.medium, fontSize: 13, color: "black" },
  chips: { marginTop: 4, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statsRow: { marginTop: 13, flexDirection: "row", gap: 12 },
  statBox: {
    flex: 1,
    height: 58,
    backgroundColor: "white",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 4px 4px rgba(163, 163, 163, 0.3)",
  },
  statNumber: { fontFamily: FONTS.bold, fontSize: 20, lineHeight: 26, color: COLORS.purple },
  statLabel: { fontFamily: FONTS.medium, fontSize: 15, color: "black" },
  editButton: {
    marginTop: 29,
    alignSelf: "center",
    width: 202,
    height: 40,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.ink,
    backgroundColor: COLORS.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  editButtonText: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.ink },
  photos: { marginTop: 28, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  photoTile: {
    width: "31.2%",
    aspectRatio: 116 / 148,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.ink,
    backgroundColor: COLORS.border,
    boxShadow: "0px 4px 4px rgba(163, 163, 163, 0.3)",
  },
  addTile: { backgroundColor: "rgba(255, 255, 255, 0.4)", alignItems: "center", justifyContent: "center" },
  addTileText: { fontFamily: FONTS.bold, fontSize: 30, color: COLORS.purple },
  agenda: {
    marginTop: 21,
    backgroundColor: "white",
    borderRadius: 20,
    paddingHorizontal: 29,
    paddingTop: 19,
    paddingBottom: 19,
    boxShadow: "0px 4px 4px rgba(163, 163, 163, 0.3)",
  },
  agendaTitle: { fontFamily: FONTS.display, fontSize: 20, color: "black" },
  weekRow: { marginTop: 11, flexDirection: "row", justifyContent: "space-between" },
  weekDay: { alignItems: "center", gap: 4 },
  weekLetter: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.pink },
  weekCircle: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  weekNumber: { fontFamily: FONTS.medium, fontSize: 14, color: "black" },
  weekNumberToday: { color: "white" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: width - 40, height: height * 0.75, backgroundColor: "white", borderRadius: 30, padding: 20, elevation: 10, overflow: "hidden" },
  modalHandle: { width: 50, height: 5, backgroundColor: "#E0E0E0", borderRadius: 2.5, alignSelf: "center", marginBottom: 15 },
  modalTitle: { fontSize: 22, fontFamily: "Poppins_700Bold", marginBottom: 20, textAlign: "center" },
  inputLabel: { fontFamily: "Poppins_700Bold", fontSize: 14, color: COLORS.black, marginBottom: 8, marginTop: 15 },
  textInput: { backgroundColor: "#f9f9f9", borderRadius: 12, padding: 15, fontFamily: "Poppins_400Regular", fontSize: 15 },
  modalActions: { flexDirection: "row", gap: 15, marginTop: 20, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 10 },
  modalBtn: { flex: 1, height: 50, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  miniPhoto: { width: 60, height: 60, borderRadius: 8, marginRight: 10, backgroundColor: COLORS.gray },
  photoGridModal: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start", gap: 10, marginTop: 10 },
  photoContainerModal: { width: (width - 100) / 3, height: (width - 100) / 3, borderRadius: 12, overflow: "hidden" },
  photoImage: { width: "100%", height: "100%" },
  addPhotoSquareModal: { width: (width - 100) / 3, height: (width - 100) / 3, backgroundColor: "#f5f5f5", borderRadius: 12, justifyContent: "center", alignItems: "center", borderStyle: "dashed", borderWidth: 2, borderColor: "#ddd" },
});
