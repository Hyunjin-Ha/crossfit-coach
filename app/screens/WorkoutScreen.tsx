import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function WorkoutScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="barbell-outline" size={48} color="#FF6B35" />
      <Text style={styles.title}>운동 기록</Text>
      <Text style={styles.sub}>곧 연결됩니다</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  sub: { fontSize: 14, color: '#555' },
});
