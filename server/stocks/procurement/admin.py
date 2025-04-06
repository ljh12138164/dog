from django.contrib import admin
from .models import Supplier, ProcurementPlan, ProcurementItem, MaterialSupervision


class ProcurementItemInline(admin.TabularInline):
    model = ProcurementItem
    extra = 1
    fields = ('ingredient', 'quantity', 'unit_price', 'supplier', 'status',
              'expected_delivery_date', 'actual_delivery_date')
    autocomplete_fields = ['ingredient', 'supplier']


@admin.register(ProcurementPlan)
class ProcurementPlanAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'created_by_name', 'start_date', 'end_date',
                    'approved_by_name', 'total_items', 'total_budget')
    list_filter = ('status', 'created_by', 'approved_by', 'start_date', 'end_date')
    search_fields = ('title', 'description')
    readonly_fields = ('total_budget', 'total_items', 'created_at', 'updated_at')
    date_hierarchy = 'created_at'
    inlines = [ProcurementItemInline]
    fieldsets = (
        ('基本信息', {
            'fields': ('title', 'description', 'status', 'created_by')
        }),
        ('时间信息', {
            'fields': ('start_date', 'end_date', 'created_at', 'updated_at')
        }),
        ('审批信息', {
            'fields': ('approved_by', 'approved_at', 'reject_reason')
        }),
        ('统计信息', {
            'fields': ('total_budget', 'total_items')
        }),
    )

    def created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username
        return "-"
    created_by_name.short_description = "创建人"

    def approved_by_name(self, obj):
        if obj.approved_by:
            return f"{obj.approved_by.first_name} {obj.approved_by.last_name}".strip() or obj.approved_by.username
        return "-"
    approved_by_name.short_description = "审批人"


@admin.register(ProcurementItem)
class ProcurementItemAdmin(admin.ModelAdmin):
    list_display = ('ingredient_name', 'plan', 'quantity', 'unit', 'unit_price',
                    'total_price', 'supplier', 'status', 'expected_delivery_date')
    list_filter = ('plan', 'status', 'supplier', 'expected_delivery_date')
    search_fields = ('ingredient__name', 'notes', 'supplier__name')
    autocomplete_fields = ['ingredient', 'supplier', 'plan']
    readonly_fields = ('total_price', 'created_at', 'updated_at')
    date_hierarchy = 'created_at'
    fieldsets = (
        ('基本信息', {
            'fields': ('plan', 'ingredient', 'quantity', 'unit_price', 'total_price')
        }),
        ('供应商信息', {
            'fields': ('supplier', 'status', 'notes')
        }),
        ('时间信息', {
            'fields': ('expected_delivery_date', 'actual_delivery_date', 'created_at', 'updated_at')
        }),
    )

    def ingredient_name(self, obj):
        return obj.ingredient.name if obj.ingredient else "-"
    ingredient_name.short_description = "原料"

    def unit(self, obj):
        return obj.ingredient.unit if obj.ingredient else "-"
    unit.short_description = "单位"


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'contact_person', 'phone', 'email', 'rating', 'is_active')
    list_filter = ('is_active', 'rating')
    search_fields = ('name', 'contact_person', 'phone', 'email', 'address', 'products')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('基本信息', {
            'fields': ('name', 'contact_person', 'phone', 'email', 'is_active')
        }),
        ('详细信息', {
            'fields': ('address', 'products', 'rating', 'notes')
        }),
        ('时间信息', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(MaterialSupervision)
class MaterialSupervisionAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'priority', 'created_by_name',
                    'supervisor_name', 'due_date', 'ingredient_count')
    list_filter = ('status', 'priority', 'created_by', 'supervisor', 'due_date')
    search_fields = ('title', 'description', 'notes')
    readonly_fields = ('created_at', 'updated_at', 'completed_at')
    filter_horizontal = ('ingredients',)
    date_hierarchy = 'created_at'
    fieldsets = (
        ('基本信息', {
            'fields': ('title', 'description', 'status', 'priority')
        }),
        ('物料信息', {
            'fields': ('ingredients', 'quantity_required')
        }),
        ('人员信息', {
            'fields': ('created_by', 'supervisor')
        }),
        ('时间信息', {
            'fields': ('due_date', 'created_at', 'updated_at', 'completed_at')
        }),
        ('备注', {
            'fields': ('notes',)
        }),
    )

    def created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username
        return "-"
    created_by_name.short_description = "创建人"

    def supervisor_name(self, obj):
        if obj.supervisor:
            return f"{obj.supervisor.first_name} {obj.supervisor.last_name}".strip() or obj.supervisor.username
        return "-"
    supervisor_name.short_description = "监督人"

    def ingredient_count(self, obj):
        return obj.ingredients.count()
    ingredient_count.short_description = "物料数量"
