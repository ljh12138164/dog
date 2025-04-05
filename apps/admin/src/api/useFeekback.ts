import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from './useAuth';
import toast from 'react-hot-toast';

// 反馈类型定义
export interface Feedback {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'resolved';
  reporter: number;
  handler: number | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

// 评论类型定义
export interface Comment {
  id: number;
  feedback: number;
  content: string;
  created_by: number;
  created_by_username: string;
  created_by_avatar?: string;
  created_at: string;
}

// 创建反馈请求类型
export interface CreateFeedbackRequest {
  title: string;
  description: string;
}

// 更新反馈状态请求类型
export interface UpdateFeedbackStatusRequest {
  status: 'pending' | 'processing' | 'resolved';
  resolution_notes?: string;
}

// 创建评论请求类型
export interface CreateCommentRequest {
  content: string;
}

// 获取反馈列表
export const useFeedbacks = () => {
  return useQuery({
    queryKey: ['feedbacks'],
    queryFn: async () => {
      const response = await apiClient.get<Feedback[]>('/employee/feedback/');
      return response.data;
    },
    retry: 1,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
};

// 获取单个反馈
export const useFeedback = (id: number) => {
  return useQuery({
    queryKey: ['feedback', id],
    queryFn: async () => {
      const response = await apiClient.get<Feedback>(`/employee/feedback/${id}/`);
      return response.data;
    },
    enabled: !!id,
  });
};

// 创建反馈
export const useCreateFeedback = () => {
  return useMutation({
    mutationFn: async (data: CreateFeedbackRequest) => {
      const response = await apiClient.post<Feedback>('/employee/feedback/', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('反馈提交成功');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '反馈提交失败');
    },
  });
};

// 更新反馈
export const useUpdateFeedback = () => {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateFeedbackRequest> }) => {
      const response = await apiClient.patch<Feedback>(`/employee/feedback/${id}/`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('反馈更新成功');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '反馈更新失败');
    },
  });
};

// 删除反馈
export const useDeleteFeedback = () => {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/employee/feedback/${id}/`);
      return id;
    },
    onSuccess: () => {
      toast.success('反馈删除成功');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '反馈删除失败');
    },
  });
};

// 更新反馈状态
export const useUpdateFeedbackStatus = () => {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateFeedbackStatusRequest }) => {
      const response = await apiClient.patch<Feedback>(`/employee/feedback/${id}/status/`, data);
      return response.data;
    },
    onSuccess: data => {
      const statusText =
        data.status === 'processing' ? '处理中' : data.status === 'resolved' ? '已解决' : '待处理';
      toast.success(`反馈状态已更新为${statusText}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '反馈状态更新失败');
    },
  });
};

// 获取反馈评论列表
export const useFeedbackComments = (feedbackId: number) => {
  return useQuery({
    queryKey: ['feedback-comments', feedbackId],
    queryFn: async () => {
      const response = await apiClient.get<Comment[]>(`/employee/feedback/${feedbackId}/comments/`);
      return response.data;
    },
    enabled: !!feedbackId,
    refetchOnWindowFocus: false,
  });
};

// 创建反馈评论
export const useCreateFeedbackComment = () => {
  return useMutation({
    mutationFn: async ({
      feedbackId,
      data,
    }: {
      feedbackId: number;
      data: CreateCommentRequest;
    }) => {
      const response = await apiClient.post<Comment>(
        `/employee/feedback/${feedbackId}/comments/`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success('评论提交成功');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '评论提交失败');
    },
  });
};
