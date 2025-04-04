import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put } from './http';

// 类型定义
export interface Ingredient {
  id: number;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  expiry_date: string;
  status: 'normal' | 'expired' | 'low' | 'pending_check';
  location: string;
  last_check_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryOperation {
  id?: number;
  ingredient: number;
  ingredient_name?: string;
  operation_type: 'in' | 'out';
  quantity: number;
  operator?: number;
  operator_name?: string;
  notes?: string;
  created_at?: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'completed';
  due_date: string;
  priority: 'low' | 'medium' | 'high';
}

export interface Feedback {
  id?: number;
  title: string;
  description: string;
  status?: 'pending' | 'processing' | 'resolved';
  reporter?: number;
  reporter_name?: string;
  handler?: number;
  handler_name?: string;
  created_at?: string;
  updated_at?: string;
  resolved_at?: string | null;
}

// 获取所有食材列表
export const useIngredients = () => {
  return useQuery<Ingredient[]>({
    queryKey: ['ingredients'],
    queryFn: () => get('/ingredients/')
  });
};

// 获取即将过期的食材列表
export const useExpiringIngredients = (days = 7) => {
  return useQuery<Ingredient[]>({
    queryKey: ['ingredients', 'expiring', days],
    queryFn: () => get(`/ingredients/expiring_soon/?days=${days}`)
  });
};

// 获取已过期的食材列表
export const useExpiredIngredients = () => {
  return useQuery<Ingredient[]>({
    queryKey: ['ingredients', 'expired'],
    queryFn: () => get('/ingredients/expired/')
  });
};

// 执行单个出入库操作
export const useInventoryOperation = () => {
  const queryClient = useQueryClient();
  
  return useMutation<InventoryOperation, Error, InventoryOperation>({
    mutationFn: (operation) => post('/inventory-operations/', operation),
    onSuccess: () => {
      // 操作成功后刷新食材列表
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    }
  });
};

// 执行批量出入库操作
export const useBatchInventoryOperation = () => {
  const queryClient = useQueryClient();
  
  return useMutation<any, Error, { operations: InventoryOperation[] }>({
    mutationFn: (data) => post('/inventory-operations/batch_operation/', data),
    onSuccess: () => {
      // 操作成功后刷新食材列表
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    }
  });
};

// 获取员工任务列表
export const useEmployeeTasks = () => {
  return useQuery<Task[]>({
    queryKey: ['employee-tasks'],
    queryFn: () => get('/employee/tasks/')
  });
};

// 完成任务
export const useCompleteTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation<Task, Error, number>({
    mutationFn: (taskId) => put(`/employee/tasks/${taskId}/complete/`),
    onSuccess: () => {
      // 更新任务列表
      queryClient.invalidateQueries({ queryKey: ['employee-tasks'] });
    }
  });
};

// 获取员工反馈列表
export const useEmployeeFeedbacks = () => {
  return useQuery<Feedback[]>({
    queryKey: ['employee-feedbacks'],
    queryFn: () => get<Feedback[]>('/employee/feedback/')
  }); //employee/feedback/
};

// 提交反馈
export const useSubmitFeedback = () => {
  const queryClient = useQueryClient();
  return useMutation<Feedback, Error, Feedback>({
    mutationFn: (feedback) => post<Feedback>('/employee/feedback/', feedback),
    onSuccess: () => {
      // 更新反馈列表
      queryClient.invalidateQueries({ queryKey: ['employee-feedbacks'] });
    }
  });
};

// 食材出入库操作的自定义Hook
export const useIngredientOperation = () => {
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const { data: ingredients, isLoading: isLoadingIngredients } = useIngredients();
  const inventoryOperation = useInventoryOperation();
  const batchOperation = useBatchInventoryOperation();
  
  const handleInventoryOperation = async (
    operationType: 'in' | 'out',
    ingredientId: number,
    quantity: number,
    notes?: string
  ) => {
    if (quantity <= 0) {
      throw new Error('数量必须大于0');
    }
    
    return await inventoryOperation.mutateAsync({
      ingredient: ingredientId,
      operation_type: operationType,
      quantity,
      notes
    });
  };
  
  const handleBatchOperation = async (operations: InventoryOperation[]) => {
    if (!operations.length) {
      throw new Error('操作列表不能为空');
    }
    
    return await batchOperation.mutateAsync({ operations });
  };
  
  return {
    selectedIngredient,
    setSelectedIngredient,
    ingredients,
    isLoadingIngredients,
    handleInventoryOperation,
    handleBatchOperation,
    isOperationLoading: inventoryOperation.isPending || batchOperation.isPending
  };
};

// 待办任务管理的自定义Hook
export const useTaskManagement = () => {
  const { data: tasks, isLoading: isLoadingTasks } = useEmployeeTasks();
  const completeTask = useCompleteTask();
  
  const handleCompleteTask = async (taskId: number) => {
    return await completeTask.mutateAsync(taskId);
  };
  
  return {
    tasks,
    isLoadingTasks,
    handleCompleteTask,
    isCompleting: completeTask.isPending
  };
};

// 异常反馈管理的自定义Hook
export const useFeedbackManagement = () => {
  const { data: feedbacks, isLoading: isLoadingFeedbacks } = useEmployeeFeedbacks();
  const submitFeedback = useSubmitFeedback();
  
  const handleSubmitFeedback = async (feedback: Feedback) => {
    return await submitFeedback.mutateAsync(feedback);
  };
  
  return {
    feedbacks,
    isLoadingFeedbacks,
    handleSubmitFeedback,
    isSubmitting: submitFeedback.isPending
  };
};
