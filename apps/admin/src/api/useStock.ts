import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './useAuth';
import toast from 'react-hot-toast';

// 食材类型
export interface Ingredient {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  location?: string;
  expiry_date?: string;
  last_check_date?: string;
  status: 'normal' | 'expired' | 'low' | 'pending_check';
  created_at: string;
  updated_at: string;
}

// 库存操作类型
export interface InventoryOperation {
  id?: number;
  ingredient: number;
  ingredient_name?: string;
  operation_type: 'in' | 'out';
  quantity: number;
  production_date?: string;
  expiry_period?: string;
  operator?: number;
  operator_name?: string;
  inspector?: number;
  inspector_name?: string;
  notes?: string;
  created_at?: string;
}

// 出库申请项目类型
export interface MaterialRequestItem {
  id?: number;
  request_id?: number;
  ingredient: number;
  ingredient_name?: string;
  quantity: number;
  unit?: string;
  notes?: string;
}

// 出库申请状态类型
export type MaterialRequestStatus =
  | 'pending'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'rejected';

// 出库申请类型
export interface MaterialRequest {
  id?: number;
  title: string;
  description?: string;
  status: MaterialRequestStatus;
  requested_by?: number;
  requested_by_name?: string;
  requested_at?: string;
  approved_by?: number;
  approved_by_name?: string;
  approved_at?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  assigned_at?: string;
  completed_by?: number;
  completed_by_name?: string;
  completed_at?: string;
  items: MaterialRequestItem[];
  status_display?: string;
}

// 分页响应接口
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// 批量操作请求接口
interface BatchOperationRequest {
  operations: Omit<
    InventoryOperation,
    'id' | 'created_at' | 'ingredient_name' | 'operator_name' | 'inspector_name'
  >[];
}

// 批量操作响应接口
interface BatchOperationResponse {
  success: number;
  failed: number;
  results: InventoryOperation[];
  errors: {
    operation: Partial<InventoryOperation>;
    errors: Record<string, string[]>;
  }[];
}

// 获取所有食材列表
export const useIngredients = (params?: Record<string, any>) => {
  return useQuery<Ingredient[]>({
    queryKey: ['ingredients', params],
    queryFn: async () => {
      const response = await apiClient.get('/ingredients/', { params });
      return response.data;
    },
    staleTime: 60000, // 60秒内不会重新获取数据
  });
};

// 获取单个食材详情
export const useIngredient = (id: number) => {
  return useQuery<Ingredient>({
    queryKey: ['ingredients', id],
    queryFn: async () => {
      const response = await apiClient.get(`/ingredients/${id}/`);
      return response.data;
    },
    enabled: !!id,
  });
};

// 获取出库申请列表
export const useMaterialRequests = (params?: Record<string, any>) => {
  return useQuery<MaterialRequest[]>({
    queryKey: ['material-requests', params],
    queryFn: async () => {
      const response = await apiClient.get('/material-requests/', { params });
      return response.data;
    },
    staleTime: 60000, // 60秒内不会重新获取数据
  });
};

// 获取单个出库申请详情
export const useMaterialRequest = (id: number) => {
  return useQuery<MaterialRequest>({
    queryKey: ['material-requests', id],
    queryFn: async () => {
      const response = await apiClient.get(`/material-requests/${id}/`);
      return response.data;
    },
    enabled: !!id,
  });
};

// 创建出库申请
export const useCreateMaterialRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      items: Array<{
        ingredient: number;
        quantity: number;
        notes?: string;
      }>;
    }) => {
      const response = await apiClient.post('/material-requests/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      toast.success('出库申请创建成功');
    },
    onError: (error: any) => {
      toast.error(`创建失败: ${error.response?.data?.detail || '未知错误'}`);
    },
  });
};

// 更新出库申请
export const useUpdateMaterialRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<{
        title: string;
        description: string;
      }>;
    }) => {
      const response = await apiClient.patch(`/material-requests/${id}/`, data);
      return response.data;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      queryClient.invalidateQueries({ queryKey: ['material-requests', data.id] });
      toast.success('出库申请更新成功');
    },
    onError: (error: any) => {
      toast.error(`更新失败: ${error.response?.data?.detail || '未知错误'}`);
    },
  });
};

