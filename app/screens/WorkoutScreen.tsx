import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Modal, TextInput, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../config';
import { wodStorage } from '../storage';

type WorkoutLog = {
  id: string;
  created_at: string;
  date: string;
  wod_name: string | null;
  result_type: string | null;
  result_value: string | null;
  notes: string | null;
};

const RESULT_TYPES = [
  { key: 'time', label: '시간', placeholder: '예: 12:34' },
  { key: 'rounds', label: '라운드', placeholder: '예: 13+5' },
  { key: 'weight', label: '무게', placeholder: '예: 100kg' },
  { key: 'score', label: '점수', placeholder: '예: 250' },
];

function todayString() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${y}.${m}.${day}`;
}

export default function WorkoutScreen() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [date, setDate] = useState(todayString());
  const [wodName, setWodName] = useState('');
  const [resultType, setResultType] = useState('time');
  const [resultValue, setResultValue] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, [])
  );

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/workouts`);
      const data = await res.json();
      setLogs(data);
    } catch {
      Alert.alert('오류', '기록을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }

  function openModal() {
    setDate(todayString());
    setWodName('');
    setResultType('time');
    setResultValue('');
    setNotes('');
    setModalVisible(true);
  }

  async function handleImagePick() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.6,
      base64: true,
    });
    if (result.canceled || result.assets.length === 0) return;

    const images = result.assets
      .filter(a => a.base64)
      .map(a => ({ image_base64: a.base64!, media_type: a.mimeType ?? 'image/jpeg' }));
    if (images.length === 0) return;

    setAnalyzing(true);
    try {
      const res = await fetch(`${API_URL}/workouts/from-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
      });
      const data = await res.json();
      if (data.error) {
        Alert.alert('인식 실패', data.error);
        return;
      }
      const wodText = [data.movements, data.notes].filter(Boolean).join('\n');
      wodStorage.save(wodText);

      setDate(todayString());
      setWodName(data.wod_name ?? '');
      setResultType(data.result_type ?? 'time');
      setResultValue('');
      setNotes(data.movements ?? '');
      setModalVisible(true);
    } catch {
      Alert.alert('오류', '이미지 분석에 실패했습니다');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSave() {
    if (!date) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/workouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          wod_name: wodName.trim() || null,
          result_type: resultValue.trim() ? resultType : null,
          result_value: resultValue.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const newLog = await res.json();
      setLogs(prev => [newLog, ...prev]);
      setModalVisible(false);
    } catch {
      Alert.alert('오류', '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(id: string) {
    Alert.alert('삭제', '이 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_URL}/workouts/${id}`, { method: 'DELETE' });
            setLogs(prev => prev.filter(l => l.id !== id));
          } catch {
            Alert.alert('오류', '삭제에 실패했습니다');
          }
        },
      },
    ]);
  }

  const placeholder = RESULT_TYPES.find(t => t.key === resultType)?.placeholder ?? '';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="barbell-outline" size={20} color="#FF6B35" />
        <Text style={styles.headerTitle}>운동 기록</Text>
        <TouchableOpacity style={styles.photoBtn} onPress={handleImagePick} disabled={analyzing}>
          {analyzing
            ? <ActivityIndicator size="small" color="#FF6B35" />
            : <Ionicons name="camera-outline" size={20} color="#FF6B35" />
          }
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={openModal}>
          <Ionicons name="add" size={20} color="#FF6B35" />
          <Text style={styles.addBtnText}>기록 추가</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#FF6B35" size="large" />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
                {item.wod_name && <Text style={styles.cardWod}>{item.wod_name}</Text>}
                <TouchableOpacity onPress={() => confirmDelete(item.id)}>
                  <Ionicons name="trash-outline" size={16} color="#555" />
                </TouchableOpacity>
              </View>
              {item.result_value && (
                <Text style={styles.cardResult}>
                  {RESULT_TYPES.find(t => t.key === item.result_type)?.label ?? ''} {item.result_value}
                </Text>
              )}
              {item.notes && <Text style={styles.cardNotes}>{item.notes}</Text>}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="barbell-outline" size={40} color="#333" />
              <Text style={styles.emptyText}>아직 운동 기록이 없어요</Text>
              <Text style={styles.emptySub}>오늘의 WOD를 기록해보세요!</Text>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>운동 기록 추가</Text>

              <Text style={styles.label}>날짜</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#444"
              />

              <Text style={styles.label}>WOD 이름 (선택)</Text>
              <TextInput
                style={styles.input}
                value={wodName}
                onChangeText={setWodName}
                placeholder="예: Fran, 오늘의 WOD..."
                placeholderTextColor="#444"
              />

              <Text style={styles.label}>결과 유형</Text>
              <View style={styles.typeRow}>
                {RESULT_TYPES.map(t => (
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
                placeholder={placeholder}
                placeholderTextColor="#444"
              />

              <Text style={styles.label}>메모 (선택)</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={notes}
                onChangeText={setNotes}
                placeholder="스케일링, 컨디션 등..."
                placeholderTextColor="#444"
                multiline
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveBtnText}>저장</Text>
                }
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
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff', flex: 1 },
  photoBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1A1A1A', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#FF6B35',
  },
  addBtnText: { color: '#FF6B35', fontSize: 13, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  card: {
    backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, gap: 6,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardDate: { color: '#555', fontSize: 13, fontWeight: '600' },
  cardWod: { color: '#fff', fontSize: 15, fontWeight: '700', flex: 1 },
  cardResult: { color: '#FF6B35', fontSize: 22, fontWeight: '800' },
  cardNotes: { color: '#555', fontSize: 13 },
  emptyBox: { alignItems: 'center', marginTop: 100, gap: 10 },
  emptyText: { color: '#555', fontSize: 16, fontWeight: '600' },
  emptySub: { color: '#333', fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0D0D0D', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '90%',
  },
  sheetTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 20 },
  label: { color: '#555', fontSize: 13, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#1A1A1A', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#2A2A2A',
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#1A1A1A', alignItems: 'center',
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  typeBtnActive: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  typeBtnText: { color: '#555', fontSize: 13, fontWeight: '600' },
  typeBtnTextActive: { color: '#fff' },
  saveBtn: {
    marginTop: 24, backgroundColor: '#FF6B35',
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { color: '#555', fontSize: 15 },
});
