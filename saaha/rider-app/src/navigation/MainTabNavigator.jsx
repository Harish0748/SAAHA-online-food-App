import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS } from '../utils/theme';

import HomeScreen from '../screens/home/HomeScreen';
import EarningsScreen from '../screens/earnings/EarningsScreen';
import HistoryScreen from '../screens/history/HistoryScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: { borderTopColor: COLORS.border, height: 58, paddingBottom: 6, paddingTop: 6 },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen}
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Icon name="home" color={color} size={size} /> }} />
      <Tab.Screen name="Earnings" component={EarningsScreen}
        options={{ title: 'Earnings', tabBarIcon: ({ color, size }) => <Icon name="dollar-sign" color={color} size={size} /> }} />
      <Tab.Screen name="History" component={HistoryScreen}
        options={{ title: 'History', tabBarIcon: ({ color, size }) => <Icon name="list" color={color} size={size} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Icon name="user" color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}
