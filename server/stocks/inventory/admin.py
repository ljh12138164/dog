from django.contrib import admin
from .models import (
    Ingredient, 
    InventoryOperation, 
    Task, 
    Feedback,
    EnvironmentData,
    InventoryEvent,
    InventoryReport
)


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'quantity', 'unit', 'status', 'expiry_date')
    list_filter = ('category', 'status')
    search_fields = ('name', 'category')


@admin.register(InventoryOperation)
class InventoryOperationAdmin(admin.ModelAdmin):
    list_display = ('ingredient', 'operation_type', 'quantity', 'operator', 'created_at')
    list_filter = ('operation_type', 'created_at')
    search_fields = ('ingredient__name', 'notes')


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'priority', 'assigned_to', 'due_date')
    list_filter = ('status', 'priority', 'due_date')
    search_fields = ('title', 'description')


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'reporter', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('title', 'description')


@admin.register(EnvironmentData)
class EnvironmentDataAdmin(admin.ModelAdmin):
    list_display = ('temperature', 'humidity', 'recorded_at')
    list_filter = ('recorded_at',)
    search_fields = ('notes',)


@admin.register(InventoryEvent)
class InventoryEventAdmin(admin.ModelAdmin):
    list_display = ('title', 'event_type', 'status', 'reported_by', 'created_at')
    list_filter = ('event_type', 'status', 'created_at')
    search_fields = ('title', 'description')
    filter_horizontal = ('ingredients',)


@admin.register(InventoryReport)
class InventoryReportAdmin(admin.ModelAdmin):
    list_display = ('title', 'report_type', 'start_date', 'end_date', 'created_by', 'created_at')
    list_filter = ('report_type', 'created_at')
    search_fields = ('title', 'summary')
