import 'dotenv/config';
import { ExpoConfig } from 'expo/config';

export default (): ExpoConfig => ({
  name: 'DogApp',
  slug: 'dog',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  scheme: 'dog',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    infoPlist: {
      NSCameraUsageDescription: '此应用需要访问您的相机以拍摄头像照片。',
      NSPhotoLibraryUsageDescription:
        '此应用需要访问您的照片库以选择头像图片。',
    },
  },
  // build: {
  //   android: {
  //     buildType: 'apk',
  //   },
  // },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.ljh.dog', // 添加这一行
    permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE'],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: '此应用需要访问您的照片库以选择头像图片。',
        cameraPermission: '此应用需要访问您的相机以拍摄头像照片。',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: `http://${process.env.REACT_NATIVE_PACKAGER_HOSTNAME || '127.0.0.1'}:8000/api`,
    appName: 'DogApp',
    debug: true,
    eas: {
      projectId: '483f9a50-62e4-4fbc-a805-9ad5096f57cc',
    },
  },
});
