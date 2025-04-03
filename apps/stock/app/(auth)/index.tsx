import { Redirect } from 'expo-router';

export default function AuthIndex() {
  // 重定向到登录页面
  return <Redirect href="/(auth)/login" />;
}
