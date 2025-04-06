import { useEffect, useState } from 'react';

// 定义股票数据接口
export interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

// WebSocket连接状态
export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

// WebSocket服务器配置
const WS_URL = 'ws://192.168.205.197:8380/stock';

// 创建单例WebSocket实例
let socket: WebSocket | null = null;
let listeners: ((data: StockData) => void)[] = [];
let connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;

// 连接到WebSocket服务器
export const connectWebSocket = (): void => {
  if (socket !== null) {
    return;
  }

  connectionStatus = ConnectionStatus.CONNECTING;

  try {
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      connectionStatus = ConnectionStatus.CONNECTED;
    };

    socket.onmessage = event => {
      try {
        const data = JSON.parse(event.data) as StockData;
        // 通知所有监听者
        listeners.forEach(listener => listener(data));
      } catch (error) {
        console.error('解析WebSocket消息时出错:', error);
      }
    };

    socket.onclose = () => {
      connectionStatus = ConnectionStatus.DISCONNECTED;
      socket = null;

      // 尝试重新连接
      setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };

    socket.onerror = error => {
      console.error('股票WebSocket错误:', error);
      connectionStatus = ConnectionStatus.ERROR;
    };
  } catch (error) {
    console.error('建立股票WebSocket连接时出错:', error);
    connectionStatus = ConnectionStatus.ERROR;
    socket = null;
  }
};

// 断开WebSocket连接
export const disconnectWebSocket = (): void => {
  if (socket !== null && socket.readyState === WebSocket.OPEN) {
    socket.close();
    socket = null;
    connectionStatus = ConnectionStatus.DISCONNECTED;
  }
};

// 获取当前连接状态
export const getConnectionStatus = (): ConnectionStatus => {
  return connectionStatus;
};

// 添加数据监听器
export const addStockDataListener = (listener: (data: StockData) => void): void => {
  listeners.push(listener);
};

// 移除数据监听器
export const removeStockDataListener = (listener: (data: StockData) => void): void => {
  listeners = listeners.filter(l => l !== listener);
};

// 订阅特定股票
export const subscribeStock = (symbol: string): void => {
  if (socket !== null && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'subscribe', symbol }));
  } else {
    console.error('WebSocket未连接，无法订阅股票');
  }
};

// 取消订阅特定股票
export const unsubscribeStock = (symbol: string): void => {
  if (socket !== null && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'unsubscribe', symbol }));
  } else {
    console.error('WebSocket未连接，无法取消订阅股票');
  }
};

// React Hook，用于在组件中使用股票数据
export const useStockData = (
  symbol?: string,
): {
  data: StockData | null;
  status: ConnectionStatus;
} => {
  const [data, setData] = useState<StockData | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>(connectionStatus);

  useEffect(() => {
    // 定义数据监听器
    const handleData = (newData: StockData) => {
      // 如果指定了symbol，只关注该股票的数据
      if (!symbol || newData.symbol === symbol) {
        setData(newData);
      }
    };

    // 连接WebSocket并添加监听器
    connectWebSocket();
    addStockDataListener(handleData);

    // 如果指定了symbol，订阅该股票
    if (symbol) {
      subscribeStock(symbol);
    }

    // 定期检查并更新连接状态
    const statusInterval = setInterval(() => {
      setStatus(getConnectionStatus());
    }, 1000);

    // 清理函数
    return () => {
      removeStockDataListener(handleData);
      if (symbol) {
        unsubscribeStock(symbol);
      }
      clearInterval(statusInterval);
    };
  }, [symbol]);

  return { data, status };
};
