import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const today = new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>안녕하세요 👋</Text>
        <Text style={styles.date}>{today}</Text>
      </View>

      <View style={styles.wodCard}>
        <View style={styles.wodHeader}>
          <Ionicons name="barbell-outline" size={20} color="#FF6B35" />
          <Text style={styles.wodTitle}>오늘의 WOD</Text>
        </View>
        <Text style={styles.wodEmpty}>아직 등록된 WOD가 없어요</Text>
        <TouchableOpacity style={styles.uploadButton}>
          <Ionicons name="camera-outline" size={16} color="#fff" />
          <Text style={styles.uploadButtonText}>프로그램 사진 업로드</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>이번 주 운동</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>총 운동 횟수</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>연속 출석</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.chatCard}>
        <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FF6B35" />
        <View style={styles.chatCardText}>
          <Text style={styles.chatCardTitle}>AI 코치에게 물어보기</Text>
          <Text style={styles.chatCardSub}>스케일링, 자세, 영양 등 뭐든지</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  content: { padding: 20, paddingTop: 60 },
  header: { marginBottom: 24 },
  greeting: { fontSize: 26, fontWeight: '700', color: '#fff', marginBottom: 4 },
  date: { fontSize: 14, color: '#888' },
  wodCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  wodHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  wodTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  wodEmpty: { fontSize: 14, color: '#555', marginBottom: 16 },
  uploadButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  uploadButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  statNumber: { fontSize: 24, fontWeight: '700', color: '#FF6B35' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 4, textAlign: 'center' },
  chatCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  chatCardText: { flex: 1 },
  chatCardTitle: { fontSize: 15, fontWeight: '600', color: '#fff' },
  chatCardSub: { fontSize: 12, color: '#666', marginTop: 2 },
});
