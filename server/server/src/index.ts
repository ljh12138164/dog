import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import axios from 'axios';

// 定义环境数据接口

// 创建HTTP服务器
const server = http.createServer();

// 创建WebSocket服务器
const wss = new WebSocketServer({
  server,
  path: '/env',
});
export interface StockData {
  type: 'emit';
  humidity: number;
  light: number;
  timestamp: string;
}
// 存储最新的环境数据
let latestData: StockData | null = null;

// Django API地址
const API_URL = 'http://localhost:8100/api/sensor-data/add_data/';

// 存储所有连接的客户端
const clients = new Set<WebSocket>();

// 处理WebSocket连接
wss.on('connection', ws => {
  console.log('设备已连接');

  // 将新客户端添加到集合中
  clients.add(ws);

  // 如果有最新数据，立即发送给新连接的客户端
  if (latestData) {
    ws.send(JSON.stringify(latestData));
  }

  // 处理接收到的消息
  ws.on('message', message => {
    try {
      // 解析接收到的JSON数据
      const data = JSON.parse(message.toString()) as StockData;
      console.log('收到数据:', data);

      if (data.type === 'emit') {
        // 发送数据到Django API
        sendDataToDjangoAPI(data);
      }
      // 更新最新的数据
      latestData = data;

      // 广播数据给所有连接的客户端
      clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          // WebSocket.OPEN = 1
          client.send(JSON.stringify(data));
        }
      });
    } catch (error) {
      console.error('解析消息时出错:', error);
    }
  });

  // 处理连接关闭
  ws.on('close', () => {
    console.log('设备已断开连接');
    clients.delete(ws);
  });

  // 处理错误
  ws.on('error', error => {
    console.error('WebSocket错误:', error);
    clients.delete(ws);
  });
});

/**
 * 发送数据到Django API
 * @param data 要发送的传感器数据
 */
async function sendDataToDjangoAPI(data: StockData) {
  try {
    const response = await axios.post(API_URL, data);
    console.log('数据已成功保存到Django:', response.data);
  } catch (error) {
    console.error('发送数据到Django时出错:', error);
  }
}

// 设置服务器监听端口
const PORT = 8380;
server.listen(PORT, () => {
  console.log(`WebSocket服务器运行在 ws://0.0.0.0:${PORT}/env`);
});

// 优雅地处理进程终止
process.on('SIGINT', () => {
  console.log('正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});
