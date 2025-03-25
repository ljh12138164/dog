from rest_framework import serializers
from .models import Dog

class DogSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    image_url = serializers.SerializerMethodField()
    height = serializers.FloatField()
    weight = serializers.FloatField()
    
    class Meta:
        model = Dog
        fields = ['id', 'name', 'breed', 'height', 'weight', 'owner', 'owner_username', 'image', 'image_url', 'created_at', 'updated_at']
        read_only_fields = ['owner', 'created_at', 'updated_at']
        
    def get_image_url(self, obj):
        if obj.image:
            return self.context['request'].build_absolute_uri(obj.image.url)
        return None
        
    def validate(self, data):
        """确保高度和体重是有效的浮点数"""
        # 处理高度
        if 'height' in data and isinstance(data['height'], str):
            try:
                data['height'] = float(data['height'])
            except ValueError:
                raise serializers.ValidationError({"height": "身高必须是有效的数字"})
                
        # 处理体重
        if 'weight' in data and isinstance(data['weight'], str):
            try:
                data['weight'] = float(data['weight'])
            except ValueError:
                raise serializers.ValidationError({"weight": "体重必须是有效的数字"})
                
        return data

class DogImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField() 