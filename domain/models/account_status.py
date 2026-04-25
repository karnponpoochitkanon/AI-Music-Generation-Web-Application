from django.db import models


class AccountStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "ACTIVE"
    RESTRICTED = "RESTRICTED", "RESTRICTED"
    SUSPENDED = "SUSPENDED", "SUSPENDED"
