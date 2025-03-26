from django.core.management.base import BaseCommand
from mqtt_client.mqtt_client import mqtt_client
import time
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = '启动MQTT客户端，连接到MQTT代理并开始监听消息'
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('启动MQTT客户端...'))
        
        try:
            # 连接到MQTT代理
            mqtt_client.connect()
            self.stdout.write(self.style.SUCCESS('MQTT客户端已启动并连接到代理'))
            
            # 让命令保持运行状态，以便MQTT客户端可以继续处理消息
            self.stdout.write(self.style.WARNING('按CTRL+C退出'))
            
            try:
                # 无限循环保持命令运行
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                # 如果接收到中断信号，则断开连接
                mqtt_client.disconnect()
                self.stdout.write(self.style.SUCCESS('MQTT客户端已停止'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'启动MQTT客户端失败: {str(e)}'))
            logger.error(f'启动MQTT客户端失败: {str(e)}')
            return 