// 删除出库申请
export const useDeleteMaterialRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/material-requests/${id}/`);
      return id;
    },
    onSuccess: id => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      queryClient.removeQueries({ queryKey: ['material-requests', id] });
      toast.success('出库申请删除成功');
    },
    onError: (error: any) => {
      toast.error(`删除失败: ${error.response?.data?.detail || '未知错误'}`);
    },
  });
};

// 审批出库申请
export const useApproveMaterialRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.put(`/material-requests/${id}/approve/`, {});
      return response.data;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      queryClient.invalidateQueries({ queryKey: ['material-requests', data.id] });
      toast.success('出库申请已批准');
    },
    onError: (error: any) => {
      toast.error(`批准失败: ${error.response?.data?.error || '未知错误'}`);
    },
  });
};

// 拒绝出库申请
export const useRejectMaterialRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.put(`/material-requests/${id}/reject/`, {});
      return response.data;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      queryClient.invalidateQueries({ queryKey: ['material-requests', data.id] });
      toast.success('出库申请已拒绝');
    },
    onError: (error: any) => {
      toast.error(`拒绝失败: ${error.response?.data?.error || '未知错误'}`);
    },
  });
};

// 开始处理出库申请
export const useStartProcessingMaterialRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.put(`/material-requests/${id}/start_processing/`, {});
      return response.data;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      queryClient.invalidateQueries({ queryKey: ['material-requests', data.id] });
      toast.success('出库申请处理已开始');
    },
    onError: (error: any) => {
      toast.error(`开始处理失败: ${error.response?.data?.error || '未知错误'}`);
    },
  });
};

// 完成出库申请
export const useCompleteMaterialRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.put(`/material-requests/${id}/complete/`, {});
      return response.data;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      queryClient.invalidateQueries({ queryKey: ['material-requests', data.id] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] }); // 同时刷新食材数据，因为会影响库存
      toast.success('出库申请已完成');
    },
    onError: (error: any) => {
      toast.error(`完成处理失败: ${error.response?.data?.error || '未知错误'}`);
    },
  });
};

// 指派员工处理出库申请
export const useAssignEmployeeToRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, employeeId }: { requestId: number; employeeId: number }) => {
      const response = await apiClient.put(`/material-requests/${requestId}/assign/`, {
        employee_id: employeeId,
      });
      return response.data;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      queryClient.invalidateQueries({ queryKey: ['material-requests', data.id] });
      toast.success('已成功指派员工');
    },
    onError: (error: any) => {
      toast.error(`指派员工失败: ${error.response?.data?.error || '未知错误'}`);
    },
  });
};

// 获取普通员工列表
export interface Employee {
  id: number;
  username: string;
  email?: string;
  phone?: string;
  user_type: string;
  user_type_display?: string;
  is_active: boolean;
}

// 获取员工列表
export const useEmployees = () => {
  return useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await apiClient.get('/users/', {
        params: { user_type: 'employee' }, // 只获取普通员工，不包括管理员
      });
      return response.data;
    },
  });
};

// 获取库存操作记录API (这部分保留，因为管理员可能需要查看)
export const useInventoryOperations = (params?: Record<string, any>) => {
  return useQuery<InventoryOperation[]>({
    queryKey: ['inventory-operations', params],
    queryFn: async () => {
      const response = await apiClient.get('/inventory-operations/', { params });
      return response.data;
    },
    staleTime: 60000, // 60秒内不会重新获取数据
  });
};

// 获取单个库存操作详情
export const useInventoryOperation = (id: number) => {
  return useQuery<InventoryOperation>({
    queryKey: ['inventory-operations', id],
    queryFn: async () => {
      const response = await apiClient.get(`/inventory-operations/${id}/`);
      return response.data;
    },
    enabled: !!id,
  });
};

// 创建库存操作记录
export const useCreateInventoryOperation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: Omit<
        InventoryOperation,
        'id' | 'created_at' | 'ingredient_name' | 'operator_name' | 'inspector_name'
      >,
    ) => {
      const response = await apiClient.post('/inventory-operations/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-operations'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] }); // 同时刷新食材数据
      toast.success('库存操作记录添加成功');
    },
    onError: (error: any) => {
      toast.error(`操作失败: ${error.response?.data?.detail || '未知错误'}`);
    },
  });
};

// 更新库存操作记录
export const useUpdateInventoryOperation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InventoryOperation> }) => {
      const response = await apiClient.patch(`/inventory-operations/${id}/`, data);
      return response.data;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['inventory-operations'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-operations', data.id] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] }); // 同时刷新食材数据
      toast.success('库存操作记录更新成功');
    },
    onError: (error: any) => {
      toast.error(`更新失败: ${error.response?.data?.detail || '未知错误'}`);
    },
  });
};

// 删除库存操作记录
export const useDeleteInventoryOperation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/inventory-operations/${id}/`);
      return id;
    },
    onSuccess: id => {
      queryClient.invalidateQueries({ queryKey: ['inventory-operations'] });
      queryClient.removeQueries({ queryKey: ['inventory-operations', id] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] }); // 同时刷新食材数据
      toast.success('库存操作记录删除成功');
    },
    onError: (error: any) => {
      toast.error(`删除失败: ${error.response?.data?.detail || '未知错误'}`);
    },
  });
};

// 批量创建库存操作记录
export const useBatchCreateInventoryOperations = () => {
  const queryClient = useQueryClient();

  return useMutation<BatchOperationResponse, Error, BatchOperationRequest>({
    mutationFn: async data => {
      const response = await apiClient.post('/inventory-operations/batch_operation/', data);
      return response.data;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['inventory-operations'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] }); // 同时刷新食材数据

      if (data.success > 0 && data.failed === 0) {
        toast.success(`成功添加${data.success}条库存操作记录`);
      } else if (data.success > 0 && data.failed > 0) {
        toast.success(`部分操作成功，${data.success}条成功，${data.failed}条失败`);
      } else {
        toast.error(`操作失败，${data.failed}条记录添加失败`);
      }
    },
    onError: (error: any) => {
      toast.error(`批量操作失败: ${error.message}`);
    },
  });
};

export default {
  useIngredients,
  useIngredient,
  useMaterialRequests,
  useMaterialRequest,
  useApproveMaterialRequest,
  useRejectMaterialRequest,
  useStartProcessingMaterialRequest,
  useCompleteMaterialRequest,
  useAssignEmployeeToRequest,
  useEmployees,
  useInventoryOperations,
  useInventoryOperation,
  useCreateInventoryOperation,
  useUpdateInventoryOperation,
  useDeleteInventoryOperation,
  useBatchCreateInventoryOperations,
  useCreateMaterialRequest,
  useUpdateMaterialRequest,
  useDeleteMaterialRequest,
};
