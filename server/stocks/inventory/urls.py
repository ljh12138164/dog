from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    IngredientViewSet,
    InventoryOperationViewSet,
    EmployeeTaskViewSet,
    EmployeeFeedbackViewSet,
    EnvironmentDataViewSet,
    InventoryEventViewSet,
    InventoryReportViewSet,
    SensorDataViewSet
)

# 创建路由器并注册视图集
router = DefaultRouter()
router.register(r'ingredients', IngredientViewSet)
router.register(r'inventory-operations', InventoryOperationViewSet)
router.register(r'employee/tasks', EmployeeTaskViewSet, basename='employee-task')
router.register(r'employee/feedback', EmployeeFeedbackViewSet, basename='employee-feedback')
router.register(r'environment-data', EnvironmentDataViewSet)
router.register(r'inventory-events', InventoryEventViewSet)
router.register(r'inventory-reports', InventoryReportViewSet)
router.register(r'sensor-data', SensorDataViewSet)

urlpatterns = [
    path('', include(router.urls)),
] 