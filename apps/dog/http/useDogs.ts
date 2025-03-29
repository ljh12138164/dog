import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, uploadFile } from './lib';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
// 定义类型
export interface Dog {
  id: number;
  name: string;
  breed: string;
  height: number;
  weight: number;
  owner: number;
  owner_username: string;
  image: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DogFormData {
  name: string;
  breed: string;
  height: number;
  weight: number;
  image?: any;
}

export interface BreedIdentificationResponse {
  breed: string;
  confidence: number;
}

// 获取当前用户的所有狗狗
export const useDogs = () => {
  return useQuery<Dog[], Error>({
    queryKey: ['dogs'],
    queryFn: () => get<Dog[]>('/dogs/'),
  });
};

// 获取单个狗狗的详情
export const useDog = (dogId: number) => {
  return useQuery<Dog, Error>({
    queryKey: ['dogs', dogId],
    queryFn: () => get<Dog>(`/dogs/${dogId}/`),
    enabled: !!dogId,
  });
};

// 添加新狗狗
export const useAddDog = () => {
  const queryClient = useQueryClient();
  
  return useMutation<Dog, Error, FormData>({
    mutationFn: (formData) => {
      return post<Dog>('/dogs/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs'] });
      router.push('/');
      Toast.show({  
        type: 'success',
        text1: '成功',
        text2: '成功添加狗狗信息'
      });
    },
    onError: (error) => {
      Toast.show({
        type: 'error',
        text1: '添加失败',
        text2: error.message
      });
    },
  });
};

// 更新狗狗信息
export const useUpdateDog = (dogId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation<Dog, Error, FormData>({
    mutationFn: (formData) => {
      return put<Dog>(`/dogs/${dogId}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dogs'] });
      queryClient.invalidateQueries({ queryKey: ['dogs', dogId] });
      Toast.show({
        type: 'success',
        text1: '成功',
        text2: '成功更新狗狗信息'
      });
    },
    onError: (error) => {
      Toast.show({
        type: 'error',
        text1: '更新失败',
        text2: error.message
      });
    },
  });
};

// 删除狗狗
export const useDeleteDog = () => {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, number>({
    mutationFn: (dogId) => del(`/dogs/${dogId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs'] });
      Toast.show({
        type: 'success',
        text1: '成功',
        text2: '成功删除狗狗信息'
      });
    },
    onError: (error) => {
      Toast.show({
        type: 'error',
        text1: '删除失败',
        text2: error.message
      });
    },
  });
};

// 识别狗品种
export const useIdentifyBreed = () => {
  return useMutation<BreedIdentificationResponse, Error, FormData>({
    mutationFn: (formData) => {
      return post<BreedIdentificationResponse>('/dogs/identify-breed/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        transformRequest: (data) => {
          return data;
        },
      });
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: '识别失败',
        text2: '请检查网络连接'
      });
    },
  });
};
