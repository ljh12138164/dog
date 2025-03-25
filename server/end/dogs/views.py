from django.shortcuts import render
from rest_framework import generics, permissions, status, parsers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from .models import Dog
from .serializers import DogSerializer, DogImageUploadSerializer
from .breed_classifier import DogBreedClassifier
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
import logging
import os

# 设置日志记录器
logger = logging.getLogger(__name__)

# Create your views here.

class DogListCreateView(generics.ListCreateAPIView):
    """
    狗狗列表和创建API
    """
    serializer_class = DogSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]

    def get_queryset(self):
        # 只返回当前用户的狗狗
        return Dog.objects.filter(owner=self.request.user)

    @swagger_auto_schema(
        operation_description="创建新狗狗",
        responses={201: "狗狗创建成功"}
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        logger.info(f"用户 {request.user.username} 创建了狗狗: id={serializer.instance.id}, name={serializer.instance.name}")
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def perform_create(self, serializer):
        # 创建时自动设置owner为当前用户
        serializer.save(owner=self.request.user)


class DogDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    狗狗详情、更新和删除API
    """
    serializer_class = DogSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]
    
    def get_queryset(self):
        # 只返回当前用户的狗狗
        return Dog.objects.filter(owner=self.request.user)
    
    @swagger_auto_schema(
        operation_description="获取狗狗详情",
        responses={200: "狗狗详情信息"}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_description="更新狗狗信息",
        responses={200: "狗狗信息更新成功"}
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_description="部分更新狗狗信息",
        responses={200: "狗狗信息部分更新成功"}
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_description="删除狗狗",
        responses={204: "删除成功"}
    )
    def delete(self, request, *args, **kwargs):
        dog = self.get_object()
        logger.info(f"用户 {request.user.username} 删除了狗狗: id={dog.id}, name={dog.name}")
        return super().delete(request, *args, **kwargs)


class DogImageUploadView(APIView):
    """
    上传狗狗图片API
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]
    
    @swagger_auto_schema(
        operation_description="上传狗狗图片",
        manual_parameters=[
            openapi.Parameter(
                name='image',
                in_=openapi.IN_FORM,
                description='上传的狗狗图片',
                type=openapi.TYPE_FILE,
                required=True
            )
        ],
        responses={
            200: "图片上传成功",
            400: "请求格式错误或未提供图片",
            401: "未认证 - 没有提供有效的身份验证凭据"
        }
    )
    def post(self, request, pk):
        """
        上传狗狗图片
        """
        try:
            # 获取当前用户的狗狗
            dog = Dog.objects.get(id=pk, owner=request.user)
            
            # 创建序列化器并验证
            serializer = DogImageUploadSerializer(data=request.data)
            if serializer.is_valid():
                # 保存图片
                dog.image = serializer.validated_data['image']
                dog.save()
                
                # 返回更新后的狗狗信息
                dog_serializer = DogSerializer(dog, context={'request': request})
                logger.info(f"用户 {request.user.username} 为狗狗 {dog.name} 上传了图片")
                
                return Response({
                    'message': '图片上传成功',
                    'dog': dog_serializer.data
                })
            else:
                logger.warning(f"用户 {request.user.username} 图片上传失败: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Dog.DoesNotExist:
            logger.warning(f"用户 {request.user.username} 尝试为不存在的狗狗上传图片")
            return Response({'message': '找不到该狗狗'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"上传图片时发生错误: {str(e)}")
            return Response({'message': f'上传失败: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DogBreedIdentifyView(APIView):
    """
    狗品种识别API
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]
    
    @swagger_auto_schema(
        operation_description="识别狗狗品种",
        manual_parameters=[
            openapi.Parameter(
                name='image',
                in_=openapi.IN_FORM,
                description='需要识别的狗狗图片',
                type=openapi.TYPE_FILE,
                required=True
            )
        ],
        responses={
            200: openapi.Response('识别结果', schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'status': openapi.Schema(type=openapi.TYPE_STRING, description='处理状态'),
                    'breed': openapi.Schema(type=openapi.TYPE_STRING, description='识别出的狗狗品种'),
                    'confidence': openapi.Schema(type=openapi.TYPE_NUMBER, description='识别置信度')
                }
            )),
            400: "请求格式错误或未提供图片",
            401: "未认证 - 没有提供有效的身份验证凭据",
            500: "服务器处理错误"
        }
    )
    def post(self, request, format=None):
        """
        上传图片识别狗狗品种
        """
        try:
            if 'image' not in request.FILES:
                return Response({
                    'status': 'error',
                    'message': '请上传图片'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            image_file = request.FILES['image']
            
            # 保存临时文件
            import tempfile
            import os
            
            # 创建临时文件
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
            temp_file.close()
            
            # 将上传的图片保存到临时文件
            with open(temp_file.name, 'wb+') as destination:
                for chunk in image_file.chunks():
                    destination.write(chunk)
                    
            # 使用分类器进行预测
            try:
                classifier = DogBreedClassifier()
                result = classifier.predict(temp_file.name)
                
                # 删除临时文件
                os.unlink(temp_file.name)
                
                # 返回预测结果
                return Response({
                    'status': 'success',
                    'breed': result['breed'],
                    'confidence': result['confidence']
                })
            except Exception as e:
                # 确保临时文件被删除
                if os.path.exists(temp_file.name):
                    os.unlink(temp_file.name)
                    
                logger.error(f"品种识别失败: {str(e)}")
                return Response({
                    'status': 'error',
                    'message': f'识别失败: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"处理上传图片时出错: {str(e)}")
            return Response({
                'status': 'error',
                'message': f'处理失败: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
