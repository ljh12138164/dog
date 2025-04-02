#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
启动脚本 - 同时启动MQTT代理服务器和Django
"""

import os
import sys
import time
import subprocess
import threading
import signal

# 设置基础目录
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def run_mqtt_broker():
    """启动MQTT代理服务器"""
    print("正在启动MQTT代理服务器...")
    mqtt_script = os.path.join(BASE_DIR, 'mqtt_client', 'example.py')
    
    # 确保脚本存在
    if not os.path.exists(mqtt_script):
        print(f"错误: MQTT脚本不存在: {mqtt_script}")
        return None
    
    # 启动MQTT代理服务器
    mqtt_process = subprocess.Popen([sys.executable, mqtt_script],
                                   stdout=subprocess.PIPE,
                                   stderr=subprocess.STDOUT,
                                   universal_newlines=True)
    
    print("MQTT代理服务器启动中...")
    
    # 等待服务器启动
    time.sleep(2)
    
    if mqtt_process.poll() is not None:
        print("MQTT代理服务器启动失败!")
        return None
    
    print("MQTT代理服务器已启动")
    return mqtt_process

def run_django_server():
    """启动Django开发服务器"""
    print("正在启动Django开发服务器...")
    manage_script = os.path.join(BASE_DIR, 'manage.py')
    
    # 确保脚本存在
    if not os.path.exists(manage_script):
        print(f"错误: Django管理脚本不存在: {manage_script}")
        return None
    
    # 启动Django服务器
    django_process = subprocess.Popen([sys.executable, manage_script, 'runserver'],
                                     stdout=subprocess.PIPE,
                                     stderr=subprocess.STDOUT,
                                     universal_newlines=True)
    
    print("Django开发服务器启动中...")
    
    # 等待服务器启动
    time.sleep(2)
    
    if django_process.poll() is not None:
        print("Django开发服务器启动失败!")
        return None
    
    print("Django开发服务器已启动")
    return django_process

def output_reader(process, prefix):
    """读取并显示进程输出"""
    for line in iter(process.stdout.readline, ''):
        print(f"[{prefix}] {line.strip()}")

def main():
    """主函数"""
    print("开始启动所有服务...")
    
    # 启动MQTT代理服务器
    mqtt_process = run_mqtt_broker()
    if mqtt_process is None:
        print("启动失败，退出程序")
        return
    
    # 创建MQTT输出线程
    mqtt_thread = threading.Thread(target=output_reader, args=(mqtt_process, "MQTT"), daemon=True)
    mqtt_thread.start()
    
    # 等待MQTT服务器完全启动
    time.sleep(3)
    
    # 启动Django服务器
    django_process = run_django_server()
    if django_process is None:
        print("启动失败，正在停止MQTT服务器...")
        mqtt_process.terminate()
        return
    
    # 创建Django输出线程
    django_thread = threading.Thread(target=output_reader, args=(django_process, "Django"), daemon=True)
    django_thread.start()
    
    print("\n所有服务已启动!")
    print("按 Ctrl+C 停止所有服务\n")
    
    # 处理信号，优雅地关闭进程
    def signal_handler(sig, frame):
        print("\n正在停止所有服务...")
        django_process.terminate()
        mqtt_process.terminate()
        print("所有服务已停止")
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    
    # 保持主线程运行
    try:
        while True:
            time.sleep(1)
            
            # 检查进程是否仍在运行
            if mqtt_process.poll() is not None:
                print("MQTT代理服务器已停止，正在终止所有服务...")
                if django_process.poll() is None:
                    django_process.terminate()
                break
            
            if django_process.poll() is not None:
                print("Django服务器已停止，正在终止所有服务...")
                if mqtt_process.poll() is None:
                    mqtt_process.terminate()
                break
            
    except KeyboardInterrupt:
        pass
    finally:
        # 确保进程被终止
        if mqtt_process.poll() is None:
            mqtt_process.terminate()
        if django_process.poll() is None:
            django_process.terminate()
        
        print("所有服务已停止")

if __name__ == "__main__":
    main() 