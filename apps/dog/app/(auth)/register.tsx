import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, router } from 'expo-router';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { z } from 'zod';
import { useRegister } from '@/http/useAuth';

// 定义表单验证架构
const registerSchema = z
  .object({
    username: z.string().min(3, '用户名至少需要3个字符'),
    email: z.string().email('请输入有效的邮箱地址'),
    password: z.string().min(6, '密码至少需要6个字符'),
    password2: z.string(),
  })
  .refine((data) => data.password === data.password2, {
    message: '两次输入的密码不一致',
    path: ['password2'],
  });

// 定义表单数据类型
type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const register = useRegister();
  const isLoading = register.isPending;

  // 使用react-hook-form
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      password2: '',
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    register.mutate(data, {
      onSuccess: () => {
        console.log('注册成功');
        router.replace('/');
      },
      onError: (error) => {
        Toast.show({
          type: 'error',
          text1: '注册失败',
          text2: error.message || '请检查您的注册信息',
        });
      },
    });
  };

  const goToLogin = () => {
    router.push('/login');
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <Stack.Screen
          options={{
            title: '注册',
            headerShown: true,
          }}
        />

        <View style={styles.form}>
          <Text style={styles.title}>创建新账号</Text>
          <Text style={styles.subtitle}>请填写以下信息完成注册</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              用户名<Text style={styles.required}>*</Text>
            </Text>
            <Controller
              control={control}
              name='username'
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.username && styles.inputError]}
                  placeholder='请输入用户名'
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize='none'
                />
              )}
            />
            {errors.username && (
              <Text style={styles.errorText}>{errors.username.message}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              邮箱<Text style={styles.required}>*</Text>
            </Text>
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
            <Text style={styles.label}>
              密码<Text style={styles.required}>*</Text>
            </Text>
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

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              确认密码<Text style={styles.required}>*</Text>
            </Text>
            <Controller
              control={control}
              name='password2'
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.password2 && styles.inputError]}
                  placeholder='请再次输入密码'
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                />
              )}
            />
            {errors.password2 && (
              <Text style={styles.errorText}>{errors.password2.message}</Text>
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
              <Text style={styles.buttonText}>注册</Text>
            )}
          </TouchableOpacity>

          <View style={styles.switchContainer}>
            <Text>已有账号？</Text>
            <TouchableOpacity onPress={goToLogin}>
              <Text style={styles.switchText}>去登录</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
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
  required: {
    color: 'red',
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
