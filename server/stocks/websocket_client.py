import websocket
import json
import time
import requests
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("websocket_client.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("WebSocketClient")

# 配置
WEBSOCKET_URL = "ws://localhost:8080"  # WebSocket服务器地址
API_URL = "http://localhost:8000/api/sensor-data/add_data/"  # Django API地址

def on_message(ws, message):
    """
    处理接收到的WebSocket消息
    """
    try:
        # 解析JSON消息
        data = json.loads(message)
        logger.info(f"接收到数据: {data}")
        
        # 检查数据格式是否符合预期
        if data.get("type") == "emit" and "humidity" in data and "light" in data:
            # 确保时间戳存在，如果不存在则添加当前时间
            if "timestamp" not in data:
                data["timestamp"] = datetime.now().isoformat()
            
            # 发送数据到Django API
            response = requests.post(API_URL, json=data)
            
            if response.status_code == 201:
                logger.info(f"数据成功保存: {response.json()}")
            else:
                logger.error(f"保存数据失败: {response.text}, 状态码: {response.status_code}")
        else:
            logger.warning(f"收到的数据格式不符合预期: {data}")
    except json.JSONDecodeError:
        logger.error(f"解析JSON失败: {message}")
    except requests.RequestException as e:
        logger.error(f"API请求失败: {str(e)}")
    except Exception as e:
        logger.error(f"处理消息时发生未知错误: {str(e)}")

def on_error(ws, error):
    """
    处理WebSocket错误
    """
    logger.error(f"WebSocket错误: {str(error)}")

def on_close(ws, close_status_code, close_msg):
    """
    处理WebSocket连接关闭
    """
    logger.info(f"WebSocket连接关闭: {close_status_code} - {close_msg}")

def on_open(ws):
    """
    处理WebSocket连接打开
    """
    logger.info("WebSocket连接已打开")

def run_websocket_client():
    """
    运行WebSocket客户端
    """
    logger.info(f"尝试连接到WebSocket服务器: {WEBSOCKET_URL}")
    
    # 创建WebSocket连接
    ws = websocket.WebSocketApp(
        WEBSOCKET_URL,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close
    )
    
    # 设置永久运行，断开后自动重连
    while True:
        try:
            ws.run_forever()
            logger.info("WebSocket连接已断开，5秒后尝试重新连接...")
            time.sleep(5)
        except Exception as e:
            logger.error(f"WebSocket客户端运行错误: {str(e)}")
            logger.info("5秒后尝试重新连接...")
            time.sleep(5)

if __name__ == "__main__":
    run_websocket_client() 