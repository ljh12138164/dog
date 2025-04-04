from rest_framework import serializers
from .models import Ingredient, InventoryOperation, Task, Feedback, EnvironmentData, InventoryEvent, InventoryReport
from users.serializers import UserSerializer


class IngredientSerializer(serializers.ModelSerializer):
    """
    食材序列化器
    """
    class Meta:
        model = Ingredient
        fields = '__all__'


class InventoryOperationSerializer(serializers.ModelSerializer):
    """
    库存操作序列化器
    """
    ingredient_name = serializers.ReadOnlyField(source='ingredient.name')
    operator_name = serializers.ReadOnlyField(source='operator.username')

    class Meta:
        model = InventoryOperation
        fields = [
            'id', 'ingredient', 'ingredient_name', 'operation_type', 
            'quantity', 'operator', 'operator_name', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'ingredient_name', 'operator_name']


class TaskSerializer(serializers.ModelSerializer):
    """
    任务序列化器
    """
    assigned_to_name = serializers.ReadOnlyField(source='assigned_to.username')
    created_by_name = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'status', 'due_date', 
            'priority', 'assigned_to', 'assigned_to_name', 
            'created_by', 'created_by_name', 'created_at', 
            'updated_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'completed_at', 
            'assigned_to_name', 'created_by_name'
        ]


class FeedbackSerializer(serializers.ModelSerializer):
    """
    异常反馈序列化器
    """
    reporter_name = serializers.ReadOnlyField(source='reporter.username')
    handler_name = serializers.ReadOnlyField(source='handler.username')

    class Meta:
        model = Feedback
        fields = [
            'id', 'title', 'description', 'status', 
            'reporter', 'reporter_name', 'handler', 'handler_name', 
            'created_at', 'updated_at', 'resolved_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'resolved_at', 
            'reporter_name', 'handler_name', 'reporter'
        ]


class TaskListSerializer(serializers.ModelSerializer):
    """
    员工任务列表序列化器
    """
    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'status', 'due_date', 'priority']


class EnvironmentDataSerializer(serializers.ModelSerializer):
    """
    环境数据序列化器
    """
    class Meta:
        model = EnvironmentData
        fields = '__all__'
        read_only_fields = ['id', 'recorded_at']


class InventoryEventSerializer(serializers.ModelSerializer):
    """
    库存事件序列化器
    """
    reported_by_name = serializers.ReadOnlyField(source='reported_by.username')
    handled_by_name = serializers.ReadOnlyField(source='handled_by.username')
    event_type_display = serializers.ReadOnlyField(source='get_event_type_display')
    status_display = serializers.ReadOnlyField(source='get_status_display')
    ingredients_details = IngredientSerializer(source='ingredients', many=True, read_only=True)

    class Meta:
        model = InventoryEvent
        fields = [
            'id', 'event_type', 'event_type_display', 'title', 'description', 
            'ingredients', 'ingredients_details', 'status', 'status_display',
            'reported_by', 'reported_by_name', 'handled_by', 'handled_by_name',
            'resolution_notes', 'created_at', 'updated_at', 'resolved_at'
        ]
        read_only_fields = [
            'id', 'reported_by_name', 'handled_by_name', 'created_at', 
            'updated_at', 'resolved_at', 'event_type_display', 'status_display'
        ]


class InventoryReportSerializer(serializers.ModelSerializer):
    """
    库存报告序列化器
    """
    created_by_name = serializers.ReadOnlyField(source='created_by.username')
    report_type_display = serializers.ReadOnlyField(source='get_report_type_display')

    class Meta:
        model = InventoryReport
        fields = [
            'id', 'report_type', 'report_type_display', 'title', 'start_date', 
            'end_date', 'summary', 'details', 'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_by_name', 'created_at', 'report_type_display'] 