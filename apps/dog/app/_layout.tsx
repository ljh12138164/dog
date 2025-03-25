import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import Toast from 'react-native-toast-message';
// import Toast from 'react-native-toast-message';

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

// 身份验证提供者
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();

  // 检查用户是否已登录
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        setIsAuthenticated(!!token);
      } catch (error) {
        console.error('检查认证状态失败:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  // 处理路由保护
  useEffect(() => {
    if (isAuthenticated === null) {
      // 等待认证状态加载完成
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inProtectedGroup = !inAuthGroup && segments[0] !== undefined;

    if (isAuthenticated && inAuthGroup) {
      // 已登录但在认证页面，重定向到主页
      router.replace('/(tabs)');
    } else if (!isAuthenticated && inProtectedGroup) {
      // 未登录但访问受保护页面，重定向到登录页
      router.replace('/login');
    }
  }, [isAuthenticated, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // 字体加载完成或发生错误时，隐藏启动画面
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // 等待字体加载
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
            <Stack.Screen name='login' options={{ headerShown: false }} />
            <Stack.Screen name='register' options={{ headerShown: false }} />
            <Stack.Screen name='+not-found' options={{ title: 'Not Found' }} />
            <Stack.Screen name='index' options={{ headerShown: false }} />
          </Stack>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
