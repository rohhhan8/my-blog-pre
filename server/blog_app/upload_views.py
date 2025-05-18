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
import logging

# Set up logger
logger = logging.getLogger(__name__)

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

    try:
        # Generate a unique filename
        file_extension = os.path.splitext(image_file.name)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"

        # Define the path where the file will be saved
        upload_dir = 'blog_images'
        file_path = os.path.join(upload_dir, unique_filename)

        # In development, ensure the upload directory exists
        if settings.DEBUG:
            os.makedirs(os.path.join(settings.MEDIA_ROOT, upload_dir), exist_ok=True)

        # Save the file using the default storage backend
        path = default_storage.save(file_path, ContentFile(image_file.read()))

        # Generate the URL
        # This will be a relative URL for local storage
        if hasattr(default_storage, 'url'):
            file_url = default_storage.url(path)
            # If the URL is a relative URL, make it absolute
            if not file_url.startswith('http'):
                file_url = request.build_absolute_uri(file_url)
        else:
            file_url = request.build_absolute_uri(settings.MEDIA_URL + path)

        logger.info(f"Image uploaded successfully: {file_url}")
        return Response({'url': file_url}, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Error uploading image: {str(e)}")
        return Response({'error': f'Error uploading image: {str(e)}'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)
