"""
URL configuration for stocks_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from rest_framework.documentation import include_docs_urls
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework import permissions
from users.views import (
    LoginView, 
    LogoutView, 
    RegisterView, 
    UserViewSet, 
    RoleViewSet, 
    PermissionViewSet,
    UserRoleViewSet,
    SystemConfigViewSet,
    UserMeView,
    CustomTokenObtainPairView,
    CustomTokenRefreshView
)
from django.conf import settings
from django.conf.urls.static import static
from django.views.decorators.csrf import csrf_exempt

# 创建API文档视图
schema_view = get_schema_view(
    openapi.Info(
        title="仓库 API",
        default_version='v1',
        description="仓库系统API文档",
        terms_of_service="https://www.example.com/terms/",
        contact=openapi.Contact(email="contact@example.com"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')),
    path('api/', include('inventory.urls')),
    path('api/', include('procurement.urls')),
    path('api-auth/', include('rest_framework.urls')),
    path('docs/', include_docs_urls(title='仓库系统 API 文档')),
    
    # Swagger UI
    re_path(r'^swagger(?P<format>\.json|\.yaml)$', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    
    # 权限和认证相关的URL
    path('api/login/', csrf_exempt(LoginView.as_view()), name='login'),
    path('api/register/', csrf_exempt(RegisterView.as_view()), name='register'),
    path('api/logout/', LogoutView.as_view(), name='logout'),
    path('api/users/me/', UserMeView.as_view(), name='user-me'),
    
    # JWT认证URL
    path('api/token/', csrf_exempt(CustomTokenObtainPairView.as_view()), name='token_obtain_pair'),
    path('api/token/refresh/', csrf_exempt(CustomTokenRefreshView.as_view()), name='token_refresh'),
]

# 在开发环境中添加媒体文件的访问URL
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
