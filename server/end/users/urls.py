from django.urls import path
from .views import RegisterView, LoginView, UserDetailView, CurrentUserView, UserAvatarView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('user/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('me/', CurrentUserView.as_view(), name='current-user'),
    path('upload-avatar/', UserAvatarView.as_view(), name='upload-avatar'),
] 