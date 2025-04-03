import { Redirect, useSegments, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useCurrentUser } from '../api/useAuth';

function useProtectedRoute() {
  const segments = useSegments();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const { data, isLoading: isUserLoading } = useCurrentUser();

  useEffect(() => {
    // 如果用户数据仍在加载，不做任何事
    if (isUserLoading) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    // 确保导航操作符合当前认证状态
    if (!data && !inAuthGroup) {
      // 未登录且不在认证页面，跳转到登录页面
      router.replace('/(auth)/login');
      return;
    }

    if (data && inAuthGroup) {
      // 已登录且在认证页面，跳转到主页面
      return;
    }

    // 认证状态处理完成
    setIsLoading(false);
  }, [segments, router, isUserLoading, data]);

  return { isLoading, data };
}
// 使用声明式的Redirect组件，而不是命令式的导航
// 这避免了"Attempted to navigate before mounting the Root Layout component"错误
export default function Index() {
  // const { isLoading, data } = useProtectedRoute();
  // if (isLoading) return null;
  // if (!data) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(tabs)" />;
}
