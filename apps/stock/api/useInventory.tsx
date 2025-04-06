import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, put } from './http';
import Toast from 'react-native-toast-message';
import { IngredientStatus } from './types';

// 定义类型
export interface EnvironmentData {
  id?: number;
  temperature: number;
  humidity: number;
  recorded_at?: string;
  notes?: string;
}

// 定义传感器数据接口
export interface SensorData {
  id?: number;
  temperature?: number | number[] | null;
  humidity: number | number[];
  light?: number | number[] | null;
  timestamps?: string[];
  timestamp?: string;
  threshold?: number;
}

// 定义图表数据响应接口
export interface SensorChartResponse {
  timestamps: string[];
  temperature: (number | null)[];
  humidity: number[];
  light: number[];
}

export interface InventoryEvent {
  id?: number;
  event_type:
    | 'shortage'
    | 'excess'
    | 'expiry'
    | 'damaged'
    | 'miscount'
    | 'special_request'
    | 'other';
  title: string;
  description: string;
  ingredients?: number[];
  status?: 'pending' | 'processing' | 'resolved' | 'rejected';
  reported_by?: number;
  handled_by?: number;
  reported_by_name?: string;
  handled_by_name?: string;
  resolution_notes?: string;
  created_at?: string;
  updated_at?: string;
  resolved_at?: string;
  event_type_display?: string;
  status_display?: string;
  ingredients_details?: any[];
}

export interface InventoryReport {
  id: number;
  report_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  title: string;
  start_date: string;
  end_date: string;
  summary: string;
  details: string;
  created_by?: number;
  created_by_name?: string;
  created_at?: string;
  report_type_display?: string;
}

export interface ResolveEventData {
  resolution_notes: string;
}

export interface RejectEventData {
  reason: string;
}

// 定义入库操作接口
export interface InventoryOperation {
  id?: number;
  name: string;
  category: number;
  expiry_date: string;
  unit: string;
  quantity: number;
}
// 库存操作类型
export type InventoryOperationType = 'in' | 'out';

// 库存操作接口
export interface InventoryOperationes {
  id?: number;
  ingredient: number; // 食材ID
  ingredient_name?: string; // 食材名称（API返回）
  operation_type: InventoryOperationType;
  quantity: number; // 数量
  production_date?: string; // 生产日期
  expiry_period?: string; // 保质期
  operator?: number; // 操作员ID
  operator_name?: string; // 操作员名称（API返回）
  inspector?: number; // 入库检收人员ID
  inspector_name?: string; // 检收人员名称（API返回）
  notes?: string; // 备注
  source?: string; // 操作来源
  device_info?: string; // 设备信息
  ip_address?: string; // IP地址
  related_request?: number; // 关联出库申请ID
  created_at?: string; // 创建时间
}

// API 请求函数
const fetchEnvironmentDataApi = async (): Promise<EnvironmentData[]> => {
  return get<EnvironmentData[]>('/environment-data/');
};

const fetchEnvironmentChartDataApi = async (range: string = 'day'): Promise<EnvironmentData[]> => {
  return get<EnvironmentData[]>(`/environment-data/chart_data/?range=${range}`);
};

const fetchLatestEnvironmentDataApi = async (): Promise<EnvironmentData> => {
  return get<EnvironmentData>('/environment-data/latest/');
};

const createEnvironmentDataApi = async (data: EnvironmentData): Promise<EnvironmentData> => {
  return post<EnvironmentData>('/environment-data/', data);
};

const fetchInventoryEventsApi = async (): Promise<InventoryEvent[]> => {
  return get<InventoryEvent[]>('/inventory-events/');
};

const createInventoryEventApi = async (data: InventoryEvent): Promise<InventoryEvent> => {
  return post<InventoryEvent>('/inventory-events/', data);
};

const resolveInventoryEventApi = async ({
  id,
  data,
}: {
  id: number;
  data: ResolveEventData;
}): Promise<InventoryEvent> => {
  return put<InventoryEvent>(`/inventory-events/${id}/resolve/`, data);
};

const rejectInventoryEventApi = async ({
  id,
  data,
}: {
  id: number;
  data: RejectEventData;
}): Promise<InventoryEvent> => {
  return put<InventoryEvent>(`/inventory-events/${id}/reject/`, data);
};

const fetchInventoryReportsApi = async (): Promise<InventoryReport[]> => {
  return get<InventoryReport[]>('/inventory-reports/');
};

const generateInventoryReportApi = async (type: string = 'daily'): Promise<InventoryReport> => {
  return get<InventoryReport>(`/inventory-reports/generate_report/?type=${type}`);
};

