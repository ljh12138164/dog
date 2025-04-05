from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import get_user_model, authenticate, login, logout
from django.contrib.auth.models import Permission
from .models import Role, UserRole, LoginLog, SystemConfig
from rest_framework.parsers import MultiPartParser, FormParser
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .serializers import (
    UserSerializer, 
    UserDetailSerializer, 
    UserCreateSerializer,
    RoleSerializer, 
    PermissionSerializer,
    UserRoleSerializer,
    LoginLogSerializer,
    SystemConfigSerializer,
    LoginSerializer,
    RegisterSerializer,
    UserAvatarSerializer
)
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView
from django.utils import timezone

# JWT相关导入
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class IsAdminUser(permissions.BasePermission):
    """
    自定义权限类，只允许管理员访问
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.user_type == 'admin')


class IsInventoryManager(permissions.BasePermission):
    """
    自定义权限类，只允许库存管理员访问
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.user_type == 'inventory')


class IsProcurementManager(permissions.BasePermission):
    """
    自定义权限类，只允许采购经理访问
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.user_type == 'procurement')


class IsLogisticsManager(permissions.BasePermission):
    """
    自定义权限类，只允许物流管理员访问
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.user_type == 'logistics')


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    """
    用户登录视图 - 使用JWT认证
    """
    permission_classes = [permissions.AllowAny]
    
    @swagger_auto_schema(
        operation_summary="用户登录",
        operation_description="使用手机号登录并获取JWT Token",
        request_body=LoginSerializer,
        responses={
            200: openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'access': openapi.Schema(type=openapi.TYPE_STRING, description='访问令牌'),
                    'refresh': openapi.Schema(type=openapi.TYPE_STRING, description='刷新令牌'),
                    'user_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='用户ID'),
                    'user_type': openapi.Schema(type=openapi.TYPE_STRING, description='用户类型'),
                    'user': openapi.Schema(type=openapi.TYPE_OBJECT, description='用户信息'),
                }
            ),
            400: "登录失败，手机号或密码错误"
        }
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            phone = serializer.validated_data['phone']
            password = serializer.validated_data['password']
            
            # 查找手机号对应的用户
            try:
                user = User.objects.get(phone=phone)
                # 验证密码
                if user.check_password(password):
                    # 记录登录信息
                    login_log = LoginLog(
                        user_id=user.id,
                        ip_address=self.get_client_ip(request),
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        is_success=True
                    )
                    login_log.save()
                    
                    # 登录用户
                    login(request, user)
                    
                    # 生成JWT令牌
                    refresh = RefreshToken.for_user(user)
                    
                    # 返回JWT令牌和用户信息
                    return Response({
                        'refresh': str(refresh),
                        'access': str(refresh.access_token),
                        'user_id': user.id,
                        'user_type': user.user_type,
                        'user': UserSerializer(user).data
                    })
                else:
                    # 密码错误
                    login_log = LoginLog(
                        user_id=user.id,
                        ip_address=self.get_client_ip(request),
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        is_success=False
                    )
                    login_log.save()
                    return Response({"detail": "手机号或密码不正确"}, status=status.HTTP_400_BAD_REQUEST)
            except User.DoesNotExist:
                # 用户不存在
                login_log = LoginLog(
                    user_id=None,
                    ip_address=self.get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    is_success=False
                )
                login_log.save()
                return Response({"detail": "手机号或密码不正确"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


@method_decorator(csrf_exempt, name='dispatch')
class CustomTokenObtainPairView(TokenObtainPairView):
    """
    自定义JWT Token获取视图
    """
    @swagger_auto_schema(
        operation_summary="获取JWT令牌",
        operation_description="使用用户名和密码获取JWT令牌",
        responses={
            200: openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'access': openapi.Schema(type=openapi.TYPE_STRING, description='访问令牌'),
                    'refresh': openapi.Schema(type=openapi.TYPE_STRING, description='刷新令牌'),
                }
            )
        }
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


@method_decorator(csrf_exempt, name='dispatch')
class CustomTokenRefreshView(TokenRefreshView):
    """
    自定义JWT Token刷新视图
    """
    @swagger_auto_schema(
        operation_summary="刷新JWT令牌",
        operation_description="使用刷新令牌获取新的访问令牌",
        responses={
            200: openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'access': openapi.Schema(type=openapi.TYPE_STRING, description='新的访问令牌'),
                }
            )
        }
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(APIView):
    """
    用户注册视图
    """
    permission_classes = [permissions.AllowAny]
    
    @swagger_auto_schema(
        operation_summary="用户注册",
        operation_description="注册新用户",
        request_body=RegisterSerializer,
        responses={
            201: openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'refresh': openapi.Schema(type=openapi.TYPE_STRING, description='刷新令牌'),
                    'access': openapi.Schema(type=openapi.TYPE_STRING, description='访问令牌'),
                    'user': openapi.Schema(type=openapi.TYPE_OBJECT, description='用户信息'),
                }
            ),
            400: "注册失败，信息不完整或已存在"
        }
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # 生成JWT令牌
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """
    用户登出视图
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_summary="用户登出",
        operation_description="用户登出系统",
        responses={
            200: openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'detail': openapi.Schema(type=openapi.TYPE_STRING, description='登出成功')
                }
            )
        }
    )
    def post(self, request):
        # 登出用户，但JWT令牌依然有效
        # 在客户端，应该删除保存的令牌
        logout(request)
        return Response({"detail": "成功登出"})


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
        elif self.action == 'update_avatar':
            return UserAvatarSerializer
        return UserSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'list', 'destroy', 'update', 'partial_update']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    @swagger_auto_schema(
        method='get',
        operation_summary="获取当前登录用户信息",
        operation_description="返回当前登录用户的详细信息，包括角色",
        responses={200: UserDetailSerializer()}
    )
    @swagger_auto_schema(
        method='put',
        operation_summary="更新当前登录用户信息",
        operation_description="使用PUT方法完整更新当前用户信息",
        request_body=UserSerializer,
        responses={
            200: UserSerializer(),
            400: "更新失败，数据无效"
        }
    )
    @swagger_auto_schema(
        method='patch',
        operation_summary="部分更新当前登录用户信息",
        operation_description="使用PATCH方法部分更新当前用户信息",
        request_body=UserSerializer,
        responses={
            200: UserSerializer(),
            400: "更新失败，数据无效"
        }
    )   
    @action(detail=False, methods=['get', 'put', 'patch'])
    def me(self, request):
        """获取或更新当前登录用户信息"""
        if request.method == 'GET':
            serializer = UserDetailSerializer(request.user)
            return Response(serializer.data)
        elif request.method in ['PUT', 'PATCH']:
            serializer = UserSerializer(request.user, data=request.data, partial=request.method == 'PATCH')
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @swagger_auto_schema(
        operation_summary="更新用户头像",
        operation_description="上传并更新当前用户的头像",
        responses={
            200: UserAvatarSerializer(),
            400: "无效的图片格式"
        }
    )
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def update_avatar(self, request):
        """更新用户头像"""
        user = request.user
        serializer = UserAvatarSerializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
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
        if not request.user.user_type == 'admin':
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
        if not request.user.user_type == 'admin':
            return Response({"detail": "没有权限执行此操作"}, status=status.HTTP_403_FORBIDDEN)
        
        user = self.get_object()
        role_id = request.data.get('role_id')
        
        try:
            user_role = UserRole.objects.get(user=user, role_id=role_id)
        except UserRole.DoesNotExist:
            return Response({"detail": "该用户没有分配此角色"}, status=status.HTTP_404_NOT_FOUND)
        
        user_role.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @swagger_auto_schema(
        operation_summary="创建新用户",
        operation_description="创建一个新用户并返回用户信息",
        request_body=UserCreateSerializer,
        responses={
            201: UserSerializer(),
            400: "创建失败，数据无效"
        }
    )
    def create(self, request, *args, **kwargs):
        """创建新用户"""
        # 不需要特殊处理email了，让它保持为空字符串
        return super().create(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary="修改用户密码",
        operation_description="修改当前登录用户的密码",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['old_password', 'new_password', 'confirm_password'],
            properties={
                'old_password': openapi.Schema(type=openapi.TYPE_STRING, description='旧密码'),
                'new_password': openapi.Schema(type=openapi.TYPE_STRING, description='新密码'),
                'confirm_password': openapi.Schema(type=openapi.TYPE_STRING, description='确认新密码'),
            }
        ),
        responses={
            200: openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'detail': openapi.Schema(type=openapi.TYPE_STRING, description='密码修改成功')
                }
            ),
            400: "密码修改失败，旧密码错误或新密码不匹配"
        }
    )
    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """修改当前用户密码"""
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')
        
        # 验证旧密码
        if not user.check_password(old_password):
            return Response({"detail": "旧密码不正确"}, status=status.HTTP_400_BAD_REQUEST)
        
        # 验证新密码
        if new_password != confirm_password:
            return Response({"detail": "两次输入的新密码不一致"}, status=status.HTTP_400_BAD_REQUEST)
        
        # 设置新密码
        user.set_password(new_password)
        user.save()
        
        return Response({"detail": "密码修改成功"}, status=status.HTTP_200_OK)


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


class LoginLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    登录日志视图集(只读)
    
    提供登录日志的查询功能，仅管理员可访问
    """
    queryset = LoginLog.objects.all()
    serializer_class = LoginLogSerializer
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        queryset = LoginLog.objects.all()
        
        # 支持按用户过滤
        user_id = self.request.query_params.get('user_id', None)
        if user_id is not None:
            queryset = queryset.filter(user_id=user_id)
            
        # 支持按时间范围过滤
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        
        if start_date is not None:
            queryset = queryset.filter(login_time__gte=start_date)
            
        if end_date is not None:
            queryset = queryset.filter(login_time__lte=end_date)
            
        return queryset


