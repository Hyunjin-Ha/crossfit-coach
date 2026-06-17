import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View, ActivityIndicator, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ChatScreen from "./src/screens/ChatScreen";
import ProgramScreen from "./src/screens/ProgramScreen";
import AssessmentScreen from "./src/screens/AssessmentScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import { colors } from "./src/constants/colors";
import { FitnessProfile } from "./src/services/api";

const Tab = createBottomTabNavigator();

function MainTabs({ onReset }: { onReset: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: "AI 코치",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>💬</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Program"
        component={ProgramScreen}
        options={{
          title: "프로그램",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>📋</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        options={{
          title: "내 프로필",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>👤</Text>
          ),
        }}
      >
        {() => <ProfileScreen onReset={onReset} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [checked, setChecked] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("fitness_profile").then((val) => {
      setHasProfile(!!val);
      setChecked(true);
    });
  }, []);

  if (!checked) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!hasProfile) {
    return (
      <>
        <StatusBar style="light" />
        <AssessmentScreen
          onComplete={(_profile: FitnessProfile) => setHasProfile(true)}
        />
      </>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <MainTabs onReset={() => setHasProfile(false)} />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
  },
});
