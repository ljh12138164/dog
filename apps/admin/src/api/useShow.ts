import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from './useAuth';

// 食材类型定义
export interface Ingredient {
  id?: number;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  expiry_date: string;
  status: 'normal' | 'expired' | 'low' | 'pending_check';
  location: string;
  last_check_date?: string;
  created_at?: string;
  updated_at?: string;
}

// 获取所有食材
export const useIngredients = () => {
  return useQuery({
    queryKey: ['ingredients'],
    queryFn: async () => {
      const response = await apiClient.get<Ingredient[]>('/ingredients/');
      return response.data;
    },
  });
};

// 获取单个食材详情
export const useIngredient = (id: number) => {
  return useQuery({
    queryKey: ['ingredient', id],
    queryFn: async () => {
      const response = await apiClient.get<Ingredient>(`/ingredients/${id}/`);
      return response.data;
    },
    enabled: !!id, // 只有当id存在时才发送请求
  });
};

// 添加食材
export const useAddIngredient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ingredient: Ingredient) => {
      const response = await apiClient.post<Ingredient>('/ingredients/', ingredient);
      return response.data;
    },
    onSuccess: () => {
      // 成功后刷新食材列表
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });
};

// 更新食材
export const useUpdateIngredient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ingredient: Ingredient) => {
      const response = await apiClient.put<Ingredient>(
        `/ingredients/${ingredient.id}/`,
        ingredient,
      );
      return response.data;
    },
    onSuccess: data => {
      // 成功后刷新食材列表和当前食材详情
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['ingredient', data.id] });

      // 确保获取最新数据
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      }, 500); // 延迟500ms再次刷新
    },
  });
};

// 删除食材
export const useDeleteIngredient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/ingredients/${id}/`);
      return id;
    },
    onSuccess: () => {
      // 成功后刷新食材列表
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });
};

// 获取即将过期的食材
export const useExpiringIngredients = (days = 7) => {
  return useQuery({
    queryKey: ['ingredients', 'expiring', days],
    queryFn: async () => {
      const response = await apiClient.get<Ingredient[]>(
        `/ingredients/expiring_soon/?days=${days}`,
      );
      return response.data;
    },
  });
};

// 获取已过期的食材
export const useExpiredIngredients = () => {
  return useQuery({
    queryKey: ['ingredients', 'expired'],
    queryFn: async () => {
      const response = await apiClient.get<Ingredient[]>('/ingredients/expired/');
      return response.data;
    },
  });
};

// 获取库存不足的食材
export const useLowStockIngredients = () => {
  return useQuery({
    queryKey: ['ingredients', 'low_stock'],
    queryFn: async () => {
      const response = await apiClient.get<Ingredient[]>('/ingredients/low_stock/');
      return response.data;
    },
  });
};

// 导入CSV
export const useImportCSV = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/ingredients/import_csv/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      // 成功后刷新食材列表
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });
};
