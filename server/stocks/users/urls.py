from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, 
    RoleViewSet, 
    PermissionViewSet, 
    LoginView, 
    RegisterView, 
    LogoutView, 
    LoginLogViewSet, 
    SystemConfigViewSet
)

# 创建路由器
router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'roles', RoleViewSet)
router.register(r'permissions', PermissionViewSet)
router.register(r'login-logs', LoginLogViewSet)
router.register(r'system-configs', SystemConfigViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('login/', LoginView.as_view(), name='login'),
    path('register/', RegisterView.as_view(), name='register'),
    path('logout/', LogoutView.as_view(), name='logout'),
] 