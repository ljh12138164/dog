from django.apps import AppConfig
import os


class MqttClientConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'mqtt_client'
    
    def ready(self):
        # 仅在主进程中运行，避免在Django开发服务器的自动重载进程中重复运行
        if os.environ.get('RUN_MAIN', None) != 'true':
            # 导入mqtt_client必须在这里进行，以避免循环导入
            from .mqtt_client import mqtt_client
            # 在生产环境中，可以自动启动MQTT客户端
            # mqtt_client.connect()
            # 对于开发环境，我们提供一个API端点来手动启动和停止MQTT客户端
            pass
