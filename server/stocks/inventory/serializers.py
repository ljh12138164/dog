from rest_framework import serializers
from .models import Ingredient, InventoryOperation, Task, Feedback, EnvironmentData, InventoryEvent, InventoryReport, SensorData, Comment, MaterialRequest, MaterialRequestItem, Category
from users.models import User
from users.serializers import UserSerializer
import logging


class IngredientSerializer(serializers.ModelSerializer):
    """
    食材序列化器
    """
    class Meta:
        model = Ingredient
        fields = ['id', 'name', 'category', 'unit', 'quantity', 'expiry_date', 
                 'status', 'location', 'last_check_date', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class InventoryOperationSerializer(serializers.ModelSerializer):
    """
    库存操作序列化器
    """
    ingredient_name = serializers.ReadOnlyField(source='ingredient.name')
    operator_name = serializers.ReadOnlyField(source='operator.username')
    inspector_name = serializers.ReadOnlyField(source='inspector.username')
    operator = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,  # 设置为非必填
    )

    class Meta:
        model = InventoryOperation
        fields = [
            'id', 'ingredient', 'ingredient_name', 'operation_type', 
            'quantity', 'production_date', 'expiry_period', 
            'operator', 'operator_name', 'inspector', 'inspector_name', 
            'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'ingredient_name', 'operator_name', 'inspector_name']
    
    def validate_ingredient(self, value):
        """
        验证并转换ingredient字段
        可以接受ingredient ID或ingredient对象，包括字符串ID
        """
        from .models import Ingredient
        logger = logging.getLogger(__name__)
        
        logger.info(f"接收到的ingredient值: {value}, 类型: {type(value)}")
        
        # 如果已经是Ingredient实例，直接返回
        if isinstance(value, Ingredient):
            return value
            
        # 处理各种类型的ingredient值
        try:
            # 如果是整数或可转换为整数的字符串
            if isinstance(value, int) or (isinstance(value, str) and value.isdigit()):
                ingredient_id = int(value)
                try:
                    return Ingredient.objects.get(pk=ingredient_id)
                except Ingredient.DoesNotExist:
                    logger.warning(f"找不到ID为{ingredient_id}的食材")
            
            # 如果是非数字字符串，尝试按名称查找
            if isinstance(value, str):
                ingredient = Ingredient.objects.filter(name=value).first()
                if ingredient:
                    return ingredient
                else:
                    logger.warning(f"找不到名称为'{value}'的食材")
            
            # 如果找不到对应的食材，尝试从全局上下文获取更多信息
            if hasattr(self, 'context') and 'request' in self.context:
                request_data = self.context['request'].data
                logger.info(f"请求数据: {request_data}")
                
                # 如果请求中包含name字段，尝试创建新食材
                if 'name' in request_data and isinstance(request_data['name'], str):
                    default_ingredient = Ingredient.objects.create(
                        name=request_data['name'],
                        category=request_data.get('category', '其他'),
                        unit=request_data.get('unit', '个'),
                        quantity=0,
                        status='normal',
                        location=''
                    )
                    logger.info(f"已创建新食材: {default_ingredient.name} (ID:{default_ingredient.id})")
                    return default_ingredient
            
            # 如果所有尝试都失败，返回错误
            raise serializers.ValidationError(f"无效的食材值: {value}, 请提供有效的食材ID或名称")
            
        except Exception as e:
            logger.error(f"处理食材数据时出错: {str(e)}")
            raise serializers.ValidationError(f"处理食材数据时出错: {str(e)}")


class TaskSerializer(serializers.ModelSerializer):
    """
    任务序列化器
    """
    assigned_to_name = serializers.ReadOnlyField(source='assigned_to.username')
    created_by_name = serializers.ReadOnlyField(source='created_by.username')
    task_type_display = serializers.ReadOnlyField(source='get_task_type_display')

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'status', 'task_type', 'task_type_display', 'due_date', 
            'priority', 'assigned_to', 'assigned_to_name', 
            'created_by', 'created_by_name', 'created_at', 
            'updated_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'completed_at', 
            'assigned_to_name', 'created_by_name', 'task_type_display'
        ]


class CommentSerializer(serializers.ModelSerializer):
    """
    评论序列化器
    """
    created_by_username = serializers.ReadOnlyField(source='created_by.username')
    created_by_avatar = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = [
            'id', 'feedback', 'content', 'created_by', 
            'created_by_username', 'created_by_avatar', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'created_by_username', 'created_by_avatar']
    
    def get_created_by_avatar(self, obj):
        if obj.created_by.avatar:
            return obj.created_by.avatar.url
        return None


