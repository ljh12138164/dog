from django.shortcuts import render, get_object_or_404
from django.utils import timezone
from django.db.models import Q, Sum, Count, Avg, F
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Ingredient, InventoryOperation, Task, Feedback, EnvironmentData, InventoryEvent, InventoryReport, SensorData, Comment
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
)
import csv
import io
import json
from datetime import datetime, timedelta


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
    食材API，提供食材的CRUD操作
    """
    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer
    
    def get_permissions(self):
        """
        库存管理员可以执行所有操作，其他用户只能查看
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'import_csv', 'low_stock']:
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

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """
        获取库存不足的食材
        """
        low_stock_ingredients = Ingredient.objects.filter(
            Q(status='low') | Q(quantity__lte=F('min_stock'))
        )
        serializer = self.get_serializer(low_stock_ingredients, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def import_csv(self, request):
        """
        从CSV文件导入食材数据
        """
        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response(
                {'detail': '请上传CSV文件'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 处理CSV文件
        decoded_file = csv_file.read().decode('utf-8')
        csv_data = csv.reader(io.StringIO(decoded_file))
        headers = next(csv_data)  # 跳过表头
        
        required_headers = [
            'name', 'quantity', 'unit', 'unit_price', 
            'shelf_life', 'min_stock', 'max_stock'
        ]
        
        # 验证CSV文件结构
        for header in required_headers:
            if header not in headers:
                return Response(
                    {'detail': f'CSV文件缺少必要的列: {header}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # 开始导入数据
        results = []
        errors = []
        
        for row in csv_data:
            try:
                data = dict(zip(headers, row))
                
                # 查找或创建食材
                ingredient, created = Ingredient.objects.get_or_create(
                    name=data['name'],
                    defaults={
                        'description': data.get('description', ''),
                        'quantity': float(data['quantity']),
                        'unit': data['unit'],
                        'unit_price': float(data['unit_price']),
                        'shelf_life': int(data['shelf_life']),
                        'min_stock': float(data['min_stock']),
                        'max_stock': float(data['max_stock']),
                        'storage_location': data.get('storage_location', ''),
                        'supplier': data.get('supplier', '')
                    }
                )
                
                if not created:  # 如果食材已存在，则更新数据
                    ingredient.quantity = float(data['quantity'])
                    ingredient.unit = data['unit']
                    ingredient.unit_price = float(data['unit_price'])
                    ingredient.shelf_life = int(data['shelf_life'])
                    ingredient.min_stock = float(data['min_stock'])
                    ingredient.max_stock = float(data['max_stock'])
                    if 'storage_location' in data:
                        ingredient.storage_location = data['storage_location']
                    if 'supplier' in data:
                        ingredient.supplier = data['supplier']
                    if 'description' in data:
                        ingredient.description = data['description']
                    ingredient.save()
                
                results.append({
                    'name': ingredient.name,
                    'status': 'created' if created else 'updated'
                })
            
            except Exception as e:
                errors.append({
                    'row': row,
                    'error': str(e)
                })
        
        return Response({
            'results': results,
            'errors': errors
        })


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
            'timestamp': request.data.get('timestamp')
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