const createInventoryReportApi = async (data: InventoryReport): Promise<InventoryReport> => {
  return post<InventoryReport>('/inventory-reports/', data);
};

// 获取库存操作列表API
const fetchInventoryOperationsApi = async (): Promise<InventoryOperation[]> => {
  return get<InventoryOperation[]>('/ingredients/');
};

const fetchInventoryOperationsesApi = async (): Promise<InventoryOperationes[]> => {
  return get<InventoryOperationes[]>('/inventory-operations/');
};

// 创建库存操作API（入库/出库）
const createInventoryOperationApi = async (
  data: InventoryOperation,
): Promise<InventoryOperation> => {
  return post<InventoryOperation>('/ingredients/', data);
};

const fetchSensorChartDataApi = async (params?: {
  days?: number;
  hours?: number;
  interval?: number;
  dense?: boolean;
}): Promise<SensorChartResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.days) queryParams.append('days', params.days.toString());
  if (params?.hours) queryParams.append('hours', params.hours.toString());
  if (params?.interval) queryParams.append('interval', params.interval.toString());
  if (params?.dense) queryParams.append('dense', params.dense.toString());

  const queryString = queryParams.toString();
  const url = `/sensor-data/chart_data/${queryString ? `?${queryString}` : ''}`;

  return get<SensorChartResponse>(url);
};

const fetchLatestSensorDataApi = async (): Promise<SensorData> => {
  return get<SensorData>('/sensor-data/latest/');
};

const createSensorDataApi = async (data: SensorData): Promise<SensorData> => {
  return post<SensorData>('/sensor-data/', data);
};

const addSensorDataApi = async (data: SensorData): Promise<SensorData> => {
  return post<SensorData>('/sensor-data/add_data/', data);
};

// 获取环境数据列表的 Hook
export const useEnvironmentDataList = () => {
  return useQuery({
    queryKey: ['environment-data'],
    queryFn: fetchEnvironmentDataApi,
    staleTime: 1000 * 60 * 5, // 5分钟内不重新请求
  });
};

// 获取环境数据图表数据的 Hook
export const useEnvironmentChartData = (range: string = 'day') => {
  return useQuery({
    queryKey: ['environment-chart-data', range],
    queryFn: () => fetchEnvironmentChartDataApi(range),
    staleTime: 1000 * 60 * 5, // 5分钟内不重新请求
  });
};

// 获取最新环境数据的 Hook
export const useLatestEnvironmentData = () => {
  return useQuery({
    queryKey: ['latest-environment-data'],
    queryFn: fetchLatestEnvironmentDataApi,
    staleTime: 1000 * 60, // 1分钟内不重新请求
    refetchInterval: 1000 * 60, // 每分钟自动刷新
  });
};

// 创建环境数据的 Hook
export const useCreateEnvironmentData = (toast: typeof Toast) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEnvironmentDataApi,
    onSuccess: () => {
      // 更新环境数据列表缓存
      queryClient.invalidateQueries({ queryKey: ['environment-data'] });
      queryClient.invalidateQueries({ queryKey: ['latest-environment-data'] });
      queryClient.invalidateQueries({ queryKey: ['environment-chart-data'] });

      toast.show({
        type: 'success',
        text1: '添加成功',
        text2: '环境数据已记录',
      });
    },
    onError: (error: any) => {
      toast.show({
        type: 'error',
        text1: '添加失败',
        text2: error.response?.data?.detail || '记录环境数据时出错',
      });
    },
  });
};

// 获取库存事件列表的 Hook
export const useInventoryEvents = () => {
  return useQuery({
    queryKey: ['inventory-events'],
    queryFn: fetchInventoryEventsApi,
    staleTime: 1000 * 60 * 5, // 5分钟内不重新请求
  });
};

// 创建库存事件的 Hook
export const useCreateInventoryEvent = (toast: typeof Toast) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInventoryEventApi,
    onSuccess: () => {
      // 更新库存事件列表缓存
      queryClient.invalidateQueries({ queryKey: ['inventory-events'] });

      toast.show({
        type: 'success',
        text1: '创建成功',
        text2: '库存事件已记录',
      });
    },
    onError: (error: any) => {
      toast.show({
        type: 'error',
        text1: '创建失败',
        text2: error.response?.data?.detail || '创建库存事件时出错',
      });
    },
  });
};

