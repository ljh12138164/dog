import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

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
        name='mydos'
        options={{
          title: '我的小狗',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name='explore' size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='pets'
        options={{
          title: '添加小狗',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name='pets' size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='user'
        options={{
          title: '我的',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name='person' size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
