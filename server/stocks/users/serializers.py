from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from .models import Role, UserRole

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
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone', 'avatar', 'is_active', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class UserDetailSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone', 'avatar', 'is_active', 'date_joined', 'roles']
        read_only_fields = ['id', 'date_joined']
    
    def get_roles(self, obj):
        user_roles = UserRole.objects.filter(user=obj)
        return RoleSerializer([user_role.role for user_role in user_roles], many=True).data


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    confirm_password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    
    class Meta:
        model = User
        fields = ['username', 'email', 'phone', 'password', 'confirm_password']
    
    def validate(self, attrs):
        if attrs['password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError("两次输入的密码不一致")
        return attrs
    
    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRole
        fields = ['id', 'user', 'role', 'created_at'] 