// 解决库存事件的 Hook
export const useResolveInventoryEvent = (toast: typeof Toast) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resolveInventoryEventApi,
    onSuccess: () => {
      // 更新库存事件列表缓存
      queryClient.invalidateQueries({ queryKey: ['inventory-events'] });

      toast.show({
        type: 'success',
        text1: '操作成功',
        text2: '库存事件已解决',
      });
    },
    onError: (error: any) => {
      toast.show({
        type: 'error',
        text1: '操作失败',
        text2: error.response?.data?.detail || '解决库存事件时出错',
      });
    },
  });
};

// 拒绝库存事件的 Hook
export const useRejectInventoryEvent = (toast: typeof Toast) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectInventoryEventApi,
    onSuccess: () => {
      // 更新库存事件列表缓存
      queryClient.invalidateQueries({ queryKey: ['inventory-events'] });

      toast.show({
        type: 'success',
        text1: '操作成功',
        text2: '库存事件已拒绝',
      });
    },
    onError: (error: any) => {
      toast.show({
        type: 'error',
        text1: '操作失败',
        text2: error.response?.data?.detail || '拒绝库存事件时出错',
      });
    },
  });
};

// 获取库存报告列表的 Hook
export const useInventoryReports = () => {
  return useQuery({
    queryKey: ['inventory-reports'],
    queryFn: fetchInventoryReportsApi,
    staleTime: 1000 * 60 * 5, // 5分钟内不重新请求
  });
};

// 生成库存报告的 Hook
export const useGenerateInventoryReport = (toast: typeof Toast) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (type: string = 'daily') => generateInventoryReportApi(type),
    onSuccess: () => {
      // 更新库存报告列表缓存
      queryClient.invalidateQueries({ queryKey: ['inventory-reports'] });

      toast.show({
        type: 'success',
        text1: '生成成功',
        text2: '库存报告已生成',
      });
    },
    onError: (error: any) => {
      toast.show({
        type: 'error',
        text1: '生成失败',
        text2: error.response?.data?.detail || '生成库存报告时出错',
      });
    },
  });
};

// 创建自定义库存报告的 Hook
export const useCreateInventoryReport = (toast: typeof Toast) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInventoryReportApi,
    onSuccess: () => {
      // 更新库存报告列表缓存
      queryClient.invalidateQueries({ queryKey: ['inventory-reports'] });

      toast.show({
        type: 'success',
        text1: '创建成功',
        text2: '自定义库存报告已创建',
      });
    },
    onError: (error: any) => {
      toast.show({
        type: 'error',
        text1: '创建失败',
        text2: error.response?.data?.detail || '创建自定义库存报告时出错',
      });
    },
  });
};

// 获取传感器数据图表数据的 Hook
export const useSensorChartData = (params?: {
  days?: number;
  hours?: number;
  interval?: number;
  dense?: boolean;
}) => {
  return useQuery<SensorChartResponse>({
    queryKey: ['sensor-chart-data', params],
    queryFn: () => fetchSensorChartDataApi(params),
    staleTime: 1000 * 60 * 5, // 5分钟内不重新请求
  });
};

// 获取最新传感器数据的 Hook
export const useLatestSensorData = () => {
  return useQuery({
    queryKey: ['latest-sensor-data'],
    queryFn: fetchLatestSensorDataApi,
    staleTime: 1000 * 60, // 1分钟内不重新请求
    refetchInterval: 1000 * 60, // 每分钟自动刷新
  });
};

// 获取库存操作列表的Hook
export const useInventoryOperations = () => {
  return useQuery({
    queryKey: ['inventory-operations'],
    queryFn: fetchInventoryOperationsApi,
    staleTime: 1000 * 60 * 5, // 5分钟内不重新请求
  });
};
export const useInventoryOperationses = () => {
  return useQuery({
    queryKey: ['inventory-operationses'],
    queryFn: fetchInventoryOperationsesApi,
    staleTime: 1000 * 60 * 5, // 5分钟内不重新请求
  });
};

// 创建库存操作的Hook（入库/出库）
export const useCreateInventoryOperation = (toast: typeof Toast) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInventoryOperationApi,
    onSuccess: data => {
      // 更新库存操作列表缓存
      queryClient.invalidateQueries({ queryKey: ['inventory-operations'] });
      // 更新库存列表缓存
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });

      toast.show({
        type: 'success',
        text1: `入库成功`,
        text2: `${data.name || '食材'} 入库操作已完成`,
      });
    },
    onError: (error: any) => {
      toast.show({
        type: 'error',
        text1: '操作失败',
        text2: error.response?.data?.detail || '库存操作时出错',
      });
    },
  });
};
