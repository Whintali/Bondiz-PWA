import BackButton from "@/components/ui/BackButton";
import ScreenBackground from "@/components/ui/ScreenBackground";
import { COLORS } from "@/constants/Colors";
import { DESIGN } from "@/constants/Design";
import { FONTS } from "@/constants/Fonts";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/services/api";
import { displayName, getAvatarUrl } from "@/utils/media";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ChatScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // matchId
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);

  const flatListRef = useRef<FlatList>(null);
  const isRedirecting = useRef(false);

  const fetchData = async () => {
    if (!user || !token || !id || isRedirecting.current) return;
    try {
      // 1. La conversation : le backend vérifie que le match nous appartient
      const convRes = await apiFetch<any>(`/conversations/${id}`, {}, token);
      setOtherUser(convRes.data?.otherUser);

      // 2. L'historique, déjà trié et limité à cette conversation
      const msgRes = await apiFetch<any>(`/conversations/${id}/messages?pageSize=100`, {}, token);
      if (msgRes.data) {
        setMessages(msgRes.data);
      }

      // 3. Les messages reçus sont marqués comme lus
      if (msgRes.data?.some((m: any) => !m.isMine && !m.isRead)) {
        await apiFetch(`/conversations/${id}/read`, { method: "POST" }, token);
      }
    } catch (error: any) {
      console.error("Chat fetch error:", error);
      // Conversation supprimée (404) ou qui n'est pas la nôtre (403).
      if (/\b40[34]\b/.test(String(error))) {
        isRedirecting.current = true;
        setLoading(false);
        router.replace("/messages");
      }
    } finally {
      if (!isRedirecting.current) {
        setLoading(false);
      }
    }
  };

  // Relancé quand la session est restaurée : à l'ouverture directe d'une
  // conversation (rafraîchissement, notification), le jeton arrive après le
  // premier rendu et l'intervalle garderait sinon un fetchData sans jeton.
  useEffect(() => {
    if (!user || !token) return;
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [id, user?.id, token]);

  const sendMessage = async () => {
    if (!messageText.trim() || !otherUser || !token) return;

    const tempText = messageText;
    setMessageText("");

    try {
      await apiFetch<any>(
        `/conversations/${id}/messages`,
        { method: "POST", body: JSON.stringify({ data: { content: tempText } }) },
        token
      );
      fetchData();
    } catch (error) {
      console.error("Send message error:", error);
      setMessageText(tempText);
    }
  };

  const avatar = getAvatarUrl(otherUser);
  const name = displayName(otherUser);

  // L'avatar n'est affiché que sur le premier message d'une suite de
  // messages reçus, comme dans la maquette.
  const renderMessage = ({ item, index }: { item: any; index: number }) => {
    const previous = messages[index - 1];
    const showAvatar = !item.isMine && (!previous || previous.isMine);

    return (
      <View style={[styles.messageRow, item.isMine ? styles.mineRow : styles.theirRow]}>
        {!item.isMine && (
          <View style={styles.messageAvatar}>
            {showAvatar && avatar ? <Image source={{ uri: avatar }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
          </View>
        )}
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  if (loading && !otherUser) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.purple} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenBackground source={DESIGN.chatBg} opacity={0.4} />

      <View style={[styles.header, { paddingTop: insets.top + 36 }]}>
        <BackButton style={[styles.back, { top: insets.top + 36 }]} onPress={() => (router.canGoBack() ? router.back() : router.replace("/messages"))} />
        <View style={styles.headerAvatar}>
          {avatar ? <Image source={{ uri: avatar }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
        </View>
        <Text style={styles.headerName} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.divider} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={<Text style={styles.empty}>Dis bonjour à {name} !</Text>}
        />

        <View style={[styles.inputRow, { paddingBottom: insets.bottom + 32 }]}>
          <TouchableOpacity
            style={styles.plus}
            onPress={() => router.push("/activity")}
            accessibilityRole="button"
            accessibilityLabel="Proposer une activité"
          >
            <Text style={styles.plusText}>+</Text>
          </TouchableOpacity>
          <View style={styles.inputPill}>
            <TextInput
              style={styles.input}
              placeholder="Envoyer un chat"
              placeholderTextColor="rgba(0, 0, 36, 0.5)"
              value={messageText}
              onChangeText={setMessageText}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
              submitBehavior="submit"
            />
            {messageText.trim() ? (
              <TouchableOpacity onPress={sendMessage} accessibilityRole="button" accessibilityLabel="Envoyer">
                <Feather name="send" size={18} color={COLORS.purple} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  flex: {
    flex: 1,
  },
  header: {
    alignItems: "center",
  },
  back: {
    position: "absolute",
    left: 34,
  },
  headerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: COLORS.ink,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },
  headerName: {
    marginTop: 4,
    fontFamily: FONTS.display,
    fontSize: 20,
    color: COLORS.ink,
  },
  divider: {
    marginTop: 17,
    width: 342,
    maxWidth: "85%",
    height: 1,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  messages: {
    paddingHorizontal: 20,
    paddingTop: 35,
    paddingBottom: 20,
    gap: 9,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  mineRow: {
    justifyContent: "flex-end",
  },
  theirRow: {
    justifyContent: "flex-start",
  },
  messageAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: "hidden",
  },
  bubble: {
    maxWidth: 250,
    backgroundColor: COLORS.white,
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 9,
    boxShadow: "1px 4px 10px rgba(0, 0, 36, 0.1)",
  },
  bubbleText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.ink,
  },
  empty: {
    marginTop: 40,
    textAlign: "center",
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: "rgba(0, 0, 36, 0.5)",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 21,
    paddingTop: 10,
  },
  plus: {
    width: 44,
    height: 43,
    borderRadius: 100,
    backgroundColor: COLORS.purple,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 4px 4px rgba(163, 163, 163, 0.3)",
  },
  plusText: {
    fontFamily: FONTS.extraBold,
    fontSize: 30,
    lineHeight: 36,
    color: "white",
  },
  inputPill: {
    flex: 1,
    height: 43,
    borderRadius: 100,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 21,
    gap: 8,
    boxShadow: "0px 4px 4px rgba(163, 163, 163, 0.3)",
  },
  input: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.ink,
    paddingVertical: 0,
    outlineStyle: "none",
  } as any,
});
