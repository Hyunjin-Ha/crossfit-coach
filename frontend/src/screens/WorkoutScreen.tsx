import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { WorkoutLog, getWorkouts, createWorkout, deleteWorkout } from "../services/api";
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

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${y}.${m}.${d}`;
}

export default function WorkoutScreen() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [date, setDate] = useState(todayString());
  const [wodName, setWodName] = useState("");
  const [resultType, setResultType] = useState("time");
  const [resultValue, setResultValue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, [])
  );

  async function fetchLogs() {
    setLoading(true);
    try {
      const data = await getWorkouts();
      setLogs(data);
    } catch {
      Alert.alert("오류", "기록을 불러오지 못했습니다");
    } finally {
      setLoading(false);
    }
  }

  function openModal() {
    setDate(todayString());
    setWodName("");
    setResultType("time");
    setResultValue("");
    setNotes("");
    setModalVisible(true);
  }

  async function handleSave() {
    if (!date) return;
    setSaving(true);
    try {
      const newLog = await createWorkout({
        date,
        wod_name: wodName.trim() || null,
        result_type: resultValue.trim() ? resultType : null,
        result_value: resultValue.trim() || null,
        notes: notes.trim() || null,
      });
      setLogs([newLog, ...logs]);
      setModalVisible(false);
    } catch {
      Alert.alert("오류", "저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(id: string) {
    Alert.alert("삭제", "이 기록을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteWorkout(id);
            setLogs((prev) => prev.filter((l) => l.id !== id));
          } catch {
            Alert.alert("오류", "삭제에 실패했습니다");
          }
        },
      },
    ]);
  }

  const resultLabel = (log: WorkoutLog) => {
    if (!log.result_value) return null;
    const typeLabel = RESULT_TYPES.find((t) => t.key === log.result_type)?.label ?? "";
    return `${typeLabel} ${log.result_value}`;
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
                {item.wod_name && (
                  <Text style={styles.cardWod}>{item.wod_name}</Text>
                )}
                <TouchableOpacity onPress={() => confirmDelete(item.id)}>
                  <Text style={styles.deleteBtn}>삭제</Text>
                </TouchableOpacity>
              </View>
              {item.result_value && (
                <Text style={styles.cardResult}>{resultLabel(item)}</Text>
              )}
              {item.notes && (
                <Text style={styles.cardNotes}>{item.notes}</Text>
              )}
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>아직 운동 기록이 없습니다{"\n"}첫 기록을 추가해보세요!</Text>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openModal}>
        <Text style={styles.fabText}>+ 기록 추가</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetTitle}>운동 기록 추가</Text>

              <Text style={styles.label}>날짜</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>WOD 이름 (선택)</Text>
              <TextInput
                style={styles.input}
                value={wodName}
                onChangeText={setWodName}
                placeholder="예: Fran, 오늘의 WOD..."
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>결과 유형</Text>
              <View style={styles.typeRow}>
                {RESULT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.typeBtn, resultType === t.key && styles.typeBtnActive]}
                    onPress={() => setResultType(t.key)}
                  >
                    <Text style={[styles.typeBtnText, resultType === t.key && styles.typeBtnTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>결과 (선택)</Text>
              <TextInput
                style={styles.input}
                value={resultValue}
                onChangeText={setResultValue}
                placeholder={RESULT_PLACEHOLDER[resultType]}
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>메모 (선택)</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={notes}
                onChangeText={setNotes}
                placeholder="스케일링, 컨디션 등..."
                placeholderTextColor={colors.textMuted}
                multiline
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>저장</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, paddingBottom: 100, gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardDate: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  cardWod: { color: colors.text, fontSize: 15, fontWeight: "700", flex: 1 },
  deleteBtn: { color: "#ef4444", fontSize: 13 },
  cardResult: { color: colors.accent, fontSize: 20, fontWeight: "800" },
  cardNotes: { color: colors.textMuted, fontSize: 13 },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 80,
    fontSize: 16,
    lineHeight: 26,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    backgroundColor: colors.accent,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
  },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 16 },
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
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  inputMulti: { minHeight: 80, textAlignVertical: "top" },
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
  cancelBtn: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelBtnText: { color: colors.textMuted, fontSize: 15 },
});
