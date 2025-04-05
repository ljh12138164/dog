import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { get, post } from './http';
import Constants from 'expo-constants';
import apiClient from './http';

// 定义类型
export interface LoginCredentials {
  phone: string;
  password: string;
}

export interface RegisterData {
  phone: string;
  email?: string;
  password: string;
  confirm_password: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user_id: number;
  user_type: string;
  user?: {
    id: number;
    username: string;
    email: string;
    phone?: string;
    avatar?: string;
    is_active: boolean;
    user_type: 'admin' | 'inventory' | 'procurement' | 'employee' | 'logistics';
    user_type_display: string;
    date_joined: string;
  };
}

// 辅助函数：将base64数据转换为Blob
const base64ToBlob = (base64Data: string, contentType: string): Blob => {
  // 提取actual base64字符串，去除"data:image/png;base64,"前缀
  const base64String = base64Data.split(',')[1];
  // 将base64字符串转换为二进制数据
  const byteCharacters = atob(base64String);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
};

// 上传头像的API请求
const uploadAvatarApi = async (fileUri: string): Promise<{ avatar: string }> => {
  try {
    // 获取访问令牌
    const token = await AsyncStorage.getItem('access_token');
    if (!token) {
      throw new Error('未登录或令牌已过期');
    }

    // 构建API URL
    const apiUrl = Constants.expoConfig?.extra?.apiUrl || 'http://127.0.0.1:8100/api';
    const url = `${apiUrl}/users/update_avatar/`;

    // 创建新的Promise包装XMLHttpRequest
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);

      // 设置请求头
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      // 监听上传完成事件
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error('响应解析失败: ' + xhr.responseText));
          }
        } else {
          reject(new Error('上传失败: ' + xhr.status + ' ' + xhr.responseText));
        }
      };

      // 监听错误事件
      xhr.onerror = () => {
        reject(new Error('网络错误'));
      };

      // 准备FormData
      const formData = new FormData();

      // 检查是否为base64数据格式
      if (fileUri.startsWith('data:image/')) {
        // 获取MIME类型
        const contentType = fileUri.split(';')[0].split(':')[1];

        try {
          // 将base64转换为Blob对象
          const blob = base64ToBlob(fileUri, contentType);

          // 添加文件到表单，使用实际的Blob对象
          const fileName = `avatar-${Date.now()}.${contentType.split('/')[1]}`;
          formData.append('avatar', blob, fileName);
        } catch (error) {
          console.error('转换base64为Blob失败', error);
          reject(error);
          return;
        }
      } else {
        // 处理常规文件URI
        const uriParts = fileUri.split('/');
        const fileName = uriParts[uriParts.length - 1];

        // 获取文件扩展名
        const fileExtParts = fileName.split('.');
        const fileExt = fileExtParts.length > 1 ? fileExtParts[fileExtParts.length - 1] : 'jpg';

        // 使用append方法，确保参数格式正确
        formData.append('avatar', {
          uri: fileUri,
          name: `avatar-${Date.now()}.${fileExt}`,
          type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        } as any);
      }

      // 发送请求
      xhr.send(formData);
    });
  } catch (error) {
    console.error('上传头像失败', error);
    throw error;
  }
};

// 登录API请求
const loginApi = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  return post<AuthResponse>('/login/', credentials);
};

// 注册API请求
const registerApi = async (data: RegisterData): Promise<AuthResponse> => {
  return post<AuthResponse>('/register/', data);
};

// 登出API请求
const logoutApi = async (): Promise<{ detail: string }> => {
  return post<{ detail: string }>('/logout/');
};

// 保存认证信息到本地存储
const saveAuthData = async (data: AuthResponse) => {
  await AsyncStorage.setItem('access_token', data.access);
  await AsyncStorage.setItem('refresh_token', data.refresh);
  await AsyncStorage.setItem('user_id', data.user_id.toString());
  await AsyncStorage.setItem('user_type', data.user_type);

  if (data.user) {
    await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
  }
};

// 清除认证信息
export const clearAuthData = async () => {
  await AsyncStorage.removeItem('access_token');
  await AsyncStorage.removeItem('refresh_token');
  await AsyncStorage.removeItem('user_id');
  await AsyncStorage.removeItem('user_type');
  await AsyncStorage.removeItem('user_data');
};

// 头像上传Hook
export const useUploadAvatar = (Toast: {
  show: (options: { type: string; text1: string; text2: string }) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileUri: string) => uploadAvatarApi(fileUri),
    onSuccess: data => {
      // 更新本地用户数据
      AsyncStorage.getItem('user_data').then(userDataStr => {
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          userData.avatar = data.avatar;
          AsyncStorage.setItem('user_data', JSON.stringify(userData));
        }
      });

      // 更新react-query缓存
      queryClient.invalidateQueries({ queryKey: ['user'] });

      // 显示成功提示
      Toast.show({
        type: 'success',
        text1: '头像更新成功',
        text2: '您的头像已更新',
      });
    },
    onError: (error: any) => {
      // 显示错误提示
      Toast.show({
        type: 'error',
        text1: '头像更新失败',
        text2: error.message || '请检查图片格式或网络连接',
      });
    },
  });
};

