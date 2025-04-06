from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count, Q, F
from django.contrib.auth import get_user_model
from .models import Supplier, ProcurementPlan, ProcurementItem, MaterialSupervision
from .serializers import (
    SupplierSerializer, 
    ProcurementPlanSerializer, 
    ProcurementItemSerializer,
    ProcurementItemCreateSerializer,
    MaterialSupervisionSerializer
)

User = get_user_model()


class SupplierViewSet(viewsets.ModelViewSet):
    """供应商API视图集"""
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    filterset_fields = ['name', 'is_active']
    search_fields = ['name', 'contact_person', 'products', 'address', 'phone', 'email']
    ordering_fields = ['name', 'rating', 'created_at']
    ordering = ['-created_at']


class ProcurementPlanViewSet(viewsets.ModelViewSet):
    """采购计划API视图集"""
    queryset = ProcurementPlan.objects.all()
    serializer_class = ProcurementPlanSerializer
    filterset_fields = ['status', 'created_by', 'approved_by']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'start_date', 'end_date', 'status']
    ordering = ['-created_at']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['put'])
    def approve(self, request, pk=None):
        """审批采购计划"""
        plan = self.get_object()
        
        if plan.status != 'pending':
            return Response(
                {"detail": "只有待审批的计划可以被批准"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        plan.status = 'approved'
        plan.approved_by = request.user
        plan.approved_at = timezone.now()
        plan.save()
        
        return Response(
            ProcurementPlanSerializer(plan).data, 
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['put'])
    def reject(self, request, pk=None):
        """拒绝采购计划"""
        plan = self.get_object()
        
        if plan.status != 'pending':
            return Response(
                {"detail": "只有待审批的计划可以被拒绝"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reason = request.data.get('reason')
        if not reason:
            return Response(
                {"detail": "拒绝原因不能为空"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        plan.status = 'rejected'
        plan.reject_reason = reason
        plan.approved_by = request.user
        plan.approved_at = timezone.now()
        plan.save()
        
        return Response(
            ProcurementPlanSerializer(plan).data, 
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['put'])
    def complete(self, request, pk=None):
        """完成采购计划"""
        plan = self.get_object()
        
        if plan.status != 'approved':
            return Response(
                {"detail": "只有已批准的计划可以标记为完成"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 检查所有采购项是否都已完成
        if plan.items.filter(~Q(status='received')).exists():
            return Response(
                {"detail": "还有未完成的采购项，不能完成计划"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        plan.status = 'completed'
        plan.save()
        
        return Response(
            ProcurementPlanSerializer(plan).data, 
            status=status.HTTP_200_OK
        )


class ProcurementItemViewSet(viewsets.ModelViewSet):
    """采购项API视图集"""
    queryset = ProcurementItem.objects.all()
    filterset_fields = ['plan', 'ingredient', 'supplier', 'status']
    search_fields = ['notes']
    ordering_fields = ['created_at', 'expected_delivery_date', 'actual_delivery_date']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProcurementItemCreateSerializer
        return ProcurementItemSerializer

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """批量创建采购项"""
        items_data = request.data.get('items', [])
        if not items_data:
            return Response(
                {"detail": "没有提供采购项数据"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ProcurementItemCreateSerializer(data=items_data, many=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['put'])
    def receive(self, request, pk=None):
        """接收采购项"""
        item = self.get_object()
        
        if item.status not in ['pending', 'ordered']:
            return Response(
                {"detail": "只有待处理或已订购的采购项可以标记为已收货"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        item.status = 'received'
        item.actual_delivery_date = timezone.now().date()
        item.save()
        
        # 检查是否所有采购项都已收货，如果是，则尝试更新计划状态
        plan = item.plan
        if plan.status == 'approved' and not plan.items.filter(~Q(status='received')).exists():
            plan.status = 'completed'
            plan.save()
        
        return Response(
            ProcurementItemSerializer(item).data, 
            status=status.HTTP_200_OK
        )


class MaterialSupervisionViewSet(viewsets.ModelViewSet):
    """物料监督单API视图集"""
    queryset = MaterialSupervision.objects.all()
    serializer_class = MaterialSupervisionSerializer
    filterset_fields = ['status', 'priority', 'created_by', 'supervisor']
    search_fields = ['title', 'description', 'notes']
    ordering_fields = ['created_at', 'due_date', 'status', 'priority']
    ordering = ['-created_at']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['put'])
    def complete(self, request, pk=None):
        """完成物料监督单"""
        supervision = self.get_object()
        
        if supervision.status not in ['pending', 'processing']:
            return Response(
                {"detail": "只有待处理或处理中的监督单可以标记为完成"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        supervision.status = 'completed'
        supervision.completed_at = timezone.now()
        supervision.save()
        
        return Response(
            MaterialSupervisionSerializer(supervision).data, 
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['put'])
    def assign(self, request, pk=None):
        """指派监督人"""
        supervision = self.get_object()
        supervisor_id = request.data.get('supervisor_id')
        
        try:
            supervisor = User.objects.get(id=supervisor_id)
            supervision.supervisor = supervisor
            if supervision.status == 'pending':
                supervision.status = 'processing'
            supervision.save()
            return Response(
                MaterialSupervisionSerializer(supervision).data, 
                status=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            return Response(
                {"detail": "指定的用户不存在"}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class ProcurementStatisticsViewSet(viewsets.ViewSet):
    """采购统计API视图集"""
    
    def list(self, request):
        """
        获取采购统计数据 - 支持直接访问/api/procurement-statistics/
        """
        return self.statistics(request)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """获取采购统计数据"""
        period = request.query_params.get('period', 'month')
        
        # 根据不同时间范围获取统计数据
        if period == 'week':
            # 获取最近一周的数据
            start_date = timezone.now().date() - timezone.timedelta(days=7)
            end_date = timezone.now().date()
            date_format = '%Y-%m-%d'  # 按天统计
            
            # 创建标签列表（最近7天的日期）
            labels = []
            current_date = start_date
            while current_date <= end_date:
                labels.append(current_date.strftime(date_format))
                current_date += timezone.timedelta(days=1)
            
            # 获取采购金额
            procurement_amounts = []
            for label in labels:
                date_obj = timezone.datetime.strptime(label, date_format).date()
                amount = ProcurementItem.objects.filter(
                    plan__status__in=['approved', 'completed'],
                    created_at__date=date_obj
                ).aggregate(total=Sum(F('unit_price') * F('quantity')))['total'] or 0
                procurement_amounts.append(float(amount))
            
        elif period == 'month':
            # 获取最近一个月的数据，按周统计
            start_date = timezone.now().date() - timezone.timedelta(days=30)
            end_date = timezone.now().date()
            
            # 创建标签列表（最近4周）
            labels = [
                f"{(end_date - timezone.timedelta(days=21)).strftime('%m-%d')} 至 {(end_date - timezone.timedelta(days=15)).strftime('%m-%d')}",
                f"{(end_date - timezone.timedelta(days=14)).strftime('%m-%d')} 至 {(end_date - timezone.timedelta(days=8)).strftime('%m-%d')}",
                f"{(end_date - timezone.timedelta(days=7)).strftime('%m-%d')} 至 {(end_date - timezone.timedelta(days=1)).strftime('%m-%d')}",
                f"{end_date.strftime('%m-%d')}"
            ]
            
            # 获取采购金额
            procurement_amounts = [
                float(ProcurementItem.objects.filter(
                    plan__status__in=['approved', 'completed'],
                    created_at__date__range=[end_date - timezone.timedelta(days=28), end_date - timezone.timedelta(days=22)]
                ).aggregate(total=Sum(F('unit_price') * F('quantity')))['total'] or 0),
                float(ProcurementItem.objects.filter(
                    plan__status__in=['approved', 'completed'],
                    created_at__date__range=[end_date - timezone.timedelta(days=21), end_date - timezone.timedelta(days=15)]
                ).aggregate(total=Sum(F('unit_price') * F('quantity')))['total'] or 0),
                float(ProcurementItem.objects.filter(
                    plan__status__in=['approved', 'completed'],
                    created_at__date__range=[end_date - timezone.timedelta(days=14), end_date - timezone.timedelta(days=8)]
                ).aggregate(total=Sum(F('unit_price') * F('quantity')))['total'] or 0),
                float(ProcurementItem.objects.filter(
                    plan__status__in=['approved', 'completed'],
                    created_at__date__range=[end_date - timezone.timedelta(days=7), end_date]
                ).aggregate(total=Sum(F('unit_price') * F('quantity')))['total'] or 0)
            ]
            
        elif period == 'quarter':
            # 获取最近一个季度的数据，按月统计
            start_date = timezone.now().date() - timezone.timedelta(days=90)
            end_date = timezone.now().date()
            
            # 创建标签列表（最近3个月）
            current_month = end_date.month
            current_year = end_date.year
            labels = []
            for i in range(2, -1, -1):
                month = current_month - i
                year = current_year
                if month <= 0:
                    month += 12
                    year -= 1
                labels.append(f"{year}-{month:02d}")
            
            # 获取采购金额
            procurement_amounts = []
            for label in labels:
                year, month = map(int, label.split('-'))
                amount = ProcurementItem.objects.filter(
                    plan__status__in=['approved', 'completed'],
                    created_at__year=year,
                    created_at__month=month
                ).aggregate(total=Sum(F('unit_price') * F('quantity')))['total'] or 0
                procurement_amounts.append(float(amount))
            
        elif period == 'year':
            # 获取最近一年的数据，按季度统计
            start_date = timezone.now().date() - timezone.timedelta(days=365)
            end_date = timezone.now().date()
            
            # 创建标签列表（最近4个季度）
            labels = [
                f"Q{(end_date.month - 9) // 3 + 1} {end_date.year - 1 if end_date.month < 10 else end_date.year}",
                f"Q{(end_date.month - 6) // 3 + 1} {end_date.year - 1 if end_date.month < 7 else end_date.year}",
                f"Q{(end_date.month - 3) // 3 + 1} {end_date.year - 1 if end_date.month < 4 else end_date.year}",
                f"Q{end_date.month // 3 + 1} {end_date.year}"
            ]
            
            # 获取采购金额（简化计算，实际中可能需要更精确的季度划分）
            procurement_amounts = [
                float(ProcurementItem.objects.filter(
                    plan__status__in=['approved', 'completed'],
                    created_at__date__range=[end_date - timezone.timedelta(days=365), end_date - timezone.timedelta(days=274)]
                ).aggregate(total=Sum(F('unit_price') * F('quantity')))['total'] or 0),
                float(ProcurementItem.objects.filter(
                    plan__status__in=['approved', 'completed'],
                    created_at__date__range=[end_date - timezone.timedelta(days=273), end_date - timezone.timedelta(days=183)]
                ).aggregate(total=Sum(F('unit_price') * F('quantity')))['total'] or 0),
                float(ProcurementItem.objects.filter(
                    plan__status__in=['approved', 'completed'],
                    created_at__date__range=[end_date - timezone.timedelta(days=182), end_date - timezone.timedelta(days=92)]
                ).aggregate(total=Sum(F('unit_price') * F('quantity')))['total'] or 0),
                float(ProcurementItem.objects.filter(
                    plan__status__in=['approved', 'completed'],
                    created_at__date__range=[end_date - timezone.timedelta(days=91), end_date]
                ).aggregate(total=Sum(F('unit_price') * F('quantity')))['total'] or 0)
            ]
        
        # 获取其他统计数据
        total_plans = ProcurementPlan.objects.count()
        pending_plans = ProcurementPlan.objects.filter(status='pending').count()
        approved_plans = ProcurementPlan.objects.filter(status='approved').count()
        completed_plans = ProcurementPlan.objects.filter(status='completed').count()
        
        total_items = ProcurementItem.objects.count()
        pending_items = ProcurementItem.objects.filter(status='pending').count()
        ordered_items = ProcurementItem.objects.filter(status='ordered').count()
        received_items = ProcurementItem.objects.filter(status='received').count()
        
        total_suppliers = Supplier.objects.count()
        active_suppliers = Supplier.objects.filter(is_active=True).count()
        
        return Response({
            'period': period,
            'labels': labels,
            'procurement_amounts': procurement_amounts,
            'total_plans': total_plans,
            'pending_plans': pending_plans,
            'approved_plans': approved_plans,
            'completed_plans': completed_plans,
            'total_items': total_items,
            'pending_items': pending_items,
            'ordered_items': ordered_items,
            'received_items': received_items,
            'total_suppliers': total_suppliers,
            'active_suppliers': active_suppliers
        })
