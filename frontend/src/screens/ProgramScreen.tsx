import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { parseProgram } from "../services/api";
import { colors } from "../constants/colors";

export default function ProgramScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("권한 필요", "사진 접근 권한이 필요합니다");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!picked.canceled) {
      const asset = picked.assets[0];
      setImageUri(asset.uri);
      setResult(null);
      await handleParse(asset.uri, asset.mimeType ?? "image/jpeg");
    }
  }

  async function handleParse(uri: string, mimeType: string) {
    setLoading(true);
    try {
      const data = await parseProgram(uri, mimeType);
      setResult(data);
    } catch (e: any) {
      Alert.alert("파싱 실패", e.message ?? "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
        <Text style={styles.uploadIcon}>📸</Text>
        <Text style={styles.uploadText}>운동 프로그램 사진 업로드</Text>
      </TouchableOpacity>

      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.preview} />
      )}

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loadingText}>AI가 프로그램을 분석 중...</Text>
        </View>
      )}

      {result && (
        <View style={styles.resultBox}>
          {result.wods?.map((wod: any, i: number) => (
            <View key={i} style={styles.wodCard}>
              <View style={styles.wodHeader}>
                {wod.type && (
                  <Text style={styles.wodType}>{wod.type}</Text>
                )}
                {wod.date && (
                  <Text style={styles.wodDate}>{wod.date}</Text>
                )}
                {wod.time_cap && (
                  <Text style={styles.timeCap}>⏱ {wod.time_cap}</Text>
                )}
              </View>
              {wod.exercises?.map((ex: any, j: number) => (
                <View key={j} style={styles.exerciseRow}>
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  <Text style={styles.exerciseDetail}>
                    {[
                      ex.sets && ex.reps
                        ? `${ex.sets}×${ex.reps}`
                        : ex.reps
                        ? `${ex.reps}회`
                        : null,
                      ex.weight,
                      ex.duration,
                    ]
                      .filter(Boolean)
                      .join("  ")}
                  </Text>
                  {ex.notes && (
                    <Text style={styles.exerciseNotes}>{ex.notes}</Text>
                  )}
                </View>
              ))}
              {wod.notes && (
                <Text style={styles.wodNotes}>{wod.notes}</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 16 },
  uploadBtn: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.accent,
    borderStyle: "dashed",
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  uploadIcon: { fontSize: 40 },
  uploadText: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  preview: { width: "100%", height: 220, borderRadius: 12, resizeMode: "cover" },
  loadingBox: { alignItems: "center", gap: 12, paddingVertical: 24 },
  loadingText: { color: colors.textMuted, fontSize: 14 },
  resultBox: { gap: 12 },
  wodCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  wodHeader: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  wodType: {
    backgroundColor: colors.accent,
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  wodDate: { color: colors.textMuted, fontSize: 13 },
  timeCap: { color: colors.textMuted, fontSize: 13 },
  exerciseRow: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    paddingLeft: 12,
    gap: 2,
  },
  exerciseName: { color: colors.text, fontSize: 15, fontWeight: "600" },
  exerciseDetail: { color: colors.accent, fontSize: 13 },
  exerciseNotes: { color: colors.textMuted, fontSize: 12 },
  wodNotes: { color: colors.textMuted, fontSize: 13, fontStyle: "italic" },
});
