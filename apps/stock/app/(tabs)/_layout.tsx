import { Colors } from '@/constants/Colors';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, useColorScheme } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarStyle: Platform.select({
          ios: {
            // 在iOS上使用半透明背景
            position: 'absolute',
          },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          title: '首页',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name='home' size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='stock'
        options={{
          title: '仓库',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name='store' size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='user'
        options={{
          title: '我的',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name='people' size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
