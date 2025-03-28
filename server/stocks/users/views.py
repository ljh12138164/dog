from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from .models import Role, UserRole
from .serializers import (
    UserSerializer, 
    UserDetailSerializer, 
    UserCreateSerializer,
    RoleSerializer, 
    PermissionSerializer,
    UserRoleSerializer
)
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

User = get_user_model()


class IsAdminUser(permissions.BasePermission):
    """
    自定义权限类，只允许管理员访问
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_staff)


class UserViewSet(viewsets.ModelViewSet):
    """
    用户管理视图集
    
    提供用户的增删改查，以及角色分配等操作
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action == 'retrieve':
            return UserDetailSerializer
        return UserSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'list', 'destroy', 'update', 'partial_update']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    @swagger_auto_schema(
        operation_summary="获取当前登录用户信息",
        operation_description="返回当前登录用户的详细信息，包括角色",
        responses={200: UserDetailSerializer()}
    )
    @action(detail=False, methods=['get'])
    def me(self, request):
        """获取当前登录用户信息"""
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data)
    
    @swagger_auto_schema(
        operation_summary="为用户分配角色",
        operation_description="为指定用户分配一个角色",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['role_id'],
            properties={
                'role_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='角色ID')
            }
        ),
        responses={
            201: UserRoleSerializer(),
            400: "角色已分配",
            403: "权限不足",
            404: "角色不存在"
        }
    )
    @action(detail=True, methods=['post'])
    def assign_role(self, request, pk=None):
        """为用户分配角色"""
        if not request.user.is_staff:
            return Response({"detail": "没有权限执行此操作"}, status=status.HTTP_403_FORBIDDEN)
        
        user = self.get_object()
        role_id = request.data.get('role_id')
        
        try:
            role = Role.objects.get(id=role_id)
        except Role.DoesNotExist:
            return Response({"detail": "角色不存在"}, status=status.HTTP_404_NOT_FOUND)
        
        # 检查是否已分配
        if UserRole.objects.filter(user=user, role=role).exists():
            return Response({"detail": "该角色已分配给此用户"}, status=status.HTTP_400_BAD_REQUEST)
        
        user_role = UserRole.objects.create(user=user, role=role)
        serializer = UserRoleSerializer(user_role)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @swagger_auto_schema(
        operation_summary="移除用户的角色",
        operation_description="移除指定用户的一个角色",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['role_id'],
            properties={
                'role_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='角色ID')
            }
        ),
        responses={
            204: "角色移除成功",
            403: "权限不足",
            404: "用户未分配该角色"
        }
    )
    @action(detail=True, methods=['post'])
    def remove_role(self, request, pk=None):
        """移除用户的角色"""
        if not request.user.is_staff:
            return Response({"detail": "没有权限执行此操作"}, status=status.HTTP_403_FORBIDDEN)
        
        user = self.get_object()
        role_id = request.data.get('role_id')
        
        try:
            user_role = UserRole.objects.get(user=user, role_id=role_id)
        except UserRole.DoesNotExist:
            return Response({"detail": "该用户没有分配此角色"}, status=status.HTTP_404_NOT_FOUND)
        
        user_role.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RoleViewSet(viewsets.ModelViewSet):
    """
    角色管理视图集
    
    提供角色的增删改查，以及权限分配等操作
    """
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAdminUser]
    
    @swagger_auto_schema(
        operation_summary="为角色添加权限",
        operation_description="为指定角色添加一个权限",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['permission_id'],
            properties={
                'permission_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='权限ID')
            }
        ),
        responses={
            204: "权限添加成功",
            400: "该角色已有此权限",
            404: "权限不存在"
        }
    )
    @action(detail=True, methods=['post'])
    def add_permission(self, request, pk=None):
        """为角色添加权限"""
        role = self.get_object()
        permission_id = request.data.get('permission_id')
        
        try:
            permission = Permission.objects.get(id=permission_id)
        except Permission.DoesNotExist:
            return Response({"detail": "权限不存在"}, status=status.HTTP_404_NOT_FOUND)
        
        if permission in role.permissions.all():
            return Response({"detail": "该角色已有此权限"}, status=status.HTTP_400_BAD_REQUEST)
        
        role.permissions.add(permission)
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @swagger_auto_schema(
        operation_summary="从角色中移除权限",
        operation_description="从指定角色中移除一个权限",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['permission_id'],
            properties={
                'permission_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='权限ID')
            }
        ),
        responses={
            204: "权限移除成功",
            400: "该角色没有此权限",
            404: "权限不存在"
        }
    )
    @action(detail=True, methods=['post'])
    def remove_permission(self, request, pk=None):
        """从角色中移除权限"""
        role = self.get_object()
        permission_id = request.data.get('permission_id')
        
        try:
            permission = Permission.objects.get(id=permission_id)
        except Permission.DoesNotExist:
            return Response({"detail": "权限不存在"}, status=status.HTTP_404_NOT_FOUND)
        
        if permission not in role.permissions.all():
            return Response({"detail": "该角色没有此权限"}, status=status.HTTP_400_BAD_REQUEST)
        
        role.permissions.remove(permission)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    权限视图集(只读)
    
    提供权限的查询功能
    """
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAdminUser]
