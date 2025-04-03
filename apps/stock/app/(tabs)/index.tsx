import { useCurrentUser } from '@/api/useAuth';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  // 使用自定义Hook获取当前用户信息
  const { data: user, isLoading } = useCurrentUser();

  // 加载中显示加载指示器
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007aff" />
        <Text style={{ marginTop: 10, color: '#666' }}>加载用户信息...</Text>
      </View>
    );
  }

  // 如果没有用户数据，跳转到登录页
  if (!user) {
    // 使用Effect处理导航，避免在渲染函数中直接调用
    useEffect(() => {
      router.replace('/(auth)/login');
    }, [router]);

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>正在跳转到登录页面...</Text>
      </View>
    );
  }

  // 确保user.username存在，避免尝试渲染undefined
  const username = user && typeof user === 'object' && 'username' in user ? user.username : '用户';

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 18 }}>欢迎，{username}</Text>
    </View>
  );
}
