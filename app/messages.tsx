import ScreenBackground from "@/components/ui/ScreenBackground";
import { COLORS } from "@/constants/Colors";
import { DESIGN } from "@/constants/Design";
import { FONTS } from "@/constants/Fonts";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/services/api";
import { displayName, getAvatarUrl } from "@/utils/media";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomNav from "./components/BottomNav";

type Conversation = {
  matchId: string;
  matchNumericId: number;
  name: string;
  avatar: string | null;
  lastMessage: string;
  sentAt: string | null;
  unread: boolean;
};

// « 18:18 » aujourd'hui, « hier », sinon « 12/10 ».
const formatTime = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (date.toDateString() === yesterday.toDateString()) return "hier";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
};

const MessagesScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = async (isRefresh = false) => {
    if (!user || !token) return;
    try {
      if (isRefresh) setRefreshing(true);
      // Le backend renvoie déjà les conversations triées, avec le dernier
      // message et le nombre de messages non lus.
      const res = await apiFetch<any>(`/conversations?pageSize=50`, {}, token);
      setConversations(
        (res.data || []).map((conv: any) => ({
          matchId: conv.matchDocumentId,
          matchNumericId: conv.matchId,
          name: displayName(conv.otherUser),
          avatar: getAvatarUrl(conv.otherUser),
          lastMessage:
            conv.lastMessage?.content ||
            "Nouvelle connexion ! Dis-lui bonjour ✨",
          sentAt: conv.lastMessage?.sentAt ?? null,
          unread: conv.unreadCount > 0,
        })),
      );
    } catch (error) {
      console.error("Fetch conversations error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [token]),
  );

  // Les connexions les plus récentes d'abord (les matchs ont des id croissants).
  const recent = [...conversations]
    .sort((a, b) => b.matchNumericId - a.matchNumericId)
    .slice(0, 10);

  return (
    <View style={styles.container}>
      <ScreenBackground source={DESIGN.messagesBg} opacity={0.4} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 26 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchConversations(true)}
            tintColor={COLORS.purple}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>MESSAGES</Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.purple}
            style={styles.loader}
          />
        ) : (
          <>
            {recent.length > 0 && (
              <>
                <Text style={styles.recentTitle}>Connexions récentes</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recentRow}
                >
                  {recent.map((conversation) => (
                    <TouchableOpacity
                      key={conversation.matchId}
                      style={styles.recentCard}
                      onPress={() =>
                        router.push(`/chat/${conversation.matchId}`)
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Discuter avec ${conversation.name}`}
                    >
                      {conversation.avatar ? (
                        <Image
                          source={{ uri: conversation.avatar }}
                          style={StyleSheet.absoluteFill}
                          contentFit="cover"
                        />
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <View
              style={[styles.sheet, { paddingBottom: insets.bottom + 120 }]}
            >
              {conversations.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>
                    Aucune conversation pour le moment
                  </Text>
                  <Text style={styles.emptyText}>
                    Like des profils sur l’accueil : quand c’est réciproque,
                    vous pourrez discuter ici.
                  </Text>
                </View>
              ) : (
                conversations.map((conversation, index) => (
                  <React.Fragment key={conversation.matchId}>
                    {index > 0 && <View style={styles.divider} />}
                    <TouchableOpacity
                      style={styles.row}
                      onPress={() =>
                        router.push(`/chat/${conversation.matchId}`)
                      }
                      accessibilityRole="button"
                    >
                      <View style={styles.avatar}>
                        {conversation.avatar ? (
                          <Image
                            source={{ uri: conversation.avatar }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                          />
                        ) : null}
                      </View>
                      <View style={styles.rowText}>
                        <Text style={styles.name} numberOfLines={1}>
                          {conversation.name}
                        </Text>
                        <Text
                          style={[
                            styles.preview,
                            conversation.unread && styles.previewUnread,
                          ]}
                          numberOfLines={1}
                        >
                          {conversation.lastMessage}
                        </Text>
                      </View>
                      <View style={styles.rowSide}>
                        {conversation.unread ? (
                          <Image
                            source={DESIGN.unreadDot}
                            style={styles.unreadDot}
                            accessibilityLabel="Non lu"
                          />
                        ) : (
                          <View style={styles.unreadDot} />
                        )}
                        <Text style={styles.time}>
                          {formatTime(conversation.sentAt)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </React.Fragment>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <BottomNav currentRoute="messages" />
    </View>
  );
};

export default MessagesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scroll: {
    flexGrow: 1,
  },
  title: {
    marginTop: 36,
    fontFamily: FONTS.display,
    fontSize: 25,
    color: COLORS.ink,
    textAlign: "center",
  },
  loader: {
    marginTop: 60,
  },
  recentTitle: {
    marginTop: 32,
    marginLeft: 29,
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.ink,
  },
  recentRow: {
    paddingLeft: 51,
    paddingRight: 20,
    paddingTop: 13,
    gap: 18,
  },
  recentCard: {
    width: 88,
    height: 101,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: COLORS.ink,
    backgroundColor: "#d9d9d9",
    overflow: "hidden",
  },
  sheet: {
    flexGrow: 1,
    marginTop: 25,
    backgroundColor: "white",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 22,
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 24,
    gap: 23,
  },
  divider: {
    height: 1,
    marginHorizontal: 10,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: COLORS.ink,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },
  rowText: {
    flex: 1,
  },
  name: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.purple,
  },
  preview: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "rgba(0, 0, 36, 0.6)",
  },
  previewUnread: {
    fontFamily: FONTS.semiBold,
    color: "rgba(0, 0, 36, 0.95)",
  },
  rowSide: {
    alignItems: "flex-end",
    gap: 8,
  },
  unreadDot: {
    width: 15,
    height: 15,
  },
  time: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "rgba(0, 0, 36, 0.3)",
  },
  empty: {
    paddingTop: 40,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.purple,
    textAlign: "center",
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "rgba(0, 0, 36, 0.6)",
    textAlign: "center",
  },
});