class FeedbackStatusSerializer(serializers.ModelSerializer):
    """
    反馈状态更新序列化器
    """
    class Meta:
        model = Feedback
        fields = ['status', 'resolution_notes']
        

class FeedbackSerializer(serializers.ModelSerializer):
    """
    异常反馈序列化器
    """
    reporter_name = serializers.ReadOnlyField(source='reporter.username')
    handler_name = serializers.ReadOnlyField(source='handler.username')
    comments = CommentSerializer(many=True, read_only=True)

    class Meta:
        model = Feedback
        fields = [
            'id', 'title', 'description', 'status', 
            'reporter', 'reporter_name', 'handler', 'handler_name', 
            'created_at', 'updated_at', 'resolved_at', 'comments'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'resolved_at', 
            'reporter_name', 'handler_name', 'reporter', 'comments'
        ]


class TaskListSerializer(serializers.ModelSerializer):
    """
    员工任务列表序列化器
    """
    task_type_display = serializers.ReadOnlyField(source='get_task_type_display')
    
    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'status', 'task_type', 'task_type_display', 'due_date', 'priority', 'completed_at']


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


class SensorDataSerializer(serializers.ModelSerializer):
    """
    传感器数据序列化器
    """
    class Meta:
        model = SensorData
        fields = ['id', 'temperature', 'humidity', 'light', 'threshold', 'timestamp', 'created_at']
        read_only_fields = ['id', 'created_at']


class MaterialRequestItemSerializer(serializers.ModelSerializer):
    """出库申请项目的序列化器"""
    ingredient_name = serializers.SerializerMethodField()
    unit = serializers.SerializerMethodField()

    class Meta:
        model = MaterialRequestItem
        fields = [
            'id', 'request', 'ingredient', 'ingredient_name', 
            'quantity', 'unit', 'notes'
        ]
        read_only_fields = ['id', 'ingredient_name', 'unit']

    def get_ingredient_name(self, obj):
        return obj.ingredient.name if obj.ingredient else None

    def get_unit(self, obj):
        return obj.ingredient.unit if obj.ingredient else None


class MaterialRequestSerializer(serializers.ModelSerializer):
    """出库申请的序列化器"""
    items = MaterialRequestItemSerializer(many=True, read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    completed_by_name = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()

    class Meta:
        model = MaterialRequest
        fields = [
            'id', 'title', 'description', 'status', 'status_display',
            'requested_by', 'requested_by_name', 'requested_at',
            'approved_by', 'approved_by_name', 'approved_at',
            'assigned_to', 'assigned_to_name', 'assigned_at',
            'completed_by', 'completed_by_name', 'completed_at',
            'items'
        ]
        read_only_fields = [
            'id', 'requested_by', 'requested_by_name', 'requested_at',
            'approved_by', 'approved_by_name', 'approved_at',
            'assigned_to', 'assigned_to_name', 'assigned_at',
            'completed_by', 'completed_by_name', 'completed_at',
            'status_display'
        ]

    def get_requested_by_name(self, obj):
        return obj.requested_by.get_full_name() or obj.requested_by.username if obj.requested_by else None

    def get_approved_by_name(self, obj):
        return obj.approved_by.get_full_name() or obj.approved_by.username if obj.approved_by else None
        
    def get_assigned_to_name(self, obj):
        return obj.assigned_to.get_full_name() or obj.assigned_to.username if obj.assigned_to else None

    def get_completed_by_name(self, obj):
        return obj.completed_by.get_full_name() or obj.completed_by.username if obj.completed_by else None

    def get_status_display(self, obj):
        return obj.get_status_display()

    def create(self, validated_data):
        items_data = self.context['request'].data.get('items', [])
        request = MaterialRequest.objects.create(**validated_data)
        
        for item_data in items_data:
            ingredient_id = item_data.get('ingredient_id')
            quantity = item_data.get('quantity')
            notes = item_data.get('notes', '')
            
            if ingredient_id and quantity:
                try:
                    ingredient = Ingredient.objects.get(id=ingredient_id)
                    MaterialRequestItem.objects.create(
                        request=request,
                        ingredient=ingredient,
                        quantity=float(quantity),
                        notes=notes
                    )
                except (Ingredient.DoesNotExist, ValueError):
                    # 如果食材不存在或数量无效，则跳过该项
                    pass
        
        return request 


class CategorySerializer(serializers.ModelSerializer):
    """
    分类序列化器
    """
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at'] 