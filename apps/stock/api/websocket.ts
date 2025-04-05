import { useEffect, useState } from 'react';
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
const API_URL = 'http://localhost:8100/api/sensor-data/latest/';

// WebSocket服务器配置 - 修正路径与服务器端匹配
const WS_URL = 'ws://localhost:8380/env';
export const useStockData = (symbol?: string) => {
  const [data, setData] = useState<SensorData | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    let sockets: WebSocket | null = null;

    get<SensorData>(API_URL).then(data => {
      setData(data);
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
              temperature: wsd.temperature ? [wsd.temperature] : undefined,
              humidity: [wsd.humidity || 0],
              light: wsd.light ? [wsd.light] : undefined,
              timestamps: wsd.timestamp ? [wsd.timestamp] : undefined,
            };
            setData(sensorData);
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

  return { data, socket };
};
