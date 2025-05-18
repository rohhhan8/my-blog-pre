from rest_framework import authentication, exceptions
from django.contrib.auth.models import User
import firebase_admin
from firebase_admin import credentials, auth
from django.conf import settings
import os
import json

# Initialize Firebase Admin SDK
try:
    # Try to get existing app
    firebase_admin.get_app()
except ValueError:
    # Initialize a new app
    try:
        # First try to use environment variables if available
        if settings.FIREBASE_CREDENTIALS:
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS)
            firebase_admin.initialize_app(cred)
        # Fall back to file-based credentials
        else:
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"Error initializing Firebase: {str(e)}")
        # In production, you might want to handle this more gracefully


class FirebaseAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        # Try to get the auth header from META (Django's standard way)
        auth_header = request.META.get('HTTP_AUTHORIZATION')

        # If not found, try to get it from headers (used by some clients)
        if not auth_header and hasattr(request, 'headers'):
            auth_header = request.headers.get('Authorization')

        if not auth_header:
            return None

        # Check if it's a Bearer token
        if auth_header.startswith('Bearer '):
            id_token = auth_header.split('Bearer ')[1]
        else:
            parts = auth_header.split()
            if len(parts) != 2 or parts[0].lower() != 'bearer':
                return None
            id_token = parts[1]

        try:
            # Print token for debugging (remove in production)
            print(f"Attempting to verify token: {id_token[:10]}...")

            # Add clock skew tolerance (60 seconds max) to handle time synchronization issues
            decoded_token = auth.verify_id_token(id_token, check_revoked=True)
            print(f"Token verified successfully. Decoded token: {decoded_token}")

            uid = decoded_token.get('uid')
            if not uid:
                raise exceptions.AuthenticationFailed('Invalid token: missing uid')

            # Get user information from the token
            email = decoded_token.get('email', '')
            display_name = decoded_token.get('name', '')

            # If no name in token, try to get it from Firebase claims
            if not display_name:
                display_name = decoded_token.get('display_name', '')

            # Create or update the user
            user, created = User.objects.get_or_create(
                username=uid,
                defaults={
                    'email': email,
                    'first_name': display_name  # Store display name in first_name field
                }
            )

            # Update the user's name if it exists in the token but not in the database
            if not created and display_name and not user.first_name:
                user.first_name = display_name
                user.save()

            if created:
                print(f"Created new user with uid: {uid}, display name: {display_name}")
            else:
                print(f"Found existing user with uid: {uid}, display name: {user.first_name}")

            return (user, None)

        except Exception as e:
            print(f"Firebase authentication error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise exceptions.AuthenticationFailed(f'Invalid token: {str(e)}')
