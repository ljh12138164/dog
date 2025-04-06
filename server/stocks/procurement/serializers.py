from rest_framework import serializers
from django.contrib.auth import get_user_model
from inventory.models import Ingredient
from inventory.serializers import IngredientSerializer
from .models import Supplier, ProcurementPlan, ProcurementItem, MaterialSupervision

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'


class ProcurementItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcurementItem
        fields = '__all__'


class ProcurementItemSerializer(serializers.ModelSerializer):
    ingredient_details = IngredientSerializer(source='ingredient', read_only=True)
    supplier_details = SupplierSerializer(source='supplier', read_only=True)
    total_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    status_display = serializers.CharField(read_only=True)
    ingredient_name = serializers.CharField(read_only=True)
    unit = serializers.CharField(read_only=True)

    class Meta:
        model = ProcurementItem
        fields = '__all__'


class ProcurementPlanSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    total_budget = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(read_only=True)
    items = ProcurementItemSerializer(many=True, read_only=True)

    class Meta:
        model = ProcurementPlan
        fields = '__all__'

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username
        return None

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return f"{obj.approved_by.first_name} {obj.approved_by.last_name}".strip() or obj.approved_by.username
        return None


class MaterialSupervisionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    supervisor_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(read_only=True)
    priority_display = serializers.CharField(read_only=True)
    ingredients_details = serializers.SerializerMethodField()

    class Meta:
        model = MaterialSupervision
        fields = '__all__'

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username
        return None

    def get_supervisor_name(self, obj):
        if obj.supervisor:
            return f"{obj.supervisor.first_name} {obj.supervisor.last_name}".strip() or obj.supervisor.username
        return None

    def get_ingredients_details(self, obj):
        return IngredientSerializer(obj.ingredients.all(), many=True).data 