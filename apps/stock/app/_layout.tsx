import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';

// 阻止启动画面自动隐藏
SplashScreen.preventAutoHideAsync();

// 创建React Query客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

/**
 * ### 保护路由
 */

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // 确保字体加载完成再显示内容
  useEffect(() => {
    if (fontsLoaded || fontError) {
      // 字体加载完成或发生错误时，隐藏启动画面
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // 如果字体未加载完成，返回空视图
  if (!fontsLoaded && !fontError) {
    return <View />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <Slot />
      </PaperProvider>
    </QueryClientProvider>
  );
}
