from django.shortcuts import render, get_object_or_404
from django.utils import timezone
from django.db.models import Q, Sum, Count, Avg, F
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Ingredient, InventoryOperation, Task, Feedback, EnvironmentData, InventoryEvent, InventoryReport, SensorData, Comment, Category, MaterialRequest, MaterialRequestItem
from .serializers import (
    IngredientSerializer, 
    InventoryOperationSerializer, 
    TaskSerializer, 
    FeedbackSerializer,
    TaskListSerializer,
    EnvironmentDataSerializer,
    InventoryEventSerializer,
    InventoryReportSerializer,
    SensorDataSerializer,
    FeedbackStatusSerializer,
    CommentSerializer,
    CategorySerializer,
    MaterialRequestSerializer,
    MaterialRequestItemSerializer
)
import csv
import io
import json
import re
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class IsInventoryManager(permissions.BasePermission):
    """
    库存管理员权限检查
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 'inventory'


class IsProcurementManager(permissions.BasePermission):
    """
    采购经理权限检查
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 'procurement'


class IsLogisticsManager(permissions.BasePermission):
    """
    物流管理员权限检查
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 'logistics'


class IsAdmin(permissions.BasePermission):
    """
    系统管理员权限检查
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 'admin'


class IsEmployeeOrReadOnly(permissions.BasePermission):
    """
    普通员工或只读权限检查
    """
    def has_permission(self, request, view):
        # 允许所有已登录用户进行只读操作
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        # 允许普通员工进行写操作
        return request.user.is_authenticated and request.user.user_type == 'employee'


