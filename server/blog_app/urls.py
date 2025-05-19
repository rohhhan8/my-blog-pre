from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BlogViewSet
from .profile_views import ProfileViewSet
from .upload_views import upload_image

router = DefaultRouter()
router.register(r'blogs', BlogViewSet, basename='blog')
router.register(r'profiles', ProfileViewSet, basename='profile')

urlpatterns = [
    path('', include(router.urls)),  # Include all router URLs under app root
    path('upload/', upload_image, name='upload_image'),  # Image upload endpoint
]
