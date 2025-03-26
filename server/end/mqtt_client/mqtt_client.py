import paho.mqtt.client as mqtt
import json
import logging
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
    
    def connect(self):
        """连接到MQTT代理"""
        try:
            self.client.connect(
                settings.MQTT_BROKER_HOST, 
                settings.MQTT_BROKER_PORT, 
                settings.MQTT_KEEPALIVE
            )
            self.client.loop_start()
            logger.info(f"MQTT客户端已连接到 {settings.MQTT_BROKER_HOST}:{settings.MQTT_BROKER_PORT}")
        except Exception as e:
            logger.error(f"MQTT连接失败: {str(e)}")
    
    def disconnect(self):
        """断开与MQTT代理的连接"""
        self.client.loop_stop()
        self.client.disconnect()
        logger.info("MQTT客户端已断开连接")
    
    def on_connect(self, client, userdata, flags, rc):
        """连接回调，订阅主题"""
        if rc == 0:
            logger.info(f"已成功连接到MQTT代理，正在订阅主题: {settings.MQTT_TOPIC}")
            client.subscribe(settings.MQTT_TOPIC)
        else:
            logger.error(f"连接MQTT代理失败，返回码: {rc}")
    
    def on_disconnect(self, client, userdata, rc):
        """断开连接回调"""
        if rc != 0:
            logger.warning(f"MQTT意外断开连接，返回码: {rc}，尝试重新连接...")
            self.connect()
    
    def on_message(self, client, userdata, msg):
        """消息接收回调"""
        try:
            logger.info(f"从主题 {msg.topic} 接收到消息: {msg.payload.decode()}")
            
            # 存储接收到的消息
            STM32Data.objects.create(
                topic=msg.topic,
                payload=msg.payload.decode(),
                qos=msg.qos
            )
            
            # 尝试解析JSON数据并处理
            try:
                payload_data = json.loads(msg.payload.decode())
                self.process_message(payload_data)
            except json.JSONDecodeError:
                logger.warning(f"消息不是有效的JSON格式: {msg.payload.decode()}")
                # 如果不是JSON，则作为原始数据处理
                self.process_raw_message(msg.payload.decode())
                
        except Exception as e:
            logger.error(f"处理MQTT消息时发生错误: {str(e)}")
    
    def process_message(self, data):
        """处理JSON格式的消息"""
        logger.info(f"处理JSON消息: {data}")
        # 这里可以根据实际需求处理JSON数据
        # 例如：更新状态、触发事件等
    
    def process_raw_message(self, data):
        """处理非JSON格式的原始消息"""
        logger.info(f"处理原始消息: {data}")
        # 这里可以根据实际需求处理原始数据
        # 例如：解析特定格式的数据、触发事件等

# 创建一个全局实例
mqtt_client = MQTTClient() 