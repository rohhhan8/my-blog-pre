from rest_framework import permissions

class IsAuthorOrReadOnly(permissions.BasePermission):
    """
    Custom permission: Only the author can edit or delete.
    Read-only access is allowed for any request.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions allowed for any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions only for the author
        # Add debug logging
        print(f"PERMISSION CHECK DETAILS:")
        print(f"Request method: {request.method}")
        print(f"Object: {obj}")
        print(f"Object type: {type(obj)}")
        print(f"Object author: {obj.author}")
        print(f"Object author type: {type(obj.author)}")
        print(f"Request user: {request.user}")
        print(f"Request user type: {type(request.user)}")

        # Get IDs for comparison
        author_id = getattr(obj.author, 'id', None)
        user_id = getattr(request.user, 'id', None)
        print(f"Author ID: {author_id}")
        print(f"User ID: {user_id}")

        # Get usernames for comparison
        author_username = getattr(obj.author, 'username', None)
        user_username = getattr(request.user, 'username', None)
        print(f"Author username: {author_username}")
        print(f"User username: {user_username}")

        # Try multiple comparison strategies
        # 1. Compare by ID (most reliable)
        if author_id is not None and user_id is not None:
            is_author_by_id = author_id == user_id
            print(f"ID comparison result: {is_author_by_id}")
            if is_author_by_id:
                return True

        # 2. Compare by username
        if author_username is not None and user_username is not None:
            is_author_by_username = author_username == user_username
            print(f"Username comparison result: {is_author_by_username}")
            if is_author_by_username:
                return True

        # 3. Direct object comparison (last resort)
        is_author_direct = obj.author == request.user
        print(f"Direct comparison result: {is_author_direct}")

        # 4. Special case for Firebase auth where username might be UID
        if hasattr(obj.author, 'username') and hasattr(request.user, 'username'):
            # Firebase UID is stored in username
            is_firebase_match = obj.author.username == request.user.username
            print(f"Firebase UID match: {is_firebase_match}")
            if is_firebase_match:
                return True

        # Final result
        print(f"PERMISSION DENIED - User is not the author")
        return False
