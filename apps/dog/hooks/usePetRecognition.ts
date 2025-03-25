import { useMutation } from '@tanstack/react-query';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { manipulateAsync } from 'expo-image-manipulator';

interface PetRecognitionResult {
  className: string;
  probability: number;
}

export const usePetRecognition = () => {
  return useMutation({
    mutationFn: async (imageUri: string): Promise<PetRecognitionResult> => {
      try {
        // 确保 TensorFlow.js 已准备就绪
        await tf.ready();
        
        // 加载 MobileNet 模型
        const model = await mobilenet.load();
        
        // 处理图片尺寸
        const manipResult = await manipulateAsync(
          imageUri,
          [{ resize: { width: 224, height: 224 } }],
          { format: 'jpeg' }
        );
        
        // 转换图片为 tensor
        const response = await fetch(manipResult.uri);
        const imageBlob = await response.blob();
        const imageBitmap = await createImageBitmap(imageBlob);
        const imageTensor = tf.browser.fromPixels(imageBitmap);
        
        // 进行预测
        const predictions = await model.classify(imageTensor);
        
        // 清理资源
        imageTensor.dispose();
        
        if (!predictions || predictions.length === 0) {
          throw new Error('无法识别图片中的宠物');
        }
        
        return {
          className: predictions[0].className,
          probability: predictions[0].probability,
        };
      } catch (error) {
        console.error('宠物识别错误:', error);
        throw error;
      }
    },
  });
}; 