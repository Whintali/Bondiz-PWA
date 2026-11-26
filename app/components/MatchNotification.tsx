import BackButton from "@/components/ui/BackButton";
import InterestChip from "@/components/ui/InterestChip";
import { COLORS } from "@/constants/Colors";
import { DESIGN } from "@/constants/Design";
import { FONTS } from "@/constants/Fonts";
import { useAuth } from "@/context/AuthContext";
import { displayName, getAvatarUrl } from "@/utils/media";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface MatchNotificationProps {
  visible: boolean;
  matchedUser: any;
  /** documentId du match, pour ouvrir la conversation. */
  matchId?: string | null;
  onClose: () => void;
}

type Tag = { id: number; name: string };

// Écran « Vous êtes connectés ! », affiché quand un like devient réciproque.
const MatchNotification = ({ visible, matchedUser, matchId, onClose }: MatchNotificationProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  if (!matchedUser) return null;

  const name = displayName(matchedUser);
  const myTags: Tag[] = user?.interestTags ?? [];
  const common: Tag[] = ((matchedUser.interestTags ?? []) as Tag[]).filter((tag) => myTags.some((mine) => mine.id === tag.id));
  const shown: Tag[] = common.length > 0 ? common : (matchedUser.interestTags ?? []).slice(0, 3);

  const openChat = () => {
    onClose();
    router.push(matchId ? `/chat/${matchId}` : "/messages");
  };

  const planActivity = () => {
    onClose();
    router.push("/activity");
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <Image source={DESIGN.matchBg} style={[StyleSheet.absoluteFill, styles.background]} contentFit="cover" />
        <Image source={DESIGN.matchDashedCurve} style={styles.curve} contentFit="contain" />

        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 48 }]}>
          <BackButton tone="dark" onPress={onClose} style={styles.back} />

          <Text style={styles.title}>
            Vous êtes <Text style={styles.highlight}>connectés !</Text>
          </Text>
          <Text style={styles.subtitle}>Toi et {name} avez des choses en commun !</Text>

          <View style={styles.avatars}>
            <Avatar uri={getAvatarUrl(matchedUser)} label={name} highlighted />
            <Avatar uri={getAvatarUrl(user)} label="Toi" />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>CENTRES D’INTÉRÊT</Text>
            <View style={styles.chips}>
              {shown.map((tag) => (
                <InterestChip key={tag.id} label={tag.name} />
              ))}
            </View>

            <Text style={styles.body}>
              {common.length > 0 ? (
                <>
                  Tu as{" "}
                  <Text style={styles.bodyHighlight}>
                    {common.length} centre{common.length > 1 ? "s" : ""} d’intérêt
                  </Text>{" "}
                  en commun avec {name}.{" "}
                </>
              ) : null}
              Commencez à discuter pour en savoir plus et organiser votre première activité ensemble !
            </Text>

            <View style={styles.actions}>
              <TouchableOpacity onPress={openChat} accessibilityRole="button" accessibilityLabel={`Écrire à ${name}`}>
                <Image source={DESIGN.matchChatBubble} style={styles.chatBubble} />
                <Image source={DESIGN.matchChatIcon} style={styles.chatIcon} contentFit="contain" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.planButton} onPress={planActivity} accessibilityRole="button">
                <Text style={styles.planText}>Organiser une activité</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const Avatar = ({ uri, label, highlighted }: { uri: string | null; label: string; highlighted?: boolean }) => (
  <View style={styles.avatarBlock}>
    <View style={[styles.avatarRing, { borderColor: highlighted ? COLORS.purple : "white" }]}>
      {uri ? <Image source={{ uri }} style={styles.avatar} contentFit="cover" /> : <View style={[styles.avatar, styles.avatarEmpty]} />}
    </View>
    <Image source={highlighted ? DESIGN.matchDotPurple : DESIGN.matchDotWhite} style={styles.avatarDot} />
    <View style={[styles.avatarLabel, { backgroundColor: highlighted ? COLORS.purple : "white" }]}>
      <Text style={[styles.avatarLabelText, { color: highlighted ? "white" : "black" }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  </View>
);

export default MatchNotification;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  background: {
    opacity: 0.4,
  },
  curve: {
    position: "absolute",
    left: 3,
    top: 137,
    width: 513,
    height: 420,
  },
  content: {
    alignItems: "center",
  },
  back: {
    alignSelf: "flex-start",
    marginLeft: 34,
  },
  title: {
    marginTop: 61,
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: "black",
    textAlign: "center",
  },
  highlight: {
    color: COLORS.purple,
  },
  subtitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: "black",
    textAlign: "center",
  },
  avatars: {
    marginTop: 38,
    flexDirection: "row",
    gap: 54,
  },
  avatarBlock: {
    alignItems: "center",
    height: 163,
  },
  avatarRing: {
    width: 143,
    height: 143,
    borderRadius: 72,
    borderWidth: 6,
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarEmpty: {
    backgroundColor: COLORS.border,
  },
  avatarDot: {
    position: "absolute",
    top: 117,
    width: 26,
    height: 26,
  },
  avatarLabel: {
    position: "absolute",
    top: 131,
    width: 109,
    height: 31,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLabelText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
  },
  card: {
    marginTop: 100,
    width: 372,
    maxWidth: "92%",
    backgroundColor: "white",
    borderRadius: 20,
    paddingHorizontal: 31,
    paddingTop: 33,
    paddingBottom: 16,
    boxShadow: "0px 4px 4px rgba(163, 163, 163, 0.3)",
  },
  cardTitle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    color: "black",
  },
  chips: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  body: {
    marginTop: 28,
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: "black",
  },
  bodyHighlight: {
    fontFamily: FONTS.bold,
    color: COLORS.purple,
  },
  actions: {
    marginTop: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chatBubble: {
    width: 47,
    height: 47,
  },
  chatIcon: {
    position: "absolute",
    left: 14.8,
    top: 14,
    width: 20.3,
    height: 20,
  },
  planButton: {
    width: 243,
    height: 47,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.ink,
    backgroundColor: COLORS.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  planText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.ink,
  },
});
