#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
简单的MQTT代理服务器实现 - 增强版
该脚本实现了一个简单的MQTT服务器，用于接收STM32+ESP8266发送的温湿度数据
增加了更多的调试信息和错误处理，特别针对ESP8266 MQTT透传AT固件
"""

import os
import sys
import time
import json
import socket
import threading
import struct
import binascii
import paho.mqtt.client as mqtt

# 开启调试模式
DEBUG = True

# MQTT服务器配置
MQTT_BROKER_HOST = "0.0.0.0"  # 监听所有网络接口
MQTT_BROKER_PORT = 1883       # MQTT服务器端口
MQTT_TOPIC = "stm32/dht11"    # 订阅的主题
MQTT_CLIENT_ID = "python-mqtt-server"

# 存储消息的字典
messages = {}
clients = []
broker_running = True

# 调试打印函数
def debug_print(message, data=None):
    if DEBUG:
        print(f"[DEBUG] {message}")
        if data and isinstance(data, bytes):
            print(f"[DEBUG] 二进制数据: {binascii.hexlify(data).decode()}")
        elif data:
            print(f"[DEBUG] 数据: {data}")

# 简单的MQTT服务器实现
class SimpleMQTTBroker:
    def __init__(self, host='0.0.0.0', port=1883):
        self.host = host
        self.port = port
        self.socket = None
        self.clients = []
        self.topics = {}
        self.running = False
    
    def start(self):
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            self.socket.bind((self.host, self.port))
            self.socket.listen(5)
            self.running = True
            print(f"MQTT代理服务器已启动，监听 {self.host}:{self.port}")
            
            while self.running:
                try:
                    client_socket, address = self.socket.accept()
                    print(f"客户端连接: {address}")
                    client_thread = threading.Thread(target=self.handle_client, args=(client_socket, address))
                    client_thread.daemon = True
                    client_thread.start()
                except Exception as e:
                    if self.running:  # 只有在服务器运行时才打印错误
                        print(f"接受连接时出错: {e}")
        except Exception as e:
            print(f"启动服务器时出错: {e}")
        finally:
            if self.socket:
                self.socket.close()
    
    def stop(self):
        self.running = False
        if self.socket:
            try:
                # 创建一个连接以解除accept()阻塞
                socket.socket(socket.AF_INET, socket.SOCK_STREAM).connect((self.host, self.port))
                self.socket.close()
            except:
                pass
        print("MQTT代理服务器已停止")
    
    def handle_client(self, client_socket, address):
        try:
            # 处理MQTT连接
            self.handle_mqtt_connection(client_socket, address)
        except Exception as e:
            print(f"处理客户端 {address} 时出错: {e}")
        finally:
            try:
                client_socket.close()
            except:
                pass
    
    def handle_mqtt_connection(self, client_socket, address):
        # 读取固定头
        try:
            packet_type = client_socket.recv(1)
            if not packet_type:
                debug_print("接收到空数据包")
                return
            
            debug_print(f"接收到数据包类型: {packet_type[0] >> 4}", packet_type)
            
            # 检查是否是CONNECT数据包 (MQTT CONNECT 包类型是 1)
            if packet_type[0] >> 4 == 1:
                debug_print("接收到CONNECT包")
                # 读取剩余长度
                multiplier = 1
                value = 0
                while True:
                    encoded_byte = client_socket.recv(1)
                    if not encoded_byte:
                        debug_print("读取长度字节时连接断开")
                        return
                    
                    debug_print(f"长度字节: {encoded_byte[0]}", encoded_byte)
                    value += (encoded_byte[0] & 127) * multiplier
                    if not (encoded_byte[0] & 128):
                        break
                    multiplier *= 128
                
                debug_print(f"CONNECT包剩余长度: {value}")
                
                # 读取剩余的连接数据包
                connect_data = client_socket.recv(value)
                debug_print("CONNECT数据", connect_data)
                
                # 尝试提取客户端ID
                try:
                    protocol_name_len = (connect_data[0] << 8) | connect_data[1]
                    protocol_name = connect_data[2:2+protocol_name_len].decode('utf-8')
                    debug_print(f"协议名称: {protocol_name}, 长度: {protocol_name_len}")
                except Exception as e:
                    debug_print(f"解析协议名称出错: {e}")
                
                # 发送CONNACK数据包 (返回连接成功)
                connack = bytearray([0x20, 0x02, 0x00, 0x00])
                client_socket.send(connack)
                print(f"客户端 {address} 已连接，已发送CONNACK")
                
                # 持续处理客户端请求
                while True:
                    try:
                        # 读取下一个数据包类型
                        packet_type = client_socket.recv(1)
                        if not packet_type:
                            debug_print("连接已关闭")
                            break
                        
                        debug_print(f"接收到数据包类型: {packet_type[0] >> 4}", packet_type)
                        
                        # 读取剩余长度
                        multiplier = 1
                        value = 0
                        while True:
                            encoded_byte = client_socket.recv(1)
                            if not encoded_byte:
                                debug_print("读取长度字节时连接断开")
                                return
                            
                            debug_print(f"长度字节: {encoded_byte[0]}", encoded_byte)
                            value += (encoded_byte[0] & 127) * multiplier
                            if not (encoded_byte[0] & 128):
                                break
                            multiplier *= 128
                        
                        debug_print(f"数据包剩余长度: {value}")
                        
                        # 读取剩余的数据包
                        packet_data = client_socket.recv(value)
                        debug_print("数据包内容", packet_data)
                        
                        # 处理PUBLISH数据包 (MQTT PUBLISH 包类型是 3)
                        if packet_type[0] >> 4 == 3:
                            debug_print("收到PUBLISH包")
                            try:
                                # 解析主题长度
                                if len(packet_data) >= 2:
                                    topic_length = (packet_data[0] << 8) | packet_data[1]
                                    debug_print(f"主题长度: {topic_length}")
                                    
                                    # 提取主题
                                    if 2+topic_length <= len(packet_data):
                                        topic = packet_data[2:2+topic_length].decode('utf-8', errors='replace')
                                        debug_print(f"主题: {topic}")
                                        
                                        # 提取消息
                                        message_data = packet_data[2+topic_length:]
                                        
                                        # 尝试不同的编码方式解码消息
                                        try:
                                            message = message_data.decode('utf-8', errors='replace')
                                        except:
                                            try:
                                                message = message_data.decode('ascii', errors='replace')
                                            except:
                                                message = binascii.hexlify(message_data).decode()
                                        
                                        print(f"收到PUBLISH，主题: {topic}, 消息: {message}")
                                        
                                        # 触发本地MQTT客户端的回调
                                        process_message(topic, message)
                                    else:
                                        debug_print(f"主题长度超出数据包大小: {topic_length} > {len(packet_data)-2}")
                                else:
                                    debug_print("数据包太短，无法读取主题长度")
                            except Exception as e:
                                debug_print(f"处理PUBLISH数据包出错: {e}")
                                
                        # 处理PINGREQ数据包 (MQTT PINGREQ 包类型是 12)
                        elif packet_type[0] >> 4 == 12:
                            debug_print("收到PINGREQ包，发送PINGRESP")
                            pingresp = bytearray([0xD0, 0x00])
                            client_socket.send(pingresp)
                    except Exception as e:
                        debug_print(f"处理客户端消息时出错: {e}")
                        break
        except Exception as e:
            debug_print(f"处理MQTT连接时出错: {e}")

# 处理MQTT消息的函数
def process_message(topic, payload):
    try:
        print(f"处理主题 {topic} 的消息: {payload}")
        
        # 如果不是目标主题，直接返回
        if topic != MQTT_TOPIC and topic.strip() != MQTT_TOPIC.strip():
            debug_print(f"主题不匹配: 收到 '{topic}'，期望 '{MQTT_TOPIC}'")
            return
        
        # 尝试解析 JSON
        try:
            # 处理可能的格式问题
            # 尝试修复常见的JSON格式错误
            fixed_payload = payload.strip()
            if fixed_payload.startswith('"') and fixed_payload.endswith('"'):
                # 去除外层引号
                fixed_payload = fixed_payload[1:-1]
            
            # 替换单引号为双引号
            fixed_payload = fixed_payload.replace("'", '"')
            
            # 尝试解析
            data = json.loads(fixed_payload)
            print(f"温度: {data.get('temperature', 'N/A')}°C, 湿度: {data.get('humidity', 'N/A')}%")
            
            # 这里可以添加数据存储逻辑，如写入数据库等
            
        except json.JSONDecodeError as e:
            print(f"收到的消息不是JSON格式: {payload}")
            debug_print(f"JSON解析错误: {e}, 原始数据: {payload}")
            
            # 尝试处理非JSON格式
            if "temperature" in payload and "humidity" in payload:
                # 尝试通过简单解析提取数据
                try:
                    temp_start = payload.find("temperature") + len("temperature") + 1
                    temp_end = payload.find(",", temp_start)
                    if temp_end == -1:
                        temp_end = payload.find("}", temp_start)
                    
                    humidity_start = payload.find("humidity") + len("humidity") + 1
                    humidity_end = payload.find("}", humidity_start)
                    
                    temp = payload[temp_start:temp_end].strip(': "\'')
                    humidity = payload[humidity_start:humidity_end].strip(': "\'')
                    
                    print(f"简易解析 - 温度: {temp}°C, 湿度: {humidity}%")
                except Exception as e:
                    debug_print(f"简易解析失败: {e}")
            
            # 如果消息只包含数字，可能是传感器直接值
            elif payload.strip().replace('.', '').isdigit():
                print(f"收到的可能是单个数值: {payload}")
    
    except Exception as e:
        print(f"处理消息时出错: {e}")

# 启动简易MQTT代理服务器
def start_broker_server():
    broker = SimpleMQTTBroker(MQTT_BROKER_HOST, MQTT_BROKER_PORT)
    try:
        broker.start()
    except KeyboardInterrupt:
        broker.stop()
    except Exception as e:
        print(f"MQTT代理服务器出错: {e}")
    finally:
        broker.stop()

# 主函数
def main():
    print("启动简易MQTT代理服务器...")
    # 在后台线程启动MQTT代理服务器
    broker_thread = threading.Thread(target=start_broker_server, daemon=True)
    broker_thread.start()
    
    print(f"MQTT代理服务器已启动，监听端口: {MQTT_BROKER_PORT}")
    print(f"等待来自 {MQTT_TOPIC} 的消息")
    
    try:
        # 保持程序运行
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("程序已停止")

if __name__ == "__main__":
    # 检查是否安装了所需的库
    try:
        import paho.mqtt.client
    except ImportError:
        print("请先安装paho-mqtt库: pip install paho-mqtt")
        sys.exit(1)
    
    main()

"""
简易MQTT服务器使用说明：

