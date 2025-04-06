import { MD3LightTheme } from 'react-native-paper';

// 定义蓝白色主题
export const blueWhiteTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0088ff', // 主蓝色
    primaryContainer: '#e6f3ff', // 蓝色容器背景
    onPrimaryContainer: '#0066cc', // 蓝色容器上的文字
    secondary: '#0066cc', // 次要颜色
    secondaryContainer: '#e1f0ff', // 次要容器背景
    background: '#ffffff', // 白色背景
    surface: '#ffffff', // 白色表面
    surfaceVariant: '#f5f9ff', // 表面变体
    outline: '#c2d8f2', // 边框颜色
  },
};

export default blueWhiteTheme;
