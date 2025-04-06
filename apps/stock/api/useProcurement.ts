import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put } from './http';
import { MaterialRequest, MaterialRequestStatus } from './types';

// 出库申请列表请求
export const fetchMaterialRequests = async (): Promise<MaterialRequest[]> => {
  return get('/material-requests/');
};

// 获取单个出库申请
export const fetchMaterialRequest = async (id: number): Promise<MaterialRequest> => {
  return get(`/material-requests/${id}/`);
};

// 创建出库申请
export const createMaterialRequest = async (data: MaterialRequest): Promise<MaterialRequest> => {
  return post('/material-requests/', data);
};

// 更新出库申请
export const updateMaterialRequest = async ({
  id,
  data,
}: {
  id: number;
  data: Partial<MaterialRequest>;
}): Promise<MaterialRequest> => {
  return put(`/material-requests/${id}/`, data);
};

// 审批出库申请
export const approveMaterialRequest = async (id: number): Promise<MaterialRequest> => {
  return put(`/material-requests/${id}/approve/`, {});
};

// 拒绝出库申请
export const rejectMaterialRequest = async (id: number): Promise<MaterialRequest> => {
  return put(`/material-requests/${id}/reject/`, {});
};

// 标记出库申请为进行中
export const startProcessingMaterialRequest = async (id: number): Promise<MaterialRequest> => {
  return put(`/material-requests/${id}/start_processing/`, {});
};

// 完成出库申请
export const completeMaterialRequest = async (id: number): Promise<MaterialRequest> => {
  return put(`/material-requests/${id}/complete/`, {});
};

// 获取普通员工列表
export interface Employee {
  id: number;
  username: string;
  email?: string;
  phone?: string;
  user_type: string;
  avatar?: string;
}

export const fetchEmployees = async (): Promise<Employee[]> => {
  return get('/users/?user_type=employee');
};

// 指派处理出库申请的员工
export const assignEmployeeToRequest = async ({
  requestId,
  employeeId,
}: {
  requestId: number;
  employeeId: number;
}): Promise<MaterialRequest> => {
  return put(`/material-requests/${requestId}/assign/`, { employee_id: employeeId });
};

// 获取出库申请列表的Hook
export const useMaterialRequests = () => {
  return useQuery({
    queryKey: ['material-requests'],
    queryFn: fetchMaterialRequests,
  });
};

// 获取单个出库申请的Hook
export const useMaterialRequest = (id: number) => {
  return useQuery({
    queryKey: ['material-requests', id],
    queryFn: () => fetchMaterialRequest(id),
    enabled: !!id,
  });
};

// 创建出库申请的Hook
export const useCreateMaterialRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMaterialRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
    },
  });
};

// 更新出库申请的Hook
export const useUpdateMaterialRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMaterialRequest,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      queryClient.invalidateQueries({ queryKey: ['material-requests', data.id] });
    },
  });
};

// 审批出库申请的Hook
export const useApproveMaterialRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveMaterialRequest,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      queryClient.invalidateQueries({ queryKey: ['material-requests', data.id] });
    },
  });
};

// 拒绝出库申请的Hook
export const useRejectMaterialRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectMaterialRequest,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      queryClient.invalidateQueries({ queryKey: ['material-requests', data.id] });
    },
  });
};

// 开始处理出库申请的Hook
export const useStartProcessingMaterialRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startProcessingMaterialRequest,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      queryClient.invalidateQueries({ queryKey: ['material-requests', data.id] });
    },
  });
};

// 完成出库申请的Hook
export const useCompleteMaterialRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: completeMaterialRequest,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      queryClient.invalidateQueries({ queryKey: ['material-requests', data.id] });
    },
  });
};

// 获取普通员工列表的Hook
export const useEmployees = () => {
  return useQuery({
    queryKey: ['employees'],
    queryFn: fetchEmployees,
  });
};

// 指派处理出库申请的员工的Hook
export const useAssignEmployeeToRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignEmployeeToRequest,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      queryClient.invalidateQueries({ queryKey: ['material-requests', data.id] });
    },
  });
};