1. 安装Python依赖：
   pip install paho-mqtt

2. 运行此脚本启动内置MQTT代理服务器：
   python 1.py

3. 配置ESP8266连接到本MQTT服务器：
   - 获取运行此脚本的电脑IP地址 (使用ipconfig命令查看)
   - 使用以下AT指令配置ESP8266:
   
   基本AT指令:
   AT+MQTTUSERCFG=0,1,"ESP8266","","",0,0,""
   AT+MQTTCONN=0,"电脑IP地址",1883,0
   AT+MQTTPUB=0,"stm32/dht11","Hello_World",0,0
   
   尝试简化指令(如果上面的不工作):
   AT+MQTTCONN="电脑IP地址",1883
   AT+MQTTPUB="stm32/dht11","Hello_World"
   
   温湿度数据发送示例:
   AT+MQTTPUB=0,"stm32/dht11","{"temperature": 25.5, "humidity": 60.2}",0,0

4. 调试模式:
   - 如果需要查看更多调试信息，将代码中的DEBUG = True保持开启
   - 如遇问题，查看调试输出可能帮助定位问题

5. 透传模式（部分固件支持）:
   - 设置透传: AT+CIPMODE=1
   - 开始透传: AT+CIPSEND
   - 然后直接发送MQTT数据包

6. 当ESP8266发送数据时，此脚本会自动接收并显示温湿度数据

注意：
- 此实现是一个简化版的MQTT代理服务器，只处理基本的发布/订阅功能
- 支持ESP8266使用AT指令连接并发布消息
- 此脚本会同时在控制台显示接收到的温湿度数据
- 如果正常AT指令无效，请参考ESP8266 MQTT透传AT固件的具体文档
"""





