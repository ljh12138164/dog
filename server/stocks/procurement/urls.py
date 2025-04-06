from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SupplierViewSet,
    ProcurementPlanViewSet,
    ProcurementItemViewSet,
    MaterialSupervisionViewSet,
    ProcurementStatisticsViewSet,
)

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet)
router.register(r'procurement-plans', ProcurementPlanViewSet)
router.register(r'procurement-items', ProcurementItemViewSet)
router.register(r'material-supervisions', MaterialSupervisionViewSet)
router.register(r'procurement-statistics', ProcurementStatisticsViewSet, basename='procurement-statistics')

urlpatterns = [
    path('', include(router.urls)),
] 