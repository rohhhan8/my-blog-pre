"""
Direct Firebase authentication module to handle token verification.
This is a more explicit approach to fix the JWT signature issue.
"""

import os
import json
import firebase_admin
from firebase_admin import credentials, auth
from django.conf import settings

# Function to initialize Firebase with explicit credentials
def initialize_firebase():
    """Initialize Firebase with explicit credentials to avoid JWT signature issues."""
    try:
        # Check if Firebase is already initialized
        firebase_admin.get_app()
        print("Firebase already initialized")
        return True
    except ValueError:
        try:
            # Get credentials from environment variables
            project_id = os.environ.get('FIREBASE_PROJECT_ID')
            client_email = os.environ.get('FIREBASE_CLIENT_EMAIL')
            private_key = os.environ.get('FIREBASE_PRIVATE_KEY')

            # Debug info
            print(f"Initializing Firebase with Project ID: {project_id}")
            print(f"Client Email: {client_email}")
            if private_key:
                print(f"Private Key available: {len(private_key)} characters")
                # Check if private key has proper format
                if "\\n" in private_key and "\n" not in private_key:
                    print("Converting escaped newlines in private key")
                    private_key = private_key.replace("\\n", "\n")
            else:
                print("WARNING: Private key not found in environment variables")

            # Create credentials dictionary
            cred_dict = {
                "type": "service_account",
                "project_id": project_id,
                "private_key": private_key,
                "client_email": client_email,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{client_email.replace('@', '%40')}",
                "universe_domain": "googleapis.com"
            }

            # Initialize Firebase with credentials
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            print("Firebase initialized successfully with environment credentials")
            return True
        except Exception as e:
            print(f"Error initializing Firebase: {str(e)}")

            # Try fallback to file-based credentials
            try:
                cred_path = os.path.join(settings.BASE_DIR, 'firebase', 'serviceAccountKey.json')
                print(f"Trying fallback to file-based credentials: {cred_path}")
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                print("Firebase initialized successfully with file credentials")
                return True
            except Exception as e2:
                print(f"Fallback initialization also failed: {str(e2)}")
                return False

# Function to verify a Firebase token
def verify_firebase_token(token):
    """Verify a Firebase ID token and return the decoded token."""
    try:
        # Make sure Firebase is initialized
        if not initialize_firebase():
            raise Exception("Firebase could not be initialized")

        # Verify the token with increased clock skew tolerance (5 minutes)
        # This helps with "Token used too early" errors due to clock synchronization issues
        print(f"Verifying token: {token[:10]}...")

        # Use a 5-minute clock skew tolerance (300 seconds)
        # Default is only 5 seconds which is too strict for some environments
        decoded_token = auth.verify_id_token(token, check_revoked=False, clock_skew_seconds=300)
        print(f"Token verified successfully: {decoded_token}")
        return decoded_token
    except Exception as e:
        print(f"Token verification failed: {str(e)}")
        print(f"Firebase authentication error: {str(e)}")

        # For "Token used too early" errors, try to extract the user ID from the token
        # This is a fallback mechanism for development environments
        if "Token used too early" in str(e):
            try:
                import jwt
                # Just decode without verification to extract user info
                # This is only for development - would be a security risk in production
                decoded = jwt.decode(token, options={"verify_signature": False})
                print(f"WARNING: Using unverified token data as fallback: {decoded}")

                # Check if this is a development environment
                if settings.DEBUG:
                    print("Development mode: Allowing unverified token")
                    return decoded
                else:
                    print("Production mode: Rejecting unverified token")
            except Exception as jwt_error:
                print(f"Failed to decode token as fallback: {str(jwt_error)}")

        raise e
