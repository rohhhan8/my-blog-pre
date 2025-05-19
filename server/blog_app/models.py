from djongo import models  # If you use djongo for MongoDB integration
from django.contrib.auth.models import User

class Blog(models.Model):
    _id = models.ObjectIdField(primary_key=True, editable=False)  # MongoDB ObjectId
    title = models.CharField(max_length=255)
    content = models.TextField()
    image_url = models.URLField(max_length=500, blank=True, null=True)  # Optional image URL
    author = models.ForeignKey(User, on_delete=models.CASCADE)  # Django User FK
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    views = models.PositiveIntegerField(default=0)  # Track view count
    likes = models.ManyToManyField(User, related_name='liked_blogs', blank=True)  # Track likes

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def like_count(self):
        return self.likes.count()
