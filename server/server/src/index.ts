import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import axios from 'axios';

// 定义数据接口
export interface SensorData {
  type: 'emit';
  temperature: number;
  humidity: number;
  light: number;
  timestamp: string;
  alarm: boolean;
  threshold: number;
}

// 定义命令接口
export interface ThresholdCommand {
  type: 'command';
  setThreshold: number;
}

// 定义响应接口
export interface CommandResponse {
  type: 'response';
  status: string;
  message: string;
  newThreshold?: number;
}

// 定义消息类型联合类型
type WebSocketMessage = SensorData | ThresholdCommand | CommandResponse;

// 创建HTTP服务器
const server = http.createServer();

// 创建WebSocket服务器
const wss = new WebSocketServer({
  server,
  path: '/env',
});

// 存储最新的环境数据
let latestData: SensorData | null = null;

// Django API地址
const API_URL = 'http://localhost:8100/api/sensor-data/add_data/';

// 存储所有连接的客户端，区分设备和前端客户端
const devices = new Set<WebSocket>();
const frontendClients = new Set<WebSocket>();

// 处理WebSocket连接
wss.on('connection', (ws, request) => {
  // 客户端标识，默认为前端
  let isDevice = false;

  // 将新客户端添加到集合中
  frontendClients.add(ws);

  // 如果有最新数据，立即发送给新连接的客户端
  if (latestData) {
    ws.send(JSON.stringify(latestData));
  }

  // 处理接收到的消息
  ws.on('message', message => {
    try {
      // 解析接收到的JSON数据
      const data = JSON.parse(message.toString()) as WebSocketMessage;
      if (data.type === 'emit') {
        // 这是来自ESP32设备的数据
        if (!isDevice) {
          isDevice = true;
          frontendClients.delete(ws);
          devices.add(ws);
        }

        // 发送数据到Django API
        sendDataToDjangoAPI(data);

        // 更新最新的数据
        latestData = data;

        // 广播数据给所有前端客户端
        frontendClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      } else if (data.type === 'command') {
        // 这是来自前端的命令

        // 转发命令给所有设备
        devices.forEach(device => {
          if (device.readyState === WebSocket.OPEN) {
            device.send(JSON.stringify(data));
          }
        });
      } else if (data.type === 'response') {
        // 这是来自设备的响应

        // 转发响应给所有前端客户端
        frontendClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      }
    } catch (error) {
      console.error('解析消息时出错:', error);
    }
  });

  // 处理连接关闭
  ws.on('close', () => {
    if (isDevice) {
      devices.delete(ws);
    } else {
      frontendClients.delete(ws);
    }
  });

  // 处理错误
  ws.on('error', error => {
    console.error('WebSocket错误:', error);
    if (isDevice) {
      devices.delete(ws);
    } else {
      frontendClients.delete(ws);
    }
  });
});

/**
 * 发送数据到Django API
 * @param data 要发送的传感器数据
 */
async function sendDataToDjangoAPI(data: SensorData) {
  try {
    const response = await axios.post(API_URL, data);
  } catch (error) {
    console.error('发送数据到Django时出错:', error);
  }
}

// 设置服务器监听端口
const PORT = 8380;
server.listen(PORT, () => {});

// 优雅地处理进程终止
process.on('SIGINT', () => {
  server.close(() => {
    process.exit(0);
  });
});
