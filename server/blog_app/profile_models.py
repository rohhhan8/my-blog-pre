from djongo import models
from django.contrib.auth.models import User
from django.utils import timezone

class Profile(models.Model):
    """
    User profile model that extends the default Django User model.
    Contains additional information about users that can be displayed publicly.
    """
    _id = models.ObjectIdField(primary_key=True, editable=False)  # MongoDB ObjectId
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Public information
    display_name = models.CharField(max_length=100, blank=True)
    bio = models.TextField(blank=True)
    profession = models.CharField(max_length=100, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=100, blank=True)
    website = models.URLField(max_length=200, blank=True)
    avatar_url = models.URLField(max_length=500, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Profile for {self.user.username}"
    
    @property
    def member_since(self):
        """Return a human-readable date for how long the user has been a member"""
        return self.created_at
    
    @property
    def blog_count(self):
        """Return the number of blogs written by this user"""
        return self.user.blog_set.count()
