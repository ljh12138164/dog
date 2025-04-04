import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// API基础URL
const API_URL = 'http://localhost:8100/api';

interface UserListResponse {
  id: number;
  username: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  is_active: boolean;
  user_type: string;
  user_type_display: string;
  date_joined: string;
}

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加请求拦截器处理token
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      // 确保token格式正确，使用Bearer认证方案
      config.headers.Authorization = `Bearer ${token.trim()}`;
      // 调试日志，查看是否正确添加了token
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// 添加响应拦截器处理错误
apiClient.interceptors.response.use(
  response => response,
  async error => {
    // 获取原始请求
    const originalRequest = error.config;

    // 如果是401错误且没有标记为重试过
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // 获取请求URL
      const requestUrl = originalRequest.url;

      // 如果不是访问token刷新接口且有刷新token
      if (!requestUrl.includes('/token/refresh/') && localStorage.getItem('refresh_token')) {
        try {
          // 尝试刷新token
          const refreshToken = localStorage.getItem('refresh_token');
          const response = await axios.post(`${API_URL}/token/refresh/`, {
            refresh: refreshToken,
          });

          // 如果刷新成功
          if (response.data.token) {
            // 保存新token
            localStorage.setItem('token', response.data.token);

            // 修改原请求的Authorization头
            originalRequest.headers.Authorization = `Bearer ${response.data.token}`;

            // 重试原请求
            return axios(originalRequest);
          }
        } catch (refreshError) {
          console.error('刷新token失败，需要重新登录', refreshError);

          // 如果不是用户列表相关接口，则执行默认的401处理
          if (!requestUrl || !requestUrl.includes('/users/')) {
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
        }
      } else {
        // 如果不是用户列表相关接口，则执行默认的401处理
        if (!requestUrl || !requestUrl.includes('/users/')) {
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

// 用户类型定义
export interface User {
  id: number;
  username: string;
  email: string;
  phone: string;
  avatar?: string;
  is_active: boolean;
  user_type: 'admin' | 'inventory' | 'procurement' | 'employee' | 'logistics';
  permissions: string[];
}
// ('admin', '系统管理员'),
// ('inventory', '库存管理员'),
// ('procurement', '采购经理'),
// ('logistics', '物流管理员'),
// ('employee', '普通员工'),
// 登录请求类型
export interface LoginRequest {
  phone: string;
  password: string;
}

// 登录响应类型
export interface LoginResponse {
  access?: string;
  refresh?: string;
  token?: string;
  refresh_token?: string;
  user: User;
}

// 注册请求类型
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
}

// 登录钩子
export const useLogin = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: LoginRequest) => {
      const response = await apiClient.post<LoginResponse>('/login/', data);
      return response.data;
    },
    onSuccess: data => {
      // 修正字段名：使用access而不是token，refresh而不是refresh_token
      const token = data.access ? data.access.trim() : data.token?.trim();
      const refreshToken = data.refresh ? data.refresh.trim() : data.refresh_token?.trim();

      localStorage.setItem('token', token!);
      localStorage.setItem('refresh_token', refreshToken!);
      localStorage.setItem('user', JSON.stringify(data.user));

      queryClient.setQueryData(['user'], data.user);
      toast.success('登录成功');
      navigate('/dashboard');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '登录失败，请检查用户名和密码');
    },
  });
};

// 注册钩子
export const useRegister = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      const response = await apiClient.post('/register/', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('注册成功，请登录');
      navigate('/login');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '注册失败，请检查输入信息');
    },
  });
};

// 获取当前用户信息钩子
export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await apiClient.get<User>('/users/me/');
      return response.data;
    },
    // initialData: () => {
    //   const userStr = localStorage.getItem('user');
    //   if (userStr) {
    //     try {
    //       return JSON.parse(userStr) as User;
    //     } catch {
    //       return undefined;
    //     }
    //   }
    //   return undefined;
    // },
    // enabled: !!localStorage.getItem('token'),
  });
};

// 登出钩子
export const useLogout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      return await apiClient.post('/logout/');
    },
    onSuccess: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      queryClient.clear();
      toast.success('已退出登录');
      navigate('/login');
    },
    onError: () => {
      // 即使API调用失败，我们仍然清除本地状态
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      queryClient.clear();
      navigate('/login');
    },
  });
};

// 刷新token钩子
export const useRefreshToken = () => {
  return useMutation({
    mutationFn: async () => {
      const refresh_token = localStorage.getItem('refresh_token');
      if (!refresh_token) {
        throw new Error('No refresh token found');
      }
      const response = await apiClient.post<{ token: string }>('/token/refresh/', {
        refresh: refresh_token,
      });
      return response.data;
    },
    onSuccess: data => {
      localStorage.setItem('token', data.token);
    },
  });
};

// 获取用户列表钩子
export const useUsers = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<UserListResponse[]>('/users/');
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          // 如果是401未授权错误，清除用户状态并重定向到登录页
          if (error.response?.status === 401) {
            console.error('获取用户列表失败: 未授权访问');
            // 清除用户状态
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            queryClient.clear();
            // 使用导航而不是直接修改window.location
          }
          // 对于其他错误，记录但不重定向
          else {
            console.error('获取用户列表失败:', error.response?.data || error.message);
          }
        } else {
          console.error('获取用户列表失败:', error);
        }
        return { results: [], count: 0 }; // 返回默认空数据
      }
    },
    retry: 1,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
};

// 获取角色列表钩子
export const useRoles = () => {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/roles/');
        return response.data;
      } catch (error) {
        // 如果不是401错误(这个错误已经由拦截器处理)，则抛出以便React Query处理
        if (axios.isAxiosError(error) && error.response?.status !== 401) {
          throw error;
        }
        return { results: [], count: 0 }; // 返回默认空数据而不是抛出错误
      }
    },
    retry: 1, // 失败时最多重试1次
    staleTime: 60000, // 数据60秒内不会被视为过时
    refetchOnWindowFocus: false, // 窗口获得焦点时不重新获取数据
  });
};

// 获取权限列表钩子
export const usePermissions = () => {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const response = await apiClient.get('/permissions/');
      return response.data;
    },
  });
};

export default apiClient;
