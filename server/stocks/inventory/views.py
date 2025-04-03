from django.shortcuts import render, get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Ingredient, InventoryOperation, Task, Feedback, EnvironmentData, InventoryEvent, InventoryReport
from .serializers import (
    IngredientSerializer, 
    InventoryOperationSerializer, 
    TaskSerializer, 
    FeedbackSerializer,
    TaskListSerializer,
    EnvironmentDataSerializer,
    InventoryEventSerializer,
    InventoryReportSerializer
)


class IsInventoryManager(permissions.BasePermission):
    """
    库存管理员权限检查
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 'inventory'


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
    食材API，提供食材的CRUD操作
    """
    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer
    
    def get_permissions(self):
        """
        库存管理员可以执行所有操作，其他用户只能查看
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsInventoryManager]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def perform_create(self, serializer):
        serializer.save()
        
    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """
        获取即将过期的食材列表
        
        URL参数：
        - days: 天数阈值，获取多少天内即将过期的食材，默认为7天
        """
        try:
            days = int(request.query_params.get('days', 7))
        except ValueError:
            days = 7
            
        threshold_date = timezone.now().date() + timezone.timedelta(days=days)
        
        # 获取即将过期的食材
        ingredients = Ingredient.objects.filter(
            expiry_date__lte=threshold_date,
            expiry_date__gte=timezone.now().date(),
            quantity__gt=0
        ).order_by('expiry_date')
        
        serializer = self.get_serializer(ingredients, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def expired(self, request):
        """
        获取已过期的食材列表
        """
        # 获取已过期的食材
        ingredients = Ingredient.objects.filter(
            expiry_date__lt=timezone.now().date(),
            quantity__gt=0
        ).order_by('expiry_date')
        
        serializer = self.get_serializer(ingredients, many=True)
        return Response(serializer.data)


class InventoryOperationViewSet(viewsets.ModelViewSet):
    """
    库存操作API，提供出入库操作的记录和查询
    """
    queryset = InventoryOperation.objects.all()
    serializer_class = InventoryOperationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(operator=self.request.user)
        
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
        
        for operation in operations:
            operation['operator'] = request.user.id
            serializer = InventoryOperationSerializer(data=operation)
            if serializer.is_valid():
                serializer.save()
                results.append(serializer.data)
            else:
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


class EmployeeTaskViewSet(viewsets.ReadOnlyModelViewSet):
    """
    员工任务API，提供针对员工的任务查询和完成功能
    """
    serializer_class = TaskListSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        返回当前用户的任务
        """
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
        返回当前用户提交的反馈
        """
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
