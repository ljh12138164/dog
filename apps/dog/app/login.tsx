import { Stack, router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLogin } from '../http/useAuth';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';

// 定义登录表单验证架构
const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(1, '请输入密码'),
});

// 定义表单数据类型
type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const login = useLogin();
  const isLoading = login.isPending;

  // 使用react-hook-form
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (data: LoginFormData) => {
    login.mutate(
      { email: data.email, password: data.password }, // 使用email字段代替username字段
      {
        onSuccess: () => {
          // 登录成功后跳转到首页
          router.replace('/');
        },
        onError: () => {
          Toast.show({
            type: 'error',
            text1: '登录失败',
            text2: '邮箱或密码错误',
          });
        },
      }
    );
  };

  const goToRegister = () => {
    router.push('/register');
  };

  return (
    <>
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: '登录',
            headerShown: true,
          }}
        />

        <View style={styles.form}>
          <Text style={styles.title}>欢迎回来</Text>
          <Text style={styles.subtitle}>请登录您的账号</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>邮箱</Text>
            <Controller
              control={control}
              name='email'
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder='请输入邮箱'
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize='none'
                  keyboardType='email-address'
                />
              )}
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email.message}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>密码</Text>
            <Controller
              control={control}
              name='password'
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  placeholder='请输入密码'
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                />
              )}
            />
            {errors.password && (
              <Text style={styles.errorText}>{errors.password.message}</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color='#fff' />
            ) : (
              <Text style={styles.buttonText}>登录</Text>
            )}
          </TouchableOpacity>

          <View style={styles.switchContainer}>
            <Text>还没有账号？</Text>
            <TouchableOpacity onPress={goToRegister}>
              <Text style={styles.switchText}>立即注册</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <Toast />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
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
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  },
  button: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  switchText: {
    color: '#3498db',
    marginLeft: 5,
    fontWeight: 'bold',
  },
});
