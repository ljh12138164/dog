import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import Constants from 'expo-constants';

// 从本地存储获取token
export const getTokenFromStorage = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('auth_token');
  } catch (error) {
    return null;
  }
};

// 创建axios实例
const apiClient = axios.create({
  baseURL: Constants.expoConfig?.extra?.apiUrl || 'http://127.0.0.1:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  async (config) => {
    // 从AsyncStorage获取token
    const token = await getTokenFromStorage();
    if (token) {
      // 修改为Django REST框架所需的Token认证格式
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    if (error.response) {
      // 处理响应错误
      if (error.response.status === 401) {
        // 未授权，可以在这里处理登出逻辑
        try {
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('user');
        } catch (e) {
          console.error('清除认证信息失败:', e);
        }
        // 可以添加重定向到登录页面的逻辑
      }
    }
    return Promise.reject(error);
  }
);

// 通用GET请求
export const get = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  try {
    const response: AxiosResponse<T> = await apiClient.get(url, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 通用POST请求
export const post = async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  try {
    // 特殊处理FormData类型的数据
    const isFormData = data instanceof FormData;
    
    const requestConfig = {
      ...config,
      headers: {
        ...(config?.headers || {}),
        // 如果是FormData，确保不会覆盖Content-Type，并且让浏览器自动设置boundary
        ...(isFormData && { 'Content-Type': 'multipart/form-data' }),
      },
    };
    
    // 确保不对FormData做任何变换
    if (isFormData && !requestConfig.transformRequest) {
      requestConfig.transformRequest = [(data) => data];
    }
    
    const response: AxiosResponse<T> = await apiClient.post(url, data, requestConfig);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const statusCode = error.response.status;
      const responseData = error.response.data;
      
      
      // 返回更具体的错误信息
      if (typeof responseData === 'object' && responseData !== null) {
        // 尝试从响应中提取错误信息
        const errorMessage = 
          responseData.detail || 
          responseData.error || 
          responseData.message || 
          (responseData.image && responseData.image[0]) ||  // 处理Django Rest Framework字段错误
          JSON.stringify(responseData);
          
        const enhancedError = new Error(errorMessage);
        throw enhancedError;
      }
    } 
    throw error;
  }
};

// 通用PUT请求
export const put = async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  try {
    const response: AxiosResponse<T> = await apiClient.put(url, data, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 通用DELETE请求
export const del = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  try {
    const response: AxiosResponse<T> = await apiClient.delete(url, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 文件上传请求
export const uploadFile = async <T>(
  url: string, 
  formData: FormData, 
  progressCallback?: (progress: number) => void
): Promise<T> => {
  try {
    const token = await getTokenFromStorage();
    
    const response: AxiosResponse<T> = await apiClient.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Token ${token}` } : {}),
      },
      onUploadProgress: progressCallback 
        ? (progressEvent) => {
            const { loaded, total } = progressEvent;
            if (total !== undefined) {
              progressCallback(Math.round((loaded * 100) / total));
            }
          }
        : undefined,
    });
    
    return response.data;
  }catch(error){
    console.error('文件上传失败:', error);
    throw error;
  }
};

// 导出实例，方便直接使用
export default apiClient;
