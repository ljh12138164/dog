import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './useAuth';
import toast from 'react-hot-toast';

// 用户创建请求类型
export interface CreateUserRequest {
  username: string;
  email?: string;
  phone: string;
  password: string;
  confirm_password: string;
  user_type: 'admin' | 'inventory' | 'procurement' | 'employee' | 'logistics';
}

// 创建用户钩子
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserRequest) => {
      const response = await apiClient.post('/users/', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('用户创建成功');
      // 刷新用户列表
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      // 处理错误响应
      const errorMsg = error.response?.data?.detail || 
                       error.response?.data?.username || 
                       error.response?.data?.email || 
                       error.response?.data?.phone || 
                       error.response?.data?.password || 
                       '创建用户失败';
      
      toast.error(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
    },
  });
};

// 用户更新请求类型
export interface UpdateUserRequest {
  username?: string;
  email?: string;
  phone?: string;
  is_active?: boolean;
  user_type?: 'admin' | 'inventory' | 'procurement' | 'employee' | 'logistics';
}

// 更新用户钩子
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: number, data: UpdateUserRequest }) => {
      const response = await apiClient.patch(`/users/${userId}/`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('用户信息更新成功');
      // 刷新用户列表
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      // 处理错误响应
      const errorMsg = error.response?.data?.detail || 
                       error.response?.data?.username || 
                       error.response?.data?.email || 
                       error.response?.data?.phone || 
                       error.response?.data?.user_type || 
                       '更新用户失败';
      
      toast.error(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
    },
  });
};
