import uuid

from django.db import models

from .admin_user import Admin
from .user import User


class ActionType(models.TextChoices):
    RESTRICT = "RESTRICT", "RESTRICT"
    SUSPEND = "SUSPEND", "SUSPEND"
    RESTORE = "RESTORE", "RESTORE"


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
