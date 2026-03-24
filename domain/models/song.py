import uuid

from django.db import models

from .user import User


class Visibility(models.TextChoices):
    PUBLIC = "PUBLIC", "PUBLIC"
    PRIVATE = "PRIVATE", "PRIVATE"


class Song(models.Model):
    song_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="songs")
    audio_url = models.CharField(max_length=500)
    visibility = models.CharField(
        max_length=7, choices=Visibility.choices, default=Visibility.PRIVATE
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
