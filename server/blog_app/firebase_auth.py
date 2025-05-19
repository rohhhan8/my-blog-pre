from rest_framework import authentication, exceptions
from django.contrib.auth.models import User
from django.conf import settings
import os
import json

# Import our direct Firebase handling module
from blog_app.firebase_direct import verify_firebase_token


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

            # Use our direct verification function
            decoded_token = verify_firebase_token(id_token)
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

            # Check if this is a clock skew error and we're in development mode
            if "Token used too early" in str(e) and hasattr(settings, 'FIREBASE_AUTH_DEVELOPMENT_MODE') and settings.FIREBASE_AUTH_DEVELOPMENT_MODE:
                # In development mode, try to extract user info from the token without verification
                try:
                    # Try to decode the token manually if we don't have a decoded token yet
                    decoded_token = None

                    # First check if we already have a decoded token from a previous step
                    if 'decoded_token' in locals() and decoded_token:
                        print("Using previously decoded token")
                    else:
                        # Try to decode the token manually
                        try:
                            import jwt
                            decoded_token = jwt.decode(id_token, options={"verify_signature": False})
                            print(f"Manually decoded token in auth class: {decoded_token}")
                        except Exception as jwt_error:
                            print(f"Failed to manually decode token: {str(jwt_error)}")

                    # If we have a decoded token (from either source), use it
                    if decoded_token:
                        uid = decoded_token.get('uid') or decoded_token.get('user_id') or decoded_token.get('sub')
                        email = decoded_token.get('email', '')
                        display_name = decoded_token.get('name', '') or decoded_token.get('display_name', '')

                        print(f"DEBUG MODE: Using unverified token data for user: {uid}")

                        # Create or update the user
                        user, created = User.objects.get_or_create(
                            username=uid,
                            defaults={
                                'email': email,
                                'first_name': display_name
                            }
                        )

                        if created:
                            print(f"Created new user with uid: {uid} (from unverified token)")
                        else:
                            print(f"Found existing user with uid: {uid} (from unverified token)")

                        # Add a warning to the request to indicate this is an unverified token
                        request.auth_warning = "Using unverified token due to clock skew issue"

                        return (user, None)
                except Exception as fallback_error:
                    print(f"Fallback authentication failed: {str(fallback_error)}")

            # For production or if fallback fails, raise the authentication error
            raise exceptions.AuthenticationFailed(f'Invalid token: {str(e)}')
