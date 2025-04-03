from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from .models import Role, UserRole, LoginLog, SystemConfig

User = get_user_model()


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'name', 'codename']


class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'permissions', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    user_type_display = serializers.CharField(source='get_user_type_display', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone', 'avatar', 'is_active', 'user_type', 'user_type_display', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class UserDetailSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    user_type_display = serializers.CharField(source='get_user_type_display', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone', 'avatar', 'is_active', 'user_type', 'user_type_display', 'date_joined', 'roles']
        read_only_fields = ['id', 'date_joined']
    
    def get_roles(self, obj):
        user_roles = UserRole.objects.filter(user=obj)
        return RoleSerializer([user_role.role for user_role in user_roles], many=True).data


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    confirm_password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    email = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'phone', 'password', 'confirm_password', 'user_type']
    
    def validate(self, attrs):
        if attrs['password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError("两次输入的密码不一致")
        
        # 验证手机号是否已经被使用
        phone = attrs.get('phone')
        if phone and User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError({"phone": "该手机号已被注册"})
        
        # 验证email格式（如果不为空）
        email = attrs.get('email')
        if email and email.strip():
            from django.core.validators import validate_email
            from django.core.exceptions import ValidationError
            try:
                validate_email(email)
            except ValidationError:
                raise serializers.ValidationError({"email": "请输入有效的邮箱地址"})
            
        return attrs
    
    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRole
        fields = ['id', 'user', 'role', 'created_at']


class LoginLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = LoginLog
        fields = ['id', 'user', 'username', 'ip_address', 'user_agent', 'login_time', 'is_success']
        read_only_fields = ['id', 'login_time']


class SystemConfigSerializer(serializers.ModelSerializer):
    updated_by_username = serializers.CharField(source='updated_by.username', read_only=True)
    
    class Meta:
        model = SystemConfig
        fields = ['id', 'key', 'value', 'description', 'created_at', 'updated_at', 'updated_by', 'updated_by_username']
        read_only_fields = ['id', 'created_at', 'updated_at']


class LoginSerializer(serializers.Serializer):
    phone = serializers.CharField(required=True)
    password = serializers.CharField(required=True, style={'input_type': 'password'}, write_only=True)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    confirm_password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    email = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = ['phone', 'email', 'password', 'confirm_password']
    
    def validate(self, attrs):
        if attrs['password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError("两次输入的密码不一致")
            
        # 验证手机号是否已经被使用
        phone = attrs.get('phone')
        if phone and User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError({"phone": "该手机号已被注册"})
            
        # 验证email格式（如果不为空）
        email = attrs.get('email')
        if email and email.strip():
            from django.core.validators import validate_email
            from django.core.exceptions import ValidationError
            try:
                validate_email(email)
            except ValidationError:
                raise serializers.ValidationError({"email": "请输入有效的邮箱地址"})
            
        # 自动生成用户名
        attrs['username'] = f"user_{phone}"
        
        return attrs
    
    def create(self, validated_data):
        # 默认注册为普通员工
        return User.objects.create_user(**validated_data, user_type='employee')


class UserAvatarSerializer(serializers.ModelSerializer):
    """用户头像更新序列化器"""
    
    class Meta:
        model = User
        fields = ['avatar']
        
    def update(self, instance, validated_data):
        # 如果有新头像上传，先删除旧头像
        if 'avatar' in validated_data and instance.avatar:
            try:
                # 尝试删除旧图片文件
                import os
                if os.path.isfile(instance.avatar.path):
                    os.remove(instance.avatar.path)
            except Exception as e:
                pass
        
        # 更新头像
        instance.avatar = validated_data.get('avatar', instance.avatar)
        instance.save()
        return instance 