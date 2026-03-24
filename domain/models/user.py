import uuid

from django.db import models


class AccountStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "ACTIVE"
    RESTRICTED = "RESTRICTED", "RESTRICTED"
    SUSPENDED = "SUSPENDED", "SUSPENDED"


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
