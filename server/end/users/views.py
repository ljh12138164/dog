from django.shortcuts import render
from rest_framework import generics, permissions, status, parsers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from .serializers import RegisterSerializer, UserSerializer, UserProfileSerializer
from .models import UserProfile
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
import logging

# 设置日志记录器
logger = logging.getLogger(__name__)

# Create your views here.

class RegisterView(generics.CreateAPIView):
    """
    用户注册API
    """
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

    @swagger_auto_schema(
        operation_description="创建新用户",
        responses={201: "用户注册成功"}
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # 为新用户创建Token
        token, created = Token.objects.get_or_create(user=user)
        
        # 记录注册成功的用户信息
        logger.info(f"用户注册成功: id={user.id}, username={user.username}, email={user.email}")
        
        return Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'token': token.key,
            'message': '注册成功'
        }, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    """
    用户登录API - 使用邮箱和密码
    """
    permission_classes = (permissions.AllowAny,)

    @swagger_auto_schema(
        operation_description="用户登录",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'email': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_EMAIL),
                'password': openapi.Schema(type=openapi.TYPE_STRING),
            },
            required=['email', 'password']
        ),
        responses={
            200: "登录成功",
            401: "登录失败"
        }
    )
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        # 记录登录尝试
        logger.info(f"登录尝试: email={email}")
        
        if not email or not password:
            return Response({
                'message': '邮箱和密码不能为空'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 尝试通过邮箱找到用户
        try:
            user = User.objects.get(email=email)
            logger.info(f"通过邮箱找到用户: username={user.username}")
            
            # 使用用户名来验证
            authenticated_user = authenticate(username=user.username, password=password)
            
            if authenticated_user:
                # 获取或创建用户Token
                token, created = Token.objects.get_or_create(user=authenticated_user)
                
                serializer = UserSerializer(authenticated_user, context={'request': request})
                logger.info(f"用户登录成功: username={authenticated_user.username}")
                
                return Response({
                    'user': serializer.data, 
                    'token': token.key,
                    'message': '登录成功'
                })
            else:
                logger.warning(f"密码验证失败: username={user.username}")
                return Response({'message': '密码不正确'}, status=status.HTTP_401_UNAUTHORIZED)
                
        except User.DoesNotExist:
            logger.warning(f"邮箱不存在: email={email}")
            return Response({'message': '该邮箱未注册'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            logger.error(f"登录过程中发生错误: {str(e)}")
            return Response({'message': f'登录失败: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({'message': '无效的邮箱或密码'}, status=status.HTTP_401_UNAUTHORIZED)

class UserDetailView(generics.RetrieveAPIView):
    """
    用户详情API
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = (permissions.AllowAny,)

    @swagger_auto_schema(
        operation_description="获取用户详情",
        responses={200: "用户详情信息"}
    )
    def get(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(user, context={'request': request})
        return Response(serializer.data)

class CurrentUserView(APIView):
    """
    获取当前登录用户的信息API
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="获取当前登录用户的详细信息",
        responses={
            200: "用户详情信息",
            401: "未认证 - 没有提供有效的身份验证凭据"
        }
    )
    def get(self, request):
        """
        返回当前登录用户的详细信息
        """
        # 添加检查，确保用户已认证
        if request.user.is_anonymous:
            return Response({"message": "未认证，请先登录"}, status=status.HTTP_401_UNAUTHORIZED)
            
        serializer = UserSerializer(request.user, context={'request': request})
        logger.info(f"用户 {request.user.username} 获取了个人信息")
        return Response(serializer.data)

class UserAvatarView(APIView):
    """
    上传/更新用户头像API
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]
    
    @swagger_auto_schema(
        operation_description="上传或更新用户头像",
        manual_parameters=[
            openapi.Parameter(
                name='avatar',
                in_=openapi.IN_FORM,
                description='用户头像图片',
                type=openapi.TYPE_FILE,
                required=True
            )
        ],
        responses={
            200: "头像更新成功",
            400: "请求格式错误或未提供头像",
            401: "未认证 - 没有提供有效的身份验证凭据"
        }
    )
    def post(self, request):
        """
        上传/更新用户头像
        """
        try:
            # 确保用户有Profile对象
            profile, created = UserProfile.objects.get_or_create(user=request.user)
            
            # 创建序列化器并验证
            serializer = UserProfileSerializer(profile, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                
                # 返回更新后的用户信息
                user_serializer = UserSerializer(request.user, context={'request': request})
                logger.info(f"用户 {request.user.username} 更新了头像")
                
                return Response({
                    'message': '头像更新成功',
                    'user': user_serializer.data
                })
            else:
                logger.warning(f"用户 {request.user.username} 头像更新失败: {serializer.errors}")
                return Response({
                    'message': '头像更新失败',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"头像更新过程中发生错误: {str(e)}")
            return Response({
                'message': f'头像更新失败: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
