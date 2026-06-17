import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { FitnessProfile } from "../services/api";
import { colors } from "../constants/colors";

const LEVEL_LABEL: Record<string, string> = {
  beginner: "초급",
  intermediate: "중급",
  advanced: "고급",
  elite: "엘리트",
};

const LEVEL_COLOR: Record<string, string> = {
  beginner: "#60a5fa",
  intermediate: "#34d399",
  advanced: "#f97316",
  elite: "#a78bfa",
};

interface Props {
  onReset: () => void;
}

export default function ProfileScreen({ onReset }: Props) {
  const [profile, setProfile] = useState<FitnessProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem("fitness_profile").then((val) => {
        if (val) setProfile(JSON.parse(val));
      });
    }, [])
  );

  function confirmReset() {
    Alert.alert(
      "프로필 초기화",
      "초기 설정을 다시 진행합니다. 계속하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "초기화",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem("fitness_profile");
            onReset();
          },
        },
      ]
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>프로필 정보를 불러오는 중...</Text>
      </View>
    );
  }

  const levelColor = LEVEL_COLOR[profile.level] ?? colors.accent;

  const rows: { label: string; value: string | null }[] = [
    { label: "경력", value: profile.years_experience != null ? `${profile.years_experience}년` : null },
    { label: "풀업", value: profile.can_do_pullups == null ? null : profile.can_do_pullups ? `가능 (${profile.pullup_count ?? "?"}개)` : "불가" },
    { label: "머슬업", value: profile.can_do_muscle_up == null ? null : profile.can_do_muscle_up ? "가능" : "불가" },
    { label: "백스쿼트 1RM", value: profile.max_back_squat },
    { label: "데드리프트 1RM", value: profile.max_deadlift },
    { label: "클린 1RM", value: profile.max_clean },
    { label: "Fran 타임", value: profile.fran_time },
    { label: "400m 러닝", value: profile.running_400m ? `${profile.running_400m}초` : null },
    { label: "특이사항", value: profile.notes },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.levelCard, { borderColor: levelColor }]}>
        <Text style={[styles.levelLabel, { color: levelColor }]}>
          {LEVEL_LABEL[profile.level] ?? profile.level}
        </Text>
        <Text style={styles.levelSub}>현재 레벨</Text>
      </View>

      <View style={styles.section}>
        {rows.map(({ label, value }) =>
          value ? (
            <View key={label} style={styles.row}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={styles.rowValue}>{value}</Text>
            </View>
          ) : null
        )}
      </View>

      <TouchableOpacity style={styles.resetBtn} onPress={confirmReset}>
        <Text style={styles.resetText}>프로필 초기화</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 16 },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" },
  empty: { color: colors.textMuted, fontSize: 15 },
  levelCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  levelLabel: { fontSize: 32, fontWeight: "800" },
  levelSub: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { color: colors.textMuted, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: "600" },
  resetBtn: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ef4444",
    alignItems: "center",
  },
  resetText: { color: "#ef4444", fontWeight: "600", fontSize: 15 },
});