// 登录Hook
export const useLogin = (Toast: {
  show: (options: { type: string; text1: string; text2: string }) => void;
}) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: loginApi,
    onSuccess: async data => {
      // 保存认证数据
      await saveAuthData(data);

      // 更新react-query缓存
      queryClient.invalidateQueries({ queryKey: ['user'] });

      // 显示成功提示
      Toast.show({
        type: 'success',
        text1: '登录成功',
        text2: `欢迎回来`,
      });

      // 延迟导航，确保数据保存完成
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 1000);
    },
    onError: (error: any) => {
      // 显示错误提示
      Toast.show({
        type: 'error',
        text1: '登录失败',
        text2: error.response?.data?.detail || '手机号或密码错误',
      });
    },
  });
};

// 注册Hook
export const useRegister = (Toast: {
  show: (options: { type: string; text1: string; text2: string }) => void;
}) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: registerApi,
    onSuccess: async data => {
      // 保存认证数据
      await saveAuthData(data);

      // 更新react-query缓存
      queryClient.invalidateQueries({ queryKey: ['user'] });

      // 显示成功提示
      Toast.show({
        type: 'success',
        text1: '注册成功',
        text2: '账户已创建并登录',
      });
      // 延迟导航，确保数据保存完成
      router.replace('/(tabs)');
    },
    onError: (error: any) => {
      // 显示错误提示
      const errorMessage =
        error.response?.data?.phone ||
        error.response?.data?.email ||
        error.response?.data?.password ||
        '注册失败，请检查输入信息';

      Toast.show({
        type: 'error',
        text1: '注册失败',
        text2: Array.isArray(errorMessage) ? errorMessage[0] : errorMessage,
      });
    },
  });
};

// 登出Hook
export const logout = async (Toast: any) => {};

// 获取当前用户信息的函数
export const getCurrentUser = async () => {
  try {
    const userData = await AsyncStorage.getItem('user_data');
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  } catch (error) {
    return null;
  }
};

// 检查用户是否已登录
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    return !!token;
  } catch (error) {
    return false;
  }
};

// 获取当前用户信息API请求
const fetchCurrentUserApi = async (): Promise<AuthResponse['user']> => {
  try {
    // 确保返回有效的用户对象
    const userData = await get<AuthResponse['user']>('/users/me/');

    // 检查返回的user是否是有效对象
    if (!userData || typeof userData !== 'object') {
      throw new Error('Invalid user data returned from API');
    }

    // 确保包含所有必要的用户字段
    if (!('id' in userData) || !('username' in userData) || !('email' in userData)) {
      throw new Error('User data missing required fields');
    }

    return userData;
  } catch (error) {
    throw error;
  }
};

// 获取当前用户信息的Hook
export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['user'],
    queryFn: fetchCurrentUserApi,
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5分钟内不重新请求
    refetchOnWindowFocus: false,
  });
};

// 更新用户信息类型
export interface UpdateUserInfoRequest {
  username?: string;
  email?: string;
  phone?: string;
}

// 修改密码请求类型
export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

// 更新用户信息Hook
export const useUpdateUserInfo = (Toast: {
  show: (options: { type: string; text1: string; text2?: string }) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateUserInfoRequest) => {
      try {
        // 直接使用PATCH方法更新当前用户信息
        const updateResponse = await apiClient.patch('/users/me/', data);

        // 更新本地用户数据
        if (updateResponse.data) {
          // 获取当前用户数据
          const userDataStr = await AsyncStorage.getItem('user_data');
          if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            // 合并更新的数据
            const updatedUserData = { ...userData, ...updateResponse.data } as AuthResponse['user'];
            await AsyncStorage.setItem('user_data', JSON.stringify(updatedUserData));
          }
        }

        return updateResponse.data;
      } catch (error: any) {
        console.error('更新用户信息失败:', error);
        console.error('错误响应:', error.response?.data);
        console.error('错误状态:', error.response?.status);
        throw error;
      }
    },
    onSuccess: () => {
      // 刷新用户数据
      queryClient.invalidateQueries({ queryKey: ['user'] });

      Toast.show({
        type: 'success',
        text1: '更新成功',
        text2: '个人信息已更新',
      });
    },
    onError: (error: any) => {
      const errorMsg =
        error.response?.data?.detail ||
        error.response?.data?.username ||
        error.response?.data?.email ||
        error.response?.data?.phone ||
        '更新用户信息失败';

      Toast.show({
        type: 'error',
        text1: '更新失败',
        text2: typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg,
      });
    },
  });
};

// 修改密码Hook
export const useChangePassword = (Toast: {
  show: (options: { type: string; text1: string; text2?: string }) => void;
}) => {
  return useMutation({
    mutationFn: async (data: ChangePasswordRequest) => {
      try {
        const response = await apiClient.post('/users/change_password/', data);

        // 密码修改成功后，主动清除本地存储的token
        // 这样可以确保用户需要重新登录
        await clearAuthData();

        return response.data;
      } catch (error: any) {
        console.error('修改密码失败:', error);
        console.error('错误响应:', error.response?.data);
        console.error('错误状态:', error.response?.status);
        throw error;
      }
    },
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: '密码修改成功',
        text2: '请使用新密码登录',
      });
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.detail || '修改密码失败';

      Toast.show({
        type: 'error',
        text1: '修改失败',
        text2: typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg,
      });
    },
  });
};
