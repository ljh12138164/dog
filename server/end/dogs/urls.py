from django.urls import path
from .views import DogListCreateView, DogDetailView, DogImageUploadView, DogBreedIdentifyView

urlpatterns = [
    path('', DogListCreateView.as_view(), name='dog-list-create'),
    path('<int:pk>/', DogDetailView.as_view(), name='dog-detail'),
    path('<int:pk>/upload-image/', DogImageUploadView.as_view(), name='dog-upload-image'),
    path('identify-breed/', DogBreedIdentifyView.as_view(), name='dog-identify-breed'),
] 