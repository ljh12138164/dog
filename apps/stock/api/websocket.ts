import { useEffect, useState, useCallback } from 'react';
import { get } from './http';
import { SensorData } from './useInventory';

// 定义温湿度数据接口
export interface StockData {
  type: 'emit';
  humidity: number;
  light: number;
  timestamp: string;
  temperature?: number;
}
const API_URL = 'http://192.168.205.197:8100/api/sensor-data/latest/';

// WebSocket服务器配置 - 修正路径与服务器端匹配
const WS_URL = 'ws://192.168.205.197:8380/env';
export const useStockData = (symbol?: string) => {
  const [data, setData] = useState<SensorData | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [currentThreshold, setCurrentThreshold] = useState<number | null>(null);
  const [thresholdUpdating, setThresholdUpdating] = useState(false);

  // 发送阈值调整命令
  const updateThreshold = useCallback(
    (newThreshold: number) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket连接未建立');
      }

      if (isNaN(newThreshold) || newThreshold < 0 || newThreshold > 100) {
        throw new Error('无效的温度阈值 (0-100°C)');
      }

      // 发送阈值调整命令
      const command = {
        type: 'command',
        setThreshold: newThreshold,
      };

      // 发送命令到WebSocket服务器
      socket.send(JSON.stringify(command));
      console.log('WebSocket发送命令:', command);

      setThresholdUpdating(true);
    },
    [socket],
  );

  useEffect(() => {
    let sockets: WebSocket | null = null;

    get<SensorData>(API_URL).then(data => {
      setData({ ...data, threshold: 30 });
      // 定义数据监听器
      sockets = new WebSocket(WS_URL);
      sockets.onopen = () => {
        setSocket(sockets);
      };
      sockets.onmessage = msg => {
        try {
          const wsd = JSON.parse(msg.data);
          if (wsd.type === 'emit') {
            // 将WebSocket数据转换为SensorData格式 (使用数组格式)
            const sensorData: SensorData = {
              temperature: wsd.temperature,
              humidity: wsd.humidity,
              light: wsd.light,
              timestamp: wsd.timestamp,
              threshold: wsd.threshold,
            };
            console.log(sensorData);
            setData(sensorData);

            // 如果有阈值信息，更新阈值状态
            if (typeof wsd.threshold === 'number') {
              setCurrentThreshold(wsd.threshold);
            }
          } else if (wsd.type === 'response' && wsd.status === 'success' && wsd.newThreshold) {
            // 处理阈值更新响应
            setCurrentThreshold(wsd.newThreshold);
            setThresholdUpdating(false);
          }
        } catch (error) {
          console.error('WebSocket消息解析错误:', error);
        }
      };
    });

    return () => {
      if (sockets) {
        sockets.close();
      }
    };
  }, [symbol]);

  return {
    data,
    socket,
    currentThreshold,
    thresholdUpdating,
    updateThreshold,
  };
};
