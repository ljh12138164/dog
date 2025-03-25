from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework.validators import UniqueValidator
from .models import UserProfile

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'password2', 'email', 'first_name', 'last_name')
        extra_kwargs = {
            'first_name': {'required': False},
            'last_name': {'required': False},
            'username': {'required': False},
            'email': {'required': True, 'validators': [UniqueValidator(
                queryset=User.objects.all(),
                message="该邮箱已被注册。"
            )]}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "密码不匹配"})
        
        email = attrs.get('email')
        username = attrs.get('username')
        
        # 如果没有提供用户名，则使用邮箱前缀作为用户名
        if not username and email:
            username = email.split('@')[0]
            
            # 检查用户名是否已存在，如果存在则添加随机数字
            from django.utils.crypto import get_random_string
            base_username = username
            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{get_random_string(length=5, allowed_chars='0123456789')}"
            
            attrs['username'] = username
            
        return attrs

    def create(self, validated_data):
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        
        user.set_password(validated_data['password'])
        user.save()
        
        return user

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ('avatar',)

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    date_joined = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    last_login = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    avatar = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 
                 'full_name', 'date_joined', 'last_login', 'is_active', 'avatar')
    
    def get_full_name(self, obj):
        if obj.first_name or obj.last_name:
            return f"{obj.first_name} {obj.last_name}".strip()
        return obj.username
        
    def get_avatar(self, obj):
        # 检查用户是否有头像
        # 如果是AnonymousUser，直接返回None
        if not obj or not obj.id or not hasattr(obj, 'id'):
            return None
            
        request = self.context.get('request')
        try:
            # 尝试通过UserProfile模型获取头像
            profile = UserProfile.objects.filter(user=obj).first()
            if profile and profile.avatar and hasattr(profile.avatar, 'url'):
                # 如果有请求上下文，则返回完整URL
                if request:
                    return request.build_absolute_uri(profile.avatar.url)
                return profile.avatar.url
        except Exception:
            # 任何异常都返回None
            pass
        # 如果没有头像，返回None
        return None 