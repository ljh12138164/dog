import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
// @ts-ignore
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// 定义数据接口
export interface SensorData {
  type: 'emit';
  temperature: number;
  humidity: number;
  light: number;
  photo_resistor?: number; // 光敏电阻值
  rfid_card?: string; // RFID卡号
  timestamp: string;
  alarm: boolean;
  threshold: number;
  sensor_error?: boolean;
}

// 定义图像数据接口
export interface CameraData {
  type: 'camera';
  imageData: string; // Base64编码的图像数据
  timestamp: string;
}

// 定义RFID卡事件接口
export interface RFIDEvent {
  type: 'rfid';
  cardId: string;
  timestamp: string;
}

// 定义命令接口
export interface ThresholdCommand {
  type: 'command';
  setThreshold: number;
}

// 定义相机命令接口
export interface CameraCommand {
  type: 'camera_command';
  action: 'capture' | 'start_stream' | 'stop_stream';
}

// 定义响应接口
export interface CommandResponse {
  type: 'response';
  status: string;
  message: string;
  newThreshold?: number;
}
export interface VideoFrame {
  type: 'video_frame';
  imageData: string;
}

// 定义消息类型联合类型
type WebSocketMessage =
  | SensorData
  | ThresholdCommand
  | CommandResponse
  | CameraData
  | RFIDEvent
  | CameraCommand
  | VideoFrame;

// 创建HTTP服务器
const server = http.createServer();

// 创建WebSocket服务器
const wss = new WebSocketServer({
  server,
  path: '/env',
});

// 存储最新的环境数据
let latestData: SensorData | null = null;
// 存储最新的图像数据
let latestImageData: CameraData | null = null;

// 创建图像存储目录
const IMAGES_DIR = path.join(__dirname, '../images');
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

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

  // 如果有最新图像数据，也发送给新客户端
  if (latestImageData) {
    ws.send(JSON.stringify(latestImageData));
  }

  // 处理接收到的消息
  ws.on('message', message => {
    try {
      // 解析接收到的JSON数据
      const data = JSON.parse(message.toString()) as WebSocketMessage;
      console.log('收到消息:', data);
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

        // 如果数据中包含RFID卡信息，单独处理
        if (data.rfid_card) {
          console.log(`检测到RFID卡: ${data.rfid_card}`);

          // 可以在这里添加特定的RFID卡处理逻辑
          const rfidEvent: RFIDEvent = {
            type: 'rfid',
            cardId: data.rfid_card,
            timestamp: data.timestamp,
          };

          // 广播RFID事件给所有前端客户端
          frontendClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(rfidEvent));
            }
          });
        }
      } else if (data.type === 'camera') {
        // 这是来自ESP32设备的图像数据
        if (!isDevice) {
          isDevice = true;
          frontendClients.delete(ws);
          devices.add(ws);
        }

        // 更新最新的图像数据
        latestImageData = data as CameraData;

        // 保存图像到文件
        saveImageToFile(data as CameraData);

        // 广播图像数据给所有前端客户端
        frontendClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      } else if (data.type === 'video_frame') {
        // 这是来自ESP32设备的视频帧数据
        if (!isDevice) {
          isDevice = true;
          frontendClients.delete(ws);
          devices.add(ws);
        }

        console.log('收到视频帧数据，长度:', data.imageData.length);

        // 广播视频帧数据给所有前端客户端
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
      } else if (data.type === 'camera_command') {
        // 这是来自前端的相机控制命令
        console.log(`收到相机命令: ${(data as CameraCommand).action}`);

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
 * 保存图像到文件
 * @param data 包含Base64编码图像的数据
 */
function saveImageToFile(data: CameraData) {
  try {
    // 从Base64字符串中提取图像数据
    const imgData = data.imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(imgData, 'base64');

    // 生成文件名 (使用时间戳以确保唯一性)
    const fileName = `image_${new Date().getTime()}.jpg`;
    const filePath = path.join(IMAGES_DIR, fileName);

    // 写入文件
    fs.writeFileSync(filePath, buffer);
    console.log(`图像已保存至: ${filePath}`);
  } catch (error) {
    console.error('保存图像时出错:', error);
  }
}

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
server.listen(PORT, () => {
  console.log(`WebSocket 服务器运行在端口 ${PORT}`);
});

// 优雅地处理进程终止
process.on('SIGINT', () => {
  server.close(() => {
    process.exit(0);
  });
});
