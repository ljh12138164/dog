from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import STM32DataViewSet

router = DefaultRouter()
router.register('stm32-data', STM32DataViewSet, basename='stm32-data')

urlpatterns = [
    path('', include(router.urls)),
] 