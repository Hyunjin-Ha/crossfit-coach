import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Modal, TextInput, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
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
  const [editingId, setEditingId] = useState<string | null>(null);

  const [date, setDate] = useState(todayString());
  const [wodName, setWodName] = useState('');
  const [resultType, setResultType] = useState('time');
  const [resultValue, setResultValue] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStatus, setAnalyzeStatus] = useState<string | null>(null);

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

  function openNew() {
    setEditingId(null);
    setDate(todayString());
    setWodName('');
    setResultType('time');
    setResultValue('');
    setNotes('');
    setModalVisible(true);
  }

  function openEdit(log: WorkoutLog) {
    setEditingId(log.id);
    setDate(log.date);
    setWodName(log.wod_name ?? '');
    setResultType(log.result_type ?? 'time');
    setResultValue(log.result_value ?? '');
    setNotes(log.notes ?? '');
    setModalVisible(true);
  }

  async function handleFileChange(e: any) {
    const files: File[] = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    setAnalyzing(true);
    setAnalyzeStatus('사진 분석 중...');
    try {
      const images = await Promise.all(files.map(file => new Promise<{ image_base64: string; media_type: string } | null>(resolve => {
        const reader = new FileReader();
        reader.onload = () => {
          const match = (reader.result as string).match(/^data:([^;]+);base64,(.+)$/);
          resolve(match ? { image_base64: match[2], media_type: match[1] } : null);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      })));
      const valid = images.filter(Boolean) as { image_base64: string; media_type: string }[];
      if (valid.length === 0) { setAnalyzeStatus('이미지를 읽을 수 없습니다'); return; }

      setAnalyzeStatus(`사진 ${valid.length}장 분석 중...`);
      const res = await fetch(`${API_URL}/workouts/from-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: valid }),
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { setAnalyzeStatus(`서버 응답 오류: ${text.slice(0, 100)}`); return; }

      if (data.error) { setAnalyzeStatus(`인식 실패: ${data.error}`); return; }

      wodStorage.save([data.movements, data.notes].filter(Boolean).join('\n'));
      setAnalyzeStatus(null);
      setEditingId(null);
      setDate(todayString());
      setWodName(data.wod_name ?? '');
      setResultType(data.result_type ?? 'time');
      setResultValue('');
      setNotes(data.movements ?? '');
      setModalVisible(true);
    } catch (err: any) {
      setAnalyzeStatus(`오류: ${err?.message ?? '알 수 없는 오류'}`);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSave() {
    if (!date) return;
    setSaving(true);
    try {
      const body = JSON.stringify({
        date,
        wod_name: wodName.trim() || null,
        result_type: resultValue.trim() ? resultType : null,
        result_value: resultValue.trim() || null,
        notes: notes.trim() || null,
      });

      if (editingId) {
        const res = await fetch(`${API_URL}/workouts/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
        const updated = await res.json();
        setLogs(prev => prev.map(l => l.id === editingId ? updated : l));
      } else {
        const res = await fetch(`${API_URL}/workouts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
        const newLog = await res.json();
        setLogs(prev => [newLog, ...prev]);
      }
      setModalVisible(false);
    } catch {
      Alert.alert('오류', '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(id: string) {
    if (!window.confirm('이 기록을 삭제할까요?')) return;
    try {
      await fetch(`${API_URL}/workouts/${id}`, { method: 'DELETE' });
      setLogs(prev => prev.filter(l => l.id !== id));
    } catch {
      window.alert('삭제에 실패했습니다');
    }
  }

  const placeholder = RESULT_TYPES.find(t => t.key === resultType)?.placeholder ?? '';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="barbell-outline" size={20} color="#FF6B35" />
        <Text style={styles.headerTitle}>운동 기록</Text>
        <View style={styles.photoBtn}>
          {analyzing
            ? <ActivityIndicator size="small" color="#FF6B35" />
            : <Ionicons name="camera-outline" size={20} color="#FF6B35" />
          }
          {!analyzing && React.createElement('input', {
            type: 'file', accept: 'image/*', multiple: true,
            onChange: handleFileChange,
            style: { position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' },
          })}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Ionicons name="add" size={20} color="#FF6B35" />
          <Text style={styles.addBtnText}>기록 추가</Text>
        </TouchableOpacity>
      </View>

      {analyzeStatus ? (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>{analyzeStatus}</Text>
          {!analyzing && (
            <TouchableOpacity onPress={() => setAnalyzeStatus(null)}>
              <Ionicons name="close" size={16} color="#aaa" />
            </TouchableOpacity>
          )}
        </View>
      ) : null}

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
              <TouchableOpacity style={styles.cardBody} onPress={() => openEdit(item)} activeOpacity={0.7}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
                  {item.wod_name && <Text style={styles.cardWod}>{item.wod_name}</Text>}
                </View>
                {item.result_value && (
                  <Text style={styles.cardResult}>
                    {RESULT_TYPES.find(t => t.key === item.result_type)?.label ?? ''} {item.result_value}
                  </Text>
                )}
                {item.notes && <Text style={styles.cardNotes} numberOfLines={2}>{item.notes}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.trashBtn} onPress={() => confirmDelete(item.id)}>
                <Ionicons name="trash-outline" size={16} color="#555" />
              </TouchableOpacity>
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
              <Text style={styles.sheetTitle}>{editingId ? '기록 수정' : '운동 기록 추가'}</Text>

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
                  : <Text style={styles.saveBtnText}>{editingId ? '수정 완료' : '저장'}</Text>
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
  statusBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#1A1A1A', borderBottomWidth: 1, borderBottomColor: '#2A2A2A',
  },
  statusText: { color: '#aaa', fontSize: 13, flex: 1 },
  photoBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
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
    backgroundColor: '#1A1A1A', borderRadius: 16,
    flexDirection: 'row', alignItems: 'flex-start',
  },
  cardBody: { flex: 1, padding: 16, gap: 6 },
  trashBtn: { width: 48, alignItems: 'center', justifyContent: 'center' },
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
