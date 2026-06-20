import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Image,
  Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDeviceId, wodStorage } from '../storage';
import { API_URL } from '../config';
const CHAT_KEY = 'chat_messages';

const WELCOME_MSG = {
  id: '0',
  role: 'assistant' as const,
  content: '안녕하세요! 크로스핏 AI 코치입니다 💪\n\nWOD 전략, 스케일링, 영양 등 뭐든지 물어보세요!\n\n처음이라면 벤치마크 측정을 먼저 해두면 무게 처방이 훨씬 정확해져요.',
};

type Message = { id: string; role: 'user' | 'assistant'; content: string };
type Mode = 'chat' | 'benchmark_intake';
type WodSession = {
  date: string;
  wod_name: string;
  result_type: string;
  result_value: string;
  notes: string;
};

const QUICK_PROMPTS = ['오늘 WOD 전략 알려줘', '스케일링 옵션은?', '운동 후 회복 방법', '단백질 섭취 조언'];

const RESULT_TYPES = [
  { key: 'time', label: '시간', placeholder: '예: 12:34' },
  { key: 'rounds', label: '라운드', placeholder: '예: 13+5' },
  { key: 'weight', label: '무게', placeholder: '예: 100kg' },
  { key: 'score', label: '점수', placeholder: '예: 250' },
];

function todayString() {
  return new Date().toISOString().split('T')[0];
}

function loadMessages(): Message[] {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [WELCOME_MSG];
}

