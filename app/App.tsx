import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import WorkoutScreen from './screens/WorkoutScreen';
import DietScreen from './screens/DietScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#1A1A1A',
            borderTopColor: '#2A2A2A',
            height: 60,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: '#FF6B35',
          tabBarInactiveTintColor: '#555',
          tabBarIcon: ({ color, size }) => {
            const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
              홈: 'home-outline',
              '운동 기록': 'barbell-outline',
              'AI 코치': 'chatbubble-ellipses-outline',
              식단: 'nutrition-outline',
            };
            return <Ionicons name={icons[route.name]} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="홈" component={HomeScreen} />
        <Tab.Screen name="운동 기록" component={WorkoutScreen} />
        <Tab.Screen name="AI 코치" component={ChatScreen} />
        <Tab.Screen name="식단" component={DietScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
