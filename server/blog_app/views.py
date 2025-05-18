from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied
from django.contrib.auth.models import User
import logging
from bson.objectid import ObjectId
from bson.errors import InvalidId

from .models import Blog
from .serializers import BlogSerializer
from .permissions import IsAuthorOrReadOnly

# Set up logger
logger = logging.getLogger(__name__)

class BlogViewSet(viewsets.ModelViewSet):
    queryset = Blog.objects.all().order_by('-created_at')
    serializer_class = BlogSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        elif self.action == 'create':
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.IsAuthenticated, IsAuthorOrReadOnly]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        # Use the authenticated user from the request
        user = self.request.user
        print(f"Creating blog with user: {user}, username: {user.username}, id: {user.id}")

        # Save blog post with the authenticated user as author
        serializer.save(author=user)

    def perform_update(self, serializer):
        """
        Custom perform_update to add logging
        """
        print(f"Performing update with data: {serializer.validated_data}")
        # Call the parent class's perform_update
        serializer.save()

    def get_object(self):
        """
        Override get_object to handle MongoDB ObjectId conversion.
        This ensures that when a blog is requested by ID for update or delete,
        the ID is properly converted to a MongoDB ObjectId.
        """
        # Get the lookup field value (usually 'pk' from the URL)
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        assert lookup_url_kwarg in self.kwargs, (
            'Expected view %s to be called with a URL keyword argument '
            'named "%s". Fix your URL conf, or set the `.lookup_field` '
            'attribute on the view correctly.' %
            (self.__class__.__name__, lookup_url_kwarg)
        )

        # Get the ID from the URL
        blog_id = self.kwargs[lookup_url_kwarg]
        print(f"Looking up blog with ID: {blog_id}")

        # Try to convert the ID to a MongoDB ObjectId
        try:
            # First try to get the blog using the standard queryset filter
            queryset = self.filter_queryset(self.get_queryset())

            # Try to convert to ObjectId if it's a string
            if isinstance(blog_id, str):
                try:
                    obj_id = ObjectId(blog_id)
                    print(f"Converted {blog_id} to ObjectId: {obj_id}")
                    # Try to find the blog with the converted ObjectId
                    obj = queryset.filter(_id=obj_id).first()
                    if obj:
                        print(f"Found blog by ObjectId: {obj.title}")
                        # Check object permissions
                        self.check_object_permissions(self.request, obj)
                        return obj
                except InvalidId:
                    print(f"Invalid ObjectId format: {blog_id}")

            # If ObjectId conversion failed or didn't find a blog, try the default lookup
            print(f"Trying default lookup for blog with ID: {blog_id}")
            obj = super().get_object()
            print(f"Found blog by default lookup: {obj.title}")
            return obj

        except NotFound:
            # If not found, try a direct database lookup with ObjectId
            print(f"Blog not found with default lookup, trying direct database lookup")
            try:
                obj_id = ObjectId(blog_id)
                obj = Blog.objects.get(_id=obj_id)
                print(f"Found blog by direct database lookup: {obj.title}")
                # Check object permissions
                self.check_object_permissions(self.request, obj)
                return obj
            except (InvalidId, Blog.DoesNotExist) as e:
                print(f"Error in direct database lookup: {str(e)}")
                raise NotFound(f"Blog with ID {blog_id} not found")

        except Exception as e:
            print(f"Unexpected error in get_object: {str(e)}")
            import traceback
            traceback.print_exc()
            raise

    def get_queryset(self):
        """
        This view should return a list of all blogs
        or filtered by author if requested.
        """
        queryset = Blog.objects.all().order_by('-created_at')

        # If user wants to filter by author
        author = self.request.query_params.get('author', None)
        if author is not None:
            print(f"Filtering blogs by author: {author}")

            # Try multiple ways to match the author
            # 1. By username (which is the Firebase UID)
            username_matches = queryset.filter(author__username=author)
            print(f"Found {username_matches.count()} blogs by username match")

            # 2. By email
            email_matches = queryset.filter(author__email=author)
            print(f"Found {email_matches.count()} blogs by email match")

            # 3. By email username part
            if '@' in author:
                email_username = author.split('@')[0]
                email_username_matches = queryset.filter(author__email__startswith=email_username)
                print(f"Found {email_username_matches.count()} blogs by email username match")
            else:
                email_username_matches = queryset.none()

            # Combine all matches
            queryset = username_matches | email_matches | email_username_matches
            queryset = queryset.distinct()
            print(f"Total blogs after filtering: {queryset.count()}")

        # Check if we're filtering by _id
        _id = self.request.query_params.get('_id', None)
        if _id is not None:
            print(f"Filtering blogs by _id: {_id}")
            try:
                # Try to convert to ObjectId
                obj_id = ObjectId(_id)
                # Use a safer approach to find by ID
                try:
                    # Direct database lookup instead of queryset filter
                    blog = Blog.objects.get(_id=obj_id)
                    print(f"Found blog by _id: {blog.title}")
                    return Blog.objects.filter(pk=blog.pk)
                except Blog.DoesNotExist:
                    print(f"No blog found with _id: {_id}")
                    return Blog.objects.none()
            except InvalidId:
                print(f"Invalid ObjectId format: {_id}")

        return queryset

    def update(self, request, *args, **kwargs):
        """
        Override update method to add more logging and ensure proper handling of ObjectIDs.
        This handles PUT requests.
        """
        try:
            # Get the blog ID from the URL
            blog_id = kwargs.get('pk')
            print(f"Attempting to update blog with ID: {blog_id}")

            # Use our custom get_object method to find the blog
            instance = self.get_object()

            # Detailed logging
            print(f"UPDATE METHOD - DETAILED LOGGING")
            print(f"Blog ID: {instance._id}")
            print(f"Blog title: {instance.title}")
            print(f"Blog author: {instance.author}")
            print(f"Request user: {request.user}")
            print(f"Request data: {request.data}")

            # Check if this is a partial update (PATCH) or full update (PUT)
            partial = kwargs.pop('partial', False)
            print(f"Partial update: {partial}")

            # Update the instance with the serializer
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)

            # If 'prefetch_related' has been applied to a queryset, we need to
            # forcibly invalidate the prefetch cache on the instance.
            if getattr(instance, '_prefetched_objects_cache', None):
                instance._prefetched_objects_cache = {}

            # Return the updated instance
            print(f"Blog {instance._id} successfully updated")
            return Response(serializer.data)

        except Exception as e:
            print(f"Error in update method: {str(e)}")
            import traceback
            traceback.print_exc()
            raise

    def partial_update(self, request, *args, **kwargs):
        """
        Override partial_update method to handle PATCH requests.
        This is a wrapper around the update method with partial=True.
        """
        print(f"Handling PATCH request for blog with ID: {kwargs.get('pk')}")
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        """
        Override retrieve method to handle GET requests for a single blog.
        This ensures proper handling of MongoDB ObjectIDs.
        """
        try:
            print(f"Retrieving blog with ID: {kwargs.get('pk')}")

            # Use our custom get_object method to find the blog
            instance = self.get_object()

            # Serialize the instance
            serializer = self.get_serializer(instance)
            print(f"Successfully retrieved blog: {instance.title}")

            # Return the serialized data
            return Response(serializer.data)

        except Exception as e:
            print(f"Error in retrieve method: {str(e)}")
            import traceback
            traceback.print_exc()
            raise

    def destroy(self, request, *args, **kwargs):
        """
        Override destroy method to add more logging and ensure proper permission checking
        """
        try:
            # Get the blog ID from the URL
            blog_id = kwargs.get('pk')
            print(f"Attempting to delete blog with ID: {blog_id}")

            # Use our custom get_object method to find the blog
            instance = self.get_object()

            # Detailed logging
            print(f"DESTROY METHOD - DETAILED LOGGING")
            print(f"Blog ID: {instance._id}")
            print(f"Blog title: {instance.title}")
            print(f"Blog author: {instance.author}")
            print(f"Blog author type: {type(instance.author)}")
            print(f"Request user: {request.user}")
            print(f"Request user type: {type(request.user)}")

            # Get user information for debugging
            if hasattr(request.user, 'id'):
                print(f"Request user ID: {request.user.id}")
            if hasattr(request.user, 'username'):
                print(f"Request user username: {request.user.username}")
            if hasattr(request.user, 'email'):
                print(f"Request user email: {request.user.email}")

            # Get author information for debugging
            if hasattr(instance.author, 'id'):
                print(f"Blog author ID: {instance.author.id}")
            if hasattr(instance.author, 'username'):
                print(f"Blog author username: {instance.author.username}")
            if hasattr(instance.author, 'email'):
                print(f"Blog author email: {instance.author.email}")

            # Simplified permission check - just check username match
            if hasattr(request.user, 'username') and hasattr(instance.author, 'username'):
                if request.user.username == instance.author.username:
                    print("Permission granted: Username match")
                    instance.delete()
                    return Response(status=status.HTTP_204_NO_CONTENT)
                else:
                    print(f"Username mismatch: {instance.author.username} != {request.user.username}")

            # Fallback to original permission checks
            # 1. Check by ID
            if hasattr(instance.author, 'id') and hasattr(request.user, 'id'):
                if instance.author.id == request.user.id:
                    print("Permission granted: Author ID matches user ID")
                    response = super().destroy(request, *args, **kwargs)
                    print(f"Blog {instance._id} successfully deleted")
                    return response
                else:
                    print(f"ID mismatch: {instance.author.id} != {request.user.id}")

            # 2. Direct comparison
            if instance.author == request.user:
                print("Permission granted: Direct object comparison")
                response = super().destroy(request, *args, **kwargs)
                print(f"Blog {instance._id} successfully deleted")
                return response
            else:
                print("Direct comparison failed")

            # If we get here, all permission checks failed
            print("PERMISSION DENIED: User is not the author of this blog")
            raise PermissionDenied("You can only delete your own blogs.")

        except Exception as e:
            print(f"Error in destroy method: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
