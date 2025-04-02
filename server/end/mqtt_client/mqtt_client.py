import paho.mqtt.client as mqtt
import json
import logging
import socket
from django.conf import settings
from .models import STM32Data

logger = logging.getLogger(__name__)

class MQTTClient:
    """MQTT客户端，用于连接MQTT代理并处理消息"""
    
    def __init__(self):
        self.client = mqtt.Client(client_id=settings.MQTT_CLIENT_ID)
        
        # 设置回调
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.on_disconnect = self.on_disconnect
        
        # 如果设置了用户名密码，则进行认证
        if settings.MQTT_USERNAME and settings.MQTT_PASSWORD:
            self.client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)
    
    def check_port_available(self, host, port):
        """检查端口是否可用"""
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            sock.bind((host, port))
            sock.close()
            return True  # 端口可用
        except socket.error:
            sock.close()
            return False  # 端口被占用
    
    def connect(self):
        """连接到MQTT代理"""
        try:
            connect_host = settings.MQTT_BROKER_HOST
            
            # 如果配置的是0.0.0.0，则在客户端连接时使用localhost
            if connect_host == '0.0.0.0':
                logger.warning("检测到MQTT主机配置为0.0.0.0，客户端连接时将使用localhost代替")
                connect_host = 'localhost'
                
            # 检查MQTT端口是否被占用
            if host_is_localhost(connect_host) and not self.check_port_available(connect_host, settings.MQTT_BROKER_PORT):
                logger.warning(f"MQTT端口 {settings.MQTT_BROKER_PORT} 已被占用，假设已有MQTT代理服务器在运行")
                logger.info(f"尝试作为MQTT客户端连接到 {connect_host}:{settings.MQTT_BROKER_PORT}...")
            
            logger.info(f"正在连接到MQTT代理: {connect_host}:{settings.MQTT_BROKER_PORT}")
            self.client.connect(
                connect_host, 
                settings.MQTT_BROKER_PORT, 
                settings.MQTT_KEEPALIVE
            )
            self.client.loop_start()
            logger.info(f"MQTT客户端已连接到 {connect_host}:{settings.MQTT_BROKER_PORT}")
        except Exception as e:
            logger.error(f"MQTT连接失败: {str(e)}")
            raise
    
    def disconnect(self):
        """断开与MQTT代理的连接"""
        try:
            self.client.loop_stop()
            self.client.disconnect()
            logger.info("MQTT客户端已断开连接")
        except Exception as e:
            logger.error(f"断开MQTT连接时出错: {str(e)}")
    
    def on_connect(self, client, userdata, flags, rc):
        """连接回调，订阅主题"""
        connection_responses = {
            0: "连接成功",
            1: "连接被拒绝 - 不支持的MQTT协议版本",
            2: "连接被拒绝 - 无效的客户端标识符",
            3: "连接被拒绝 - 服务器不可用",
            4: "连接被拒绝 - 错误的用户名或密码",
            5: "连接被拒绝 - 未授权"
        }
        
        if rc == 0:
            logger.info(f"已成功连接到MQTT代理，正在订阅主题: {settings.MQTT_TOPIC}")
            client.subscribe(settings.MQTT_TOPIC)
        else:
            error_message = connection_responses.get(rc, f"未知错误代码: {rc}")
            logger.error(f"连接MQTT代理失败: {error_message}")
    
    def on_disconnect(self, client, userdata, rc):
        """断开连接回调"""
        if rc != 0:
            logger.warning(f"MQTT意外断开连接，返回码: {rc}，尝试重新连接...")
            try:
                self.connect()
            except Exception as e:
                logger.error(f"重新连接MQTT失败: {str(e)}")
    
    def on_message(self, client, userdata, msg):
        """消息接收回调"""
        try:
            payload = msg.payload.decode('utf-8', errors='replace')
            logger.info(f"从主题 {msg.topic} 接收到消息: {payload}")
            
            # 直接打印接收到的原始数据
            print(f"\n===== MQTT数据接收 =====")
            print(f"主题: {msg.topic}")
            print(f"数据: {payload}")
            print(f"QoS: {msg.qos}")
            print(f"=======================\n")
            
            # 存储接收到的消息
            STM32Data.objects.create(
                topic=msg.topic,
                payload=payload,
                qos=msg.qos
            )
            
            # 尝试解析JSON数据并处理
            try:
                payload_data = json.loads(payload)
                print(f">>> 解析为JSON: {json.dumps(payload_data, ensure_ascii=False, indent=2)}")
                self.process_message(payload_data)
            except json.JSONDecodeError:
                logger.warning(f"消息不是有效的JSON格式: {payload}")
                print(f">>> 非JSON格式数据")
                # 如果不是JSON，则作为原始数据处理
                self.process_raw_message(payload)
                
        except Exception as e:
            logger.error(f"处理MQTT消息时发生错误: {str(e)}")
            print(f"处理MQTT消息时发生错误: {str(e)}")
    
    def process_message(self, data):
        """处理JSON格式的消息"""
        logger.info(f"处理JSON消息: {data}")
        # 打印格式化的数据信息
        print(f"\n----- 处理JSON数据 -----")
        
        # 针对温湿度数据的特殊处理
        if isinstance(data, dict) and ('temperature' in data or 'humidity' in data):
            temp = data.get('temperature', 'N/A')
            humidity = data.get('humidity', 'N/A')
            print(f"温度: {temp}°C")
            print(f"湿度: {humidity}%")
        else:
            # 其他类型的JSON数据
            for key, value in data.items():
                print(f"{key}: {value}")
        
        print(f"-------------------------\n")
        # 这里可以根据实际需求处理JSON数据
        # 例如：更新状态、触发事件等
    
    def process_raw_message(self, data):
        """处理非JSON格式的原始消息"""
        logger.info(f"处理原始消息: {data}")
        
        print(f"\n----- 处理原始数据 -----")
        # 尝试提取常见格式的数据
        if "temperature" in data and "humidity" in data:
            # 尝试简单解析
            try:
                temp_start = data.find("temperature") + len("temperature")
                temp_end = data.find(",", temp_start)
                if temp_end == -1:
                    temp_end = data.find("}", temp_start)
                
                humidity_start = data.find("humidity") + len("humidity")
                humidity_end = data.find("}", humidity_start)
                
                temp = data[temp_start:temp_end].strip(': "\'')
                humidity = data[humidity_start:humidity_end].strip(': "\'')
                
                print(f"简易解析 - 温度: {temp}°C")
                print(f"简易解析 - 湿度: {humidity}%")
            except Exception as e:
                print(f"简易解析失败: {e}")
                print(f"原始数据: {data}")
        elif data.replace('.', '').strip().isdigit():
            print(f"数值数据: {data}")
        else:
            print(f"原始数据: {data}")
        
        print(f"-------------------------\n")
        # 这里可以根据实际需求处理原始数据
        # 例如：解析特定格式的数据、触发事件等

def host_is_localhost(host):
    """判断主机是否为本地主机"""
    return host in ['localhost', '127.0.0.1', '0.0.0.0']

# 创建一个全局实例
mqtt_client = MQTTClient() 