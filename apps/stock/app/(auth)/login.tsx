import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useCurrentUser, useLogin } from '../../api/useAuth';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Redirect, useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';

// 使用zod定义表单验证schema
const loginSchema = z.object({
  phone: z
    .string()
    .min(1, '手机号不能为空')
    .regex(/^1[3-9]\d{9}$/, '请输入正确的手机号格式'),
  password: z.string().min(1, '密码不能为空'),
});

// 从schema中提取类型
type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  // 检查是否从密码修改页面跳转而来
  const fromPasswordChange = params.fromPasswordChange === 'true';

  // 使用react-query的登录hook
  const { mutate: login, isPending } = useLogin(Toast);
  const { data: user, isLoading: userLoading, refetch } = useCurrentUser();

  // 如果是从密码修改跳转来的，需要显示提示消息
  useEffect(() => {
    if (fromPasswordChange) {
      Toast.show({
        type: 'success',
        text1: '密码已更新',
        text2: '请使用新密码登录',
        visibilityTime: 4000,
      });
    }
  }, [fromPasswordChange]);

  // 使用react-hook-form管理表单
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: '',
      password: '',
    },
  });

  // 提交表单
  const onSubmit = (data: LoginFormData) => {
    Keyboard.dismiss();
    login(data);
  };

  // 跳转到注册页面
  const goToRegister = () => {
    router.push('register' as any);
  };

  // 点击空白区域关闭键盘
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // 修改自动重定向逻辑，如果是从密码修改页面来的，不自动重定向
  if (userLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  // 只有在不是从密码修改页面跳转且用户已登录的情况下才自动重定向
  if (user && !fromPasswordChange) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    // 安卓端不使用KeyboardAvoidingView，直接用触摸关闭键盘
    Platform.OS === 'android' ? (
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={styles.container}>
          <StatusBar style="dark" />
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.formContainer}>
              <Text style={styles.title}>欢迎回来</Text>
              <Text style={styles.subtitle}>请登录您的账号</Text>

              {/* 手机号输入 */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>手机号</Text>
                <Controller
                  control={control}
                  name="phone"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, errors.phone && styles.inputError]}
                      placeholder="请输入您的手机号"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      keyboardType="phone-pad"
                      maxLength={11}
                    />
                  )}
                />
                {errors.phone && <Text style={styles.errorText}>{errors.phone.message}</Text>}
              </View>

              {/* 密码输入 */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>密码</Text>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, errors.password && styles.inputError]}
                      placeholder="请输入您的密码"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      secureTextEntry
                    />
                  )}
                />
                {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
              </View>

              {/* 登录按钮 */}
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleSubmit(onSubmit)}
                disabled={isPending}
              >
                {isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>登录</Text>
                )}
              </TouchableOpacity>

              {/* 注册链接 */}
              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>还没有账号？</Text>
                <TouchableOpacity onPress={goToRegister}>
                  <Text style={styles.registerLink}>立即注册</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
          <Toast />
        </View>
      </TouchableWithoutFeedback>
    ) : (
      // iOS保持原来的KeyboardAvoidingView
      <KeyboardAvoidingView style={styles.container} behavior="padding" keyboardVerticalOffset={64}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.formContainer}>
            <Text style={styles.title}>欢迎回来</Text>
            <Text style={styles.subtitle}>请登录您的账号</Text>

            {/* 手机号输入 */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>手机号</Text>
              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.phone && styles.inputError]}
                    placeholder="请输入您的手机号"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    keyboardType="phone-pad"
                    maxLength={11}
                  />
                )}
              />
              {errors.phone && <Text style={styles.errorText}>{errors.phone.message}</Text>}
            </View>

            {/* 密码输入 */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>密码</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.password && styles.inputError]}
                    placeholder="请输入您的密码"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    secureTextEntry
                  />
                )}
              />
              {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
            </View>

            {/* 登录按钮 */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleSubmit(onSubmit)}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>登录</Text>
              )}
            </TouchableOpacity>

            {/* 注册链接 */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>还没有账号？</Text>
              <TouchableOpacity onPress={goToRegister}>
                <Text style={styles.registerLink}>立即注册</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        <Toast />
      </KeyboardAvoidingView>
    )
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    marginTop: 5,
  },
  loginButton: {
    backgroundColor: '#007aff',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: '#666',
    fontSize: 16,
  },
  registerLink: {
    color: '#007aff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 5,
  },
});
