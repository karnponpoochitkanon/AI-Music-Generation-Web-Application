from django.db import models
import uuid


# Enum
class AccountStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "ACTIVE"
    RESTRICTED = "RESTRICTED", "RESTRICTED"
    SUSPENDED = "SUSPENDED", "SUSPENDED"


class Visibility(models.TextChoices):
    PUBLIC = "PUBLIC", "PUBLIC"
    PRIVATE = "PRIVATE", "PRIVATE"


class ActionType(models.TextChoices):
    RESTRICT = "RESTRICT", "RESTRICT"
    SUSPEND = "SUSPEND", "SUSPEND"
    RESTORE = "RESTORE", "RESTORE"


class User(models.Model):
    user_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    account_status = models.CharField(
        max_length=12,
        choices=AccountStatus.choices,
        default=AccountStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.email


class Admin(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)
    is_active_admin = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Admin({self.user.email})"


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


class MusicGenerationRequest(models.Model):
    request_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="generation_requests")
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


class AdminAction(models.Model):
    action_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)


    target_user = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="actions_received"
    )

    action_type = models.CharField(max_length=10, choices=ActionType.choices)


    performed_by = models.ForeignKey(
        Admin, on_delete=models.PROTECT, related_name="actions_performed"
    )

    reason = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.action_type} -> {self.target_user.email}"