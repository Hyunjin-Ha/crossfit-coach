import React, { useState, useRef } from "react";
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
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { sendAssessmentMessage, Message, FitnessProfile } from "../services/api";
import { colors } from "../constants/colors";

const GREETING =
  "안녕하세요! 저는 AI 크로스핏 코치입니다 💪\n맞춤 코칭을 위해 실력을 파악하고 싶어요. 크로스핏은 얼마나 하셨나요?";

interface Props {
  onComplete: (profile: FitnessProfile) => void;
}

export default function AssessmentScreen({ onComplete }: Props) {
  const [displayMessages, setDisplayMessages] = useState<Message[]>([
    { role: "assistant", content: GREETING },
  ]);
  const [apiMessages, setApiMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const listRef = useRef<FlatList>(null);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading || complete) return;
    setInput("");

    const userMsg: Message = { role: "user", content: text };
    const newDisplay = [...displayMessages, userMsg];
    const newApi = [...apiMessages, userMsg];

    setDisplayMessages(newDisplay);
    setApiMessages(newApi);
    setLoading(true);

    try {
      const result = await sendAssessmentMessage(newApi);
      const aiMsg: Message = { role: "assistant", content: result.message };

      setDisplayMessages([...newDisplay, aiMsg]);
      const finalApi = [...newApi, aiMsg];
      setApiMessages(finalApi);

      if (result.complete && result.profile) {
        setComplete(true);
        await AsyncStorage.setItem("fitness_profile", JSON.stringify(result.profile));
        setTimeout(() => onComplete(result.profile!), 1200);
      }
    } catch {
      setDisplayMessages([
        ...newDisplay,
        { role: "assistant", content: "오류가 발생했습니다. 다시 시도해주세요." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>실력 파악</Text>
        <Text style={styles.headerSub}>맞춤 코칭을 위한 초기 설정</Text>
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={displayMessages}
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
        />
        {loading && (
          <ActivityIndicator
            style={styles.loader}
            color={colors.accent}
            size="small"
          />
        )}
        {complete ? (
          <View style={styles.completeBar}>
            <Text style={styles.completeText}>
              프로필 완성! 메인 화면으로 이동 중...
            </Text>
          </View>
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="답변 입력..."
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
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.text, fontSize: 22, fontWeight: "700" },
  headerSub: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  list: { padding: 16, gap: 10 },
  bubble: { maxWidth: "80%", borderRadius: 16, padding: 12 },
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
  loader: { marginVertical: 8 },
  completeBar: {
    backgroundColor: "#22c55e22",
    padding: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#22c55e44",
  },
  completeText: { color: "#22c55e", fontWeight: "600", fontSize: 15 },
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
