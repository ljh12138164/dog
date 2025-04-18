import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, put } from './http';
import Toast from 'react-native-toast-message';

// 定义类型
export interface Ingredient {
  id: number;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  expiry_date: string;
  status: string;
  location: string;
  last_check_date?: string;
  created_at: string;
  updated_at: string;
}
export interface InventoryOperation {
  id?: number;
  name: string;
  category: string; // 商品类别
  expiry_date: string;
  unit: string;
  quantity: number;
}
export interface InventoryOperationes {
  id?: number;
  name?: string;
  status?: string;
  category?: string; // 商品类别
  ingredient?: string | number; // 食材ID
  operation_type?: 'in' | 'out'; // 操作类型
  quantity: number; // 数量
  operator?: number; // 操作员ID
  expiry_date?: string; // 保质期
  expiry_period?: string; // 保质期天数
  notes?: string; // 备注
  unit?: string; // 单位
}
export interface TaskItem {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'completed';
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  assigned_to: number;
  created_at: string;
  updated_at: string;
}

export interface FeedbackItem {
  id?: number;
  title: string;
  description: string;
  status?: 'pending' | 'processing' | 'resolved';
  reporter?: number;
  created_at?: string;
  updated_at?: string;
}

// API 请求函数
const fetchIngredientListApi = async (): Promise<Ingredient[]> => {
  return get<Ingredient[]>('/ingredients/');
};

// 执行入库
const performInventoryOperationApi = async (
  data: InventoryOperationes,
): Promise<InventoryOperationes> => {
  return post<InventoryOperationes>('/inventory-operations/', data);
};
// 执行出库
const show = async (data: InventoryOperationes): Promise<InventoryOperationes> => {
  return post<InventoryOperationes>('/ingredients/', data);
};

const fetchTasksApi = async (): Promise<TaskItem[]> => {
  return get<TaskItem[]>('/employee/tasks/');
};

const completeTaskApi = async (taskId: number): Promise<TaskItem> => {
  return put<TaskItem>(`/employee/tasks/${taskId}/complete/`, {});
};

const submitFeedbackApi = async (data: FeedbackItem): Promise<FeedbackItem> => {
  return post<FeedbackItem>('/employee/feedback/', data);
};

// 获取食材列表的 Hook
export const useIngredientList = () => {
  return useQuery({
    queryKey: ['ingredients'],
    queryFn: fetchIngredientListApi,
    staleTime: 1000 * 60 * 5, // 5分钟内不重新请求
    refetchOnWindowFocus: true,
  });
};

// 执行库存操作（出入库）的 Hook
export const useInventoryOperation = (toast: typeof Toast) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InventoryOperationes) => {
      return performInventoryOperationApi({ ...data, operation_type: 'in' });
    },
    onSuccess: () => {
      // 更新食材列表缓存
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });

      toast.show({
        type: 'success',
        text1: '操作成功',
        text2: '库存操作已完成',
      });
    },
  });
};
// 执行创建商品
export const useShow = (toast: typeof Toast) => {
  return useMutation({
    mutationFn: show,
    onSuccess: () => {
      toast.show({
        type: 'success',
        text1: '操作成功',
        text2: '商品创建成功',
      });
    },
    onError: (error: any) => {
      console.log('error:' + error);
    },
  });
};

// 获取待办任务列表的 Hook
export const useTasks = () => {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasksApi,
    staleTime: 1000 * 60 * 3, // 3分钟内不重新请求
    refetchOnWindowFocus: true,
  });
};

// 完成任务的 Hook
export const useCompleteTask = (toast: typeof Toast) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeTaskApi,
    onSuccess: () => {
      // 更新任务列表缓存
      queryClient.invalidateQueries({ queryKey: ['tasks'] });

      toast.show({
        type: 'success',
        text1: '任务已完成',
        text2: '任务状态已更新',
      });
    },
    onError: (error: any) => {
      toast.show({
        type: 'error',
        text1: '操作失败',
        text2: error.response?.data?.detail || '更新任务状态时出错',
      });
    },
  });
};

// 提交反馈的 Hook
export const useSubmitFeedback = (toast: typeof Toast) => {
  return useMutation({
    mutationFn: submitFeedbackApi,
    onSuccess: () => {
      toast.show({
        type: 'success',
        text1: '反馈已提交',
        text2: '您的反馈已成功提交',
      });
    },
    onError: (error: any) => {
      toast.show({
        type: 'error',
        text1: '提交失败',
        text2: error.response?.data?.detail || '提交反馈时出错',
      });
    },
  });
};
