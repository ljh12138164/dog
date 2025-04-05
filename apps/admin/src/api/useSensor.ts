import { useQuery } from '@tanstack/react-query';
import { apiClient } from './useAuth';
// 定义传感器数据接口
export interface SensorData {
  id?: number;
  temperature?: number | number[] | null;
  humidity: number | number[];
  light?: number | number[] | null;
  timestamps?: string[];
  timestamp?: string;
  notes?: string;
}

// 定义图表数据响应接口
export interface SensorChartResponse {
  timestamps: string[];
  temperature: (number | null)[];
  humidity: number[];
  light: number[];
}

// API请求函数
const fetchSensorChartData = async (params?: {
  days?: number;
  hours?: number;
  dense?: boolean;
}): Promise<SensorChartResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.days) queryParams.append('days', params.days.toString());
  if (params?.hours) queryParams.append('hours', params.hours.toString());
  if (params?.dense) queryParams.append('dense', params.dense.toString());

  const queryString = queryParams.toString();
  const url = `http://localhost:8100/api/sensor-data/chart_data/${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient.get<SensorChartResponse>(url);
  return response.data;
};

const fetchLatestSensorData = async (): Promise<SensorData> => {
  const response = await apiClient.get<SensorData>('http://localhost:8100/api/sensor-data/latest/');
  return response.data;
};

// 获取传感器数据图表数据的 Hook
export const useSensorChartData = (params?: { days?: number; hours?: number; dense?: boolean }) => {
  return useQuery<SensorChartResponse>({
    queryKey: ['sensor-chart-data', params],
    queryFn: () => fetchSensorChartData(params),
    staleTime: 1000 * 60 * 5, // 5分钟内不重新请求
  });
};

// 获取最新传感器数据的 Hook
export const useLatestSensorData = () => {
  return useQuery({
    queryKey: ['latest-sensor-data'],
    queryFn: fetchLatestSensorData,
    staleTime: 1000 * 60, // 1分钟内不重新请求
    refetchInterval: 1000 * 60, // 每分钟自动刷新
  });
};
