import uuid

from django.db import models

from .action_type import ActionType
from .account_status import AccountStatus
from .admin_user import Admin
from .user import User

_ACTION_TO_STATUS = {
    ActionType.RESTRICT: AccountStatus.RESTRICTED,
    ActionType.SUSPEND: AccountStatus.SUSPENDED,
    ActionType.RESTORE: AccountStatus.ACTIVE,
}


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

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        new_status = _ACTION_TO_STATUS.get(self.action_type)
        if new_status:
            User.objects.filter(pk=self.target_user_id).update(account_status=new_status)

    def __str__(self):
        return f"{self.action_type} -> {self.target_user.email}"
