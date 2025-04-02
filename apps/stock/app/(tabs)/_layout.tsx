import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
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
            <MaterialIcons name="warehouse" size={size} color={color} />)
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
