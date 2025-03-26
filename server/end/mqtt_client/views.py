from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import STM32Data
from .serializers import STM32DataSerializer
from .mqtt_client import mqtt_client
import logging

logger = logging.getLogger(__name__)

class STM32DataViewSet(viewsets.ModelViewSet):
    """STM32数据的API视图集"""
    queryset = STM32Data.objects.all()
    serializer_class = STM32DataSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        """根据不同的操作设置不同的权限"""
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]
    
    @action(detail=False, methods=['post'])
    def start_mqtt(self, request):
        """启动MQTT客户端"""
        try:
            mqtt_client.connect()
            return Response({"status": "MQTT客户端已启动"}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"启动MQTT客户端失败: {str(e)}")
            return Response(
                {"error": f"启动MQTT客户端失败: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def stop_mqtt(self, request):
        """停止MQTT客户端"""
        try:
            mqtt_client.disconnect()
            return Response({"status": "MQTT客户端已停止"}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"停止MQTT客户端失败: {str(e)}")
            return Response(
                {"error": f"停止MQTT客户端失败: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def latest_data(self, request):
        """获取最新的数据记录"""
        try:
            latest = STM32Data.objects.first()  # 因为我们在Meta中设置了按时间戳倒序排列
            if latest:
                serializer = self.get_serializer(latest)
                return Response(serializer.data)
            return Response({"message": "没有找到数据"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"获取最新数据失败: {str(e)}")
            return Response(
                {"error": f"获取最新数据失败: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
