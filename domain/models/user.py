import uuid

from django.db import models

from .account_status import AccountStatus


class User(models.Model):
    user_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=120, blank=True, default="")
    username = models.CharField(max_length=50, unique=True, null=True, blank=True)
    profile_image_url = models.TextField(blank=True, default="")
    account_status = models.CharField(
        max_length=12,
        choices=AccountStatus.choices,
        default=AccountStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def is_profile_complete(self):
        return bool(self.username and self.profile_image_url)

    def __str__(self):
        return self.username or self.email