function saveMessages(msgs: Message[]) {
  try {
    localStorage.setItem(CHAT_KEY, JSON.stringify(msgs));
  } catch {}
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [mode, setMode] = useState<Mode>('chat');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [benchmarkSaved, setBenchmarkSaved] = useState(false);
  const [pendingImages, setPendingImages] = useState<{ uri: string; base64: string; mediaType: string }[]>([]);
  const [serverStatus, setServerStatus] = useState<'checking' | 'ready' | 'slow'>('checking');
  const scrollRef = useRef<ScrollView>(null);
  const chatBackupRef = useRef<Message[]>([]);

  // WOD 저장 관련 상태
  const [extracting, setExtracting] = useState(false);
  const [saveModal, setSaveModal] = useState(false);
  const [sessions, setSessions] = useState<WodSession[]>([]);
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    if (mode === 'chat' && messages.length > 0) {
      try { localStorage.setItem(CHAT_KEY, JSON.stringify(messages)); } catch {}
    }
  }, [messages, mode]);

  useEffect(() => {
    const pingTimer = setTimeout(() => setServerStatus('slow'), 4000);
    fetch(`${API_URL}/`).then(() => {
      clearTimeout(pingTimer);
      setServerStatus('ready');
    }).catch(() => {
      clearTimeout(pingTimer);
      setServerStatus('ready');
    });

    getDeviceId().then(async id => {
      setDeviceId(id);
      try {
        const res = await fetch(`${API_URL}/profile/${id}`);
        const data = await res.json();
        if (data.profile?.benchmark && Object.keys(data.profile.benchmark).length > 0) {
          setBenchmarkSaved(true);
        }
      } catch {}
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  function startBenchmark() {
    chatBackupRef.current = messages;
    setMode('benchmark_intake');
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: '벤치마크 인테이크를 시작할게요! 현재 실력을 파악해서 앞으로 무게 처방을 정확하게 해드릴게요 💪',
    }]);
  }

  function resetChat() {
    const doneMsg: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: '벤치마크가 저장됐어요! 이제 WOD나 훈련 관련해서 뭐든지 물어보세요 💪',
    };
    const restored = [...chatBackupRef.current, doneMsg];
    setMode('chat');
    setMessages(restored);
    saveMessages(restored);
  }

  async function saveBenchmark(summary: string) {
    if (!deviceId || benchmarkSaved) return;
    try {
      await fetch(`${API_URL}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, summary }),
      });
      setBenchmarkSaved(true);
    } catch {}
  }

  function handleImageFile(e: any) {
    const files: File[] = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    const readers = files.map(file => new Promise<{ uri: string; base64: string; mediaType: string } | null>(resolve => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        resolve(match ? { uri: dataUrl, base64: match[2], mediaType: match[1] } : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    }));
    Promise.all(readers).then(results => {
      const valid = results.filter(Boolean) as { uri: string; base64: string; mediaType: string }[];
      if (valid.length > 0) setPendingImages(valid);
    });
  }

  function updateSession(index: number, field: keyof WodSession, value: string) {
    setSessions(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  }

  // 이미지 한 장 = 세션 한 개, 병렬 인식 후 카드 목록 표시
  function handleWodImageFile(e: any) {
    const files: File[] = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    setExtracting(true);
    const today = todayString();

    const readers = files.map(file => new Promise<{ image_base64: string; media_type: string } | null>(resolve => {
      const reader = new FileReader();
      reader.onload = () => {
        const match = (reader.result as string).match(/^data:([^;]+);base64,(.+)$/);
        resolve(match ? { image_base64: match[2], media_type: match[1] } : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    }));

    Promise.all(readers).then(async results => {
      const valid = results.filter(Boolean) as { image_base64: string; media_type: string }[];
      if (valid.length === 0) { setExtracting(false); return; }
      try {
        // 이미지마다 별도 API 호출 (병렬)
        const extracted = await Promise.all(valid.map(img =>
          fetch(`${API_URL}/workouts/from-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images: [img] }),
          }).then(r => r.json())
        ));
        const newSessions: WodSession[] = extracted.map(data => ({
          date: today,
          wod_name: data.wod_name ?? '',
          result_type: data.result_type ?? 'time',
          result_value: '',
          notes: [data.movements, data.notes].filter(Boolean).join('\n'),
        }));
        setSessions(newSessions);
        setSaveModal(true);
      } catch (err: any) {
        Alert.alert('오류', err?.message ?? 'WOD 인식에 실패했습니다');
      } finally {
        setExtracting(false);
      }
    });
  }

  async function handleSaveAll() {
    setSavingAll(true);
    try {
      await Promise.all(sessions.map(s =>
        fetch(`${API_URL}/workouts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: s.date,
            wod_name: s.wod_name.trim() || null,
            result_type: s.result_value.trim() ? s.result_type : null,
            result_value: s.result_value.trim() || null,
            notes: s.notes.trim() || null,
          }),
        })
      ));
      setSaveModal(false);
      Alert.alert('저장 완료', `${sessions.length}개 세션을 운동기록에 저장했습니다!`);
    } catch {
      Alert.alert('오류', '저장에 실패했습니다');
    } finally {
      setSavingAll(false);
    }
  }

  async function send(text?: string) {
    const content = text ?? input.trim();
    if ((!content && pendingImages.length === 0) || loading) return;

    const displayContent = content || `📷 사진 ${pendingImages.length}장을 보냈습니다`;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: displayContent };
    const assistantId = (Date.now() + 1).toString();
    const withNew = [...messages, userMsg, { id: assistantId, role: 'assistant' as const, content: '' }];

    const imagesToSend = pendingImages;
    setMessages(withNew);
    setInput('');
    setPendingImages([]);
    setLoading(true);

    try {
      const history = [...messages, { role: 'user', content: content || '이 WOD 분석해줘' }];
      const latestWod = wodStorage.load();
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          device_id: deviceId,
          mode,
          ...(latestWod ? { wod_context: latestWod } : {}),
          ...(imagesToSend.length > 0 ? { images: imagesToSend.map(i => ({ image_base64: i.base64, image_media_type: i.mediaType })) } : {}),
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`서버 오류 ${res.status}: ${errText.slice(0, 200)}`);
      }
      if (!res.body) throw new Error('no body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const snap = accumulated;
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: snap } : m));
      }

      if (mode === 'benchmark_intake' && accumulated.includes('[[BENCHMARK_COMPLETE]]')) {
        const clean = accumulated.replace('[[BENCHMARK_COMPLETE]]', '').trim();
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: clean } : m));
        await saveBenchmark(clean);
        setTimeout(resetChat, 3000);
      } else if (mode === 'chat') {
        const final = withNew.map(m => m.id === assistantId ? { ...m, content: accumulated } : m);
        saveMessages(final);
      }
    } catch (err: any) {
      const errMsg = err?.message ?? String(err) ?? '알 수 없는 오류';
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: `오류: ${errMsg}\nURL: ${API_URL}` } : m
      ));
    } finally {
      setLoading(false);
    }
  }


  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Ionicons name="fitness-outline" size={20} color="#FF6B35" />
        <Text style={styles.headerTitle}>
          {mode === 'benchmark_intake' ? '벤치마크 인테이크' : 'AI 코치'}
        </Text>
        <Text style={{ color: '#333', fontSize: 10 }}>v0620</Text>
        {mode === 'chat' ? (
          <TouchableOpacity style={styles.benchmarkBtn} onPress={startBenchmark}>
            <Text style={styles.benchmarkBtnText}>벤치마크</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.recordingDot} />
        )}
      </View>

      {serverStatus === 'slow' && (
        <View style={styles.pingBanner}>
          <ActivityIndicator size="small" color="#FF6B35" />
          <Text style={styles.pingText}>서버 시작 중... (첫 요청은 30초 걸릴 수 있어요)</Text>
        </View>
      )}

      <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent}>
        {messages.map(msg => (
          <View key={msg.id} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            {msg.role === 'assistant' && msg.content === '' ? (
              <ActivityIndicator size="small" color="#FF6B35" />
            ) : (
              <View>
                {msg.content.split('\n').map((line, i) => (
                  <Text key={i} style={[styles.bubbleText, msg.role === 'user' && styles.userText]}>
                    {line || ' '}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}
        {benchmarkSaved && mode === 'chat' && (
          <View style={styles.savedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
            <Text style={styles.savedBadgeText}>벤치마크 저장됨</Text>
          </View>
        )}
      </ScrollView>

      {mode === 'chat' && (
        <View style={styles.quickRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {QUICK_PROMPTS.map(q => (
              <TouchableOpacity key={q} style={styles.quickChip} onPress={() => send(q)}>
                <Text style={styles.quickChipText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {pendingImages.length > 0 && (
        <View style={styles.imagePreviewRow}>
          {pendingImages.map((img, i) => (
            <Image key={i} source={{ uri: img.uri }} style={styles.imagePreview} />
          ))}
          <TouchableOpacity onPress={() => setPendingImages([])} style={styles.imageRemoveBtn}>
            <Ionicons name="close-circle" size={20} color="#aaa" />
          </TouchableOpacity>
          <Text style={styles.imagePreviewLabel}>사진 {pendingImages.length}장 — 전송 시 분석</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        {mode === 'chat' && (
          <View style={styles.cameraBtn}>
            <Ionicons name="camera-outline" size={20} color="#888" />
            {React.createElement('input', {
              type: 'file', accept: 'image/*', multiple: true,
              onChange: handleImageFile,
              style: { position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' },
            })}
          </View>
        )}
        {mode === 'chat' && (
          <View style={styles.wodSaveBtn}>
            {extracting
              ? <ActivityIndicator size="small" color="#FF6B35" />
              : <Ionicons name="clipboard-outline" size={20} color="#FF6B35" />
            }
            {!extracting && React.createElement('input', {
              type: 'file', accept: 'image/*', multiple: true,
              onChange: handleWodImageFile,
              style: { position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' },
            })}
          </View>
        )}
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={mode === 'benchmark_intake' ? '측정값을 입력하세요...' : '메시지를 입력하세요...'}
          placeholderTextColor="#444"
          multiline
          onSubmitEditing={() => send()}
        />
        <TouchableOpacity
          style={[styles.sendBtn, ((!input.trim() && pendingImages.length === 0) || loading) && styles.sendBtnDisabled]}
          onPress={() => send()}
          disabled={(!input.trim() && pendingImages.length === 0) || loading}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* WOD 기록 저장 모달 — 세션 카드 목록 */}
      <Modal visible={saveModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>
                WOD 세션 {sessions.length}개 인식됨
              </Text>

              {sessions.map((s, idx) => (
                <View key={idx} style={styles.sessionCard}>
                  <Text style={styles.sessionLabel}>세션 {idx + 1}</Text>

                  <Text style={styles.label}>날짜</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={s.date}
                    onChangeText={v => updateSession(idx, 'date', v)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#444"
                  />

                  <Text style={styles.label}>WOD 이름 (선택)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={s.wod_name}
                    onChangeText={v => updateSession(idx, 'wod_name', v)}
                    placeholder="예: Fran, 오전 WOD..."
                    placeholderTextColor="#444"
                  />

                  <Text style={styles.label}>WOD 내용</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalInputMulti]}
                    value={s.notes}
                    onChangeText={v => updateSession(idx, 'notes', v)}
                    multiline
                    placeholderTextColor="#444"
                  />

                  <Text style={styles.label}>결과 유형</Text>
                  <View style={styles.typeRow}>
                    {RESULT_TYPES.map(t => (
                      <TouchableOpacity
                        key={t.key}
                        style={[styles.typeBtn, s.result_type === t.key && styles.typeBtnActive]}
                        onPress={() => updateSession(idx, 'result_type', t.key)}
                      >
                        <Text style={[styles.typeBtnText, s.result_type === t.key && styles.typeBtnTextActive]}>
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>내 결과 (선택)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={s.result_value}
                    onChangeText={v => updateSession(idx, 'result_value', v)}
                    placeholder={RESULT_TYPES.find(t => t.key === s.result_type)?.placeholder ?? ''}
                    placeholderTextColor="#444"
                  />
                </View>
              ))}

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAll} disabled={savingAll}>
                {savingAll
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveBtnText}>모두 저장 ({sessions.length}개)</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSaveModal(false)}>
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
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff', flex: 1 },
  benchmarkBtn: {
    backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#FF6B35',
  },
  benchmarkBtnText: { color: '#FF6B35', fontSize: 13, fontWeight: '600' },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6B35' },
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 10 },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  aiBubble: { backgroundColor: '#1A1A1A', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  userBubble: { backgroundColor: '#FF6B35', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15, color: '#ddd', lineHeight: 22 },
  userText: { color: '#fff' },
  savedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center',
    backgroundColor: '#0D2010', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#1A4020', marginTop: 8,
  },
  savedBadgeText: { color: '#4CAF50', fontSize: 13 },
  quickRow: { paddingHorizontal: 12, paddingVertical: 8 },
  quickChip: {
    backgroundColor: '#1A1A1A', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7, marginRight: 8,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  quickChipText: { fontSize: 13, color: '#aaa' },
  imagePreviewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: '#1A1A1A',
  },
  imagePreview: { width: 48, height: 48, borderRadius: 8 },
  imageRemoveBtn: { padding: 2 },
  imagePreviewLabel: { color: '#888', fontSize: 12, flex: 1 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 12, borderTopWidth: 1, borderTopColor: '#1A1A1A',
  },
  cameraBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  wodSaveBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#1A0A00', borderWidth: 1, borderColor: '#FF6B35',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  input: {
    flex: 1, backgroundColor: '#1A1A1A', borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, color: '#fff',
    fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: '#2A2A2A',
  },
  sendBtn: { backgroundColor: '#FF6B35', width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#333' },
  pingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#1A0A00', borderBottomWidth: 1, borderBottomColor: '#2A1A00',
  },
  pingText: { color: '#FF6B35', fontSize: 12, flex: 1 },
  // 모달
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0D0D0D', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '90%',
  },
  sheetTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 20 },
  label: { color: '#555', fontSize: 13, marginBottom: 6, marginTop: 14 },
  modalInput: {
    backgroundColor: '#1A1A1A', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#2A2A2A',
  },
  modalInputMulti: { minHeight: 100, textAlignVertical: 'top' },
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
  sessionCard: {
    borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 16,
    padding: 16, marginBottom: 16,
  },
  sessionLabel: { color: '#FF6B35', fontSize: 13, fontWeight: '700', marginBottom: 4 },
});
