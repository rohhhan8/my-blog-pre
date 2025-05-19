from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
import logging

from .profile_models import Profile
from .profile_serializers import ProfileSerializer, PublicProfileSerializer

# Set up logger
logger = logging.getLogger(__name__)

class ProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing user profiles.
    """
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer

    def get_queryset(self):
        """
        Return all profiles or filter by username if provided
        """
        queryset = Profile.objects.all()

        # Check if username parameter is provided
        username = self.request.query_params.get('username', None)
        if username is not None:
            logger.info(f"Filtering profiles by username: {username}")

            # Try multiple approaches to find the profile
            # 1. Exact match
            exact_match = queryset.filter(user__username=username)
            if exact_match.exists():
                logger.info(f"Found exact username match for: {username}")
                return exact_match

            # 2. Case-insensitive match
            iexact_match = queryset.filter(user__username__iexact=username)
            if iexact_match.exists():
                logger.info(f"Found case-insensitive username match for: {username}")
                return iexact_match

            # 3. Contains match
            contains_match = queryset.filter(user__username__icontains=username)
            if contains_match.exists():
                logger.info(f"Found username contains match for: {username}")
                return contains_match

            # 4. Display name match
            display_name_match = queryset.filter(display_name__icontains=username)
            if display_name_match.exists():
                logger.info(f"Found display name match for: {username}")
                return display_name_match

            # If no matches, return empty queryset
            logger.warning(f"No profile matches found for username: {username}")
            return queryset.none()

        return queryset

    def get_permissions(self):
        """
        - List/retrieve: Anyone can view profiles
        - Create/update/delete: Only authenticated users can modify their own profile
        """
        if self.action in ['list', 'retrieve', 'public']:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        """
        Return different serializers based on the action:
        - public: PublicProfileSerializer (limited info)
        - others: ProfileSerializer (full info for owner)
        """
        if self.action == 'public':
            return PublicProfileSerializer
        return ProfileSerializer

    def get_object(self):
        """
        Custom method to get profile by username or ID
        """
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field

        if lookup_url_kwarg in self.kwargs:
            filter_kwargs = {self.lookup_field: self.kwargs[lookup_url_kwarg]}

            # Try to get by ID first
            try:
                obj = self.queryset.get(**filter_kwargs)
                self.check_object_permissions(self.request, obj)
                return obj
            except Profile.DoesNotExist:
                pass

            # If not found by ID, try by username
            try:
                username = self.kwargs[lookup_url_kwarg]
                obj = self.queryset.get(user__username=username)
                self.check_object_permissions(self.request, obj)
                return obj
            except Profile.DoesNotExist:
                pass

        # If we're here, we couldn't find the profile
        return super().get_object()

    def retrieve(self, request, *args, **kwargs):
        """
        Get a user's profile. If the user is requesting their own profile,
        return the full profile. Otherwise, return the public profile.
        """
        instance = self.get_object()

        # Check if the requesting user is the profile owner
        if request.user.is_authenticated and request.user.id == instance.user.id:
            serializer = self.get_serializer(instance)
        else:
            serializer = PublicProfileSerializer(instance)

        return Response(serializer.data)

    @action(detail=False, methods=['get', 'post', 'patch'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """
        Get, create, or update the current user's profile
        """
        try:
            logger.info(f"Profile 'me' endpoint called with method: {request.method}")
            logger.info(f"User: {request.user.username}, ID: {request.user.id}")

            # Check if there was an auth warning (unverified token)
            auth_warning = getattr(request, 'auth_warning', None)
            if auth_warning:
                logger.warning(f"Auth warning for user {request.user.username}: {auth_warning}")

            # Get or create profile for the current user
            profile, created = Profile.objects.get_or_create(
                user=request.user,
                defaults={
                    'display_name': request.user.get_full_name() or request.user.username
                }
            )

            if created:
                logger.info(f"Created new profile for user {request.user.username}")

            # Handle different HTTP methods
            if request.method == 'GET':
                serializer = self.get_serializer(profile)
                response_data = serializer.data

                # Add warning to response if using unverified token
                if auth_warning:
                    response_data['auth_warning'] = auth_warning

                return Response(response_data)
            elif request.method in ['POST', 'PATCH']:
                # Update the profile
                logger.info(f"Updating profile for user {request.user.username}")
                logger.info(f"Request data: {request.data}")

                serializer = self.get_serializer(profile, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                self.perform_update(serializer)

                logger.info(f"Profile updated successfully for user {request.user.username}")
                response_data = serializer.data

                # Add warning to response if using unverified token
                if auth_warning:
                    response_data['auth_warning'] = auth_warning

                return Response(response_data)
        except Exception as e:
            logger.error(f"Error in profile 'me' endpoint for user {request.user.username}: {str(e)}")
            return Response(
                {"detail": f"Error processing profile request: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def public(self, request, pk=None):
        """
        Get the public profile for a user
        """
        try:
            logger.info(f"Public profile requested for: {pk}")

            # Try to get the profile
            try:
                instance = self.get_object()
                logger.info(f"Found profile for: {pk}")
            except Exception as e:
                logger.error(f"Error getting profile for {pk}: {str(e)}")

                # Try to find by username if pk doesn't match an ID
                try:
                    # Try exact username match
                    profile = Profile.objects.filter(user__username=pk).first()
                    if profile:
                        logger.info(f"Found profile by exact username match: {pk}")
                        instance = profile
                    else:
                        # Try case-insensitive username match
                        profile = Profile.objects.filter(user__username__iexact=pk).first()
                        if profile:
                            logger.info(f"Found profile by case-insensitive username match: {pk}")
                            instance = profile
                        else:
                            # Try display name match
                            profile = Profile.objects.filter(display_name__icontains=pk).first()
                            if profile:
                                logger.info(f"Found profile by display name match: {pk}")
                                instance = profile
                            else:
                                logger.error(f"No profile found for {pk}")
                                return Response(
                                    {"detail": f"Profile not found for {pk}"},
                                    status=status.HTTP_404_NOT_FOUND
                                )
                except Exception as username_err:
                    logger.error(f"Error finding profile by username for {pk}: {str(username_err)}")
                    return Response(
                        {"detail": f"Error finding profile: {str(username_err)}"},
                        status=status.HTTP_404_NOT_FOUND
                    )

            # Serialize and return the profile
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Unexpected error in public profile endpoint: {str(e)}")
            return Response(
                {"detail": f"Error retrieving profile: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def update(self, request, *args, **kwargs):
        """
        Update a user's profile
        """
        try:
            instance = self.get_object()

            # Only allow users to update their own profile
            if request.user.id != instance.user.id:
                return Response(
                    {"detail": "You do not have permission to edit this profile."},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Proceed with the update
            return super().update(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error updating profile: {str(e)}")

            # If this is a 'me' endpoint and profile doesn't exist, create it
            if kwargs.get('pk') == 'me':
                try:
                    # Create a new profile
                    profile, created = Profile.objects.get_or_create(
                        user=request.user,
                        defaults={
                            'display_name': request.user.get_full_name() or request.user.username
                        }
                    )

                    if created:
                        logger.info(f"Created new profile for user {request.user.username} during update")

                    # Update the newly created profile
                    serializer = self.get_serializer(profile, data=request.data, partial=True)
                    serializer.is_valid(raise_exception=True)
                    self.perform_update(serializer)

                    return Response(serializer.data)
                except Exception as create_error:
                    logger.error(f"Error creating profile during update: {str(create_error)}")
                    return Response(
                        {"detail": f"Error creating profile: {str(create_error)}"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

            return Response(
                {"detail": f"Error updating profile: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def partial_update(self, request, *args, **kwargs):
        """
        Partially update a user's profile
        """
        try:
            instance = self.get_object()

            # Only allow users to update their own profile
            if request.user.id != instance.user.id:
                return Response(
                    {"detail": "You do not have permission to edit this profile."},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Proceed with the partial update
            return super().partial_update(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error in partial_update: {str(e)}")

            # If this is a 'me' endpoint and profile doesn't exist, create it
            if kwargs.get('pk') == 'me':
                try:
                    # Create a new profile
                    profile, created = Profile.objects.get_or_create(
                        user=request.user,
                        defaults={
                            'display_name': request.user.get_full_name() or request.user.username
                        }
                    )

                    if created:
                        logger.info(f"Created new profile for user {request.user.username} during partial_update")

                    # Update the newly created profile
                    serializer = self.get_serializer(profile, data=request.data, partial=True)
                    serializer.is_valid(raise_exception=True)
                    self.perform_update(serializer)

                    return Response(serializer.data)
                except Exception as create_error:
                    logger.error(f"Error creating profile during partial_update: {str(create_error)}")
                    return Response(
                        {"detail": f"Error creating profile: {str(create_error)}"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

            return Response(
                {"detail": f"Error updating profile: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
