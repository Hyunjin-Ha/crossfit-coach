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
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import {
  Message,
  FitnessProfile,
  sendChat,
  extractWodFromImage,
  createWorkout,
} from "../services/api";
import { colors } from "../constants/colors";

const RESULT_TYPES = [
  { key: "time", label: "시간" },
  { key: "rounds", label: "라운드" },
  { key: "weight", label: "무게" },
  { key: "score", label: "점수" },
];

const RESULT_PLACEHOLDER: Record<string, string> = {
  time: "예: 12:34",
  rounds: "예: 13+5",
  weight: "예: 100kg",
  score: "예: 250",
};

function todayString() {
  return new Date().toISOString().split("T")[0];
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const listRef = useRef<FlatList>(null);

  const [extracting, setExtracting] = useState(false);
  const [saveModal, setSaveModal] = useState(false);
  const [saveDate, setSaveDate] = useState(todayString());
  const [saveWodName, setSaveWodName] = useState("");
  const [saveResultType, setSaveResultType] = useState("time");
  const [saveResultValue, setSaveResultValue] = useState("");
  const [saveNotes, setSaveNotes] = useState("");
  const [saving, setSaving] = useState(false);

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

  async function handlePickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;

    setExtracting(true);
    try {
      const asset = result.assets[0];
      const data = await extractWodFromImage(
        asset.base64!,
        asset.mimeType ?? "image/jpeg"
      );
      setSaveDate(todayString());
      setSaveWodName(data.wod_name ?? "");
      setSaveResultType(data.result_type ?? "time");
      setSaveResultValue("");
      setSaveNotes(
        data.movements + (data.notes ? `\n${data.notes}` : "")
      );
      setSaveModal(true);
    } catch {
      Alert.alert("오류", "WOD 인식에 실패했습니다");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSaveWorkout() {
    if (!saveDate) return;
    setSaving(true);
    try {
      await createWorkout({
        date: saveDate,
        wod_name: saveWodName.trim() || null,
        result_type: saveResultValue.trim() ? saveResultType : null,
        result_value: saveResultValue.trim() || null,
        notes: saveNotes.trim() || null,
      });
      setSaveModal(false);
      Alert.alert("저장 완료", "운동기록 탭에서 확인하세요!");
    } catch {
      Alert.alert("오류", "저장에 실패했습니다");
    } finally {
      setSaving(false);
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
        <TouchableOpacity
          style={styles.cameraBtn}
          onPress={handlePickImage}
          disabled={extracting}
        >
          {extracting ? (
            <ActivityIndicator color={colors.accent} size="small" />
          ) : (
            <Text style={styles.cameraIcon}>📷</Text>
          )}
        </TouchableOpacity>
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

      <Modal visible={saveModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetTitle}>WOD 기록 저장</Text>

              <Text style={styles.label}>날짜</Text>
              <TextInput
                style={styles.fieldInput}
                value={saveDate}
                onChangeText={setSaveDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>WOD 이름 (선택)</Text>
              <TextInput
                style={styles.fieldInput}
                value={saveWodName}
                onChangeText={setSaveWodName}
                placeholder="예: Fran, 6월 20일 WOD..."
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>인식된 WOD 내용</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputMulti]}
                value={saveNotes}
                onChangeText={setSaveNotes}
                multiline
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>결과 유형</Text>
              <View style={styles.typeRow}>
                {RESULT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      styles.typeBtn,
                      saveResultType === t.key && styles.typeBtnActive,
                    ]}
                    onPress={() => setSaveResultType(t.key)}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        saveResultType === t.key && styles.typeBtnTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>내 결과 (선택)</Text>
              <TextInput
                style={styles.fieldInput}
                value={saveResultValue}
                onChangeText={setSaveResultValue}
                placeholder={RESULT_PLACEHOLDER[saveResultType]}
                placeholderTextColor={colors.textMuted}
              />

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveWorkout}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>운동기록에 저장</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setSaveModal(false)}
              >
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
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
    alignItems: "center",
  },
  cameraBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraIcon: { fontSize: 20 },
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
    height: 40,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: "#fff", fontWeight: "700" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 20,
  },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: 6, marginTop: 12 },
  fieldInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  fieldInputMulti: { minHeight: 100, textAlignVertical: "top" },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  typeBtnActive: { backgroundColor: colors.accent },
  typeBtnText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  typeBtnTextActive: { color: "#fff" },
  saveBtn: {
    marginTop: 24,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancelBtn: { marginTop: 10, paddingVertical: 12, alignItems: "center" },
  cancelBtnText: { color: colors.textMuted, fontSize: 15 },
});
