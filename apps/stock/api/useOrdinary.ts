import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put } from './http';
import { Ingredient, InventoryOperation, Task, Feedback } from './types';

export type { Task };

// 获取食材列表
export const fetchIngredients = async (): Promise<Ingredient[]> => {
  return get('/ingredients/');
};

// 获取单个食材
export const fetchIngredient = async (id: number): Promise<Ingredient> => {
  return get(`/ingredients/${id}/`);
};

// 执行食材操作（入库/出库）
export const performInventoryOperation = async (
  data: InventoryOperation,
): Promise<InventoryOperation> => {
  return post('/inventory-operations/', data);
};

// 使用食材列表
export const useIngredients = () => {
  return useQuery<Ingredient[]>({
    queryKey: ['ingredients'],
    queryFn: fetchIngredients,
  });
};

// 使用单个食材
export const useIngredient = (id: number) => {
  return useQuery<Ingredient>({
    queryKey: ['ingredients', id],
    queryFn: () => fetchIngredient(id),
    enabled: !!id,
  });
};

// 食材操作Hook
export const useIngredientOperation = () => {
  const queryClient = useQueryClient();
  const { data: ingredients, isLoading: isLoadingIngredients } = useIngredients();

  const operationMutation = useMutation<InventoryOperation, Error, InventoryOperation>({
    mutationFn: performInventoryOperation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });

  const handleInventoryOperation = async (
    operation_type: 'in' | 'out',
    ingredient: number,
    quantity: number,
    notes?: string,
  ) => {
    return operationMutation.mutateAsync({
      operation_type,
      ingredient,
      quantity,
      notes,
    });
  };

  return {
    ingredients,
    isLoadingIngredients,
    handleInventoryOperation,
    isOperationLoading: operationMutation.isPending,
  };
};

// 获取即将过期的食材列表
export const useExpiringIngredients = (days: number = 7) => {
  return useQuery<Ingredient[]>({
    queryKey: ['ingredients', 'expiring', days],
    queryFn: () => get(`/ingredients/expiring/?days=${days}`),
  });
};

// 获取库存不足的食材列表
export const useLowStockIngredients = () => {
  return useQuery<Ingredient[]>({
    queryKey: ['ingredients', 'low-stock'],
    queryFn: () => get('/ingredients/low-stock/'),
  });
};

// 执行批量出入库操作
export const useBatchInventoryOperation = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { operations: InventoryOperation[] }>({
    mutationFn: data => post('/inventory-operations/batch/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });
};

// 获取员工任务列表
export const useEmployeeTasks = () => {
  return useQuery<Task[]>({
    queryKey: ['employee-tasks'],
    queryFn: () => get('/employee/tasks/'),
  });
};

// 获取指派给当前用户的材料出库申请
export const useAssignedMaterialRequests = () => {
  return useQuery<any[]>({
    queryKey: ['assigned-material-requests'],
    queryFn: () => get('/material-requests/assigned_to_me/'),
  });
};

// 完成材料出库申请
export const useCompleteMaterialRequest = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, number>({
    mutationFn: requestId => put(`/material-requests/${requestId}/complete/`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assigned-material-requests'] });
    },
  });
};

// 开始处理材料出库申请
export const useStartProcessingMaterialRequest = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, number>({
    mutationFn: requestId => put(`/material-requests/${requestId}/start_processing/`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assigned-material-requests'] });
    },
  });
};

// 完成任务
export const useCompleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, number>({
    mutationFn: taskId => put(`/employee/tasks/${taskId}/complete/`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-tasks'] });
    },
  });
};

// 获取员工反馈列表
export const useEmployeeFeedbacks = () => {
  return useQuery<Feedback[]>({
    queryKey: ['employee-feedbacks'],
    queryFn: () => get('/employee/feedback/'),
  });
};

// 提交反馈
export const useSubmitFeedback = () => {
  const queryClient = useQueryClient();
  return useMutation<Feedback, Error, Feedback>({
    mutationFn: feedback => post('/employee/feedback/', feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-feedbacks'] });
    },
  });
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
    isCompleting: completeTask.isPending,
  };
};

// 出库申请任务管理的自定义Hook
export const useMaterialRequestManagement = () => {
  const { data: requests, isLoading: isLoadingRequests } = useAssignedMaterialRequests();
  const completeMaterialRequest = useCompleteMaterialRequest();
  const startProcessingRequest = useStartProcessingMaterialRequest();

  const handleCompleteMaterialRequest = async (requestId: number) => {
    return await completeMaterialRequest.mutateAsync(requestId);
  };

  const handleStartProcessingRequest = async (requestId: number) => {
    return await startProcessingRequest.mutateAsync(requestId);
  };

  return {
    requests,
    isLoadingRequests,
    handleCompleteMaterialRequest,
    handleStartProcessingRequest,
    isCompleting: completeMaterialRequest.isPending,
    isStartingProcess: startProcessingRequest.isPending,
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
    isSubmitting: submitFeedback.isPending,
  };
};
