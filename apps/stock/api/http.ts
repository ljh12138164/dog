import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://127.0.0.1:8100/api';
export const API_TIMEOUT = 15000; // 15秒超时

// 创建axios实例
const instance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 刷新token的函数
const refreshAccessToken = async () => {
  const refreshToken = await AsyncStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
      refresh: refreshToken,
    });

    const { access } = response.data;
    await AsyncStorage.setItem('access_token', access);
    return access;
  } catch (error) {
    // 如果刷新失败，清除所有token
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('refresh_token');
    throw error;
  }
};

// 请求拦截器
instance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // 从AsyncStorage获取JWT访问令牌
    const token = await AsyncStorage.getItem('access_token');

    // 如果有token则添加到请求头
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// 响应拦截器
instance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    // 处理401错误（未授权）且不是刷新token的请求
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/token/refresh/'
    ) {
      originalRequest._retry = true;

      try {
        // 尝试刷新token
        const newAccessToken = await refreshAccessToken();

        // 使用新token更新原始请求的headers
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        // 重试原始请求
        return instance(originalRequest);
      } catch (refreshError) {
        // 刷新失败，可能需要重新登录
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('refresh_token');
        // 可以触发重定向到登录页面的逻辑
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// 封装GET请求
export const get = async <T>(url: string, params?: object): Promise<T> => {
  try {
    const response = await instance.get<T>(url, { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 封装POST请求
export const post = async <T>(url: string, data?: any, config?: any): Promise<T> => {
  try {
    // 处理FormData类型的请求
    if (data instanceof FormData) {
      // 对于FormData，让浏览器自动设置正确的Content-Type和boundary
      const response = await instance.post<T>(url, data, {
        ...config,
        headers: {
          ...(config?.headers || {}),
          // FormData不需要手动设置Content-Type，让浏览器自动处理
          'Content-Type': 'multipart/form-data',
        },
        // 禁止axios转换请求数据
        transformRequest: (data, headers) => {
          return data;
        },
      });
      return response.data;
    }

    // 处理普通JSON请求
    const response = await instance.post<T>(url, data, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 封装PUT请求
export const put = async <T>(url: string, data?: object): Promise<T> => {
  try {
    const response = await instance.put<T>(url, data);
    return response.data;
  } catch (error) {
    console.error(`PUT请求失败: ${url}`, error); // 打印错误详情
    if (axios.isAxiosError(error) && error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    throw error;
  }
};

// 封装DELETE请求
export const del = async <T>(url: string): Promise<T> => {
  try {
    const response = await instance.delete<T>(url);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 导出axios实例，以便进行自定义请求
export default instance;
