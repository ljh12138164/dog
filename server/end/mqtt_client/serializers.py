from rest_framework import serializers
from .models import STM32Data

class STM32DataSerializer(serializers.ModelSerializer):
    """STM32数据的序列化器"""
    class Meta:
        model = STM32Data
        fields = ['id', 'topic', 'payload', 'qos', 'timestamp']
        read_only_fields = ['timestamp'] 