class SystemConfigViewSet(viewsets.ModelViewSet):
    """
    系统配置视图集
    
    提供系统配置的增删改查功能，仅管理员可访问
    """
    queryset = SystemConfig.objects.all()
    serializer_class = SystemConfigSerializer
    permission_classes = [IsAdminUser]
    
    def perform_create(self, serializer):
        serializer.save(updated_by=self.request.user)
        
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class UserRoleViewSet(viewsets.ModelViewSet):
    """
    用户角色关联视图集
    
    提供用户角色关联的增删改查功能，仅管理员可访问
    """
    queryset = UserRole.objects.all()
    serializer_class = UserRoleSerializer
    permission_classes = [IsAdminUser]
    
    @swagger_auto_schema(
        operation_summary="获取用户角色关联",
        operation_description="获取所有用户角色关联信息",
        responses={200: UserRoleSerializer(many=True)}
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="创建用户角色关联",
        operation_description="创建新的用户角色关联",
        request_body=UserRoleSerializer,
        responses={201: UserRoleSerializer()}
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="获取用户角色关联详情",
        operation_description="获取指定ID的用户角色关联详情",
        responses={200: UserRoleSerializer()}
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="更新用户角色关联",
        operation_description="更新指定ID的用户角色关联",
        request_body=UserRoleSerializer,
        responses={200: UserRoleSerializer()}
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="删除用户角色关联",
        operation_description="删除指定ID的用户角色关联",
        responses={204: "删除成功"}
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


class UserMeView(APIView):
    """
    当前用户信息视图
    
    获取当前登录用户的详细信息
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_summary="获取当前登录用户信息",
        operation_description="返回当前登录用户的详细信息，包括角色",
        responses={200: UserDetailSerializer()}
    )
    def get(self, request):
        """获取当前登录用户信息"""
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data)
