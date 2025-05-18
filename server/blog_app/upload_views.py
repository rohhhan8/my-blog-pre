from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
import os
import uuid
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_image(request):
    """
    Upload an image and return its URL
    """
    if 'image' not in request.FILES:
        return Response({'error': 'No image file provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    image_file = request.FILES['image']
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/gif']
    if image_file.content_type not in allowed_types:
        return Response({'error': 'File type not supported. Please upload JPEG, PNG or GIF'}, 
                        status=status.HTTP_400_BAD_REQUEST)
    
    # Validate file size (5MB max)
    if image_file.size > 5 * 1024 * 1024:
        return Response({'error': 'File too large. Maximum size is 5MB'}, 
                        status=status.HTTP_400_BAD_REQUEST)
    
    # Generate a unique filename
    file_extension = os.path.splitext(image_file.name)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    
    # Define the path where the file will be saved
    upload_dir = 'blog_images'
    file_path = os.path.join(upload_dir, unique_filename)
    
    # Ensure the upload directory exists
    os.makedirs(os.path.join(settings.MEDIA_ROOT, upload_dir), exist_ok=True)
    
    # Save the file
    path = default_storage.save(file_path, ContentFile(image_file.read()))
    
    # Generate the URL
    file_url = request.build_absolute_uri(settings.MEDIA_URL + path)
    
    return Response({'url': file_url}, status=status.HTTP_201_CREATED)
