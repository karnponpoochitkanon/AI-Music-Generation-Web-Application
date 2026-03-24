import uuid

from django.db import models

from .song import Song
from .user import User


class MusicGenerationRequest(models.Model):
    request_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="generation_requests"
    )
    song_name = models.CharField(max_length=200)
    genre = models.CharField(max_length=100)
    mood = models.CharField(max_length=100)
    singer_style = models.CharField(max_length=100, blank=True, default="")
    description = models.TextField(blank=True, default="")
    completed_at = models.DateTimeField(null=True, blank=True)
    produced_song = models.OneToOneField(
        Song,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="produced_from_request",
    )

    def __str__(self):
        return self.song_name
