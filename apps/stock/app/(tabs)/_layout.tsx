import { useCurrentUser } from '@/api/useAuth';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs, usePathname, useRouter, Redirect } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

// 根据用户类型获取允许访问的路由
const getAllowedRoutes = (userType?: string) => {
  switch (userType) {
    //
    case 'admin':
      return [
        { name: 'index', title: '首页', icon: 'home' },
        { name: 'inventory-manager', title: '库存管理', icon: 'event-note' },
        { name: 'stock', title: '出入库', icon: 'assessment' },
        { name: 'user', title: '我的', icon: 'person' },
      ];
    case 'procurement':
      return [
        { name: 'index', title: '首页', icon: 'home' },
        { name: 'stock', title: '库存管理', icon: 'inventory' },
        { name: 'user', title: '我的', icon: 'person' },
      ];
    case 'inventory':
      return [
        { name: 'index', title: '首页', icon: 'home' },
        { name: 'inventory-manager', title: '库存管理', icon: 'event-note' },
        { name: 'stock', title: '出入库', icon: 'assessment' },
        { name: 'user', title: '我的', icon: 'person' },
      ];
    default:
      return [
        { name: 'ordinary-user', title: '首页', icon: 'home' },
        { name: 'user', title: '我的', icon: 'person' },
        { name: 'text', title: '测试', icon: 'test' },
      ];
  }
};

export default function Layout() {
  const { data, isLoading, error } = useCurrentUser();
  const userType = data?.user_type;
  const router = useRouter();
  const pathname = usePathname();

  // 路由拦截：检查用户是否有权限访问当前路由
  useEffect(() => {
    if (!isLoading && !error && userType) {
      const currentRoute = pathname.split('/').pop();
      const allowedRoutes = getAllowedRoutes(userType).map(route => route.name);

      // 如果当前路由不在允许列表中，重定向到首页
      if (currentRoute && !allowedRoutes.includes(currentRoute)) {
        console.log(`用户 ${userType} 无权访问 ${currentRoute}，重定向到首页`);
        router.replace('/(tabs)');
      }
    }
  }, [pathname, userType, isLoading, error, router]);

  // 如果加载中显示加载状态
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>加载用户信息中...</Text>
      </View>
    );
  }

  // 如果有错误显示错误信息
  if (error) {
    return <Redirect href="/(auth)/login" />;
  }

  // 获取当前用户的允许路由
  const allowedRoutes = getAllowedRoutes(userType);

  // 自定义Tab渲染函数
  const renderTabBar = ({ navigation }: { navigation: any }) => {
    return (
      <View style={styles.tabBar}>
        {allowedRoutes.map(route => {
          const isFocused = pathname.includes(route.name);
          const onPress = () => {
            navigation.navigate(route.name);
          };

          return (
            <Pressable
              key={route.name}
              onPress={onPress}
              style={[
                styles.tabItem,
                { flex: 1 / allowedRoutes.length }, // 平均分配宽度
              ]}
            >
              <MaterialIcons
                name={route.icon as any}
                size={24}
                color={isFocused ? '#007aff' : '#8e8e93'}
              />
              <Text style={[styles.tabLabel, { color: isFocused ? '#007aff' : '#8e8e93' }]}>
                {route.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  // 根据用户类型渲染不同的标签页
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={renderTabBar}
    >
      {allowedRoutes.map(route => (
        <Tabs.Screen key={route.name} name={route.name} options={{ title: route.title }} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    height: 60,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 2,
  },
});
