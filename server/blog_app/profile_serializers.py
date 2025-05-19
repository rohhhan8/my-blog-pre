from rest_framework import serializers
from django.contrib.auth.models import User
from .profile_models import Profile

class ProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for the Profile model.
    Includes both public and private information.
    """
    username = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    blog_count = serializers.SerializerMethodField()
    member_since = serializers.SerializerMethodField()
    
    class Meta:
        model = Profile
        fields = [
            '_id', 'username', 'email', 'display_name', 'bio', 'profession', 
            'gender', 'location', 'website', 'avatar_url', 'blog_count', 
            'member_since', 'created_at', 'updated_at'
        ]
        read_only_fields = ['_id', 'username', 'email', 'blog_count', 'member_since', 'created_at', 'updated_at']
    
    def get_username(self, obj):
        return obj.user.username
    
    def get_email(self, obj):
        # Only return email if the request user is the profile owner
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.id == obj.user.id:
            return obj.user.email
        return None
    
    def get_blog_count(self, obj):
        return obj.user.blog_set.count()
    
    def get_member_since(self, obj):
        return obj.created_at.strftime('%B %Y')  # Format: "May 2023"

class PublicProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for public profile information only.
    Used when other users view someone's profile.
    """
    username = serializers.SerializerMethodField()
    blog_count = serializers.SerializerMethodField()
    member_since = serializers.SerializerMethodField()
    
    class Meta:
        model = Profile
        fields = [
            '_id', 'username', 'display_name', 'bio', 'profession', 
            'gender', 'location', 'website', 'avatar_url', 
            'blog_count', 'member_since'
        ]
        read_only_fields = fields  # All fields are read-only for public view
    
    def get_username(self, obj):
        return obj.user.username
    
    def get_blog_count(self, obj):
        return obj.user.blog_set.count()
    
    def get_member_since(self, obj):
        return obj.created_at.strftime('%B %Y')  # Format: "May 2023"
