import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { post, get, uploadFile } from './lib';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

// 类型定义
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  date_joined: string;
  last_login: string;
  is_active: boolean;
  avatar: string | null;
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

export interface AvatarResponse {
  message: string;
  user: User;
}

export interface LoginCredentials {
  email: string;  // 已修改为使用email字段
  password: string;
}

export interface RegisterCredentials {
  username?: string;  // 可选的用户名
  email: string;
  password: string;
  password2: string;
}

// 保存用户信息到本地存储
const saveUserToLocalStorage = async (userData: User) => {
  try {
    await AsyncStorage.setItem('user', JSON.stringify(userData));
  } catch (error) {
    console.error('保存用户信息失败:', error);
  }
};

// 保存token到本地存储
export const saveTokenToStorage = async (token: string) => {
  try {
    await AsyncStorage.setItem('auth_token', token);
  } catch (error) {
    console.error('保存token失败:', error);
  }
};

// 从本地存储获取用户信息
export const getUserFromLocalStorage = async (): Promise<User | null> => {
  try {
    const userStr = await AsyncStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
  } catch  {
  }
  return null;
};

// 从本地存储获取token
export const getTokenFromStorage = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('auth_token');
  } catch (error) {
    console.error('获取token失败:', error);
    return null;
  }
};

// 登录hook
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation<AuthResponse, Error, LoginCredentials>({
    mutationFn: (credentials: LoginCredentials) => post<AuthResponse>('/login/', credentials),
    onSuccess: async (data) => {
      // 保存用户信息到本地存储
      await saveUserToLocalStorage(data.user);
      
      // 保存token
      await saveTokenToStorage(data.token);
      
      // 使用React Query的缓存更新用户信息
      queryClient.setQueryData(['user'], data.user);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['isAuthenticated'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
    onError: (error) => {
      Toast.show({
        type: 'error',
        text1: '登录失败',
        text2: error.message
      });
    },
  });
};

// 注册hook
export const useRegister = () => {
  const queryClient = useQueryClient();
  
  return useMutation<AuthResponse, Error, RegisterCredentials>({
    mutationFn: (credentials: RegisterCredentials) => post<AuthResponse>('/register/', credentials),
    onSuccess: async (data) => {
      // 保存用户信息和token
      await saveUserToLocalStorage(data.user);
      await saveTokenToStorage(data.token);
      
      // 更新缓存
      queryClient.setQueryData(['user'], data.user);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['isAuthenticated'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
    onError: (error) => {
      Toast.show({
        type: 'error',
        text1: '注册失败',
        text2: error.message
      });
    },
  });
};

// 获取用户信息hook
export const useUser = (userId: number) => {
  return useQuery<User, Error>({
    queryKey: ['user', userId],
    queryFn: () => get<User>(`/user/${userId}/`),
    // 当userId为undefined或0时不执行查询
    enabled: !!userId,
  });
};

// 获取当前登录用户信息hook
export const useCurrentUser = () => {
  const queryClient = useQueryClient();
  
  return useQuery<User | null, Error>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        // 首先检查是否有token
        const token = await getTokenFromStorage();
        if (!token) {
          return null;
        }
        
        // 从服务器获取最新的用户信息
        const userData = await get<User>('/me/');
        
        // 更新本地存储中的用户信息
        await saveUserToLocalStorage(userData);
        
        // 如果成功获取，将数据缓存到其他相关查询中
        queryClient.setQueryData(['user', userData.id], userData);
        
        return userData;
      } catch (error) {
        console.error('获取当前用户信息失败:', error);
        
        // 如果API请求失败，尝试从本地存储获取
        const localUser = await getUserFromLocalStorage();
        return localUser;
      }
    },
    staleTime: 1000 * 60 * 5, // 5分钟内不重新获取
    retry: 1, // 如果失败，最多重试1次
  });
};

// 上传头像hook
export const useUploadAvatar = () => {
  const queryClient = useQueryClient();
  
  return useMutation<AvatarResponse, Error, { uri: string, type: string, name: string }>({
    mutationFn: async (file) => {
      // 创建FormData对象
      const formData = new FormData();
      formData.append('avatar', {
        uri: file.uri,
        type: file.type,
        name: file.name,
      } as any);
      
      // 上传文件
      return await uploadFile<AvatarResponse>('/users/upload-avatar/', formData);
    },
    onSuccess: async (data) => {
      // 保存更新后的用户信息到本地存储
      await saveUserToLocalStorage(data.user);
      
      // 更新缓存
      queryClient.setQueryData(['currentUser'], data.user);
      queryClient.setQueryData(['user', data.user.id], data.user);
      
      // 显示成功提示
      Toast.show({
        type: 'success',
        text1: '成功',
        text2: '头像更新成功'
      });
    },
    onError: (error) => {
      Toast.show({
        type: 'error',
        text1: '上传失败',
        text2: error.message || '头像上传失败，请重试'
      });
    },
  });
};

// 退出登录hook
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // 清除本地存储中的用户信息
      try {
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('auth_token');
      } catch (error) {
        console.error('清除用户信息失败:', error);
      }
      return Promise.resolve();
    },
    onSuccess: () => {
      // 清除React Query缓存中的用户信息
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.setQueryData(['user'], null);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.setQueryData(['currentUser'], null);
      queryClient.invalidateQueries({ queryKey: ['isAuthenticated'] });
      queryClient.setQueryData(['isAuthenticated'], false);
    },
  });
};

// 检查用户是否已登录
export const useIsAuthenticated = () => {
  return useQuery<boolean, Error>({
    queryKey: ['isAuthenticated'],
    queryFn: async () => {
      try {
        const token = await getTokenFromStorage();
        return !!token; // 只要有token就认为已登录
      } catch (error) {
        console.error('验证登录状态失败:', error);
        return false;
      }
    },
    // 添加初始数据，避免首次渲染出现undefined
    initialData: false
  });
};
