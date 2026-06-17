import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Message, FitnessProfile, sendChat } from "../services/api";
import { colors } from "../constants/colors";

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    AsyncStorage.getItem("fitness_profile").then((val) => {
      if (val) setProfile(JSON.parse(val));
    });
  }, []);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const updated: Message[] = [...messages, { role: "user", content: text }];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const reply = await sendChat(updated, profile);
      setMessages([...updated, { role: "assistant", content: reply }]);
    } catch {
      setMessages([
        ...updated,
        { role: "assistant", content: "오류가 발생했습니다. 다시 시도해주세요." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === "user" ? styles.userBubble : styles.aiBubble,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                item.role === "user" && styles.userText,
              ]}
            >
              {item.content}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>오늘의 WOD를 물어보세요!</Text>
        }
      />
      {loading && (
        <ActivityIndicator
          style={styles.loader}
          color={colors.accent}
          size="small"
        />
      )}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="메시지 입력..."
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendText}>전송</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, gap: 10 },
  bubble: {
    maxWidth: "80%",
    borderRadius: 16,
    padding: 12,
  },
  userBubble: {
    backgroundColor: colors.userBubble,
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: colors.surface,
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  bubbleText: { color: colors.text, fontSize: 15, lineHeight: 22 },
  userText: { color: "#fff" },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 80,
    fontSize: 16,
  },
  loader: { marginVertical: 8 },
  inputRow: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: "#fff", fontWeight: "700" },
});