class IngredientViewSet(viewsets.ModelViewSet):
    """
    食材API视图集，提供食材的增删改查功能
    """
    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['category', 'status', 'location']
    search_fields = ['name', 'category']
    ordering_fields = ['name', 'category', 'expiry_date', 'created_at', 'quantity']
    ordering = ['-created_at']
    
    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """
        获取即将过期的食材列表
        
        URL参数：
        - days: 天数，获取几天内将要过期的食材，默认为7天
        """
        days = int(request.query_params.get('days', 7))
        today = timezone.now().date()
        end_date = today + timezone.timedelta(days=days)
        
        # 获取未过期但即将在指定天数内过期的食材
        queryset = Ingredient.objects.filter(
            expiry_date__gt=today,  # 未过期
            expiry_date__lte=end_date  # 但在指定天数内过期
        ).order_by('expiry_date')  # 按过期日期升序排序，最早过期的排在前面
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def expired(self, request):
        """
        获取已过期的食材列表
        """
        today = timezone.now().date()
        queryset = Ingredient.objects.filter(
            expiry_date__lt=today  # 已过期
        ).order_by('expiry_date')  # 按过期日期升序排序
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """
        获取库存不足的食材列表
        """
        queryset = Ingredient.objects.filter(status='low')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def import_csv(self, request):
        """
        从CSV文件导入食材数据
        
        CSV文件格式要求：
        第一行为标题行，必须包含以下字段：name,category,unit,quantity,expiry_date,location
        示例：
        name,category,unit,quantity,expiry_date,location
        苹果,水果,个,10,2023-12-31,冰箱
        牛肉,肉类,kg,2.5,2023-10-15,冷冻室
        """
        if 'file' not in request.FILES:
            return Response(
                {'detail': '未提供CSV文件'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file = request.FILES['file']
        if not file.name.endswith('.csv'):
            return Response(
                {'detail': '只支持CSV文件格式'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 处理CSV文件
        try:
            decoded_file = file.read().decode('utf-8').splitlines()
            reader = csv.DictReader(decoded_file)
            
            imported_count = 0
            errors = []
            
            for row in reader:
                try:
                    # 创建或更新食材
                    ingredient_data = {
                        'name': row.get('name', '').strip(),
                        'category': row.get('category', '').strip(),
                        'unit': row.get('unit', '').strip(),
                        'quantity': float(row.get('quantity', 0)),
                        'expiry_date': row.get('expiry_date', '').strip(),
                        'location': row.get('location', '').strip(),
                    }
                    
                    serializer = self.get_serializer(data=ingredient_data)
                    if serializer.is_valid():
                        serializer.save()
                        imported_count += 1
                    else:
                        errors.append({
                            'row': dict(row),
                            'errors': serializer.errors
                        })
                
                except Exception as e:
                    errors.append({
                        'row': dict(row),
                        'errors': str(e)
                    })
            
            return Response({
                'imported_count': imported_count,
                'errors': errors,
                'total_rows': reader.line_num
            })
            
        except Exception as e:
            return Response(
                {'detail': f'解析CSV文件时出错: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class InventoryOperationViewSet(viewsets.ModelViewSet):
    """
    库存操作API，提供出入库操作的记录和查询
    """
    queryset = InventoryOperation.objects.all()
    serializer_class = InventoryOperationSerializer
    permission_classes = [permissions.AllowAny]  # 临时更改为允许所有请求，用于调试
    
    def perform_create(self, serializer):
        # 记录操作用户信息
        if self.request.user.is_authenticated:
            user = self.request.user
            logger.info(f"用户 {user.username}(ID:{user.id}) 创建库存操作: {serializer.validated_data.get('operation_type')} - {serializer.validated_data.get('quantity')} {serializer.validated_data.get('ingredient').name}")
            serializer.save(operator=self.request.user)
        else:
            # 获取一个可用的用户作为默认操作员（通常是管理员用户）
            try:
                from users.models import User
                default_user = User.objects.filter(is_staff=True).first() or User.objects.first()
                if default_user:
                    logger.warning(f"未认证用户创建库存操作，使用默认用户 {default_user.username}(ID:{default_user.id})")
                    serializer.save(operator=default_user)
                else:
                    # 如果没有找到用户，尝试直接创建一个默认用户
                    logger.warning("未找到可用用户，尝试创建默认管理员用户")
                    default_user = User.objects.create_superuser(
                        username='default_admin',
                        email='admin@example.com',
                        password='defaultpassword',
                        is_staff=True,
                        is_superuser=True
                    )
                    serializer.save(operator=default_user)
            except Exception as e:
                logger.error(f"创建库存操作失败: {str(e)}")
                # 如果所有尝试都失败，直接保存而不设置operator
                logger.warning("无法找到或创建默认用户，尝试不设置operator直接保存")
                serializer.save()
    
    def perform_update(self, serializer):
        # 记录操作更新信息
        old_instance = self.get_object()
        if self.request.user.is_authenticated:
            user = self.request.user
            logger.info(f"用户 {user.username}(ID:{user.id}) 更新库存操作记录(ID:{old_instance.id})")
        serializer.save()
    
    def perform_destroy(self, instance):
        # 记录删除操作
        if self.request.user.is_authenticated:
            user = self.request.user
            logger.info(f"用户 {user.username}(ID:{user.id}) 删除库存操作记录: ID:{instance.id}, {instance.operation_type} - {instance.quantity} {instance.ingredient.name}")
        instance.delete()
        
    @action(detail=False, methods=['post'])
    def batch_operation(self, request):
        """
        批量出入库操作API
        
        请求示例：
        {
            "operations": [
                {"ingredient": 1, "operation_type": "in", "quantity": 10, "notes": "入库备注"},
                {"ingredient": 2, "operation_type": "out", "quantity": 5, "notes": "出库备注"}
            ]
        }
        """
        operations = request.data.get('operations', [])
        if not operations:
            return Response(
                {'detail': '未提供操作数据'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        results = []
        errors = []
        
        # 记录批量操作日志
        user_info = f"{request.user.username}(ID:{request.user.id})" if request.user.is_authenticated else "未认证用户"
        logger.info(f"{user_info} 执行批量库存操作, 共{len(operations)}项")
        
        for operation in operations:
            if request.user.is_authenticated:
                operation['operator'] = request.user.id
            
            serializer = InventoryOperationSerializer(data=operation)
            if serializer.is_valid():
                try:
                    instance = serializer.save()
                    results.append(serializer.data)
                    logger.info(f"批量操作: 成功创建库存操作 - {instance.operation_type} {instance.quantity} {instance.ingredient.name}")
                except Exception as e:
                    logger.error(f"批量操作: 创建库存操作失败 - {str(e)}")
                    errors.append({
                        'operation': operation,
                        'errors': {'general': [str(e)]}
                    })
            else:
                logger.warning(f"批量操作: 验证失败 - {serializer.errors}")
                errors.append({
                    'operation': operation,
                    'errors': serializer.errors
                })
        
        return Response({
            'success': len(results),
            'failed': len(errors),
            'results': results,
            'errors': errors
        })

    def create(self, request, *args, **kwargs):
        # 记录请求数据
        logger.info(f"收到入库请求数据: {request.data}")
        
        # 检查食材参数
        ingredient_param = request.data.get('ingredient')
        if ingredient_param:
            logger.info(f"食材参数: {ingredient_param}, 类型: {type(ingredient_param)}")
        else:
            logger.warning("请求中缺少ingredient参数")
        
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"创建库存操作记录失败: {str(e)}")
            return Response(
                {"detail": f"创建失败: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )


class EmployeeTaskViewSet(viewsets.ReadOnlyModelViewSet):
    """
    员工任务API，提供针对员工的任务查询和完成功能
    """
    serializer_class = TaskListSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    # 定义任务类型，与Task模型中的枚举保持一致
    TASK_TYPE_CHOICES = (
        ('check', '检查'),
        ('procurement', '采购'),
        ('inventory', '库存'),
        ('other', '其他'),
    )
    
    def get_queryset(self):
        """
        返回当前用户的库存相关任务
        
        过滤条件:
        1. 当前用户被分配的任务
        2. 任务类型为inventory (库存)
        """
        # 检查Task模型是否有task_type字段并根据不同情况过滤
        if hasattr(Task, 'task_type'):
            # 如果有task_type字段，则过滤出库存类型的任务
            return Task.objects.filter(
                assigned_to=self.request.user,
                task_type='inventory'
            )
        else:
            # 如果没有task_type字段，只按用户过滤
            print("Warning: Task model does not have task_type field, returning all tasks")
            return Task.objects.filter(assigned_to=self.request.user)
    
    @action(detail=True, methods=['put'])
    def complete(self, request, pk=None):
        """
        完成任务接口
        """
        task = self.get_object()
        if task.status == 'completed':
            return Response(
                {'detail': '任务已经标记为完成'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        task.status = 'completed'
        task.completed_at = timezone.now()
        task.save()
        
        serializer = self.get_serializer(task)
        return Response(serializer.data)


class EmployeeFeedbackViewSet(viewsets.ModelViewSet):
    """
    员工反馈API，提供反馈的提交和查询
    """
    serializer_class = FeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        返回反馈列表：管理员可以看到所有反馈，普通用户只能看到自己提交的反馈
        """
        if self.request.user.user_type in ['admin', 'inventory_admin']:
            # 管理员可以看到所有反馈
            return Feedback.objects.all()
        else:
            # 普通用户只能看到自己提交的反馈
            return Feedback.objects.filter(reporter=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)
    
    def update(self, request, *args, **kwargs):
        """
        普通员工只能更新自己提交的且未处理的反馈
        """
        instance = self.get_object()
        if instance.status != 'pending':
            return Response(
                {'detail': '此反馈已在处理中或已解决，无法修改'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """
        普通员工只能删除自己提交的且未处理的反馈
        """
        instance = self.get_object()
        if instance.status != 'pending':
            return Response(
                {'detail': '此反馈已在处理中或已解决，无法删除'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['patch'])
    def status(self, request, pk=None):
        """
        更新反馈状态接口
        """
        feedback = self.get_object()
        serializer = FeedbackStatusSerializer(feedback, data=request.data, partial=True)
        
        if serializer.is_valid():
            # 如果状态为已解决，记录解决时间
            if request.data.get('status') == 'resolved':
                feedback.resolved_at = timezone.now()
                feedback.handler = request.user
            
            # 如果状态为处理中，记录处理人
            if request.data.get('status') == 'processing':
                feedback.handler = request.user
                
            serializer.save()
            
            # 返回完整的反馈数据
            full_serializer = FeedbackSerializer(feedback)
            return Response(full_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get', 'post'])
    def comments(self, request, pk=None):
        """
        获取和添加反馈评论
        """
        feedback = self.get_object()
        
        if request.method == 'GET':
            comments = Comment.objects.filter(feedback=feedback)
            serializer = CommentSerializer(comments, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            serializer = CommentSerializer(data={
                'feedback': feedback.id,
                'content': request.data.get('content'),
                'created_by': request.user.id
            })
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EnvironmentDataViewSet(viewsets.ModelViewSet):
    """
    环境数据API，提供环境数据的记录和查询
    """
    queryset = EnvironmentData.objects.all()
    serializer_class = EnvironmentDataSerializer
    
    def get_permissions(self):
        """
        库存管理员可以添加数据，所有已认证用户可以查看
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsInventoryManager]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=['get'])
    def latest(self, request):
        """
        获取最新环境数据
        """
        latest_record = EnvironmentData.objects.order_by('-recorded_at').first()
        if not latest_record:
            return Response(
                {'detail': '暂无环境数据记录', 'temperature': 0, 'humidity': 0},
                status=status.HTTP_200_OK
            )
        
        serializer = self.get_serializer(latest_record)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def chart_data(self, request):
        """
        获取图表数据，支持天、周、月的数据聚合
        """
        time_range = request.query_params.get('range', 'day')
        
        # 根据时间范围获取数据
        if time_range == 'day':
            # 获取过去24小时的数据
            start_time = timezone.now() - timezone.timedelta(hours=24)
            data = EnvironmentData.objects.filter(
                recorded_at__gte=start_time
            ).order_by('recorded_at')
        elif time_range == 'week':
            # 获取过去7天的数据
            start_time = timezone.now() - timezone.timedelta(days=7)
            data = EnvironmentData.objects.filter(
                recorded_at__gte=start_time
            ).order_by('recorded_at')
        elif time_range == 'month':
            # 获取过去30天的数据
            start_time = timezone.now() - timezone.timedelta(days=30)
            data = EnvironmentData.objects.filter(
                recorded_at__gte=start_time
            ).order_by('recorded_at')
        else:
            return Response(
                {'detail': '不支持的时间范围参数'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data, many=True)
        return Response(serializer.data)


class InventoryEventViewSet(viewsets.ModelViewSet):
    """
    库存事件API，提供库存异常事件的记录、处理和查询
    """
    queryset = InventoryEvent.objects.all()
    serializer_class = InventoryEventSerializer
    
    def get_permissions(self):
        """
        处理权限：库存管理员可以处理事件，所有已认证用户可以报告和查看事件
        """
        if self.action in ['update', 'partial_update', 'resolve', 'reject']:
            permission_classes = [IsInventoryManager]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)
    
    @action(detail=True, methods=['put'])
    def resolve(self, request, pk=None):
        """
        解决库存事件接口
        """
        event = self.get_object()
        if event.status == 'resolved':
            return Response(
                {'detail': '此事件已经解决'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        resolution_notes = request.data.get('resolution_notes', '')
        if not resolution_notes:
            return Response(
                {'detail': '请提供解决方案说明'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        event.status = 'resolved'
        event.handled_by = request.user
        event.resolution_notes = resolution_notes
        event.resolved_at = timezone.now()
        event.save()
        
        serializer = self.get_serializer(event)
        return Response(serializer.data)
    
    @action(detail=True, methods=['put'])
    def reject(self, request, pk=None):
        """
        拒绝库存事件接口
        """
        event = self.get_object()
        if event.status in ['resolved', 'rejected']:
            return Response(
                {'detail': '此事件已经处理完毕'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reason = request.data.get('reason', '')
        if not reason:
            return Response(
                {'detail': '请提供拒绝理由'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        event.status = 'rejected'
        event.handled_by = request.user
        event.resolution_notes = f"拒绝理由: {reason}"
        event.resolved_at = timezone.now()
        event.save()
        
        serializer = self.get_serializer(event)
        return Response(serializer.data)


class InventoryReportViewSet(viewsets.ModelViewSet):
    """
    库存报告API，提供库存报告的生成和查询
    """
    queryset = InventoryReport.objects.all()
    serializer_class = InventoryReportSerializer
    permission_classes = [IsInventoryManager]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def generate_report(self, request):
        """
        自动生成库存报告
        """
        report_type = request.query_params.get('type', 'daily')
        
        # 设置报告的时间范围
        end_date = timezone.now().date()
        if report_type == 'daily':
            start_date = end_date
            title = f"每日库存报告 - {end_date}"
        elif report_type == 'weekly':
            start_date = end_date - timezone.timedelta(days=7)
            title = f"每周库存报告 - {start_date} 至 {end_date}"
        elif report_type == 'monthly':
            start_date = end_date.replace(day=1)
            title = f"每月库存报告 - {start_date.strftime('%Y年%m月')}"
        else:
            return Response(
                {'detail': '不支持的报告类型'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 获取时间范围内的数据
        operations = InventoryOperation.objects.filter(
            created_at__date__range=[start_date, end_date]
        )
        events = InventoryEvent.objects.filter(
            created_at__date__range=[start_date, end_date]
        )
        
        # 生成报告摘要
        in_count = operations.filter(operation_type='in').count()
        out_count = operations.filter(operation_type='out').count()
        event_count = events.count()
        
        summary = f"在此期间共有{in_count}次入库操作，{out_count}次出库操作，{event_count}个库存事件。"
        
        # 生成详细内容
        details = "## 库存操作详情\n\n"
        for op in operations:
            details += f"- {op.created_at.strftime('%Y-%m-%d %H:%M')} - {op.get_operation_type_display()}: {op.ingredient.name} {op.quantity}{op.ingredient.unit}\n"
        
        details += "\n## 库存事件详情\n\n"
        for event in events:
            details += f"- {event.created_at.strftime('%Y-%m-%d %H:%M')} - {event.get_event_type_display()}: {event.title} ({event.get_status_display()})\n"
        
        # 创建报告
        report = InventoryReport.objects.create(
            report_type=report_type,
            title=title,
            start_date=start_date,
            end_date=end_date,
            summary=summary,
            details=details,
            created_by=request.user
        )
        
        serializer = self.get_serializer(report)
        return Response(serializer.data)


class SensorDataViewSet(viewsets.ModelViewSet):
    """
    传感器数据API，提供传感器数据的记录和查询
    """
    queryset = SensorData.objects.all()
    serializer_class = SensorDataSerializer
    
    def get_permissions(self):
        """
        add_data接口不需要认证，其他接口需要认证
        """
        if self.action == 'add_data':
            permission_classes = []  # 不需要任何权限
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    @action(detail=False, methods=['post'])
    def add_data(self, request):
        """
        添加传感器数据的API
        
        接收WebSocket转发的数据并保存
        数据格式：
        {
            "type": "emit",
            "temperature": 25.8,
            "humidity": 45.6,
            "light": 789.2,
            "threshold": 30.0,  # 可选，温度警报阈值
            "timestamp": "2023-04-04T12:34:56Z"
        }
        """
        if request.data.get('type') != 'emit':
            return Response(
                {'detail': '不支持的数据类型'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        data = {
            'temperature': request.data.get('temperature'),
            'humidity': request.data.get('humidity'),
            'light': request.data.get('light'),
            'timestamp': request.data.get('timestamp'),
            'threshold': request.data.get('threshold')  # 添加threshold字段
        }
        
        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def latest(self, request):
        """
        获取最新的传感器数据
        """
        latest_data = SensorData.objects.order_by('-timestamp').first()
        if not latest_data:
            return Response(
                {'detail': '没有传感器数据'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = self.get_serializer(latest_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def chart_data(self, request):
        """
        获取用于图表显示的传感器数据
        
        URL参数：
        - days: 天数，获取最近多少天的数据，默认为7天
        - hours: 小时数，获取最近多少小时的数据
        - dense: 如果设置为true，则返回所有数据点而不进行聚合
        """
        try:
            # 获取请求参数
            dense = request.query_params.get('dense', 'false').lower() == 'true'
            
            if 'hours' in request.query_params:
                hours = int(request.query_params.get('hours', 24))
                start_time = timezone.now() - timezone.timedelta(hours=hours)
                
                # 日视图：每10分钟一个数据点
                interval_minutes = 5
            else:
                days = int(request.query_params.get('days', 7))
                start_time = timezone.now() - timezone.timedelta(days=days)
                
                # 周视图和月视图的聚合间隔
                if days <= 7:
                    interval_minutes = 30  # 周视图：每30分钟一个数据点
                else:
                    interval_minutes = 60  # 月视图：每1小时一个数据点
        except ValueError:
            return Response(
                {'detail': '参数格式错误'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 获取时间范围内的数据，按时间戳排序
        sensor_data = SensorData.objects.filter(
            timestamp__gte=start_time
        ).order_by('timestamp')
        
        # 确保有足够的数据进行聚合
        if not sensor_data:
            return Response({
                'timestamps': [],
                'temperature': [],
                'humidity': [],
                'light': []
            })
        
        # 对数据进行时间间隔聚合
        timestamps = []
        temperature_values = []
        humidity_values = []
        light_values = []
        
        # 设置起始时间为第一个数据点的时间
        current_time = sensor_data.first().timestamp
        end_time = timezone.now()
        
        # 对数据按时间间隔聚合
        while current_time <= end_time:
            interval_end = current_time + timezone.timedelta(minutes=interval_minutes)
            interval_data = sensor_data.filter(
                timestamp__gte=current_time,
                timestamp__lt=interval_end
            )
            
            # 只在有数据的情况下添加数据点
            if interval_data.exists():
                # 计算平均值
                avg_temp_values = [d.temperature for d in interval_data if d.temperature is not None]
                avg_temp = sum(avg_temp_values) / len(avg_temp_values) if avg_temp_values else 25.0
                
                avg_humidity = sum(d.humidity for d in interval_data) / interval_data.count()
                avg_light = sum(d.light for d in interval_data) / interval_data.count()
                
                timestamps.append(current_time.isoformat())
                temperature_values.append(round(avg_temp, 1))
                humidity_values.append(round(avg_humidity, 1))
                light_values.append(round(avg_light, 1))
            
            current_time = interval_end
        
        # 确保返回的数据点不超过最大限制，同时保留足够的数据点
        if len(timestamps) > 500:
            step = len(timestamps) // 500 + 1
            timestamps = timestamps[::step]
            temperature_values = temperature_values[::step]
            humidity_values = humidity_values[::step]
            light_values = light_values[::step]
        
        return Response({
            'timestamps': timestamps,
            'temperature': temperature_values,
            'humidity': humidity_values,
            'light': light_values
        })


# 材料出库申请视图集
class MaterialRequestViewSet(viewsets.ModelViewSet):
    """
    提供材料出库申请的CRUD操作以及状态变更动作
    """
    queryset = MaterialRequest.objects.all()
    serializer_class = MaterialRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # 如果是管理员，返回所有申请
        if user.user_type == 'admin' or user.user_type == 'logistics':
            return MaterialRequest.objects.all()
        # 普通用户只能看到自己创建的申请
        return MaterialRequest.objects.filter(requested_by=user)

    def perform_create(self, serializer):
        # 自动设置申请人为当前用户
        serializer.save(requested_by=self.request.user)

    @action(detail=False, methods=['get'])
    def assigned_to_me(self, request):
        """获取指派给当前登录用户的出库申请"""
        user = request.user
        requests = MaterialRequest.objects.filter(assigned_to=user)
        serializer = self.get_serializer(requests, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['put'])
    def approve(self, request, pk=None):
        """批准出库申请"""
        material_request = self.get_object()
        try:
            material_request.approve(request.user)
            return Response(
                {'status': 'approved', 'message': '出库申请已批准'},
                status=status.HTTP_200_OK
            )
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['put'])
    def reject(self, request, pk=None):
        """拒绝出库申请"""
        material_request = self.get_object()
        try:
            material_request.reject(request.user)
            return Response(
                {'status': 'rejected', 'message': '出库申请已拒绝'},
                status=status.HTTP_200_OK
            )
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['put'])
    def start_processing(self, request, pk=None):
        """开始处理出库申请"""
        try:
            # 直接从数据库查询，避免使用self.get_object()可能抛出的404错误
            material_request = MaterialRequest.objects.get(pk=pk)
            
            if material_request.status != 'approved':
                return Response(
                    {"detail": f"出库申请必须处于'已批准'状态才能开始处理，当前状态: {material_request.status}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            logger.info(f"开始处理出库申请 ID={pk}, 当前状态: {material_request.status}")
            material_request.start_processing()
            logger.info(f"出库申请已更新为处理中状态 ID={pk}")
            
            return Response({"status": "processing"})
        except MaterialRequest.DoesNotExist:
            logger.error(f"找不到ID为{pk}的出库申请记录")
            return Response(
                {"detail": f"找不到ID为{pk}的出库申请记录"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"处理出库申请时发生错误: {str(e)}")
            return Response(
                {"detail": f"处理出库申请时发生错误: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['put'])
    def complete(self, request, pk=None):
        """完成出库申请"""
        try:
            # 直接从数据库查询，避免使用self.get_object()可能抛出的404错误
            material_request = MaterialRequest.objects.get(pk=pk)
            
            if material_request.status != 'in_progress':
                return Response(
                    {'detail': f"只能完成处理中的出库申请，当前状态: {material_request.status}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            logger.info(f"标记出库申请为已完成 ID={pk}, 当前状态: {material_request.status}")
            material_request.status = 'completed'
            material_request.completed_at = timezone.now()
            material_request.completed_by = request.user
            material_request.save()
            logger.info(f"出库申请已更新为已完成状态 ID={pk}")
            
            serializer = self.get_serializer(material_request)
            return Response(serializer.data)
        except MaterialRequest.DoesNotExist:
            logger.error(f"找不到ID为{pk}的出库申请记录")
            return Response(
                {"detail": f"找不到ID为{pk}的出库申请记录"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"完成出库申请时发生错误: {str(e)}")
            return Response(
                {"detail": f"完成出库申请时发生错误: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['put'])
    def assign(self, request, pk=None):
        """指派处理出库申请的员工"""
        material_request = self.get_object()
        employee_id = request.data.get('employee_id')
        
        if not employee_id:
            return Response(
                {'error': '未提供员工ID'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            from users.models import User
            employee = User.objects.get(id=employee_id, user_type='employee')
            
            # 记录指派的员工信息
            material_request.assigned_to = employee
            material_request.assigned_at = timezone.now()
            material_request.save()
            
            # 为该出库申请创建一个对应的库存任务
            try:
                task = Task.objects.create(
                    title=f'处理出库申请 #{material_request.id}',
                    description=f'处理材料出库申请 #{material_request.id} - {material_request.title}，请根据申请单进行物料的出库操作。',
                    task_type='inventory',  # 设置为库存类型任务
                    due_date=timezone.now().date() + timezone.timedelta(days=1),  # 设置截止日期为明天
                    priority='medium',
                    assigned_to=employee,  # 指派给同一个员工
                    created_by=request.user  # 任务创建者为当前用户（通常是物流管理员）
                )
                print(f"为出库申请 #{material_request.id} 创建了库存任务 ID: {task.id}")
            except Exception as e:
                print(f"创建任务时出错: {str(e)}")
                # 即使创建任务失败，也继续处理申请指派
            
            # 返回更新后的申请数据
            serializer = self.get_serializer(material_request)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response(
                {'error': '未找到指定的员工'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


# 材料出库申请项目视图集
class MaterialRequestItemViewSet(viewsets.ModelViewSet):
    """
    提供材料出库申请项目的CRUD操作
    """
    queryset = MaterialRequestItem.objects.all()
    serializer_class = MaterialRequestItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        request_id = self.request.query_params.get('request_id', None)
        if request_id is not None:
            return MaterialRequestItem.objects.filter(request_id=request_id)
        return MaterialRequestItem.objects.all()


class InventoryViewSet(viewsets.ViewSet):
    """
    提供食材入库操作和创建的API
    """
    permission_classes = [permissions.AllowAny]  # 临时设置为允许所有访问
    
    def create(self, request):
        """
        处理/inventory/的POST请求，支持使用字符串ID创建食材或入库
        """
        try:
            # 获取请求数据并打印详细日志
            data = request.data
            logger.info(f"收到添加商品请求数据类型: {type(data)}, 内容: {data}")
            
            # 如果数据是字符串，尝试解析为JSON
            if isinstance(data, str):
                try:
                    import json
                    data = json.loads(data)
                    logger.info(f"将字符串数据解析为JSON: {data}")
                except json.JSONDecodeError as e:
                    logger.error(f"JSON解析错误: {str(e)}")
            
            # 处理没有ingredient字段的情况，直接使用name创建
            ingredient_id = data.get('ingredient')
            name = data.get('name')
            
            logger.info(f"提取的字段: ingredient_id={ingredient_id}, name={name}")
            
            if not ingredient_id and not name:
                logger.error("请求中缺少必要的ingredient或name字段")
                return Response({
                    'error': '缺少必要的ingredient或name字段'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 尝试查找或创建食材
            try:
                from .models import Ingredient
                
                # 直接使用name创建新食材
                if name:
                    # 查找是否已存在同名食材
                    ingredient = Ingredient.objects.filter(name=name).first()
                    
                    # 如果不存在，创建新食材
                    if not ingredient:
                        logger.info(f"创建新食材: name={name}")
                        expiry_date = process_expiry_date(data.get('expiry_date'))
                        logger.info(f"处理后的过期日期: {expiry_date}")
                        
                        ingredient = Ingredient.objects.create(
                            name=name,
                            category=data.get('category', '其他'),
                            unit=data.get('unit', '个'),
                            quantity=0,  # 初始库存为0，后续通过库存操作增加
                            expiry_date=expiry_date,
                            status='normal',
                            location=''
                        )
                        logger.info(f"成功创建新食材: id={ingredient.id}, name={ingredient.name}")
                    else:
                        logger.info(f"找到现有食材: id={ingredient.id}, name={ingredient.name}")
                
                # 创建入库操作
                from users.models import User
                default_user = User.objects.filter(is_staff=True).first() or User.objects.first()
                if not default_user:
                    logger.warning("未找到默认用户，尝试创建一个")
                    default_user = User.objects.create_user(
                        username="default_admin",
                        password="admin123",
                        is_staff=True
                    )
                
                from .models import InventoryOperation
                # 获取数量并确保是浮点数
                try:
                    quantity = float(data.get('quantity', 0))
                except (TypeError, ValueError) as e:
                    logger.error(f"无法将数量转换为浮点数: {str(e)}")
                    quantity = 0
                
                logger.info(f"准备创建入库操作: ingredient={ingredient.id}, quantity={quantity}")
                operation = InventoryOperation.objects.create(
                    ingredient=ingredient,
                    operation_type='in',
                    quantity=quantity,
                    expiry_period=data.get('expiry_period', ''),
                    operator=default_user,
                    notes=data.get('notes', f'通过API创建的入库操作: {ingredient.name}')
                )
                
                logger.info(f"成功创建入库操作: id={operation.id}")
                
                # 返回成功响应
                return Response({
                    'id': operation.id,
                    'ingredient': ingredient.id,
                    'name': ingredient.name,
                    'quantity': operation.quantity,
                    'message': '商品添加成功'
                }, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                logger.error(f"处理食材时出错: {str(e)}", exc_info=True)
                import traceback
                logger.error(f"详细错误: {traceback.format_exc()}")
                return Response({
                    'error': f'处理食材时出错: {str(e)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"创建入库操作失败: {str(e)}", exc_info=True)
            import traceback
            logger.error(f"详细错误: {traceback.format_exc()}")
            return Response({
                'error': f'创建入库操作失败: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def process_expiry_date(expiry_date):
    """
    处理过期日期字段，确保它是有效的日期格式
    """
    # 处理ISO格式的日期
    if expiry_date and isinstance(expiry_date, str):
        if 'T' in expiry_date:
            # 如果是ISO格式，只取日期部分
            expiry_date = expiry_date.split('T')[0]
        # 如果是空字符串，设为None
        if expiry_date.strip() == '':
            expiry_date = None
    
    # 如果没有提供日期，则使用一年后的日期作为默认值
    if not expiry_date:
        expiry_date = (datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d')
    
    return expiry_date
