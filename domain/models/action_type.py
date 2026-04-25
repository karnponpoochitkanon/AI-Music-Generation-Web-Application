from django.db import models


class ActionType(models.TextChoices):
    RESTRICT = "RESTRICT", "RESTRICT"
    SUSPEND = "SUSPEND", "SUSPEND"
    RESTORE = "RESTORE", "RESTORE"
