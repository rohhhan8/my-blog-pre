from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Blog

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class BlogSerializer(serializers.ModelSerializer):
    author_id = serializers.SerializerMethodField()
    author = serializers.StringRelatedField(read_only=True)  # Returns author.__str__ which is usually username
    author_name = serializers.SerializerMethodField()
    like_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Blog
        fields = ['_id', 'title', 'content', 'image_url', 'author', 'author_id',
                 'author_name', 'created_at', 'updated_at', 'views', 'like_count', 'is_liked']
        read_only_fields = ['author', 'author_id', 'author_name', 'created_at',
                           'updated_at', 'views', 'like_count', 'is_liked']

    def get_author_id(self, obj):
        """
        Return the author's ID for permission checking
        """
        if not obj.author:
            return None
        return obj.author.id

    def get_author_name(self, obj):
        """
        Return the author's name or a friendly display name
        """
        if not obj.author:
            return "Anonymous"

        # Direct access to the author object
        if obj.author.first_name and obj.author.last_name:
            return f"{obj.author.first_name} {obj.author.last_name}"
        elif obj.author.first_name:
            return obj.author.first_name
        elif obj.author.email:
            # Use email username part as a fallback
            return obj.author.email.split('@')[0]
        else:
            # If username is a Firebase UID (long string), return "Anonymous"
            if len(obj.author.username) > 20:  # Firebase UIDs are typically long
                return "Anonymous"
            return obj.author.username

    def get_like_count(self, obj):
        """
        Return the number of likes for this blog
        """
        return obj.likes.count()

    def get_is_liked(self, obj):
        """
        Return whether the current user has liked this blog
        """
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(id=request.user.id).exists()
        return False
